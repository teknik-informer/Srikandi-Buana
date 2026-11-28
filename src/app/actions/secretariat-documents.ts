"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { getSecretariatTemplate } from "@/lib/secretariat-templates";

const CATEGORIES = ["SK", "Laporan", "SOP", "Surat", "Notulen", "Publikasi"] as const;
const VISIBILITIES = ["publik", "internal", "terbatas"] as const;
function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

interface UploadedFileAsset {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
}

async function resolveUploadedFileAsset(
  value: FormDataEntryValue | null,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  required: boolean,
): Promise<UploadedFileAsset | null> {
  const assetId = String(value ?? "").trim();
  if (!assetId) {
    if (required) throw new Error("Unggah berkas ke Cloudinary terlebih dahulu.");
    return null;
  }
  if (!validUuid(assetId)) throw new Error("Referensi berkas tidak valid.");

  const sql = getV9Sql();
  const result = await sql`
    SELECT asset.id::text AS id, asset.file_name, asset.mime_type,
      asset.size_bytes::int AS size_bytes, asset.sha256
    FROM v9.file_assets AS asset
    WHERE asset.id = ${assetId}
      AND asset.organization_id = ${identity.organizationId}
      AND asset.uploaded_by = ${identity.userId}
      AND asset.scope_kind = 'organization'
      AND asset.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM v9.secretariat_document_files AS existing
        WHERE existing.asset_id = asset.id
      )
    LIMIT 1
  `;
  const asset = rowsFromResult<UploadedFileAsset>(result)[0];
  if (!asset) throw new Error("Berkas tidak ditemukan, sudah terpakai, atau bukan milik akun ini.");
  return asset;
}

function logFailure(area: string, error: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    error instanceof Error ? error.message : "Unknown error",
  );
}

export async function registerSecretariatDocument(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:documents:write");
  const number = String(formData.get("number") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().replace(/\s+/g, " ");
  const category = String(formData.get("category") ?? "").trim();
  const documentDate = String(formData.get("document_date") ?? "").trim();
  const owner = String(formData.get("owner_label") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "internal").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (
    number.length > 100 ||
    title.length < 3 || title.length > 300 ||
    !CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ||
    !validDate(documentDate) ||
    owner.length < 2 || owner.length > 160 ||
    !VISIBILITIES.includes(visibility as (typeof VISIBILITIES)[number]) ||
    description.length > 4000
  ) {
    redirect("/app/sekretariat/dokumen?result=invalid");
  }
  if (visibility === "publik" && !can(identity, "documents:publish")) {
    redirect("/app/sekretariat/dokumen?result=forbidden");
  }

  let uploadedAsset: UploadedFileAsset | null;
  try {
    uploadedAsset = await resolveUploadedFileAsset(formData.get("asset_id"), identity, false);
  } catch (error) {
    redirect(`/app/sekretariat/dokumen?result=file-invalid&message=${encodeURIComponent(error instanceof Error ? error.message : "Berkas tidak valid.")}`);
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted_document AS (
        INSERT INTO v9.secretariat_documents (
          organization_id, number, title, category, document_date,
          owner_label, visibility, status, description, created_by, updated_by
        )
        VALUES (
          ${identity.organizationId},
          NULLIF(${number}, ''),
          ${title},
          ${category},
          ${documentDate}::date,
          ${owner},
          ${visibility},
          'draft',
          NULLIF(${description}, ''),
          ${identity.userId},
          ${identity.userId}
        )
        RETURNING id, reference_no, organization_id, title, number, status, visibility
      ),
      inserted_file AS (
        INSERT INTO v9.secretariat_document_files (
          document_id, revision_no, file_name, mime_type, size_bytes, sha256,
          file_data, asset_id, uploaded_by
        )
        SELECT
          inserted_document.id,
          1,
          asset.file_name,
          asset.mime_type,
          asset.size_bytes,
          asset.sha256,
          NULL,
          asset.id,
          ${identity.userId}
        FROM inserted_document
        INNER JOIN v9.file_assets AS asset
          ON asset.id = ${uploadedAsset?.id ?? null}
          AND asset.organization_id = ${identity.organizationId}
          AND asset.uploaded_by = ${identity.userId}
          AND asset.status = 'active'
        WHERE ${Boolean(uploadedAsset)}
        RETURNING id, document_id, revision_no
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          inserted_document.organization_id,
          ${identity.userId},
          'secretariat_document.registered',
          'secretariat_document',
          inserted_document.id::text,
          jsonb_build_object(
            'reference_no', inserted_document.reference_no,
            'title', inserted_document.title,
            'number', inserted_document.number,
            'status', inserted_document.status,
            'visibility', inserted_document.visibility,
            'file_attached', ${Boolean(uploadedAsset)}
          )
        FROM inserted_document
        LEFT JOIN inserted_file ON true
        RETURNING id
      )
      SELECT inserted_document.id::text AS id
      FROM inserted_document
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-document-register", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique")) redirect("/app/sekretariat/dokumen?result=duplicate");
    redirect("/app/sekretariat/dokumen?result=error");
  }

  if (!created) redirect("/app/sekretariat/dokumen?result=error");
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/dokumen");
  redirect("/app/sekretariat/dokumen?result=created");
}

export async function updateSecretariatDocument(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:documents:write");
  const id = String(formData.get("document_id") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().replace(/\s+/g, " ");
  const category = String(formData.get("category") ?? "").trim();
  const documentDate = String(formData.get("document_date") ?? "").trim();
  const owner = String(formData.get("owner_label") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "internal").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (
    !validUuid(id) || number.length > 100 ||
    title.length < 3 || title.length > 300 ||
    !CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ||
    !validDate(documentDate) ||
    owner.length < 2 || owner.length > 160 ||
    !VISIBILITIES.includes(visibility as (typeof VISIBILITIES)[number]) ||
    description.length > 4000
  ) {
    redirect("/app/sekretariat/dokumen?result=invalid");
  }
  if (visibility === "publik" && !can(identity, "documents:publish")) {
    redirect("/app/sekretariat/dokumen?result=forbidden");
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.secretariat_documents
        SET
          number = NULLIF(${number}, ''),
          title = ${title},
          category = ${category},
          document_date = ${documentDate}::date,
          owner_label = ${owner},
          visibility = ${visibility},
          description = NULLIF(${description}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND status = 'draft'
        RETURNING id, reference_no, organization_id, title, number, category, visibility
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'secretariat_document.metadata_updated',
          'secretariat_document', id::text,
          jsonb_build_object('reference_no', reference_no, 'title', title, 'number', number,
            'category', category, 'visibility', visibility)
        FROM changed
        RETURNING id
      )
      SELECT changed.id FROM changed INNER JOIN audit ON true
    `;
    updated = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-document-update", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique")) redirect("/app/sekretariat/dokumen?result=duplicate");
    redirect("/app/sekretariat/dokumen?result=error");
  }

  if (!updated) redirect("/app/sekretariat/dokumen?result=locked");
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/dokumen");
  redirect("/app/sekretariat/dokumen?result=updated");
}

export async function uploadSecretariatDocumentRevision(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:documents:write");
  const documentId = String(formData.get("document_id") ?? "").trim();
  if (!validUuid(documentId)) redirect("/app/sekretariat/dokumen?result=invalid");

  let uploadedAsset: UploadedFileAsset | null;
  try {
    uploadedAsset = await resolveUploadedFileAsset(formData.get("asset_id"), identity, true);
  } catch (error) {
    redirect(`/app/sekretariat/dokumen?result=file-invalid&message=${encodeURIComponent(error instanceof Error ? error.message : "Berkas tidak valid.")}`);
  }
  if (!uploadedAsset) redirect("/app/sekretariat/dokumen?result=file-invalid");

  let uploaded = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        SELECT id, status
        FROM v9.secretariat_documents
        WHERE id = ${documentId}
          AND organization_id = ${identity.organizationId}
          AND status <> 'arsip'
        FOR UPDATE
      ),
      reset_final AS (
        UPDATE v9.secretariat_documents AS document
        SET
          status = CASE WHEN document.status = 'final' THEN 'draft' ELSE document.status END,
          finalized_by = CASE WHEN document.status = 'final' THEN NULL ELSE document.finalized_by END,
          finalized_at = CASE WHEN document.status = 'final' THEN NULL ELSE document.finalized_at END,
          updated_by = ${identity.userId},
          updated_at = now()
        FROM target
        WHERE document.id = target.id
        RETURNING document.id, document.reference_no, document.status
      ),
      next_revision AS (
        SELECT reset_final.id AS document_id,
          COALESCE((SELECT max(revision_no) FROM v9.secretariat_document_files files
            WHERE files.document_id = reset_final.id), 0) + 1 AS revision_no
        FROM reset_final
      ),
      inserted_file AS (
        INSERT INTO v9.secretariat_document_files (
          document_id, revision_no, file_name, mime_type, size_bytes, sha256,
          file_data, asset_id, uploaded_by
        )
        SELECT
          next_revision.document_id,
          next_revision.revision_no,
          ${uploadedAsset.file_name},
          ${uploadedAsset.mime_type},
          ${uploadedAsset.size_bytes},
          ${uploadedAsset.sha256},
          NULL,
          ${uploadedAsset.id},
          ${identity.userId}
        FROM next_revision
        RETURNING id, document_id, revision_no
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_document.file_revision_uploaded',
          'secretariat_document',
          reset_final.id::text,
          jsonb_build_object('reference_no', reset_final.reference_no,
            'status_after_upload', reset_final.status,
            'revision_no', inserted_file.revision_no,
            'file_name', ${uploadedAsset.file_name},
            'sha256', ${uploadedAsset.sha256})
        FROM reset_final
        INNER JOIN inserted_file ON inserted_file.document_id = reset_final.id
        RETURNING id
      )
      SELECT inserted_file.id FROM inserted_file INNER JOIN audit ON true
    `;
    uploaded = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-document-upload", error);
    redirect("/app/sekretariat/dokumen?result=error");
  }

  if (!uploaded) redirect("/app/sekretariat/dokumen?result=locked");
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/dokumen");
  redirect("/app/sekretariat/dokumen?result=file-uploaded");
}

export async function finalizeSecretariatDocument(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:documents:write");
  const id = String(formData.get("document_id") ?? "").trim();
  if (!validUuid(id)) redirect("/app/sekretariat/dokumen?result=invalid");

  let finalized = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        UPDATE v9.secretariat_documents AS document
        SET
          status = 'final',
          finalized_by = ${identity.userId},
          finalized_at = now(),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE document.id = ${id}
          AND document.organization_id = ${identity.organizationId}
          AND document.status = 'draft'
          AND (
            EXISTS (
              SELECT 1 FROM v9.secretariat_document_files AS file
              WHERE file.document_id = document.id
            )
            OR (
              document.visibility <> 'publik'
              AND EXISTS (
                SELECT 1 FROM v9.secretariat_document_generations AS generation
                WHERE generation.document_id = document.id
              )
            )
          )
          AND (
            document.visibility <> 'publik'
            OR ${can(identity, "documents:publish")}
          )
        RETURNING document.id, document.reference_no, document.title, document.visibility
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_document.finalized',
          'secretariat_document',
          target.id::text,
          jsonb_build_object(
            'reference_no', target.reference_no,
            'title', target.title,
            'visibility', target.visibility,
            'generated_content', EXISTS (
              SELECT 1 FROM v9.secretariat_document_generations AS generation
              WHERE generation.document_id = target.id
            )
          )
        FROM target
        RETURNING id
      )
      SELECT target.id FROM target INNER JOIN audit ON true
    `;
    finalized = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-document-finalize", error);
    redirect("/app/sekretariat/dokumen?result=error");
  }

  if (!finalized) redirect("/app/sekretariat/dokumen?result=not-ready");
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/dokumen");
  redirect("/app/sekretariat/dokumen?result=finalized");
}

export async function archiveSecretariatDocument(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:documents:write");
  const id = String(formData.get("document_id") ?? "").trim();
  if (!validUuid(id)) redirect("/app/sekretariat/dokumen?result=invalid");

  let archived = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.secretariat_documents
        SET
          status = 'arsip',
          archived_by = ${identity.userId},
          archived_at = now(),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND status <> 'arsip'
        RETURNING id, reference_no, title, visibility
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT ${identity.organizationId}, ${identity.userId}, 'secretariat_document.archived',
          'secretariat_document', id::text,
          jsonb_build_object('reference_no', reference_no, 'title', title, 'visibility', visibility)
        FROM changed
        RETURNING id
      )
      SELECT changed.id FROM changed INNER JOIN audit ON true
    `;
    archived = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-document-archive", error);
    redirect("/app/sekretariat/dokumen?result=error");
  }

  if (!archived) redirect("/app/sekretariat/dokumen?result=stale");
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/dokumen");
  redirect("/app/sekretariat/dokumen?result=archived");
}


export async function saveGeneratedSecretariatDocument(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:documents:write");
  const templateCode = String(formData.get("template_code") ?? "").trim();
  const template = getSecretariatTemplate(templateCode);
  const documentId = String(formData.get("document_id") ?? "").trim();
  const submittedMeetingId = String(formData.get("source_meeting_id") ?? "").trim();
  const submittedMinutesId = String(formData.get("source_minutes_id") ?? "").trim();
  const submittedLetterId = String(formData.get("source_letter_id") ?? "").trim();
  const submittedFieldActivityId = String(formData.get("source_field_activity_id") ?? "").trim();
  const submittedFieldProgramId = String(formData.get("source_field_program_id") ?? "").trim();
  const title = String(formData.get("document_title") ?? "").trim().replace(/\s+/g, " ");
  const number = String(formData.get("number") ?? "").trim();
  const documentDate = String(formData.get("document_date") ?? "").trim();
  const owner = String(formData.get("owner_label") ?? "").trim().replace(/\s+/g, " ");
  const visibility = String(formData.get("visibility") ?? "internal").trim();

  if (!template || title.length < 3 || title.length > 300 ||
      number.length > 100 || !validDate(documentDate) ||
      owner.length < 2 || owner.length > 160 ||
      !["internal", "terbatas"].includes(visibility) ||
      (documentId && !validUuid(documentId)) ||
      [submittedMeetingId, submittedMinutesId, submittedLetterId, submittedFieldActivityId, submittedFieldProgramId].some((id) => id && !validUuid(id)) ||
      [submittedMeetingId, submittedMinutesId, submittedLetterId, submittedFieldActivityId, submittedFieldProgramId].filter(Boolean).length > 1) {
    redirect("/app/sekretariat/template?result=invalid");
  }

  const sql = getV9Sql();
  let persistedSource: {
    source_meeting_id: string | null;
    source_minutes_id: string | null;
    source_letter_id: string | null;
    source_field_activity_id: string | null;
    source_field_program_id: string | null;
    source_field_key: string | null;
  } | undefined;
  if (documentId) {
    try {
      const existingSourceResult = await sql`
        SELECT source_meeting_id::text AS source_meeting_id,
          source_minutes_id::text AS source_minutes_id,
          source_letter_id::text AS source_letter_id,
          source_field_activity_id::text AS source_field_activity_id,
          source_field_program_id::text AS source_field_program_id,
          source_field_key
        FROM v9.secretariat_documents
        WHERE id = ${documentId}
          AND organization_id = ${identity.organizationId}
          AND status <> 'arsip'
          AND visibility <> 'publik'
        LIMIT 1
      `;
      persistedSource = rowsFromResult<{
        source_meeting_id: string | null; source_minutes_id: string | null; source_letter_id: string | null;
        source_field_activity_id: string | null; source_field_program_id: string | null; source_field_key: string | null;
      }>(existingSourceResult)[0];
    } catch (error) {
      logFailure("secretariat-document-source-check", error);
      redirect(`/app/sekretariat/template/${template.code}?result=error`);
    }
    if (!persistedSource) redirect(`/app/sekretariat/template/${template.code}?result=unavailable`);
    if ((submittedMeetingId && submittedMeetingId !== persistedSource.source_meeting_id) ||
        (submittedMinutesId && submittedMinutesId !== persistedSource.source_minutes_id) ||
        (submittedLetterId && submittedLetterId !== persistedSource.source_letter_id) ||
        (submittedFieldActivityId && submittedFieldActivityId !== persistedSource.source_field_activity_id) ||
        (submittedFieldProgramId && submittedFieldProgramId !== persistedSource.source_field_program_id)) {
      redirect(`/app/sekretariat/template/${template.code}?result=source-invalid`);
    }
  }

  const sourceMeetingId = persistedSource?.source_meeting_id ?? submittedMeetingId;
  const sourceMinutesId = persistedSource?.source_minutes_id ?? submittedMinutesId;
  const sourceLetterId = persistedSource?.source_letter_id ?? submittedLetterId;
  const sourceFieldActivityId = persistedSource?.source_field_activity_id ?? submittedFieldActivityId;
  const sourceFieldProgramId = persistedSource?.source_field_program_id ?? submittedFieldProgramId;
  const sourceFieldKey = persistedSource?.source_field_key ?? null;
  const sourceCount = [sourceMeetingId, sourceMinutesId, sourceLetterId, sourceFieldActivityId, sourceFieldProgramId].filter(Boolean).length;
  if (sourceCount > 1 ||
      (sourceMeetingId && template.code !== "TPL-UND") ||
      (sourceMinutesId && template.code !== "TPL-NOT") ||
      (sourceLetterId && template.code !== "TPL-KEL") ||
      ((sourceFieldActivityId || sourceFieldProgramId) && template.code !== "TPL-LAP")) {
    redirect(`/app/sekretariat/template/${template.code}?result=source-invalid`);
  }

  let sourceReference: string | null = null;
  let resolvedSourceFieldKey: string | null = sourceFieldKey;
  try {
    if (sourceMeetingId) {
      const result = await sql`
        SELECT reference_no FROM v9.secretariat_meetings
        WHERE id = ${sourceMeetingId}
          AND organization_id = ${identity.organizationId}
          AND status <> 'cancelled'
        LIMIT 1
      `;
      sourceReference = rowsFromResult<{ reference_no: string }>(result)[0]?.reference_no ?? null;
    } else if (sourceMinutesId) {
      const result = await sql`
        SELECT meeting.reference_no || ' · revisi notulen ' || minutes.revision_no::text AS reference_no
        FROM v9.secretariat_minutes AS minutes
        INNER JOIN v9.secretariat_meetings AS meeting ON meeting.id = minutes.meeting_id
        WHERE minutes.id = ${sourceMinutesId}
          AND meeting.organization_id = ${identity.organizationId}
          AND meeting.status <> 'cancelled'
        LIMIT 1
      `;
      sourceReference = rowsFromResult<{ reference_no: string }>(result)[0]?.reference_no ?? null;
    } else if (sourceLetterId) {
      const result = await sql`
        SELECT reference_no FROM v9.secretariat_letters
        WHERE id = ${sourceLetterId}
          AND organization_id = ${identity.organizationId}
          AND direction = 'keluar'
        LIMIT 1
      `;
      sourceReference = rowsFromResult<{ reference_no: string }>(result)[0]?.reference_no ?? null;
    }
    else if (sourceFieldActivityId) {
      const result = await sql`
        SELECT reference_no, field_key
        FROM v9.field_activities
        WHERE id = ${sourceFieldActivityId}
          AND organization_id = ${identity.organizationId}
          AND status IN ('in_progress', 'completed')
        LIMIT 1
      `;
      const source = rowsFromResult<{ reference_no: string; field_key: string }>(result)[0];
      sourceReference = source?.reference_no ?? null;
      if (source) resolvedSourceFieldKey = source.field_key;
    } else if (sourceFieldProgramId) {
      const result = await sql`
        SELECT reference_no, field_key
        FROM v9.field_programs
        WHERE id = ${sourceFieldProgramId}
          AND organization_id = ${identity.organizationId}
          AND status IN ('active', 'completed')
        LIMIT 1
      `;
      const source = rowsFromResult<{ reference_no: string; field_key: string }>(result)[0];
      sourceReference = source?.reference_no ?? null;
      if (source) resolvedSourceFieldKey = source.field_key;
    }
  } catch (error) {
    logFailure("secretariat-document-source-validate", error);
    redirect(`/app/sekretariat/template/${template.code}?result=error`);
  }
  if (sourceCount && (!sourceReference || ((sourceFieldActivityId || sourceFieldProgramId) && !resolvedSourceFieldKey))) {
    redirect(`/app/sekretariat/template/${template.code}?result=source-invalid`);
  }

  const values = new Map<string, string>();
  let totalCharacters = title.length + number.length + owner.length;
  for (const field of template.fields) {
    const raw = String(formData.get(`field_${field.key}`) ?? "");
    const value = field.type === "textarea"
      ? raw.replace(/\r\n?/g, "\n").trim()
      : raw.trim().replace(/\s+/g, " ");

    if ((field.required && !value) || value.length > field.maxLength) {
      redirect(`/app/sekretariat/template/${template.code}?result=invalid`);
    }
    if (field.type === "date" && value && !validDate(value)) {
      redirect(`/app/sekretariat/template/${template.code}?result=invalid`);
    }
    totalCharacters += value.length;
    values.set(field.key, value);
  }

  if (totalCharacters > 30000) {
    redirect(`/app/sekretariat/template/${template.code}?result=too-long`);
  }

  const groups = template.sections.map((section) => ({
    title: section.title,
    fields: section.fields.map((key) => {
      const definition = template.fields.find((field) => field.key === key);
      if (!definition) throw new Error(`Template field definition missing: ${key}`);
      return {
        key: definition.key,
        label: definition.label,
        value: values.get(key) ?? "",
        type: definition.type,
      };
    }).filter((field) => field.value !== ""),
  })).filter((section) => section.fields.length > 0);

  let organization: { legal_name: string; short_name: string; address: string | null } | undefined;
  try {
    const organizationResult = await sql`
      SELECT legal_name, short_name, address
      FROM v9.organizations
      WHERE id = ${identity.organizationId}
        AND status = 'active'
      LIMIT 1
    `;
    organization = rowsFromResult<{ legal_name: string; short_name: string; address: string | null }>(organizationResult)[0];
  } catch (error) {
    logFailure("secretariat-document-generator-organization", error);
    redirect(`/app/sekretariat/template/${template.code}?result=error`);
  }

  if (!organization) redirect(`/app/sekretariat/template/${template.code}?result=unavailable`);

  const content = {
    version: 1 as const,
    templateCode: template.code,
    templateName: template.name,
    documentHeading: template.documentHeading,
    title,
    documentNumber: number || null,
    documentDate,
    ownerLabel: owner,
    organization,
    groups,
    source: sourceCount ? {
      kind: sourceMeetingId ? "meeting" as const :
        sourceMinutesId ? "minutes" as const :
          sourceLetterId ? "letter" as const :
            sourceFieldActivityId ? "field_activity" as const : "field_program" as const,
      id: sourceMeetingId || sourceMinutesId || sourceLetterId || sourceFieldActivityId || sourceFieldProgramId,
      reference: sourceReference,
      fieldKey: resolvedSourceFieldKey,
    } : undefined,
  };
  const contentJson = JSON.stringify(content);
  const contentSha256 = createHash("sha256").update(contentJson).digest("hex");
  if (Buffer.byteLength(contentJson, "utf8") > 100000) {
    redirect(`/app/sekretariat/template/${template.code}?result=too-long`);
  }

  let saved: { id: string; revision_no: number; operation: "created" | "revised" } | undefined;
  try {
    const result = await sql`
      WITH organization AS (
        SELECT id
        FROM v9.organizations
        WHERE id = ${identity.organizationId}
          AND status = 'active'
      ),
      new_document AS (
        INSERT INTO v9.secretariat_documents (
          organization_id, number, title, category, document_date,
          owner_label, visibility, status, description,
          source_meeting_id, source_minutes_id, source_letter_id,
          source_field_activity_id, source_field_program_id, source_field_key,
          created_by, updated_by
        )
        SELECT
          organization.id,
          NULLIF(${number}, ''),
          ${title},
          ${template.category},
          ${documentDate}::date,
          ${owner},
          ${visibility},
          'draft',
          ${"Dibuat melalui Generator " + template.name + ". Periksa isi dan kewenangan sebelum finalisasi."},
          NULLIF(${sourceMeetingId}, '')::uuid,
          NULLIF(${sourceMinutesId}, '')::uuid,
          NULLIF(${sourceLetterId}, '')::uuid,
          NULLIF(${sourceFieldActivityId}, '')::uuid,
          NULLIF(${sourceFieldProgramId}, '')::uuid,
          ${resolvedSourceFieldKey},
          ${identity.userId},
          ${identity.userId}
        FROM organization
        WHERE ${documentId} = ''
        RETURNING id, reference_no, organization_id, title, number, category, visibility, status
      ),
      existing_target AS (
        SELECT document.id, document.reference_no, document.organization_id,
          document.title, document.number, document.category, document.visibility, document.status
        FROM v9.secretariat_documents AS document
        WHERE document.id = NULLIF(${documentId}, '')::uuid
          AND document.organization_id = ${identity.organizationId}
          AND document.status <> 'arsip'
          AND document.visibility <> 'publik'
          AND document.source_meeting_id IS NOT DISTINCT FROM NULLIF(${sourceMeetingId}, '')::uuid
          AND document.source_minutes_id IS NOT DISTINCT FROM NULLIF(${sourceMinutesId}, '')::uuid
          AND document.source_letter_id IS NOT DISTINCT FROM NULLIF(${sourceLetterId}, '')::uuid
          AND document.source_field_activity_id IS NOT DISTINCT FROM NULLIF(${sourceFieldActivityId}, '')::uuid
          AND document.source_field_program_id IS NOT DISTINCT FROM NULLIF(${sourceFieldProgramId}, '')::uuid
          AND document.source_field_key IS NOT DISTINCT FROM ${resolvedSourceFieldKey}
          AND ${documentId} <> ''
          AND EXISTS (
            SELECT 1
            FROM v9.secretariat_document_generations AS generation
            WHERE generation.document_id = document.id
              AND generation.template_code = ${template.code}
          )
        FOR UPDATE
      ),
      updated_document AS (
        UPDATE v9.secretariat_documents AS document
        SET number = NULLIF(${number}, ''),
            title = ${title},
            category = ${template.category},
            document_date = ${documentDate}::date,
            owner_label = ${owner},
            visibility = ${visibility},
            description = ${"Dibuat melalui Generator " + template.name + ". Periksa isi dan kewenangan sebelum finalisasi."},
            status = CASE WHEN document.status = 'final' THEN 'draft' ELSE document.status END,
            finalized_by = CASE WHEN document.status = 'final' THEN NULL ELSE document.finalized_by END,
            finalized_at = CASE WHEN document.status = 'final' THEN NULL ELSE document.finalized_at END,
            updated_by = ${identity.userId},
            updated_at = now()
        FROM existing_target
        WHERE document.id = existing_target.id
        RETURNING document.id, document.reference_no, document.organization_id,
          document.title, document.number, document.category, document.visibility, document.status
      ),
      target_document AS (
        SELECT id, reference_no, organization_id, title, number, category, visibility, status,
          'created'::text AS operation
        FROM new_document
        UNION ALL
        SELECT id, reference_no, organization_id, title, number, category, visibility, status,
          'revised'::text AS operation
        FROM updated_document
      ),
      next_revision AS (
        SELECT target_document.*,
          COALESCE(MAX(previous.revision_no), 0) + 1 AS revision_no
        FROM target_document
        LEFT JOIN v9.secretariat_document_generations AS previous
          ON previous.document_id = target_document.id
        GROUP BY target_document.id, target_document.reference_no, target_document.organization_id,
          target_document.title, target_document.number, target_document.category,
          target_document.visibility, target_document.status, target_document.operation
      ),
      generation AS (
        INSERT INTO v9.secretariat_document_generations (
          document_id, revision_no, template_code, content_json, content_sha256, created_by
        )
        SELECT id, revision_no, ${template.code}, ${contentJson}::jsonb, ${contentSha256}, ${identity.userId}
        FROM next_revision
        RETURNING id, document_id, revision_no
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT next_revision.organization_id, ${identity.userId},
          CASE WHEN next_revision.operation = 'created'
            THEN 'secretariat_document.generated'
            ELSE 'secretariat_document.content_revision_created' END,
          'secretariat_document', next_revision.id::text,
          CASE WHEN next_revision.operation = 'created' THEN NULL
            ELSE (
              SELECT jsonb_build_object(
                'previous_status', existing_target.status,
                'previous_title', existing_target.title,
                'previous_number', existing_target.number
              )
              FROM existing_target
              WHERE existing_target.id = next_revision.id
            ) END,
          jsonb_build_object(
            'reference_no', next_revision.reference_no,
            'template_code', ${template.code}::text,
            'template_name', ${template.name}::text,
            'title', next_revision.title,
            'revision_no', generation.revision_no,
            'content_sha256', ${contentSha256}::text,
            'status', next_revision.status,
            'source_reference', ${sourceReference}::text,
            'source_field_key', ${resolvedSourceFieldKey}::text
          )
        FROM next_revision
        INNER JOIN generation ON generation.document_id = next_revision.id
        RETURNING id
      )
      SELECT next_revision.id::text AS id,
        next_revision.revision_no,
        next_revision.operation
      FROM next_revision
      INNER JOIN generation ON generation.document_id = next_revision.id
      INNER JOIN audit ON true
    `;
    saved = rowsFromResult<{ id: string; revision_no: number; operation: "created" | "revised" }>(result)[0];
  } catch (error) {
    logFailure("secretariat-document-generator-save", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(`/app/sekretariat/template/${template.code}?result=duplicate`);
    if (message.includes("foreign key") || message.includes("source")) {
      redirect(`/app/sekretariat/template/${template.code}?result=source-invalid`);
    }
    redirect(`/app/sekretariat/template/${template.code}?result=error`);
  }

  if (!saved) redirect(`/app/sekretariat/template/${template.code}?result=unavailable`);
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/app/sekretariat/template");
  revalidatePath("/app/sekretariat/program");
  revalidatePath("/app/sekretariat/rapat");
  revalidatePath("/app/sekretariat/notulen");
  revalidatePath("/app/sekretariat/presensi");
  revalidatePath("/app/sekretariat/surat");
  revalidatePath("/app/pengurus/program");
  if (resolvedSourceFieldKey) {
    revalidatePath(`/app/bidang/${resolvedSourceFieldKey}/rencana`);
    revalidatePath(`/app/bidang/${resolvedSourceFieldKey}/kegiatan`);
  }
  redirect(`/app/sekretariat/dokumen/${saved.id}/cetak?result=${saved.operation}`);
}
