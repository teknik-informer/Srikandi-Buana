import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FilePreviewClient } from "@/components/file-preview-client";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Pratinjau Berkas" };

interface FileRow {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  scope_kind: "organization" | "field" | "self";
  scope_ref: string | null;
  file_name: string;
  mime_type: string;
  status: "active" | "revoked";
}

export default async function FilePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await requireIdentity("files:read");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();

  const sql = getV9Sql();
  const result = await sql`
    SELECT asset.id::text AS id, asset.organization_id::text AS organization_id,
      asset.uploaded_by::text AS uploaded_by, asset.scope_kind, asset.scope_ref,
      asset.file_name, asset.mime_type, asset.status
    FROM v9.file_assets AS asset
    WHERE asset.id = ${id} AND asset.status = 'active'
      AND asset.organization_id = ${identity.organizationId}
    LIMIT 1
  `;
  const file = rowsFromResult<FileRow>(result)[0];
  if (!file) notFound();

  const allowed = can(identity, "files:manage") ||
    (file.scope_kind === "self" && file.uploaded_by === identity.userId) ||
    (file.scope_kind === "organization" && can(identity, "files:read")) ||
    (file.scope_kind === "field" && !!identity.field && identity.field === file.scope_ref);
  if (!allowed || !(file.mime_type === "application/pdf" || file.mime_type.startsWith("image/"))) notFound();

  const linked = await sql`
    SELECT document.status, document.visibility, attachment.revision_no,
      (SELECT max(latest.revision_no) FROM v9.secretariat_document_files AS latest
        WHERE latest.document_id = attachment.document_id) AS latest_revision
    FROM v9.secretariat_document_files AS attachment
    INNER JOIN v9.secretariat_documents AS document ON document.id = attachment.document_id
    WHERE attachment.asset_id = ${id}
    LIMIT 1
  `;
  const linkedDocument = rowsFromResult<{ status: string; visibility: string; revision_no: number; latest_revision: number }>(linked)[0];
  if (linkedDocument && (linkedDocument.status !== "final" || linkedDocument.visibility !== "publik" || linkedDocument.revision_no !== linkedDocument.latest_revision)) notFound();

  return <FilePreviewClient fileId={file.id} fileName={file.file_name} />;
}
