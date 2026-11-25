import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const lifecycleMigration = read("db/migrations/0035_field_program_lifecycle_guard.sql");
const childGuardMigration = read("db/migrations/0036_field_program_child_link_guard.sql");
const closedChildGuardMigration = read("db/migrations/0037_field_program_closed_child_guard.sql");
const actions = read("src/app/actions/field-operations.ts");
const workspace = read("src/components/field-operations-section.tsx");
const managerPage = read("src/app/app/(area)/pengurus/program/page.tsx");

assert.ok(
  lifecycleMigration.includes("CREATE OR REPLACE FUNCTION v9.protect_field_program()") &&
  lifecycleMigration.includes("BEFORE UPDATE OR DELETE ON v9.field_programs") &&
  lifecycleMigration.includes("Field programs cannot be deleted") &&
  lifecycleMigration.includes("OLD.status = 'draft' AND NEW.status IN ('planned','cancelled')") &&
  lifecycleMigration.includes("OLD.status = 'planned' AND NEW.status IN ('active','paused','cancelled')") &&
  lifecycleMigration.includes("OLD.status = 'active' AND NEW.status IN ('paused','completed','cancelled')") &&
  lifecycleMigration.includes("OLD.status = 'paused' AND NEW.status IN ('active','cancelled')"),
  "Program lifecycle must retain records and enforce only valid, forward status transitions at database level.",
);

assert.ok(
  lifecycleMigration.includes("OLD.status NOT IN ('draft','planned')") &&
  lifecycleMigration.includes("NEW.status NOT IN ('draft','planned')") &&
  lifecycleMigration.includes("Program details can only be edited while the program is draft or planned.") &&
  lifecycleMigration.includes("task.status IN ('belum','proses')") &&
  lifecycleMigration.includes("activity.status IN ('scheduled','in_progress')"),
  "Program details must become immutable after planning, and completion must be blocked while work remains open.",
);

assert.ok(
  childGuardMigration.includes("CREATE OR REPLACE FUNCTION v9.protect_field_program_child_link()") &&
  childGuardMigration.includes("FOR UPDATE") &&
  childGuardMigration.includes("parent_status IN ('completed','cancelled')") &&
  childGuardMigration.includes("ON v9.field_activities") &&
  childGuardMigration.includes("ON v9.field_tasks"),
  "Task and activity creation must serialize against program completion and reject closed parent programs.",
);

assert.ok(
  closedChildGuardMigration.includes("UPDATE OF program_id, organization_id, field_key, status") &&
  closedChildGuardMigration.includes("TG_TABLE_NAME = 'field_tasks' AND NEW.status IN ('belum','proses')") &&
  closedChildGuardMigration.includes("TG_TABLE_NAME = 'field_activities' AND NEW.status IN ('scheduled','in_progress')") &&
  closedChildGuardMigration.includes("A closed program cannot receive new links or reopen tasks and activities."),
  "Closed programs must also prevent their linked tasks and activities from being reopened.",
);

assert.ok(
  actions.includes("export async function updateFieldProgram") &&
  actions.includes("export async function changeFieldProgramStatus") &&
  actions.includes("ensurePermission(identity, fieldKey, `field:${fieldKey}:program:write`)") &&
  actions.includes("identity.organizationId") &&
  actions.includes("'field_program.updated'") &&
  actions.includes("'field_program.status.' || updated.status") &&
  actions.includes("before_state, after_state"),
  "Program update and status actions must be permission-gated, organization-scoped, and audited with before/after state.",
);

assert.ok(
  workspace.includes("action={updateFieldProgram}") &&
  workspace.includes("action={changeFieldProgramStatus}") &&
  workspace.includes('name="budget_request"') &&
  workspace.includes('name="next_status"') &&
  workspace.includes("program.status === \"draft\" || program.status === \"planned\"") &&
  workspace.includes("program.status !== \"completed\" && program.status !== \"cancelled\""),
  "The field workspace must expose draft/planned editing and only the status transitions available for each program state.",
);

assert.ok(
  managerPage.includes("program.budget_request::text AS budget_request") &&
  managerPage.includes("Data organisasi") &&
  managerPage.includes("Usulan anggaran bukan persetujuan atau realisasi"),
  "The manager overview must show live program budget requests without misrepresenting them as approved or realized funds.",
);

const workplanMigration = read("db/migrations/0038_field_workplan_lifecycle_approval.sql");

assert.ok(
  workplanMigration.includes("CREATE OR REPLACE FUNCTION v9.protect_field_workplan()") &&
  workplanMigration.includes("OLD.status = 'draft' AND NEW.status IN ('submitted','cancelled')") &&
  workplanMigration.includes("OLD.status = 'submitted' AND NEW.status IN ('approved','cancelled')") &&
  workplanMigration.includes("NEW.approved_by IS NOT DISTINCT FROM NEW.created_by") &&
  workplanMigration.includes("A workplan cannot be closed while linked programs remain open.") &&
  workplanMigration.includes("CREATE TRIGGER field_workplans_guard"),
  "Workplans must preserve their lifecycle, require independent approval, and close only after linked programs are closed.",
);

assert.ok(
  workplanMigration.includes("CREATE OR REPLACE FUNCTION v9.protect_field_program_workplan_link()") &&
  workplanMigration.includes("FOR UPDATE") &&
  workplanMigration.includes("parent_status IN ('completed','cancelled')") &&
  workplanMigration.includes("CREATE TRIGGER field_programs_workplan_status_guard"),
  "Programs must not be newly linked to a closed workplan, with row locking to serialize parent/child writes.",
);

assert.ok(
  actions.includes("export async function updateFieldWorkplan") &&
  actions.includes("export async function approveFieldWorkplan") &&
  actions.includes("export async function changeFieldWorkplanStatus") &&
  actions.includes("requireRoles(['platform_admin', 'organization_admin', 'chair'])") &&
  actions.includes("'field_workplan.approved'") &&
  actions.includes("current_workplan.created_by IS DISTINCT FROM") &&
  actions.includes("'field_workplan.status.' || updated.status"),
  "Workplan edit, approval and execution actions must be role-gated and audited; approval is separate from the submitter.",
);

assert.ok(
  workspace.includes("action={updateFieldWorkplan}") &&
  workspace.includes("action={changeFieldWorkplanStatus}") &&
  workspace.includes("Ajukan untuk persetujuan") &&
  workspace.includes("Mulai pelaksanaan") &&
  workspace.includes("Tandai rencana selesai"),
  "The field workspace must expose draft correction, submission, execution start and completion actions.",
);

assert.ok(
  managerPage.includes("pendingWorkplans") &&
  managerPage.includes("action={approveFieldWorkplan}") &&
  managerPage.includes("canApproveWorkplans") &&
  managerPage.includes("Antrean persetujuan rencana kerja"),
  "The Pengurus dashboard must present submitted workplans and expose approval only to authorized leadership roles.",
);

const workplanRevisionMigration = read("db/migrations/0039_field_workplan_revision_cycle.sql");

assert.ok(
  workplanRevisionMigration.includes("status IN ('draft','submitted','rejected','approved','active','completed','cancelled')") &&
  workplanRevisionMigration.includes("OLD.status = 'submitted' AND NEW.status IN ('approved','rejected','cancelled')") &&
  workplanRevisionMigration.includes("OLD.status = 'rejected' AND NEW.status IN ('submitted','cancelled')") &&
  workplanRevisionMigration.includes("NEW.reviewed_by IS NOT DISTINCT FROM NEW.created_by") &&
  workplanRevisionMigration.includes("A submission timestamp can only advance when a rejected workplan is resubmitted.") &&
  workplanRevisionMigration.includes("A rejection decision is immutable; submit a revised workplan for a new review."),
  "Workplan review must support recorded rejection, author revision and explicit resubmission without overwriting prior review history.",
);

assert.ok(
  actions.includes("export async function rejectFieldWorkplan") &&
  actions.includes("'field_workplan.rejected'") &&
  actions.includes("'field_workplan.resubmitted'") &&
  actions.includes("review_note = NULL") &&
  actions.includes("status IN ('draft','rejected')"),
  "Workplan rejection and resubmission actions must validate reviewer roles, require a reason, reset review metadata and audit every transition.",
);

assert.ok(
  workspace.includes("plan.status === \"rejected\" && plan.review_note") &&
  workspace.includes("plan.status === \"draft\" || plan.status === \"rejected\"") &&
  workspace.includes("Kirim ulang untuk ditinjau"),
  "The field workspace must show the rejection reason and allow corrected workplans to be resubmitted.",
);

assert.ok(
  managerPage.includes("action={rejectFieldWorkplan}") &&
  managerPage.includes('name="review_note"') &&
  managerPage.includes("Kembalikan untuk perbaikan") &&
  managerPage.includes("canApproveWorkplans && workplan.created_by !== identity.userId"),
  "The Pengurus review queue must require a written correction note and prevent the creator from approving or rejecting their own workplan.",
);

process.stdout.write("Field program lifecycle and controls: PASS\\n");
