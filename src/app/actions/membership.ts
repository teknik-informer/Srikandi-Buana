"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

interface DecisionResult {
  reference_no: string;
  membership_id: string | null;
}

export async function decideMembershipInterest(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:organisasi:review");
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("review_note") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/app/bidang/organisasi/pengajuan?result=invalid");
  }
  if (!["under_review", "approved", "rejected"].includes(decision)) {
    redirect("/app/bidang/organisasi/pengajuan?result=invalid");
  }
  if (reviewNote.length > 1000) {
    redirect("/app/bidang/organisasi/pengajuan?result=invalid");
  }

  const sql = getV9Sql();
  const result = await sql`
    WITH target AS (
      SELECT *
      FROM v9.membership_interests
      WHERE id = ${id}
        AND organization_id = ${identity.organizationId}
        AND status IN ('submitted', 'under_review')
      FOR UPDATE
    ),
    organization AS (
      SELECT id
      FROM v9.organizations
      WHERE id = ${identity.organizationId}
        AND status = 'active'
      LIMIT 1
    ),
    matched_person AS (
      SELECT
        target.id AS interest_id,
        target.applicant_name,
        target.phone,
        target.address,
        matched.id AS person_id
      FROM target
      LEFT JOIN LATERAL (
        SELECT person.id
        FROM v9.people AS person
        WHERE lower(person.full_name) = lower(target.applicant_name)
          AND person.phone = target.phone
        ORDER BY person.created_at DESC
        LIMIT 1
      ) AS matched ON true
    ),
    inserted_person AS (
      INSERT INTO v9.people (full_name, phone, address, status)
      SELECT applicant_name, phone, address, 'active'
      FROM matched_person
      WHERE person_id IS NULL
        AND ${decision} = 'approved'
      RETURNING id
    ),
    resolved_person AS (
      SELECT person_id AS id
      FROM matched_person
      WHERE person_id IS NOT NULL
      UNION ALL
      SELECT id FROM inserted_person
    ),
    existing_membership AS (
      SELECT membership.id
      FROM v9.memberships AS membership
      INNER JOIN resolved_person AS person
        ON person.id = membership.person_id
      CROSS JOIN organization
      WHERE membership.organization_id = organization.id
        AND membership.status IN ('pending', 'active')
      ORDER BY membership.created_at DESC
      LIMIT 1
    ),
    inserted_membership AS (
      INSERT INTO v9.memberships (
        organization_id,
        person_id,
        status,
        valid_from
      )
      SELECT organization.id, person.id, 'pending', NULL::date
      FROM resolved_person AS person
      CROSS JOIN organization
      WHERE ${decision} = 'approved'
        AND NOT EXISTS (SELECT 1 FROM existing_membership)
      RETURNING id, person_id, organization_id
    ),
    updated_interest AS (
      UPDATE v9.membership_interests AS interest
      SET
        status = ${decision},
        reviewed_by = ${identity.userId},
        reviewed_at = now(),
        review_note = NULLIF(${reviewNote}, ''),
        updated_at = now()
      FROM target
      WHERE interest.id = target.id
      RETURNING interest.id, interest.reference_no, interest.status
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
        organization.id,
        ${identity.userId},
        'membership_interest.' || updated_interest.status,
        'membership_interest',
        updated_interest.id::text,
        jsonb_build_object(
          'reference_no', updated_interest.reference_no,
          'status', updated_interest.status,
          'membership_id', COALESCE(
            (SELECT id FROM inserted_membership LIMIT 1),
            (SELECT id FROM existing_membership LIMIT 1)
          )
        )
      FROM updated_interest
      CROSS JOIN organization
      RETURNING id
    )
    SELECT
      updated_interest.reference_no,
      COALESCE(
        (SELECT id FROM inserted_membership LIMIT 1),
        (SELECT id FROM existing_membership LIMIT 1)
      ) AS membership_id
    FROM updated_interest
    INNER JOIN audit ON true
  `;

  const rows = rowsFromResult<DecisionResult>(result);
  if (rows.length !== 1) {
    redirect("/app/bidang/organisasi/pengajuan?result=stale");
  }

  revalidatePath("/app/bidang/organisasi/pengajuan");
  revalidatePath("/app/pengurus/anggota");
  redirect(`/app/bidang/organisasi/pengajuan?result=${decision}`);
}
