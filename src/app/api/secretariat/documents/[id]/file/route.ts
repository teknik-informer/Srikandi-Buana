import { NextResponse } from "next/server";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, getIdentity } from "@/lib/session";

interface DocumentRecord {
  organization_id: string;
  status: "draft" | "final" | "arsip";
  visibility: "publik" | "internal" | "terbatas";
  file_name: string;
  mime_type: string;
  size_bytes: number;
  base64: string;
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
        encode(file.file_data, 'base64') AS base64
      FROM v9.secretariat_document_files AS file
      INNER JOIN v9.secretariat_documents AS document
        ON document.id = file.document_id
      WHERE file.document_id = ${id}
        AND document.status <> 'arsip'
      ORDER BY file.revision_no DESC
      LIMIT 1
    `;
    const file = rowsFromResult<Pick<DocumentRecord, "file_name" | "mime_type" | "size_bytes" | "base64">>(fileResult)[0];
    if (!file) return missing();

    const bytes = Buffer.from(file.base64, "base64");
    const fallbackName = file.file_name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "document";
    const contentDisposition = `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mime_type,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": contentDisposition,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": isPublic ? "public, max-age=3600, s-maxage=3600" : "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      "[secretariat-document-download] Failed:",
      error instanceof Error ? error.message : "Unknown error",
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
