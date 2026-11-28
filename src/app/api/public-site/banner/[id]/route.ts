import { NextResponse } from "next/server";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { fetchCloudinaryAsset, type StoredFileAsset } from "@/lib/cloudinary-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missing() {
  return new NextResponse("Banner tidak ditemukan.", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return missing();

  try {
    const settings = await getPublicSiteSettings();
    if (settings.hero.imageAssetId !== id) return missing();

    const sql = getV9Sql();
    const result = await sql`
      SELECT
        asset.id,
        asset.organization_id,
        asset.uploaded_by,
        asset.category,
        asset.scope_kind,
        asset.scope_ref,
        asset.file_name,
        asset.mime_type,
        asset.size_bytes,
        asset.sha256,
        asset.cloudinary_asset_id,
        asset.cloudinary_public_id,
        asset.cloudinary_resource_type,
        asset.cloudinary_delivery_type,
        asset.cloudinary_version,
        asset.cloudinary_format,
        asset.status
      FROM v9.file_assets AS asset
      WHERE asset.id = ${id}
        AND asset.status = 'active'
        AND asset.scope_kind = 'organization'
        AND asset.category = 'public-site-banner'
        AND asset.mime_type LIKE 'image/%'
      LIMIT 1
    `;
    const asset = rowsFromResult<StoredFileAsset>(result)[0];
    if (!asset) return missing();

    const upstream = await fetchCloudinaryAsset(asset);
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": asset.mime_type,
        "Content-Length": String(asset.size_bytes),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.warn("[public-banner] Delivery unavailable", error instanceof Error ? error.name : "UnknownError");
    return new NextResponse("Banner sementara tidak tersedia.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
