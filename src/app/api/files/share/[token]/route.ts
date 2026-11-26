import { NextResponse } from "next/server";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import {
  attachmentDisposition, fetchCloudinaryAsset, sha256Hex, type StoredFileAsset,
} from "@/lib/cloudinary-files";

function unavailable() {
  return new NextResponse("Tautan berbagi tidak tersedia atau sudah kedaluwarsa.", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return unavailable();

  try {
    const sql = getV9Sql();
    const consumed = await sql`
      WITH permitted AS (
        UPDATE v9.file_share_links AS link
        SET download_count = link.download_count + 1
        FROM v9.file_assets AS asset
        WHERE link.file_asset_id = asset.id
          AND link.token_hash = ${sha256Hex(token)}
          AND link.organization_id = asset.organization_id
          AND link.revoked_at IS NULL
          AND link.expires_at > now()
          AND (link.max_downloads IS NULL OR link.download_count < link.max_downloads)
          AND asset.status = 'active'
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
        RETURNING asset.*
      )
      SELECT * FROM permitted LIMIT 1
    `;
    const asset = rowsFromResult<StoredFileAsset>(consumed)[0];
    if (!asset) return unavailable();

    const disposition = new URL(request.url).searchParams.get("disposition") === "inline";
    const inline = disposition && (asset.mime_type === "application/pdf" || asset.mime_type.startsWith("image/"));
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
    console.warn("[file-share-download] Delivery unavailable", error instanceof Error ? error.name : "UnknownError");
    return unavailable();
  }
}
