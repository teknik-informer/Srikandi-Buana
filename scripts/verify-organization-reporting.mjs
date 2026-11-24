import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

const members = await source("src/app/app/(area)/pengurus/anggota/page.tsx");
const structure = await source("src/app/app/(area)/pengurus/struktur/page.tsx");
const secretariatReport = await source("src/app/app/(area)/sekretariat/laporan/page.tsx");
const managementDocuments = await source("src/app/app/(area)/pengurus/dokumen/page.tsx");
const managementMeetings = await source("src/app/app/(area)/pengurus/rapat/page.tsx");
const documentMigration = await source("db/migrations/0008_secretariat_document_register_and_files.sql");
const meetingMigration = await source("db/migrations/0006_secretariat_meetings_minutes_attendance.sql");

const currentValidity = [
  "membership.status = 'active'",
  "person.status = 'active'",
  "membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date",
  "membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date",
];

for (const condition of currentValidity) {
  assert.ok(members.includes(condition), `Pengurus member page is missing current-membership condition: ${condition}`);
}
assert.ok(
  members.includes("INNER JOIN v9.people AS person") && members.includes("AND person.status = 'active'"),
  "The member list must exclude inactive person records.",
);
assert.ok(
  secretariatReport.includes("person.status = 'active'") &&
    secretariatReport.includes("membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date") &&
    secretariatReport.includes("membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date"),
  "Secretariat current-active membership count must use the same person-status and validity-window rules.",
);

const exactCoreTitles = [
  '"ketua"', '"wakil ketua"', '"sekretaris"', '"wakil sekretaris"', '"bendahara"', '"wakil bendahara"',
];
for (const title of exactCoreTitles) {
  assert.ok(structure.includes(title), `Exact executive position is missing: ${title}`);
}
assert.ok(structure.includes("const [organizationResult, unitResult, rosterSummaryResult, peopleResult] = await Promise.all(["), "Structure aggregate result must map to the roster summary, not the member rows.");
assert.ok(structure.includes("people = rowsFromResult<PersonRow>(peopleResult)") && structure.includes("rowsFromResult<RosterSummaryRow>(rosterSummaryResult)"), "Structure list and summary results must be mapped to their matching query outputs.");
assert.ok(
  structure.includes("person.status = 'active'") &&
    structure.includes("membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date") &&
    structure.includes("membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date"),
  "Structure roster and its aggregate must exclude inactive people and expired/future memberships.",
);
assert.ok(structure.includes("CORE_POSITION_TITLES.has(normalized)"), "Core positions must use exact title matching.");
assert.ok(!structure.includes("return /^(ketua|wakil ketua|sekretaris"), "Prefix-based title matching must not classify Ketua Bidang as Ketua.");

assert.ok(
  managementDocuments.includes("document.status = 'final'") && managementDocuments.includes("document.visibility = 'publik'"),
  "Management document view must limit non-secretariat readers to final public documents.",
);
assert.ok(
  managementMeetings.includes("attendee.attendance_status = 'hadir'") && managementMeetings.includes("meeting.status <> 'cancelled'"),
  "Management meeting summaries must use saved attendance and exclude cancelled meetings.",
);

assert.ok(documentMigration.includes("secretariat_documents_org_visibility_status_idx"), "Secretariat document visibility index is required.");
assert.ok(documentMigration.includes("secretariat_document_files"), "Secretariat document file revisions must be persisted.");
assert.ok(meetingMigration.includes("secretariat_meeting_attendance"), "Secretariat meeting attendance must be persisted.");
assert.ok(meetingMigration.includes("secretariat_minutes_one_draft_per_meeting_uq"), "Only one editable minutes draft may exist per meeting.");

console.log("Organization reporting regression checks passed.");
