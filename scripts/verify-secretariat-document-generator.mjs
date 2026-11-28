import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const templates = read("src/lib/secretariat-templates.ts");
const builder = read("src/app/app/(area)/sekretariat/template/[code]/page.tsx");
const templateIndex = read("src/app/app/(area)/sekretariat/template/page.tsx");
const actions = read("src/app/actions/secretariat-documents.ts");
const migration = read("db/migrations/0040_secretariat_document_generator.sql");
const registerPage = read("src/app/app/(area)/sekretariat/dokumen/page.tsx");
const printPage = read("src/app/app/(area)/sekretariat/dokumen/[id]/cetak/page.tsx");
const printActions = read("src/components/secretariat-document-print-actions.tsx");
const globalStyles = read("src/app/globals.css");

const templateCodes = ["TPL-SK", "TPL-UND", "TPL-KEL", "TPL-NOT", "TPL-LAP", "TPL-SPR"];
for (const code of templateCodes) {
  assert.ok(templates.includes(`code: "${code}"`), `Missing Secretariat template ${code}.`);
  assert.ok(templateIndex.includes("/app/sekretariat/template/"), "Template catalog must link to working generator routes.");
}

assert.ok(
  templates.includes("Menimbang") &&
  templates.includes("Mengingat") &&
  templates.includes("Keputusan rapat") &&
  templates.includes("Ringkasan pembahasan") &&
  templates.includes("Hasil / capaian") &&
  templates.includes("Narasumber yang dimohon"),
  "Templates must provide real field structures for decisions, minutes, reports, and speaker requests.",
);

assert.ok(
  builder.includes('requireIdentity("secretariat:documents:write")') &&
  builder.includes("saveGeneratedSecretariatDocument") &&
  builder.includes('name="document_title"') &&
  builder.includes('name="document_date"') &&
  builder.includes('name={`field_${field.key}`}') &&
  builder.includes("defaultValue={defaultValue}") &&
  builder.includes("Nomor resmi tidak dibuat otomatis"),
  "The builder must be permission-gated, prefillable for revisions, and avoid inventing official numbering.",
);

assert.ok(
  actions.includes("export async function saveGeneratedSecretariatDocument") &&
  actions.includes('requireIdentity("secretariat:documents:write")') &&
  actions.includes("getSecretariatTemplate(templateCode)") &&
  actions.includes("identity.organizationId") &&
  actions.includes("contentSha256") &&
  actions.includes("'secretariat_document.generated'") &&
  actions.includes("'secretariat_document.content_revision_created'") &&
  actions.includes("'template_code', ${template.code}::text") &&
  actions.includes("'template_name', ${template.name}::text") &&
  actions.includes("'content_sha256', ${contentSha256}::text") &&
  actions.includes("'source_reference', ${sourceReference}::text") &&
  actions.includes("'source_field_key', ${resolvedSourceFieldKey}::text") &&
  actions.includes("AND document.visibility <> 'publik'"),
  "Generated content must be validated, organization-scoped, checksum-protected, and audited; public documents follow the attachment review path.",
);

assert.ok(
  migration.includes("CREATE TABLE IF NOT EXISTS v9.secretariat_document_generations") &&
  migration.includes("UNIQUE (document_id, revision_no)") &&
  migration.includes("content_sha256") &&
  migration.includes("Generated document revisions are immutable") &&
  migration.includes("An archived document cannot receive a generated revision.") &&
  migration.includes("SET status = 'draft'") &&
  migration.includes("BEFORE INSERT OR UPDATE OR DELETE"),
  "Generated content must be append-only, versioned, and reopen final records as drafts when revised.",
);

assert.ok(
  actions.includes("FROM v9.secretariat_document_generations AS generation") &&
  actions.includes("document.visibility <> 'publik'") &&
  registerPage.includes("latest_generation.template_code") &&
  registerPage.includes("latest_generation.revision_no AS generated_revision") &&
  registerPage.includes("/cetak") &&
  registerPage.includes("document.has_generated_content") &&
  registerPage.includes('document.visibility === "publik" && (!document.file_name || !canPublish)'),
  "The existing Register Dokumen must recognize generated revisions and retain the public-file finalization rule.",
);

assert.ok(
  builder.includes("Setelah disimpan, aplikasi membuka naskah untuk pemeriksaan") &&
  builder.includes('existing ? "Simpan revisi & lanjutkan" : "Simpan draf & lanjutkan"') &&
  actions.includes("redirect(`/app/sekretariat/dokumen/${saved.id}/cetak?result=${saved.operation}`)") &&
  printPage.includes("Langkah berikutnya") &&
  printPage.includes("Periksa, cetak, lalu finalkan naskah") &&
  printPage.includes("Finalkan setelah diperiksa"),
  "Saving a generated draft must take the user to its review page and expose the next review, print, and finalization steps."
);

assert.ok(
  printPage.includes('requireIdentity("secretariat:read")') &&
  printPage.includes("identity.organizationId") &&
  printPage.includes('document.status <> \'arsip\'') &&
  printPage.includes("generated.groups.map") &&
  printPage.includes("document.status === \"draft\"") &&
  printPage.includes("DRAF — BELUM DISAHKAN") &&
  printPage.includes("finalizeSecretariatDocument") &&
  printPage.includes("document.visibility !== \"publik\""),
  "The print view must enforce organization access, show generated content, and only provide revision controls for supported visibility.",
);

assert.ok(
  printPage.includes("Perbaiki / buat revisi") &&
  printPage.includes("Koreksi disimpan sebagai versi baru; versi sebelumnya tetap tercatat.") &&
  printPage.includes("archiveSecretariatDocument") &&
  printPage.includes("Pindahkan draf ke arsip"),
  "The generated document review page must clearly expose safe correction and draft-archiving actions.",
);

assert.ok(
  printActions.includes('"use client"') &&
  printActions.includes("window.print()"),
  "The print control must open the browser print dialog for paper or PDF output.",
);

assert.ok(
  printPage.includes('id="sb-generated-document-print"') &&
  globalStyles.includes("@page {") &&
  globalStyles.includes("size: A4;") &&
  globalStyles.includes("body * {") &&
  globalStyles.includes("#sb-generated-document-print,") &&
  globalStyles.includes("#sb-generated-document-print * {") &&
  globalStyles.includes("visibility: hidden !important;") &&
  globalStyles.includes("visibility: visible !important;"),
  "Browser printing must isolate the generated A4 sheet and hide the application workspace.",
);

process.stdout.write("Secretariat document generator contract: PASS\\n");
