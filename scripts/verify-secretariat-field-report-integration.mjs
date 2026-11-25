import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const migration = read("db/migrations/0042_secretariat_field_report_sources.sql");
const actions = read("src/app/actions/secretariat-documents.ts");
const builder = read("src/app/app/(area)/sekretariat/template/[code]/page.tsx");
const templates = read("src/lib/secretariat-templates.ts");
const fieldOperations = read("src/components/field-operations-section.tsx");
const register = read("src/app/app/(area)/sekretariat/dokumen/page.tsx");
const printPage = read("src/app/app/(area)/sekretariat/dokumen/[id]/cetak/page.tsx");

assert.ok(
  migration.includes("source_field_activity_id") &&
  migration.includes("source_field_program_id") &&
  migration.includes("source_field_key") &&
  migration.includes("REFERENCES v9.field_activities(id, organization_id, field_key)") &&
  migration.includes("REFERENCES v9.field_programs(id, organization_id, field_key)") &&
  migration.includes("secretariat_documents_active_source_field_activity_uq") &&
  migration.includes("secretariat_documents_active_source_field_program_uq") &&
  migration.includes("num_nonnulls("),
  "Activity and program sources must be organization- and field-scoped, singular, and unique while active.",
);

assert.ok(
  templates.includes('kind: "meeting" | "minutes" | "letter" | "field_activity" | "field_program"') &&
  templates.includes('key: "periode_kegiatan", label: "Tanggal / periode kegiatan", type: "text"') &&
  templates.includes('key: "kegiatan_tercatat", label: "Daftar kegiatan yang tercatat"') &&
  templates.includes('key: "catatan_agenda", label: "Catatan awal pada agenda"') &&
  templates.includes('key: "pelaksanaan", label: "Uraian pelaksanaan aktual"') &&
  templates.includes('key: "tempat_kegiatan", label: "Tempat", type: "text", required: false'),
  "The activity report template must support both a date and a period without inventing a single event date for a program summary.",
);

assert.ok(
  builder.includes("sourceFieldActivityId") &&
  builder.includes("sourceFieldProgramId") &&
  builder.includes("activity.status IN ('in_progress', 'completed')") &&
  builder.includes("program.status IN ('active', 'completed')") &&
  builder.includes("sourceValues.set(\"kegiatan_tercatat\", activitySummary)") &&
  builder.includes("sourceValues.set(\"catatan_agenda\", source.description ?? \"\")") &&
  !builder.includes("sourceValues.set(\"pelaksanaan\", source.description") &&
  builder.includes("sourceValues.set(\"hasil\", indicatorSummary)") &&
  builder.includes("indicator.actual_value === null ? \"realisasi belum dicatat\"") &&
  builder.includes("sourceValues.set(\"tindak_lanjut\", taskSummary)") &&
  builder.includes("sourceFieldKey = source.field_key") &&
  builder.includes("task.activity_id = ${source.id}") &&
  builder.includes("source_field_activity_id") &&
  builder.includes("source_field_program_id"),
  "The report builder must load current, organization-scoped operational records and distinguish scheduled activities, recorded indicator actuals, and task status.",
);

assert.ok(
  actions.includes("submittedFieldActivityId") &&
  actions.includes("submittedFieldProgramId") &&
  actions.includes('template.code !== "TPL-LAP"') &&
  actions.includes("status IN ('in_progress', 'completed')") &&
  actions.includes("status IN ('active', 'completed')") &&
  actions.includes("source_field_activity_id, source_field_program_id, source_field_key") &&
  actions.includes("document.source_field_activity_id IS NOT DISTINCT FROM") &&
  actions.includes("document.source_field_program_id IS NOT DISTINCT FROM") &&
  actions.includes("document.source_field_key IS NOT DISTINCT FROM") &&
  actions.includes("'source_field_key', ${resolvedSourceFieldKey}"),
  "The server action must validate source status, template pairing, field scope, immutable revisions, and audit provenance.",
);

assert.ok(
  fieldOperations.includes("canGenerateActivityReports") &&
  fieldOperations.includes("TPL-LAP?source_field_activity_id=") &&
  fieldOperations.includes("TPL-LAP?source_field_program_id=") &&
  fieldOperations.includes('activity.status === "completed"') &&
  fieldOperations.includes('program.status === "completed"'),
  "Operational activity and program cards must expose report links only when their state and permissions allow it.",
);

assert.ok(
  register.includes("source_field_activity.reference_no") &&
  register.includes("source_field_program.reference_no") &&
  register.includes("source_field_activity_id") &&
  register.includes("source_field_program_id") &&
  printPage.includes('generated.source.kind === "field_activity"') &&
  printPage.includes('"Program bidang"'),
  "The register and printed report must retain the originating activity or program reference.",
);

process.stdout.write("Secretariat field report integration contract: PASS\n");
