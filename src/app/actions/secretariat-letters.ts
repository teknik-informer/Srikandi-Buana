"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

const LETTER_STATUSES = ["baru", "diproses", "selesai"] as const;
type LetterStatus = (typeof LETTER_STATUSES)[number];

export async function registerSecretariatLetter(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:letters:write");
  const direction = String(formData.get("direction") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim().replace(/\s+/g, " ");
  const counterpart = String(formData.get("counterpart") ?? "").trim().replace(/\s+/g, " ");
  const number = String(formData.get("number") ?? "").trim();
  const assignee = String(formData.get("assignee") ?? "").trim();

  if (!["masuk", "keluar"].includes(direction)) {
    redirect("/app/sekretariat/surat?result=invalid");
  }
  if (subject.length < 3 || subject.length > 300) {
    redirect("/app/sekretariat/surat?result=invalid");
  }
  if (counterpart.length < 2 || counterpart.length > 200) {
    redirect("/app/sekretariat/surat?result=invalid");
  }
  if (number.length > 100 || number.includes("\n")) {
    redirect("/app/sekretariat/surat?result=invalid");
  }
  if (assignee.length < 2 || assignee.length > 120) {
    redirect("/app/sekretariat/surat?result=invalid");
  }

  const sql = getV9Sql();
  let created = false;
  try {
    const result = await sql`
      WITH organization AS (
        SELECT id, timezone
        FROM v9.organizations
        WHERE id = ${identity.organizationId}
          AND status = 'active'
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO v9.secretariat_letters (
          organization_id,
          direction,
          number,
          subject,
          counterpart,
          letter_date,
          status,
          assignee_label,
          created_by,
          updated_by
        )
        SELECT
          organization.id,
          ${direction},
          NULLIF(${number}, ''),
          ${subject},
          ${counterpart},
          (now() AT TIME ZONE organization.timezone)::date,
          'baru',
          ${assignee},
          ${identity.userId},
          ${identity.userId}
        FROM organization
        RETURNING id, reference_no, organization_id, direction, number, subject, counterpart, status
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
          inserted.organization_id,
          ${identity.userId},
          'secretariat_letter.registered',
          'secretariat_letter',
          inserted.id::text,
          jsonb_build_object(
            'reference_no', inserted.reference_no,
            'direction', inserted.direction,
            'number', inserted.number,
            'subject', inserted.subject,
            'counterpart', inserted.counterpart,
            'status', inserted.status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.reference_no
      FROM inserted
      INNER JOIN audit ON true
    `;

    const rows = Array.isArray(result)
      ? (result as Array<{ reference_no: string }>)
      : (result as unknown as { rows: Array<{ reference_no: string }> }).rows;

    created = Boolean(rows[0]?.reference_no);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown letter registration error";
    console.error("[secretariat-letter] Registration failed:", message);
    if (message.toLowerCase().includes("unique")) {
      redirect("/app/sekretariat/surat?result=duplicate");
    }
    redirect("/app/sekretariat/surat?result=error");
  }

  if (!created) {
    redirect("/app/sekretariat/surat?result=unavailable");
  }

  revalidatePath("/app/sekretariat/surat");
  revalidatePath("/app/sekretariat/ekspedisi");
  revalidatePath("/app/sekretariat");
  redirect("/app/sekretariat/surat?result=created");
}

export async function advanceSecretariatLetter(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:letters:write");
  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim() as LetterStatus;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/app/sekretariat/surat?result=invalid");
  }
  if (!LETTER_STATUSES.includes(next)) {
    redirect("/app/sekretariat/surat?result=invalid");
  }

  const sql = getV9Sql();
  const result = await sql`
    WITH target AS (
      SELECT id, status
      FROM v9.secretariat_letters
      WHERE id = ${id}
        AND organization_id = ${identity.organizationId}
      FOR UPDATE
    ),
    allowed_transition AS (
      SELECT id
      FROM target
      WHERE (status = 'baru' AND ${next} = 'diproses')
         OR (status = 'diproses' AND ${next} = 'selesai')
    ),
    updated AS (
      UPDATE v9.secretariat_letters AS letter
      SET
        status = ${next},
        updated_by = ${identity.userId},
        updated_at = now(),
        completed_at = CASE WHEN ${next} = 'selesai' THEN now() ELSE NULL END
      FROM allowed_transition
      WHERE letter.id = allowed_transition.id
      RETURNING letter.id, letter.reference_no, letter.organization_id, letter.status
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
        'secretariat_letter.status.' || updated.status,
        'secretariat_letter',
        updated.id::text,
        jsonb_build_object('reference_no', updated.reference_no, 'status', updated.status)
      FROM updated
      RETURNING id
    )
    SELECT updated.id
    FROM updated
    INNER JOIN audit ON true
  `;

  const rows = Array.isArray(result) ? result : (result as unknown as { rows: unknown[] }).rows;
  if (!rows?.length) {
    redirect("/app/sekretariat/surat?result=transition");
  }

  revalidatePath("/app/sekretariat");
  revalidatePath("/app/sekretariat/surat");
  revalidatePath("/app/sekretariat/ekspedisi");
  redirect("/app/sekretariat/surat?result=updated");
}
