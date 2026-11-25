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
  actions.includes('can(identity, `field:${fieldKey}:program:write`)') &&
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

process.stdout.write("Field program lifecycle and controls: PASS\\n");
