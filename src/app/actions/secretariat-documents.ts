"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { getSecretariatTemplate } from "@/lib/secretariat-templates";

const CATEGORIES = ["SK", "Laporan", "SOP", "Surat", "Notulen", "Publikasi"] as const;
const VISIBILITIES = ["publik", "internal", "terbatas"] as const;
const MAX_FILE_BYTES = 3 * 1024 * 1024;

const EXTENSION_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

interface PreparedFile {
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  base64: string;
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function sanitizeFileName(value: string): string {
  const leaf = value.replace(/\\/g, "/").split("/").pop() ?? "";
  return leaf
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N} ._()\-]/gu, "_")
    .trim()
    .slice(0, 180);
}

function hasExpectedSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimeType.startsWith("application/vnd.openxmlformats-officedocument.")) {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  return false;
}

async function prepareFile(value: FormDataEntryValue | null, required: boolean): Promise<PreparedFile | null> {
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new Error("Berkas wajib dipilih.");
    return null;
  }

  if (value.size > MAX_FILE_BYTES) throw new Error("Ukuran berkas maksimal 3 MiB.");
  const fileName = sanitizeFileName(value.name);
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const expectedMime = EXTENSION_MIME[extension];

  if (!fileName || !expectedMime) {
    throw new Error("Format berkas tidak didukung. Gunakan PDF, JPG, PNG, DOCX, XLSX, atau PPTX.");
  }
  if (value.type && value.type !== expectedMime) {
    throw new Error("Tipe berkas tidak sesuai dengan ekstensi nama berkas.");
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  if (!hasExpectedSignature(bytes, expectedMime)) {
    throw new Error("Isi berkas tidak cocok dengan format yang dinyatakan.");
  }

  return {
    name: fileName,
    mimeType: expectedMime,
    size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    base64: bytes.toString("base64"),
  };
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

  let prepared: PreparedFile | null;
  try {
    prepared = await prepareFile(formData.get("document_file"), false);
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
          document_id, revision_no, file_name, mime_type, size_bytes, sha256, file_data, uploaded_by
        )
        SELECT
          inserted_document.id,
          1,
          ${prepared?.name ?? null},
          ${prepared?.mimeType ?? null},
          ${prepared?.size ?? null},
          ${prepared?.sha256 ?? null},
          decode(${prepared?.base64 ?? ""}, 'base64'),
          ${identity.userId}
        FROM inserted_document
        WHERE ${Boolean(prepared)}
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
            'file_attached', ${Boolean(prepared)}
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

  let prepared: PreparedFile;
  try {
    const file = await prepareFile(formData.get("document_file"), true);
    if (!file) throw new Error("Berkas wajib dipilih.");
    prepared = file;
  } catch (error) {
    redirect(`/app/sekretariat/dokumen?result=file-invalid&message=${encodeURIComponent(error instanceof Error ? error.message : "Berkas tidak valid.")}`);
  }

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
          document_id, revision_no, file_name, mime_type, size_bytes, sha256, file_data, uploaded_by
        )
        SELECT
          next_revision.document_id,
          next_revision.revision_no,
          ${prepared.name},
          ${prepared.mimeType},
          ${prepared.size},
          ${prepared.sha256},
          decode(${prepared.base64}, 'base64'),
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
            'file_name', ${prepared.name},
            'sha256', ${prepared.sha256})
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
          AND EXISTS (
            SELECT 1 FROM v9.secretariat_document_files AS file
            WHERE file.document_id = document.id
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
          jsonb_build_object('reference_no', target.reference_no, 'title', target.title, 'visibility', target.visibility)
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
  const title = String(formData.get("document_title") ?? "").trim().replace(/\s+/g, " ");
  const number = String(formData.get("number") ?? "").trim();
  const documentDate = String(formData.get("document_date") ?? "").trim();
  const owner = String(formData.get("owner_label") ?? "").trim().replace(/\s+/g, " ");
  const visibility = String(formData.get("visibility") ?? "internal").trim();

  if (!template || title.length < 3 || title.length > 300 ||
      number.length > 100 || !validDate(documentDate) ||
      owner.length < 2 || owner.length > 160 ||
      !["internal", "terbatas"].includes(visibility) ||
      (documentId && !validUuid(documentId))) {
    redirect("/app/sekretariat/template?result=invalid");
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

  const sql = getV9Sql();
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
          owner_label, visibility, status, description, created_by, updated_by
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
            ELSE jsonb_build_object('previous_status', 'draft') END,
          jsonb_build_object(
            'reference_no', next_revision.reference_no,
            'template_code', ${template.code},
            'template_name', ${template.name},
            'title', next_revision.title,
            'revision_no', generation.revision_no,
            'content_sha256', ${contentSha256},
            'status', next_revision.status
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
    redirect(`/app/sekretariat/template/${template.code}?result=error`);
  }

  if (!saved) redirect(`/app/sekretariat/template/${template.code}?result=unavailable`);
  revalidatePath("/app/sekretariat/dokumen");
  revalidatePath("/app/sekretariat/template");
  revalidatePath("/app/sekretariat/program");
  redirect(`/app/sekretariat/dokumen/${saved.id}/cetak?result=${saved.operation}`);
}
