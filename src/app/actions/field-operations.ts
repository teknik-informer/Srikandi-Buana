"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity, requireRoles } from "@/lib/session";
import { FIELDS_BY_SLUG } from "@/config/fields";

type FieldStatusResult = { id: string; status: string };

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function getFieldKey(formData: FormData): string {
  return String(formData.get("field_key") ?? "").trim();
}

function ensurePermission(identity: Awaited<ReturnType<typeof requireIdentity>>, fieldKey: string, permission: string): void {
  if (!FIELDS_BY_SLUG[fieldKey]) redirect("/app/bidang");
  if (!can(identity, permission)) redirect("/app");
}

function error(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function sectionPath(fieldKey: string, section: string): string {
  return `/app/bidang/${fieldKey}/${section}`;
}

function fieldPath(fieldKey: string, section: string, result: string): string {
  return `${sectionPath(fieldKey, section)}?result=${result}`;
}

export async function createFieldWorkplan(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  ensurePermission(identity, fieldKey, `field:${fieldKey}:workplan:write`);

  const title = normalize(String(formData.get("title") ?? ""));
  const objective = String(formData.get("objective") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();

  if (title.length < 3 || title.length > 300 || objective.length > 5000 ||
      !validDate(periodStart) || !validDate(periodEnd) || periodEnd < periodStart) {
    redirect(fieldPath(fieldKey, "rencana", "invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.field_workplans (
          organization_id, field_key, title, objective, period_start, period_end,
          status, created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          field.field_key,
          ${title},
          NULLIF(${objective}, ''),
          ${periodStart}::date,
          ${periodEnd}::date,
          'draft',
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS field
        WHERE field.field_key = ${fieldKey}
          AND field.organization_id = ${identity.organizationId}
          AND field.is_enabled = true
        RETURNING id, reference_no, organization_id, field_key, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          inserted.organization_id,
          ${identity.userId},
          'field_workplan.created',
          'field_workplan',
          inserted.id::text,
          jsonb_build_object(
            'reference_no', inserted.reference_no,
            'field_key', inserted.field_key,
            'title', inserted.title,
            'status', inserted.status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-workplan-create", reason);
    redirect(fieldPath(fieldKey, "rencana", "error"));
  }

  if (!created) redirect(fieldPath(fieldKey, "rencana", "unavailable"));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, "rencana"));
  redirect(fieldPath(fieldKey, "rencana", "workplan-created"));
}

export async function submitFieldWorkplan(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const id = String(formData.get('workplan_id') ?? '').trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:workplan:write`);
  if (!validUuid(id)) redirect(fieldPath(fieldKey, 'rencana', 'invalid'));

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_workplan AS (
        SELECT id, organization_id, field_key, reference_no, title, status, submitted_at,
          reviewed_at, reviewed_by, review_note
        FROM v9.field_workplans
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND status IN ('draft','rejected')
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_workplans AS workplan
        SET status = 'submitted',
            submitted_at = now(),
            reviewed_at = NULL,
            reviewed_by = NULL,
            review_note = NULL,
            updated_by = ${identity.userId},
            updated_at = now()
        FROM current_workplan
        WHERE workplan.id = current_workplan.id
        RETURNING workplan.id, workplan.organization_id, workplan.field_key,
          workplan.reference_no, workplan.title, workplan.status, workplan.submitted_at
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          CASE WHEN current_workplan.status = 'rejected' THEN 'field_workplan.resubmitted'
            ELSE 'field_workplan.submitted' END,
          'field_workplan', updated.id::text,
          jsonb_build_object('reference_no', current_workplan.reference_no,
            'field_key', current_workplan.field_key, 'title', current_workplan.title,
            'previous_status', current_workplan.status, 'previous_reviewed_at', current_workplan.reviewed_at,
            'previous_reviewed_by', current_workplan.reviewed_by, 'previous_review_note', current_workplan.review_note),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'status', updated.status, 'submitted_at', updated.submitted_at)
        FROM updated
        INNER JOIN current_workplan ON current_workplan.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-workplan-submit', reason);
    redirect(fieldPath(fieldKey, 'rencana', 'error'));
  }

  if (!changed) redirect(fieldPath(fieldKey, 'rencana', 'stale'));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  revalidatePath('/app/pengurus/program');
  redirect(fieldPath(fieldKey, 'rencana', 'workplan-submitted'));
}
export async function updateFieldWorkplan(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const workplanId = String(formData.get('workplan_id') ?? '').trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:workplan:write`);

  const title = normalize(String(formData.get('title') ?? ''));
  const objective = String(formData.get('objective') ?? '').trim();
  const periodStart = String(formData.get('period_start') ?? '').trim();
  const periodEnd = String(formData.get('period_end') ?? '').trim();

  if (!validUuid(workplanId) || title.length < 3 || title.length > 300 ||
      objective.length > 5000 || !validDate(periodStart) || !validDate(periodEnd) ||
      periodEnd < periodStart) {
    redirect(fieldPath(fieldKey, 'rencana', 'invalid'));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_workplan AS (
        SELECT id, organization_id, field_key, reference_no, title, objective, period_start, period_end
        FROM v9.field_workplans
        WHERE id = ${workplanId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND status IN ('draft','rejected')
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_workplans AS workplan
        SET title = ${title}, objective = NULLIF(${objective}, ''),
            period_start = ${periodStart}::date, period_end = ${periodEnd}::date,
            updated_by = ${identity.userId}, updated_at = now()
        FROM current_workplan
        WHERE workplan.id = current_workplan.id
        RETURNING workplan.id, workplan.organization_id, workplan.field_key,
          workplan.reference_no, workplan.title, workplan.objective,
          workplan.period_start, workplan.period_end, workplan.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId}, 'field_workplan.updated',
          'field_workplan', updated.id::text,
          jsonb_build_object('title', current_workplan.title, 'objective', current_workplan.objective,
            'period_start', current_workplan.period_start, 'period_end', current_workplan.period_end),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'objective', updated.objective,
            'period_start', updated.period_start, 'period_end', updated.period_end, 'status', updated.status)
        FROM updated
        INNER JOIN current_workplan ON current_workplan.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-workplan-update', reason);
    redirect(fieldPath(fieldKey, 'rencana', 'error'));
  }

  if (!changed) redirect(fieldPath(fieldKey, 'rencana', 'stale'));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  redirect(fieldPath(fieldKey, 'rencana', 'workplan-updated'));
}

export async function rejectFieldWorkplan(formData: FormData): Promise<void> {
  const identity = await requireRoles(['platform_admin', 'organization_admin', 'chair']);
  const fieldKey = getFieldKey(formData);
  const workplanId = String(formData.get('workplan_id') ?? '').trim();
  const reviewNote = String(formData.get('review_note') ?? '').trim();
  if (!FIELDS_BY_SLUG[fieldKey]) redirect('/app/bidang');
  if (!validUuid(workplanId) || reviewNote.length < 3 || reviewNote.length > 1000) {
    redirect('/app/pengurus/program?result=invalid');
  }

  let rejected = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_workplan AS (
        SELECT id, organization_id, field_key, reference_no, title, status, created_by
        FROM v9.field_workplans
        WHERE id = ${workplanId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND status = 'submitted'
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_workplans AS workplan
        SET status = 'rejected', reviewed_at = now(), reviewed_by = ${identity.userId},
            review_note = ${reviewNote}, updated_by = ${identity.userId}, updated_at = now()
        FROM current_workplan
        WHERE workplan.id = current_workplan.id
          AND current_workplan.created_by IS DISTINCT FROM ${identity.userId}
        RETURNING workplan.id, workplan.organization_id, workplan.field_key,
          workplan.reference_no, workplan.title, workplan.status,
          workplan.reviewed_at, workplan.reviewed_by, workplan.review_note
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId}, 'field_workplan.rejected',
          'field_workplan', updated.id::text,
          jsonb_build_object('reference_no', current_workplan.reference_no,
            'field_key', current_workplan.field_key, 'title', current_workplan.title, 'status', current_workplan.status),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'status', updated.status, 'reviewed_at', updated.reviewed_at,
            'reviewed_by', updated.reviewed_by, 'review_note', updated.review_note)
        FROM updated
        INNER JOIN current_workplan ON current_workplan.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    rejected = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-workplan-reject', reason);
    redirect('/app/pengurus/program?result=error');
  }

  if (!rejected) redirect('/app/pengurus/program?result=stale');
  revalidatePath('/app/pengurus/program');
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  redirect('/app/pengurus/program?result=workplan-rejected');
}
export async function approveFieldWorkplan(formData: FormData): Promise<void> {
  const identity = await requireRoles(['platform_admin', 'organization_admin', 'chair']);
  const fieldKey = getFieldKey(formData);
  const workplanId = String(formData.get('workplan_id') ?? '').trim();
  if (!FIELDS_BY_SLUG[fieldKey]) redirect('/app/bidang');
  if (!validUuid(workplanId)) redirect('/app/pengurus/program?result=invalid');

  let approved = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_workplan AS (
        SELECT id, organization_id, field_key, reference_no, title, status, created_by
        FROM v9.field_workplans
        WHERE id = ${workplanId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND status = 'submitted'
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_workplans AS workplan
        SET status = 'approved', approved_at = now(), approved_by = ${identity.userId},
            updated_by = ${identity.userId}, updated_at = now()
        FROM current_workplan
        WHERE workplan.id = current_workplan.id
          AND current_workplan.created_by IS DISTINCT FROM ${identity.userId}
        RETURNING workplan.id, workplan.organization_id, workplan.field_key,
          workplan.reference_no, workplan.title, workplan.status, workplan.approved_at
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId}, 'field_workplan.approved',
          'field_workplan', updated.id::text,
          jsonb_build_object('reference_no', current_workplan.reference_no,
            'field_key', current_workplan.field_key, 'title', current_workplan.title, 'status', current_workplan.status),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'status', updated.status, 'approved_at', updated.approved_at)
        FROM updated
        INNER JOIN current_workplan ON current_workplan.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    approved = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-workplan-approve', reason);
    redirect('/app/pengurus/program?result=error');
  }

  if (!approved) redirect('/app/pengurus/program?result=stale');
  revalidatePath('/app/pengurus/program');
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  redirect('/app/pengurus/program?result=workplan-approved');
}

export async function changeFieldWorkplanStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const workplanId = String(formData.get('workplan_id') ?? '').trim();
  const next = String(formData.get('next_status') ?? '').trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:workplan:write`);

  if (!validUuid(workplanId) || !['active','completed'].includes(next)) {
    redirect(fieldPath(fieldKey, 'rencana', 'invalid'));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_workplan AS (
        SELECT id, organization_id, field_key, reference_no, title, status
        FROM v9.field_workplans
        WHERE id = ${workplanId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_workplans AS workplan
        SET status = ${next}, updated_by = ${identity.userId}, updated_at = now()
        FROM current_workplan
        WHERE workplan.id = current_workplan.id
          AND ((current_workplan.status = 'approved' AND ${next} = 'active')
            OR (current_workplan.status = 'active' AND ${next} = 'completed'))
        RETURNING workplan.id, workplan.organization_id, workplan.field_key,
          workplan.reference_no, workplan.title, workplan.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId}, 'field_workplan.status.' || updated.status,
          'field_workplan', updated.id::text,
          jsonb_build_object('reference_no', current_workplan.reference_no,
            'field_key', current_workplan.field_key, 'title', current_workplan.title, 'status', current_workplan.status),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'status', updated.status)
        FROM updated
        INNER JOIN current_workplan ON current_workplan.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-workplan-status', reason);
    redirect(fieldPath(fieldKey, 'rencana', 'error'));
  }

  if (!changed) redirect(fieldPath(fieldKey, 'rencana', 'stale'));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  revalidatePath('/app/pengurus/program');
  redirect(fieldPath(fieldKey, 'rencana', 'workplan-status-updated'));
}
export async function createFieldProgram(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  ensurePermission(identity, fieldKey, `field:${fieldKey}:program:write`);

  const title = normalize(String(formData.get("title") ?? ""));
  const objective = String(formData.get("objective") ?? "").trim();
  const workplanId = String(formData.get("workplan_id") ?? "").trim();
  const start = String(formData.get("period_start") ?? "").trim();
  const end = String(formData.get("period_end") ?? "").trim();
  const budgetText = String(formData.get("budget_request") ?? "").trim();
  const budget = budgetText === "" ? null : Number(budgetText);

  if (title.length < 3 || title.length > 300 || objective.length > 5000 ||
      (workplanId && !validUuid(workplanId)) ||
      (start && !validDate(start)) || (end && !validDate(end)) ||
      (start && end && end < start) ||
      (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000_000_000))) {
    redirect(fieldPath(fieldKey, "rencana", "invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.field_programs (
          organization_id, field_key, workplan_id, title, objective,
          period_start, period_end, status, budget_request, created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          field.field_key,
          NULLIF(${workplanId}, '')::uuid,
          ${title},
          NULLIF(${objective}, ''),
          NULLIF(${start}, '')::date,
          NULLIF(${end}, '')::date,
          'draft',
          ${budget},
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS field
        LEFT JOIN v9.field_workplans AS workplan
          ON workplan.id = NULLIF(${workplanId}, '')::uuid
          AND workplan.organization_id = field.organization_id
          AND workplan.field_key = field.field_key
          AND workplan.status IN ('submitted','approved','active')
        WHERE field.field_key = ${fieldKey}
          AND field.organization_id = ${identity.organizationId}
          AND field.is_enabled = true
          AND (NULLIF(${workplanId}, '') IS NULL OR workplan.id IS NOT NULL)
        RETURNING id, reference_no, organization_id, field_key, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'field_program.created',
          'field_program', id::text,
          jsonb_build_object('reference_no', reference_no, 'field_key', field_key, 'title', title, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-program-create", reason);
    redirect(fieldPath(fieldKey, "rencana", "error"));
  }

  if (!created) redirect(fieldPath(fieldKey, "rencana", "unavailable"));
  revalidatePath(sectionPath(fieldKey, "rencana"));
  redirect(fieldPath(fieldKey, "rencana", "program-created"));
}

export async function updateFieldProgram(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const programId = String(formData.get('program_id') ?? '').trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:program:write`);

  const title = normalize(String(formData.get('title') ?? ''));
  const objective = String(formData.get('objective') ?? '').trim();
  const start = String(formData.get('period_start') ?? '').trim();
  const end = String(formData.get('period_end') ?? '').trim();
  const budgetText = String(formData.get('budget_request') ?? '').trim();
  const budget = budgetText === '' ? null : Number(budgetText);

  if (!validUuid(programId) || title.length < 3 || title.length > 300 ||
      objective.length > 5000 || (start && !validDate(start)) ||
      (end && !validDate(end)) || (start && end && end < start) ||
      (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000_000_000))) {
    redirect(fieldPath(fieldKey, 'rencana', 'invalid'));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_program AS (
        SELECT id, organization_id, field_key, reference_no, title, objective,
          period_start, period_end, budget_request, status
        FROM v9.field_programs
        WHERE id = ${programId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND status IN ('draft','planned')
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_programs AS program
        SET title = ${title},
            objective = NULLIF(${objective}, ''),
            period_start = NULLIF(${start}, '')::date,
            period_end = NULLIF(${end}, '')::date,
            budget_request = ${budget},
            updated_by = ${identity.userId},
            updated_at = now()
        FROM current_program
        WHERE program.id = current_program.id
        RETURNING program.id, program.organization_id, program.field_key,
          program.reference_no, program.title, program.objective,
          program.period_start, program.period_end, program.budget_request, program.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId}, 'field_program.updated',
          'field_program', updated.id::text,
          jsonb_build_object('title', current_program.title, 'objective', current_program.objective,
            'period_start', current_program.period_start, 'period_end', current_program.period_end,
            'budget_request', current_program.budget_request),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'objective', updated.objective,
            'period_start', updated.period_start, 'period_end', updated.period_end,
            'budget_request', updated.budget_request, 'status', updated.status)
        FROM updated
        INNER JOIN current_program ON current_program.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-program-update', reason);
    redirect(fieldPath(fieldKey, 'rencana', 'error'));
  }

  if (!changed) redirect(fieldPath(fieldKey, 'rencana', 'stale'));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  revalidatePath('/app/pengurus/program');
  redirect(fieldPath(fieldKey, 'rencana', 'program-updated'));
}

export async function changeFieldProgramStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const programId = String(formData.get('program_id') ?? '').trim();
  const next = String(formData.get('next_status') ?? '').trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:program:write`);

  if (!validUuid(programId) || !['planned','active','paused','completed','cancelled'].includes(next)) {
    redirect(fieldPath(fieldKey, 'rencana', 'invalid'));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH current_program AS (
        SELECT id, organization_id, field_key, reference_no, title, status
        FROM v9.field_programs
        WHERE id = ${programId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
        FOR UPDATE
      ),
      updated AS (
        UPDATE v9.field_programs AS program
        SET status = ${next}, updated_by = ${identity.userId}, updated_at = now()
        FROM current_program
        WHERE program.id = current_program.id
          AND (
            (current_program.status = 'draft' AND ${next} IN ('planned','cancelled'))
            OR (current_program.status = 'planned' AND ${next} IN ('active','paused','cancelled'))
            OR (current_program.status = 'active' AND ${next} IN ('paused','completed','cancelled'))
            OR (current_program.status = 'paused' AND ${next} IN ('active','cancelled'))
          )
        RETURNING program.id, program.organization_id, program.field_key,
          program.reference_no, program.title, program.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
        )
        SELECT updated.organization_id, ${identity.userId},
          'field_program.status.' || updated.status, 'field_program', updated.id::text,
          jsonb_build_object('reference_no', current_program.reference_no, 'field_key', current_program.field_key,
            'title', current_program.title, 'status', current_program.status),
          jsonb_build_object('reference_no', updated.reference_no, 'field_key', updated.field_key,
            'title', updated.title, 'status', updated.status)
        FROM updated
        INNER JOIN current_program ON current_program.id = updated.id
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error('field-program-status', reason);
    redirect(fieldPath(fieldKey, 'rencana', 'error'));
  }

  if (!changed) redirect(fieldPath(fieldKey, 'rencana', 'stale'));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, 'rencana'));
  revalidatePath('/app/pengurus/program');
  redirect(fieldPath(fieldKey, 'rencana', 'program-status-updated'));
}
export async function addFieldProgramIndicator(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const programId = String(formData.get("program_id") ?? "").trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:program:write`);
  const label = normalize(String(formData.get("indicator_label") ?? ""));
  const unitLabel = String(formData.get("unit_label") ?? "").trim();
  const targetText = String(formData.get("target_value") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const target = targetText ? Number(targetText) : null;

  if (!validUuid(programId) || label.length < 2 || label.length > 240 ||
      unitLabel.length > 60 || note.length > 1000 ||
      (target !== null && (!Number.isFinite(target) || target < 0))) {
    redirect(fieldPath(fieldKey, "rencana", "invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.field_program_indicators (
          organization_id, field_key, program_id, indicator_label,
          target_value, unit_label, note, created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          program.field_key,
          program.id,
          ${label},
          ${target},
          NULLIF(${unitLabel}, ''),
          NULLIF(${note}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_programs AS program
        WHERE program.id = ${programId}
          AND program.organization_id = ${identity.organizationId}
          AND program.field_key = ${fieldKey}
          AND program.status <> 'cancelled'
        RETURNING id, program_id, field_key, indicator_label, target_value
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT ${identity.organizationId}, ${identity.userId}, 'field_program_indicator.created',
          'field_program_indicator', id::text,
          jsonb_build_object('program_id', program_id, 'field_key', field_key,
            'indicator_label', indicator_label, 'target_value', target_value)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-program-indicator-create", reason);
    redirect(fieldPath(fieldKey, "rencana", "error"));
  }

  if (!created) redirect(fieldPath(fieldKey, "rencana", "stale"));
  revalidatePath(sectionPath(fieldKey, "rencana"));
  redirect(fieldPath(fieldKey, "rencana", "indicator-created"));
}

export async function createFieldActivity(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  ensurePermission(identity, fieldKey, `field:${fieldKey}:activity:write`);

  const title = normalize(String(formData.get("title") ?? ""));
  const programId = String(formData.get("program_id") ?? "").trim();
  const date = String(formData.get("activity_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const responsible = String(formData.get("responsible_label") ?? "").trim();
  const openToPublic = formData.get("open_to_public") === "on";

  if (title.length < 3 || title.length > 300 || (programId && !validUuid(programId)) ||
      !validDate(date) || (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) ||
      (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) ||
      (startTime && endTime && endTime <= startTime) ||
      location.length > 300 || description.length > 5000 || responsible.length > 160) {
    redirect(fieldPath(fieldKey, "kegiatan", "invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.field_activities (
          organization_id, field_key, program_id, title, activity_date,
          start_time, end_time, location, description, responsible_label,
          status, open_to_public, created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          field.field_key,
          NULLIF(${programId}, '')::uuid,
          ${title},
          ${date}::date,
          NULLIF(${startTime}, '')::time,
          NULLIF(${endTime}, '')::time,
          NULLIF(${location}, ''),
          NULLIF(${description}, ''),
          NULLIF(${responsible}, ''),
          'scheduled',
          ${openToPublic},
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS field
        LEFT JOIN v9.field_programs AS program
          ON program.id = NULLIF(${programId}, '')::uuid
          AND program.organization_id = field.organization_id
          AND program.field_key = field.field_key
          AND program.status <> 'cancelled'
        WHERE field.field_key = ${fieldKey}
          AND field.organization_id = ${identity.organizationId}
          AND field.is_enabled = true
          AND (NULLIF(${programId}, '') IS NULL OR program.id IS NOT NULL)
        RETURNING id, reference_no, organization_id, field_key, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'field_activity.created',
          'field_activity', id::text,
          jsonb_build_object('reference_no', reference_no, 'field_key', field_key, 'title', title, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-activity-create", reason);
    redirect(fieldPath(fieldKey, "kegiatan", "error"));
  }

  if (!created) redirect(fieldPath(fieldKey, "kegiatan", "unavailable"));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, "kegiatan"));
  redirect(fieldPath(fieldKey, "kegiatan", "activity-created"));
}

export async function updateFieldActivityStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const next = String(formData.get("next_status") ?? "").trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:activity:write`);

  if (!validUuid(activityId) || !["in_progress","completed","cancelled"].includes(next)) {
    redirect(fieldPath(fieldKey, "kegiatan", "invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.field_activities
        SET status = ${next},
            updated_by = ${identity.userId},
            updated_at = now(),
            completed_at = CASE WHEN ${next} = 'completed' THEN now() ELSE NULL END,
            cancelled_at = CASE WHEN ${next} = 'cancelled' THEN now() ELSE NULL END
        WHERE id = ${activityId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND (
            (status = 'scheduled' AND ${next} IN ('in_progress','cancelled'))
            OR (status = 'in_progress' AND ${next} IN ('completed','cancelled'))
          )
        RETURNING id, reference_no, organization_id, field_key, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'field_activity.status.' || status,
          'field_activity', id::text,
          jsonb_build_object('reference_no', reference_no, 'field_key', field_key, 'title', title, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-activity-status", reason);
    redirect(fieldPath(fieldKey, "kegiatan", "error"));
  }

  if (!changed) redirect(fieldPath(fieldKey, "kegiatan", "stale"));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, "kegiatan"));
  redirect(fieldPath(fieldKey, "kegiatan", "activity-updated"));
}

export async function createFieldTask(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  ensurePermission(identity, fieldKey, `field:${fieldKey}:task:write`);

  const title = normalize(String(formData.get("title") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const programId = String(formData.get("program_id") ?? "").trim();
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const assignee = String(formData.get("assignee_label") ?? "").trim();
  const due = String(formData.get("due_date") ?? "").trim();
  const priority = String(formData.get("priority") ?? "sedang").trim();

  if (title.length < 3 || title.length > 300 || description.length > 5000 ||
      (programId && !validUuid(programId)) || (activityId && !validUuid(activityId)) ||
      assignee.length > 160 || (due && !validDate(due)) ||
      !["tinggi","sedang","rendah"].includes(priority)) {
    redirect(fieldPath(fieldKey, "tugas", "invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.field_tasks (
          organization_id, field_key, program_id, activity_id, title, description,
          assignee_label, due_date, priority, status, created_by, updated_by
        )
        SELECT
          ${identity.organizationId},
          field.field_key,
          NULLIF(${programId}, '')::uuid,
          NULLIF(${activityId}, '')::uuid,
          ${title},
          NULLIF(${description}, ''),
          NULLIF(${assignee}, ''),
          NULLIF(${due}, '')::date,
          ${priority},
          'belum',
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS field
        LEFT JOIN v9.field_programs AS program
          ON program.id = NULLIF(${programId}, '')::uuid
          AND program.organization_id = field.organization_id
          AND program.field_key = field.field_key
          AND program.status <> 'cancelled'
        LEFT JOIN v9.field_activities AS activity
          ON activity.id = NULLIF(${activityId}, '')::uuid
          AND activity.organization_id = field.organization_id
          AND activity.field_key = field.field_key
          AND activity.status <> 'cancelled'
        WHERE field.field_key = ${fieldKey}
          AND field.organization_id = ${identity.organizationId}
          AND field.is_enabled = true
          AND (NULLIF(${programId}, '') IS NULL OR program.id IS NOT NULL)
          AND (NULLIF(${activityId}, '') IS NULL OR activity.id IS NOT NULL)
        RETURNING id, reference_no, organization_id, field_key, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'field_task.created',
          'field_task', id::text,
          jsonb_build_object('reference_no', reference_no, 'field_key', field_key, 'title', title, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id FROM inserted INNER JOIN audit ON true
    `;
    created = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-task-create", reason);
    redirect(fieldPath(fieldKey, "tugas", "error"));
  }

  if (!created) redirect(fieldPath(fieldKey, "tugas", "unavailable"));
  revalidatePath(sectionPath(fieldKey, "tugas"));
  redirect(fieldPath(fieldKey, "tugas", "task-created"));
}

export async function updateFieldTaskStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const taskId = String(formData.get("task_id") ?? "").trim();
  const next = String(formData.get("next_status") ?? "").trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:task:write`);

  if (!validUuid(taskId) || !["belum","proses","selesai","dibatalkan"].includes(next)) {
    redirect(fieldPath(fieldKey, "tugas", "invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.field_tasks
        SET status = ${next},
            completed_at = CASE WHEN ${next} = 'selesai' THEN now() ELSE NULL END,
            updated_by = ${identity.userId},
            updated_at = now()
        WHERE id = ${taskId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND (
            (status = 'belum' AND ${next} IN ('proses','dibatalkan'))
            OR (status = 'proses' AND ${next} IN ('belum','selesai','dibatalkan'))
          )
        RETURNING id, reference_no, organization_id, field_key, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'field_task.status.' || status,
          'field_task', id::text,
          jsonb_build_object('reference_no', reference_no, 'field_key', field_key, 'title', title, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id FROM updated INNER JOIN audit ON true
    `;
    changed = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-task-status", reason);
    redirect(fieldPath(fieldKey, "tugas", "error"));
  }

  if (!changed) redirect(fieldPath(fieldKey, "tugas", "stale"));
  revalidatePath(`/app/bidang/${fieldKey}`);
  revalidatePath(sectionPath(fieldKey, "tugas"));
  redirect(fieldPath(fieldKey, "tugas", "task-updated"));
}

export async function updateFieldProgramIndicatorActual(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = getFieldKey(formData);
  const indicatorId = String(formData.get("indicator_id") ?? "").trim();
  ensurePermission(identity, fieldKey, `field:${fieldKey}:program:write`);

  const actualText = String(formData.get("actual_value") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const actual = actualText === "" ? null : Number(actualText);

  if (!validUuid(indicatorId) || note.length > 1000 ||
      (actual !== null && (!Number.isFinite(actual) || actual < 0 || actual > 1_000_000_000_000))) {
    redirect(fieldPath(fieldKey, "rencana", "invalid"));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.field_program_indicators AS indicator
        SET
          actual_value = ${actual},
          note = NULLIF(${note}, ''),
          updated_by = ${identity.userId},
          updated_at = now()
        FROM v9.field_programs AS program
        WHERE indicator.id = ${indicatorId}
          AND indicator.program_id = program.id
          AND indicator.organization_id = ${identity.organizationId}
          AND indicator.field_key = ${fieldKey}
          AND program.organization_id = ${identity.organizationId}
          AND program.field_key = ${fieldKey}
          AND program.status <> 'cancelled'
        RETURNING indicator.id, indicator.program_id, indicator.indicator_label,
          indicator.target_value, indicator.actual_value, indicator.unit_label
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'field_program_indicator.actual_updated',
          'field_program_indicator',
          changed.id::text,
          jsonb_build_object(
            'program_id', changed.program_id,
            'field_key', ${fieldKey},
            'indicator_label', changed.indicator_label,
            'target_value', changed.target_value,
            'actual_value', changed.actual_value,
            'unit_label', changed.unit_label
          )
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    updated = rowsFromResult<FieldStatusResult>(result).length === 1;
  } catch (reason) {
    error("field-program-indicator-actual", reason);
    redirect(fieldPath(fieldKey, "rencana", "error"));
  }

  if (!updated) redirect(fieldPath(fieldKey, "rencana", "stale"));
  revalidatePath(sectionPath(fieldKey, "rencana"));
  revalidatePath(`/app/bidang/${fieldKey}`);
  redirect(fieldPath(fieldKey, "rencana", "indicator-updated"));
}
