"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeErrorName(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

/** Approve a submitted field workplan from the organization-wide approval inbox. */
export async function approveSubmittedWorkplan(formData: FormData): Promise<void> {
  const identity = await requireIdentity("organization:read");
  if (!can(identity, "organization:team:approve")) redirect("/app");

  const id = String(formData.get("workplan_id") ?? "").trim();
  const note = String(formData.get("review_note") ?? "").trim();
  if (!validUuid(id) || note.length > 1000) {
    redirect("/app/pengurus/persetujuan?result=workplan-invalid");
  }

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<{ id: string; field_key: string }>(await sql`
      WITH updated AS (
        UPDATE v9.field_workplans
        SET
          status = 'approved',
          approved_by = ${identity.userId},
          approved_at = now(),
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND status = 'submitted'
        RETURNING id, organization_id, field_key, reference_no, title, status,
          approved_by, approved_at
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          updated.organization_id,
          ${identity.userId},
          'field_workplan.approved',
          'field_workplan',
          updated.id::text,
          jsonb_build_object(
            'reference_no', updated.reference_no,
            'field_key', updated.field_key,
            'title', updated.title,
            'status', updated.status,
            'approved_by', updated.approved_by,
            'approved_at', updated.approved_at,
            'review_note', NULLIF(${note}, '')
          )
        FROM updated
        RETURNING id
      )
      SELECT updated.id::text AS id, updated.field_key
      FROM updated
      INNER JOIN audit ON true
    `);

    if (!rows[0]) {
      redirect("/app/pengurus/persetujuan?result=workplan-stale");
    }

    revalidatePath("/app/pengurus/persetujuan");
    revalidatePath(`/app/bidang/${rows[0].field_key}/rencana`);
    revalidatePath(`/app/bidang/${rows[0].field_key}`);
    redirect("/app/pengurus/persetujuan?result=workplan-approved");
  } catch (reason) {
    const errorType = safeErrorName(reason);
    console.warn("[workplan-approval] Update failed", errorType);
    redirect("/app/pengurus/persetujuan?result=workplan-error");
  }
}
