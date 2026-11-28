import { NextResponse } from "next/server";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, getIdentity } from "@/lib/session";
import {
  attachmentDisposition, fetchCloudinaryAsset, type StoredFileAsset,
} from "@/lib/cloudinary-files";

interface PublicDocumentFile {
  organization_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  base64: string | null;
  asset_id: string | null;
  cloudinary_asset_id: string | null;
  cloudinary_public_id: string | null;
  cloudinary_resource_type: "image" | "video" | "raw" | null;
  cloudinary_delivery_type: "authenticated" | null;
  cloudinary_version: number | null;
  cloudinary_format: string | null;
  asset_status: "active" | "revoked" | null;
}

interface DocumentRecord {
  organization_id: string;
  status: "draft" | "final" | "arsip";
  visibility: "publik" | "internal" | "terbatas";
  file_name: string;
  mime_type: string;
  size_bytes: number;
  base64: string | null;
  asset_id: string | null;
  cloudinary_asset_id: string | null;
  cloudinary_public_id: string | null;
  cloudinary_resource_type: "image" | "video" | "raw" | null;
  cloudinary_delivery_type: "authenticated" | null;
  cloudinary_version: number | null;
  cloudinary_format: string | null;
  asset_status: "active" | "revoked" | null;
}

function missing() {
  return new NextResponse("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return missing();
  }

  try {
    const sql = getV9Sql();

    // Tokenless public downloads use a fixed SECURITY DEFINER projection that
    // returns only the latest revision of a final public document.
    let publicFile: PublicDocumentFile | undefined;
    try {
      const publicResult = await sql`
        SELECT * FROM v9.get_public_document_file(${id}::uuid)
        LIMIT 1
      `;
      publicFile = rowsFromResult<PublicDocumentFile>(publicResult)[0];
    } catch {
      // Keep internal download behavior available before the QA migration is
      // applied; public delivery remains unavailable until the projection exists.
    }

    if (publicFile) {
      const inlineRequested = new URL(_request.url).searchParams.get("disposition") === "inline";
      const inline = inlineRequested && (
        publicFile.mime_type === "application/pdf" || publicFile.mime_type.startsWith("image/")
      );
      const headers = {
        "Content-Type": publicFile.mime_type,
        "Content-Length": String(publicFile.size_bytes),
        "Content-Disposition": attachmentDisposition(publicFile.file_name, inline),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "private, no-store",
      };

      if (publicFile.asset_id && publicFile.asset_status !== "active") return missing();
      if (publicFile.asset_id && publicFile.cloudinary_asset_id && publicFile.cloudinary_public_id &&
          publicFile.cloudinary_resource_type && publicFile.cloudinary_delivery_type && publicFile.cloudinary_version) {
        const upstream = await fetchCloudinaryAsset({
          id: publicFile.asset_id,
          organization_id: publicFile.organization_id,
          uploaded_by: null,
          category: "document",
          scope_kind: "organization",
          scope_ref: null,
          file_name: publicFile.file_name,
          mime_type: publicFile.mime_type,
          size_bytes: publicFile.size_bytes,
          cloudinary_asset_id: publicFile.cloudinary_asset_id,
          cloudinary_public_id: publicFile.cloudinary_public_id,
          cloudinary_resource_type: publicFile.cloudinary_resource_type,
          cloudinary_delivery_type: publicFile.cloudinary_delivery_type,
          cloudinary_version: Number(publicFile.cloudinary_version),
          cloudinary_format: publicFile.cloudinary_format,
          status: "active",
        });
        return new NextResponse(upstream.body, { status: 200, headers });
      }

      if (!publicFile.base64) return missing();
      return new NextResponse(Buffer.from(publicFile.base64, "base64"), { status: 200, headers });
    }

    const metadataResult = await sql`
      SELECT
        document.organization_id::text AS organization_id,
        document.status,
        document.visibility
      FROM v9.secretariat_documents AS document
      WHERE document.id = ${id}
      LIMIT 1
    `;
    const metadata = rowsFromResult<Pick<DocumentRecord, "organization_id" | "status" | "visibility">>(metadataResult)[0];
    if (!metadata || metadata.status === "arsip") return missing();

    const isPublic = metadata.status === "final" && metadata.visibility === "publik";
    if (!isPublic) {
      const identity = await getIdentity();
      if (!identity || identity.organizationId !== metadata.organization_id || !can(identity, "secretariat:read")) {
        return missing();
      }
      if (
        metadata.visibility === "terbatas" &&
        !["platform_admin", "organization_admin", "chair", "secretary"].includes(identity.roleKey)
      ) {
        return missing();
      }
    }

    const fileResult = await sql`
      SELECT
        file.file_name,
        file.mime_type,
        file.size_bytes,
        CASE WHEN file.file_data IS NOT NULL THEN encode(file.file_data, 'base64') ELSE NULL END AS base64,
        file.asset_id::text AS asset_id,
        asset.cloudinary_asset_id,
        asset.cloudinary_public_id,
        asset.cloudinary_resource_type,
        asset.cloudinary_delivery_type,
        asset.cloudinary_version,
        asset.cloudinary_format,
        asset.status AS asset_status
      FROM v9.secretariat_document_files AS file
      INNER JOIN v9.secretariat_documents AS document
        ON document.id = file.document_id
      LEFT JOIN v9.file_assets AS asset ON asset.id = file.asset_id
      WHERE file.document_id = ${id}
        AND document.status <> 'arsip'
      ORDER BY file.revision_no DESC
      LIMIT 1
    `;
    const file = rowsFromResult<Pick<DocumentRecord,
      "file_name" | "mime_type" | "size_bytes" | "base64" | "asset_id" |
      "cloudinary_asset_id" | "cloudinary_public_id" | "cloudinary_resource_type" |
      "cloudinary_delivery_type" | "cloudinary_version" | "cloudinary_format" | "asset_status"
    >>(fileResult)[0];
    if (!file) return missing();

    const inlineRequested = new URL(_request.url).searchParams.get("disposition") === "inline";
    const inline = inlineRequested && (file.mime_type === "application/pdf" || file.mime_type.startsWith("image/"));
    const headers = {
      "Content-Type": file.mime_type,
      "Content-Length": String(file.size_bytes),
      "Content-Disposition": attachmentDisposition(file.file_name, inline),
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "private, no-store",
    };

    if (file.asset_id && file.asset_status !== "active") return missing();
    if (file.asset_id && file.cloudinary_asset_id && file.cloudinary_public_id && file.cloudinary_resource_type &&
        file.cloudinary_delivery_type && file.cloudinary_version) {
      const upstream = await fetchCloudinaryAsset({
        id: file.asset_id,
        organization_id: metadata.organization_id,
        uploaded_by: null,
        category: "document",
        scope_kind: "organization",
        scope_ref: null,
        file_name: file.file_name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        cloudinary_asset_id: file.cloudinary_asset_id,
        cloudinary_public_id: file.cloudinary_public_id,
        cloudinary_resource_type: file.cloudinary_resource_type,
        cloudinary_delivery_type: file.cloudinary_delivery_type,
        cloudinary_version: file.cloudinary_version,
        cloudinary_format: file.cloudinary_format,
        status: "active",
      });
      return new NextResponse(upstream.body, { status: 200, headers });
    }

    if (!file.base64) return missing();
    const bytes = Buffer.from(file.base64, "base64");
    return new NextResponse(bytes, { status: 200, headers });
  } catch (error) {
    // Keep database/storage details out of runtime logs and visitor responses.
    console.warn(
      "[secretariat-document-download] Source unavailable",
      error instanceof Error ? error.name : "UnknownError",
    );
    return new NextResponse("Document is currently unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
