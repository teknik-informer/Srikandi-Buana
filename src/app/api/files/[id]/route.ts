import { NextResponse } from "next/server";
import { getIdentity, can } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import {
  attachmentDisposition, fetchCloudinaryAsset, type StoredFileAsset,
} from "@/lib/cloudinary-files";

function missing() {
  return new NextResponse("Berkas tidak ditemukan.", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function canReadAsset(asset: StoredFileAsset, identity: Awaited<ReturnType<typeof getIdentity>>) {
  if (!identity || identity.organizationId !== asset.organization_id || !can(identity, "files:read")) return false;
  if (can(identity, "files:manage")) return true;
  if (asset.scope_kind === "self") return asset.uploaded_by === identity.userId;
  if (asset.scope_kind === "field") return !!identity.field && identity.field === asset.scope_ref;
  return asset.scope_kind === "organization";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return missing();

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT asset.*
      FROM v9.file_assets AS asset
      WHERE asset.id = ${id} AND asset.status = 'active'
      LIMIT 1
    `;
    const asset = rowsFromResult<StoredFileAsset>(result)[0];
    if (!asset || !(await canReadAsset(asset, await getIdentity()))) return missing();

    const linkedDocument = await sql`
      SELECT document.status, document.visibility, file.revision_no,
        (SELECT max(latest.revision_no) FROM v9.secretariat_document_files AS latest
          WHERE latest.document_id = file.document_id) AS latest_revision
      FROM v9.secretariat_document_files AS file
      INNER JOIN v9.secretariat_documents AS document ON document.id = file.document_id
      WHERE file.asset_id = ${id}
      LIMIT 1
    `;
    const linked = rowsFromResult<{ status: string; visibility: string; revision_no: number; latest_revision: number }>(linkedDocument)[0];
    if (linked && (linked.status !== "final" || linked.visibility !== "publik" || linked.revision_no !== linked.latest_revision)) return missing();

    const inlineRequested = new URL(request.url).searchParams.get("disposition") === "inline";
    const inline = inlineRequested && (
      asset.mime_type === "application/pdf" || asset.mime_type.startsWith("image/")
    );
    const upstream = await fetchCloudinaryAsset(asset);
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": asset.mime_type,
        "Content-Length": String(asset.size_bytes),
        "Content-Disposition": attachmentDisposition(asset.file_name, inline),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.warn("[file-download] Delivery unavailable", error instanceof Error ? error.name : "UnknownError");
    return new NextResponse("Berkas sementara tidak dapat diakses.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
