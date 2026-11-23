"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { FIELDS_BY_SLUG } from "@/config/fields";

type MutationRow = { id: string };

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function fail(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function sectionPath(fieldKey: string): string {
  return `/app/bidang/${fieldKey}/tim`;
}

function path(fieldKey: string, result: string): string {
  return `${sectionPath(fieldKey)}?result=${result}`;
}

function checkFieldPermission(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  fieldKey: string,
): void {
  if (!FIELDS_BY_SLUG[fieldKey]) redirect("/app/bidang");
  if (!can(identity, `field:${fieldKey}:team:write`)) redirect("/app");
}

export async function proposeFieldTeamAssignment(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = String(formData.get("field_key") ?? "").trim();
  checkFieldPermission(identity, fieldKey);

  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const roleLabel = String(formData.get("role_label") ?? "").trim().replace(/\s+/g, " ");
  const scopeLabel = String(formData.get("scope_label") ?? "").trim();
  const appointmentReference = String(formData.get("appointment_reference") ?? "").trim();
  const appointedOn = String(formData.get("appointed_on") ?? "").trim();
  const validFrom = String(formData.get("valid_from") ?? "").trim();
  const validUntil = String(formData.get("valid_until") ?? "").trim();

  if (
    !validUuid(membershipId) ||
    roleLabel.length < 2 || roleLabel.length > 160 ||
    scopeLabel.length > 300 ||
    appointmentReference.length > 100 ||
    (appointedOn && !validDate(appointedOn)) ||
    !validDate(validFrom) ||
    (validUntil && !validDate(validUntil)) ||
    (validUntil && validUntil < validFrom)
  ) {
    redirect(path(fieldKey, "invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.field_team_assignments (
          organization_id, field_key, membership_id, role_label, scope_label,
          appointment_reference, appointed_on, valid_from, valid_until,
          status, created_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          membership.id,
          ${roleLabel},
          NULLIF(${scopeLabel}, ''),
          NULLIF(${appointmentReference}, ''),
          NULLIF(${appointedOn}, '')::date,
          ${validFrom}::date,
          NULLIF(${validUntil}, '')::date,
          'proposed',
          ${identity.userId}
        FROM v9.field_applications AS application
        INNER JOIN v9.memberships AS membership
          ON membership.organization_id = application.organization_id
          AND membership.unit_id = application.unit_id
        WHERE application.field_key = ${fieldKey}
          AND application.organization_id = ${identity.organizationId}
          AND application.is_enabled = true
          AND membership.id = ${membershipId}
          AND membership.status = 'active'
        RETURNING id, organization_id, field_key, membership_id, role_label,
          appointment_reference, valid_from, valid_until, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'field_team_assignment.proposed',
          'field_team_assignment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'membership_id', membership_id,
            'role_label', role_label,
            'appointment_reference', appointment_reference,
            'valid_from', valid_from,
            'valid_until', valid_until,
            'status', status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("field-team-assignment-propose", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(path(fieldKey, "duplicate"));
    redirect(path(fieldKey, "error"));
  }

  if (!created) redirect(path(fieldKey, "member-unavailable"));
  revalidatePath(sectionPath(fieldKey));
  revalidatePath(`/app/bidang/${fieldKey}`);
  redirect(path(fieldKey, "proposed"));
}

export async function approveFieldTeamAssignment(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = String(formData.get("field_key") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();

  if (!FIELDS_BY_SLUG[fieldKey]) redirect("/app/bidang");
  if (!can(identity, "organization:team:approve")) redirect("/app");

  if (!validUuid(assignmentId)) redirect(path(fieldKey, "invalid"));

  let approved = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.field_team_assignments AS assignment
        SET
          status = 'active',
          approved_by = ${identity.userId},
          approved_at = now(),
          updated_at = now()
        FROM v9.field_applications AS application
        INNER JOIN v9.memberships AS membership
          ON membership.organization_id = application.organization_id
          AND membership.unit_id = application.unit_id
        WHERE assignment.id = ${assignmentId}
          AND assignment.organization_id = ${identity.organizationId}
          AND assignment.field_key = ${fieldKey}
          AND assignment.status = 'proposed'
          AND application.field_key = assignment.field_key
          AND application.organization_id = assignment.organization_id
          AND application.is_enabled = true
          AND membership.id = assignment.membership_id
          AND membership.status = 'active'
        RETURNING assignment.id, assignment.organization_id, assignment.field_key,
          assignment.membership_id, assignment.role_label, assignment.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'field_team_assignment.approved',
          'field_team_assignment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'membership_id', membership_id,
            'role_label', role_label,
            'status', status
          )
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    approved = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("field-team-assignment-approve", reason);
    redirect(path(fieldKey, "error"));
  }

  if (!approved) redirect(path(fieldKey, "stale"));
  revalidatePath(sectionPath(fieldKey));
  revalidatePath(`/app/bidang/${fieldKey}`);
  redirect(path(fieldKey, "approved"));
}

export async function endFieldTeamAssignment(formData: FormData): Promise<void> {
  const identity = await requireIdentity();
  const fieldKey = String(formData.get("field_key") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  checkFieldPermission(identity, fieldKey);

  if (!validUuid(assignmentId)) redirect(path(fieldKey, "invalid"));

  let ended = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.field_team_assignments
        SET
          status = 'ended',
          ended_by = ${identity.userId},
          ended_at = now(),
          updated_at = now()
        WHERE id = ${assignmentId}
          AND organization_id = ${identity.organizationId}
          AND field_key = ${fieldKey}
          AND status = 'active'
        RETURNING id, organization_id, field_key, membership_id, role_label, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'field_team_assignment.ended',
          'field_team_assignment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'membership_id', membership_id,
            'role_label', role_label,
            'status', status
          )
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    ended = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    fail("field-team-assignment-end", reason);
    redirect(path(fieldKey, "error"));
  }

  if (!ended) redirect(path(fieldKey, "stale"));
  revalidatePath(sectionPath(fieldKey));
  revalidatePath(`/app/bidang/${fieldKey}`);
  redirect(path(fieldKey, "ended"));
}
