import { NextResponse } from "next/server";
import { getIdentity, can } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { createOpaqueShareToken, sha256Hex, type StoredFileAsset } from "@/lib/cloudinary-files";

function deny(status = 404) {
  return NextResponse.json({ error: "Berkas tidak ditemukan atau akses tidak diizinkan." }, {
    status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity || !can(identity, "files:share")) return deny(403);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return deny();

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        link.id::text AS id,
        link.expires_at::text AS expires_at,
        link.max_downloads,
        link.download_count,
        (link.revoked_at IS NOT NULL) AS revoked,
        (link.expires_at <= now()) AS expired,
        (link.max_downloads IS NOT NULL AND link.download_count >= link.max_downloads) AS exhausted
      FROM v9.file_share_links AS link
      INNER JOIN v9.file_assets AS asset ON asset.id = link.file_asset_id
      WHERE asset.id = ${id}
        AND asset.organization_id = ${identity.organizationId}
        AND asset.status = 'active'
        AND (asset.uploaded_by = ${identity.userId} OR ${can(identity, "files:manage")})
        AND NOT EXISTS (
          SELECT 1
          FROM v9.secretariat_document_files AS file
          INNER JOIN v9.secretariat_documents AS document ON document.id = file.document_id
          WHERE file.asset_id = asset.id
            AND (
              document.status <> 'final'
              OR document.visibility <> 'publik'
              OR file.revision_no <> (
                SELECT max(latest.revision_no)
                FROM v9.secretariat_document_files AS latest
                WHERE latest.document_id = file.document_id
              )
            )
        )
      ORDER BY link.created_at DESC
      LIMIT 20
    `;
    return NextResponse.json({ links: rowsFromResult<{
      id: string; expires_at: string; max_downloads: number | null;
      download_count: number; revoked: boolean; expired: boolean; exhausted: boolean;
    }>(result) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return deny(502);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity || !can(identity, "files:share")) return deny(403);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return deny();
  if (request.headers.get("origin") !== new URL(request.url).origin) return deny(403);

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT asset.*, asset.uploaded_by::text AS uploaded_by
      FROM v9.file_assets AS asset
      WHERE asset.id = ${id}
        AND asset.organization_id = ${identity.organizationId}
        AND asset.status = 'active'
        AND (asset.uploaded_by = ${identity.userId} OR ${can(identity, "files:manage")})
        AND NOT EXISTS (
          SELECT 1
          FROM v9.secretariat_document_files AS file
          INNER JOIN v9.secretariat_documents AS document ON document.id = file.document_id
          WHERE file.asset_id = asset.id
            AND (
              document.status <> 'final'
              OR document.visibility <> 'publik'
              OR file.revision_no <> (
                SELECT max(latest.revision_no)
                FROM v9.secretariat_document_files AS latest
                WHERE latest.document_id = file.document_id
              )
            )
        )
      LIMIT 1
    `;
    const asset = rowsFromResult<StoredFileAsset>(result)[0];
    if (!asset) return deny();

    const body = await request.json().catch(() => ({})) as { expiresInDays?: number; maxDownloads?: number | null } | null;
    const requestedExpiry = Number(body?.expiresInDays ?? 7);
    const requestedLimit = body?.maxDownloads == null ? null : Number(body.maxDownloads);
    if (!Number.isInteger(requestedExpiry) || (requestedLimit !== null && !Number.isInteger(requestedLimit))) return deny(400);
    const expiresInDays = Math.min(30, Math.max(1, requestedExpiry));
    const maxDownloads = requestedLimit === null ? null : Math.min(1000, Math.max(1, requestedLimit));
    const token = createOpaqueShareToken();
    const tokenHash = sha256Hex(token);
    const created = await sql`
      WITH link AS (
        INSERT INTO v9.file_share_links (
          file_asset_id, organization_id, created_by, token_hash, expires_at, max_downloads
        )
        VALUES (
          ${id}, ${identity.organizationId}, ${identity.userId}, ${tokenHash},
          now() + (${expiresInDays}::text || ' days')::interval, ${maxDownloads}
        )
        RETURNING id, expires_at, max_downloads
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT ${identity.organizationId}, ${identity.userId}, 'file.share_link_created',
          'file_asset', ${id},
          jsonb_build_object('share_id', link.id, 'expires_at', link.expires_at, 'max_downloads', link.max_downloads)
        FROM link
        RETURNING id
      )
      SELECT link.id::text AS id, link.expires_at::text AS expires_at, link.max_downloads
      FROM link INNER JOIN audit ON true
    `;
    const share = rowsFromResult<{ id: string; expires_at: string; max_downloads: number | null }>(created)[0];
    if (!share) return deny(502);
    const previewOrigin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_URL || request.url;
    const origin = new URL(previewOrigin).origin;
    return NextResponse.json({
      id: share.id,
      url: `${origin}/api/files/share/${token}`,
      expiresAt: share.expires_at,
      maxDownloads: share.max_downloads,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[file-share] Link creation failed", error instanceof Error ? error.name : "UnknownError");
    return deny(502);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity || !can(identity, "files:share")) return deny(403);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return deny();

  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return deny(403);
    const body = await request.json().catch(() => ({})) as { shareId?: string } | null;
    if (!body?.shareId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.shareId)) return deny(400);
    const shareId = body.shareId;
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.file_share_links AS link
        SET revoked_at = now()
        FROM v9.file_assets AS asset
        WHERE link.file_asset_id = asset.id
          AND asset.id = ${id}
          AND asset.organization_id = ${identity.organizationId}
          AND (asset.uploaded_by = ${identity.userId} OR ${can(identity, "files:manage")})
          AND link.revoked_at IS NULL
          AND link.id = ${shareId}::uuid
        RETURNING link.id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT ${identity.organizationId}, ${identity.userId}, 'file.share_link_revoked',
          'file_asset', ${id}, jsonb_build_object('share_id', changed.id)
        FROM changed
        RETURNING id
      )
      SELECT count(*)::int AS revoked FROM changed
    `;
    return NextResponse.json({ revoked: rowsFromResult<{ revoked: number }>(result)[0]?.revoked ?? 0 }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return deny(502);
  }
}
