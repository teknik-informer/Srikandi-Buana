"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

interface MembershipStatusResult {
  id: string;
  status: string;
}

export async function updateMembershipStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("membership:activate");
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const rawMemberNumber = String(formData.get("member_number") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/app/pengurus/anggota?result=invalid");
  }
  if (!["active", "inactive", "left"].includes(decision)) {
    redirect("/app/pengurus/anggota?result=invalid");
  }
  if (
    rawMemberNumber &&
    !/^[A-Za-z0-9][A-Za-z0-9./-]{1,39}$/.test(rawMemberNumber)
  ) {
    redirect("/app/pengurus/anggota?result=invalid");
  }
  if (note.length > 1000) {
    redirect("/app/pengurus/anggota?result=invalid");
  }

  const memberNumber = rawMemberNumber ? rawMemberNumber.toUpperCase() : null;
  const sql = getV9Sql();
  let result: unknown;
  try {
    result = await sql`
    WITH target AS (
      SELECT membership.id
      FROM v9.memberships AS membership
      WHERE membership.id = ${id}
        AND membership.organization_id = ${identity.organizationId}
        AND membership.status IN ('pending', 'active', 'inactive', 'left')
      FOR UPDATE
    ),
    updated AS (
      UPDATE v9.memberships AS membership
      SET
        status = ${decision},
        member_number = COALESCE(${memberNumber}, membership.member_number),
        valid_from = CASE
          WHEN ${decision} = 'active' THEN COALESCE(membership.valid_from, current_date)
          ELSE membership.valid_from
        END,
        valid_until = CASE
          WHEN ${decision} IN ('inactive', 'left') THEN current_date
          ELSE NULL
        END,
        updated_at = now()
      FROM target
      WHERE membership.id = target.id
      RETURNING
        membership.id,
        membership.organization_id,
        membership.person_id,
        membership.member_number,
        membership.status,
        membership.valid_from,
        membership.valid_until
    ),
    audit AS (
      INSERT INTO v9.audit_events (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        after_state
      )
      SELECT
        updated.organization_id,
        ${identity.userId},
        'membership.status.' || updated.status,
        'membership',
        updated.id::text,
        jsonb_build_object(
          'member_number', updated.member_number,
          'status', updated.status,
          'valid_from', updated.valid_from,
          'valid_until', updated.valid_until,
          'note', NULLIF(${note}, '')
        )
      FROM updated
      RETURNING id
    )
    SELECT updated.id::text AS id, updated.status
    FROM updated
    INNER JOIN audit ON true
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown membership update error";
    console.error("[membership-status] Update failed:", message);
    if (message.toLowerCase().includes("unique")) {
      redirect("/app/pengurus/anggota?result=duplicate");
    }
    redirect("/app/pengurus/anggota?result=error");
  }

  const rows = rowsFromResult<MembershipStatusResult>(result);
  if (rows.length !== 1) {
    redirect("/app/pengurus/anggota?result=stale");
  }

  revalidatePath("/app/pengurus/anggota");
  revalidatePath("/app/anggota");
  redirect(`/app/pengurus/anggota?result=${decision}`);
}
