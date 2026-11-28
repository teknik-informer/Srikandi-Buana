import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const migration = read("db/migrations/0041_secretariat_document_source_links.sql");
const actions = read("src/app/actions/secretariat-documents.ts");
const builder = read("src/app/app/(area)/sekretariat/template/[code]/page.tsx");
const meetings = read("src/app/app/(area)/sekretariat/rapat/page.tsx");
const minutes = read("src/app/app/(area)/sekretariat/notulen/page.tsx");
const attendance = read("src/app/app/(area)/sekretariat/presensi/page.tsx");
const letters = read("src/app/app/(area)/sekretariat/surat/page.tsx");
const lettersClient = read("src/app/app/(area)/sekretariat/surat/surat-client.tsx");
const documentRegister = read("src/app/app/(area)/sekretariat/dokumen/page.tsx");
const printPage = read("src/app/app/(area)/sekretariat/dokumen/[id]/cetak/page.tsx");
const templateTypes = read("src/lib/secretariat-templates.ts");

assert.ok(
  migration.includes("source_meeting_id") &&
  migration.includes("source_minutes_id") &&
  migration.includes("source_letter_id") &&
  migration.includes("num_nonnulls(source_meeting_id, source_minutes_id, source_letter_id) <= 1") &&
  migration.includes("secretariat_documents_active_source_meeting_uq") &&
  migration.includes("secretariat_documents_active_source_minutes_uq") &&
  migration.includes("secretariat_documents_active_source_letter_uq") &&
  migration.includes("status <> 'arsip'"),
  "The register must hold at most one active generated document per canonical operational source.",
);

assert.ok(
  builder.includes("source_meeting_id") &&
  builder.includes("source_minutes_id") &&
  builder.includes("source_letter_id") &&
  builder.includes("attendance.attendance_status") &&
  builder.includes("signature_recorded") &&
  builder.includes("secretariat_meeting_decisions") &&
  builder.includes("sourceValues.set(\"keputusan\", decisionText)") &&
  builder.includes("sourceValues.set(\"peserta\", attendanceText)") &&
  builder.includes("if (!initialValues.has(key)) initialValues.set(key, value)") &&
  builder.includes('name="source_meeting_id"') &&
  builder.includes('name="source_minutes_id"') &&
  builder.includes('name="source_letter_id"') &&
  builder.includes("meeting.organization_id = ${identity.organizationId}") &&
  builder.includes("letter.direction = 'keluar'"),
  "The builder must prefill only verified organization-scoped meeting, minutes, attendance, decisions, and outgoing-letter data while preserving edited values on revision.",
);

assert.ok(
  actions.includes("submittedMeetingId") &&
  actions.includes("submittedMinutesId") &&
  actions.includes("submittedLetterId") &&
  actions.includes("sourceCount > 1") &&
  actions.includes('template.code !== "TPL-UND"') &&
  actions.includes('template.code !== "TPL-NOT"') &&
  actions.includes('template.code !== "TPL-KEL"') &&
  actions.includes("AND organization_id = ${identity.organizationId}") &&
  actions.includes("source_meeting_id, source_minutes_id, source_letter_id") &&
  actions.includes("document.source_minutes_id IS NOT DISTINCT FROM") &&
  actions.includes("'source_reference', ${sourceReference}") &&
  actions.includes("result=source-invalid"),
  "The server action must validate source ownership/template pairing, keep a source immutable across revisions, and audit the source reference.",
);

assert.ok(
  letters.includes("direction?: string") &&
  letters.includes('requestedDirection === "keluar"') &&
  letters.includes("initialDirection={initialDirection}") &&
  lettersClient.includes('href="/app/sekretariat/surat?direction=masuk"') &&
  lettersClient.includes('href="/app/sekretariat/surat?direction=keluar"') &&
  lettersClient.includes("initialDirection: Direction") &&
  !lettersClient.includes("<Segmented<Direction>"),
  "Incoming and outgoing letters must switch through explicit URL navigation and receive the selected direction from the server."
);

assert.ok(
  meetings.includes("source_meeting_id = meeting.id") &&
  meetings.includes("TPL-UND?source_meeting_id=") &&
  minutes.includes("source_minutes_id = latest_minutes.id") &&
  minutes.includes("TPL-NOT?source_minutes_id=") &&
  attendance.includes("source_minutes_id = latest_minutes.id") &&
  attendance.includes("TPL-NOT?source_minutes_id=") &&
  letters.includes("source_letter_id = letter.id") &&
  lettersClient.includes("letter.direction === \"keluar\"") &&
  lettersClient.includes("canGenerateDocuments && letter.direction") &&
  documentRegister.includes("source_reference") &&
  printPage.includes("generated.source.reference"),
  "Operational pages must link invitations, minutes, and outgoing letters, and preserve source references in the register and print view."
);

assert.ok(
  templateTypes.includes('kind: "meeting" | "minutes" | "letter"') &&
  templateTypes.includes("reference: string | null"),
  "Generated content must retain source provenance for review and audit.",
);

process.stdout.write("Secretariat source integration contract: PASS\\n");
