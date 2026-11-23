"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

const MEETING_TYPES = ["pengurus", "bidang", "anggota"] as const;
const UNIT_KEYS = new Set([
  "pengurus-harian",
  "sekretariat",
  "keuangan",
  "organisasi",
  "pertanian",
  "pelatihan",
  "usaha",
]);

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function logFailure(area: string, error: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    error instanceof Error ? error.message : "Unknown error",
  );
}

export async function createSecretariatMeeting(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:meetings:write");
  const title = String(formData.get("title") ?? "").trim().replace(/\s+/g, " ");
  const meetingType = String(formData.get("meeting_type") ?? "").trim();
  const meetingDate = String(formData.get("meeting_date") ?? "").trim();
  const timeLabel = String(formData.get("time_label") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unitKey = String(formData.get("unit_key") ?? "").trim();
  const openToPublic = formData.get("open_to_public") === "on";

  if (title.length < 3 || title.length > 300 || !MEETING_TYPES.includes(meetingType as (typeof MEETING_TYPES)[number]) ||
      !validDate(meetingDate) || timeLabel.length > 80 || location.length > 300 ||
      description.length > 4000 || (unitKey && !UNIT_KEYS.has(unitKey))) {
    redirect("/app/sekretariat/rapat?result=invalid");
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH organization AS (
        SELECT id, timezone
        FROM v9.organizations
        WHERE id = ${identity.organizationId}
          AND status = 'active'
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO v9.secretariat_meetings (
          organization_id, title, meeting_type, meeting_date,
          time_label, location, description, unit_id, open_to_public,
          created_by, updated_by
        )
        SELECT
          organization.id,
          ${title},
          ${meetingType},
          ${meetingDate}::date,
          NULLIF(${timeLabel}, ''),
          NULLIF(${location}, ''),
          NULLIF(${description}, ''),
          unit.id,
          ${openToPublic},
          ${identity.userId},
          ${identity.userId}
        FROM organization
        LEFT JOIN v9.organization_units AS unit
          ON unit.organization_id = organization.id
          AND unit.unit_key = NULLIF(${unitKey}, '')
        RETURNING id, organization_id, reference_no, title, meeting_date, status
      ),
      draft_minutes AS (
        INSERT INTO v9.secretariat_minutes (meeting_id, revision_no, status, prepared_by, prepared_by_label)
        SELECT inserted.id, 1, 'draft', ${identity.userId}, ${identity.name}
        FROM inserted
        RETURNING id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          inserted.organization_id,
          ${identity.userId},
          'secretariat_meeting.created',
          'secretariat_meeting',
          inserted.id::text,
          jsonb_build_object(
            'reference_no', inserted.reference_no,
            'title', inserted.title,
            'meeting_date', inserted.meeting_date,
            'status', inserted.status
          )
        FROM inserted
        INNER JOIN draft_minutes ON true
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-meeting-create", error);
    redirect("/app/sekretariat/rapat?result=error");
  }

  if (!created) redirect("/app/sekretariat/rapat?result=unavailable");
  revalidatePath("/app/sekretariat/rapat");
  revalidatePath("/app/sekretariat/agenda");
  revalidatePath("/app/sekretariat/notulen");
  redirect("/app/sekretariat/rapat?result=created");
}

export async function updateSecretariatMeetingStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:meetings:write");
  const id = String(formData.get("id") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();

  if (!validUuid(id) || !["completed", "cancelled"].includes(next)) {
    redirect("/app/sekretariat/rapat?result=invalid");
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.secretariat_meetings
        SET
          status = ${next},
          updated_by = ${identity.userId},
          updated_at = now(),
          completed_at = CASE WHEN ${next} = 'completed' THEN now() ELSE NULL END,
          cancelled_at = CASE WHEN ${next} = 'cancelled' THEN now() ELSE NULL END
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND status = 'scheduled'
        RETURNING id, organization_id, reference_no, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'secretariat_meeting.status.' || status,
          'secretariat_meeting',
          id::text,
          jsonb_build_object('reference_no', reference_no, 'status', status)
        FROM updated
        RETURNING id
      )
      SELECT updated.id
      FROM updated
      INNER JOIN audit ON true
    `;
    changed = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-meeting-status", error);
    redirect("/app/sekretariat/rapat?result=error");
  }

  if (!changed) redirect("/app/sekretariat/rapat?result=stale");
  revalidatePath("/app/sekretariat/rapat");
  revalidatePath("/app/sekretariat/agenda");
  redirect("/app/sekretariat/rapat?result=updated");
}

export async function saveSecretariatMinutes(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:minutes:write");
  const meetingId = String(formData.get("meeting_id") ?? "").trim();
  const opening = String(formData.get("opening_notes") ?? "").trim();
  const discussion = String(formData.get("discussion_notes") ?? "").trim();
  const closing = String(formData.get("closing_notes") ?? "").trim();

  if (!validUuid(meetingId) || opening.length > 10000 || discussion.length > 30000 || closing.length > 10000) {
    redirect("/app/sekretariat/notulen?result=invalid");
  }

  let saved = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH updated AS (
        UPDATE v9.secretariat_minutes AS minutes
        SET
          opening_notes = NULLIF(${opening}, ''),
          discussion_notes = NULLIF(${discussion}, ''),
          closing_notes = NULLIF(${closing}, ''),
          prepared_by = ${identity.userId},
          prepared_by_label = ${identity.name},
          updated_at = now()
        FROM v9.secretariat_meetings AS meeting
        WHERE meeting.id = ${meetingId}
          AND meeting.organization_id = ${identity.organizationId}
          AND meeting.status <> 'cancelled'
          AND minutes.meeting_id = meeting.id
          AND minutes.status = 'draft'
        RETURNING minutes.id, minutes.meeting_id, minutes.revision_no
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_minutes.draft_saved',
          'secretariat_minutes',
          updated.id::text,
          jsonb_build_object('meeting_id', updated.meeting_id, 'revision_no', updated.revision_no)
        FROM updated
        RETURNING id
      )
      SELECT updated.id
      FROM updated
      INNER JOIN audit ON true
    `;
    saved = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-minutes-save", error);
    redirect("/app/sekretariat/notulen?result=error");
  }

  if (!saved) redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=revision-required`);
  revalidatePath("/app/sekretariat/notulen");
  redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=saved`);
}
export async function addSecretariatDecision(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:minutes:write");
  const meetingId = String(formData.get("meeting_id") ?? "").trim();
  const decisionText = String(formData.get("decision_text") ?? "").trim();
  const responsible = String(formData.get("responsible_label") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();

  if (!validUuid(meetingId) || decisionText.length < 3 || decisionText.length > 3000 ||
      responsible.length > 160 || (dueDate && !validDate(dueDate))) {
    redirect("/app/sekretariat/notulen?result=invalid");
  }

  let added = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target_meeting AS (
        SELECT meeting.id
        FROM v9.secretariat_meetings AS meeting
        WHERE meeting.id = ${meetingId}
          AND meeting.organization_id = ${identity.organizationId}
          AND meeting.status <> 'cancelled'
      ),
      current_draft AS (
        SELECT minutes.id, minutes.meeting_id
        FROM v9.secretariat_minutes AS minutes
        INNER JOIN target_meeting ON target_meeting.id = minutes.meeting_id
        WHERE minutes.status = 'draft'
        FOR UPDATE OF minutes
      ),
      next_order AS (
        SELECT current_draft.id AS minutes_id,
          COALESCE((SELECT max(order_no) FROM v9.secretariat_meeting_decisions AS decisions
            WHERE decisions.minutes_id = current_draft.id), 0) + 1 AS order_no
        FROM current_draft
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO v9.secretariat_meeting_decisions (
          minutes_id, order_no, decision_text, responsible_label, due_date, created_by, updated_by
        )
        SELECT
          next_order.minutes_id,
          next_order.order_no,
          ${decisionText},
          NULLIF(${responsible}, ''),
          NULLIF(${dueDate}, '')::date,
          ${identity.userId},
          ${identity.userId}
        FROM next_order
        RETURNING id, minutes_id, order_no, decision_text
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_meeting_decision.created',
          'secretariat_meeting_decision',
          inserted.id::text,
          jsonb_build_object('minutes_id', inserted.minutes_id, 'order_no', inserted.order_no, 'decision_text', inserted.decision_text)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id FROM inserted INNER JOIN audit ON true
    `;
    added = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-decision-add", error);
    redirect("/app/sekretariat/notulen?result=error");
  }

  if (!added) redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=revision-required`);
  revalidatePath("/app/sekretariat/notulen");
  redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=decision-added`);
}
export async function finalizeSecretariatMinutes(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:minutes:write");
  const meetingId = String(formData.get("meeting_id") ?? "").trim();

  if (!validUuid(meetingId)) redirect("/app/sekretariat/notulen?result=invalid");

  let finalized = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        SELECT minutes.id, minutes.meeting_id, minutes.revision_no
        FROM v9.secretariat_minutes AS minutes
        INNER JOIN v9.secretariat_meetings AS meeting
          ON meeting.id = minutes.meeting_id
        WHERE meeting.id = ${meetingId}
          AND meeting.organization_id = ${identity.organizationId}
          AND meeting.status = 'completed'
          AND minutes.status = 'draft'
        FOR UPDATE OF minutes
      ),
      ready AS (
        SELECT target.*
        FROM target
        INNER JOIN v9.secretariat_minutes AS minutes ON minutes.id = target.id
        WHERE length(trim(
          COALESCE(minutes.opening_notes, '') ||
          COALESCE(minutes.discussion_notes, '') ||
          COALESCE(minutes.closing_notes, '')
        )) > 0
        OR EXISTS (
          SELECT 1 FROM v9.secretariat_meeting_decisions AS decisions
          WHERE decisions.minutes_id = target.id
        )
      ),
      updated AS (
        UPDATE v9.secretariat_minutes AS minutes
        SET
          status = 'final',
          finalized_by = ${identity.userId},
          finalized_at = now(),
          updated_at = now()
        FROM ready
        WHERE minutes.id = ready.id
        RETURNING minutes.id, minutes.meeting_id, minutes.revision_no
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_minutes.finalized',
          'secretariat_minutes',
          updated.id::text,
          jsonb_build_object('meeting_id', updated.meeting_id, 'revision_no', updated.revision_no)
        FROM updated
        RETURNING id
      )
      SELECT updated.id FROM updated INNER JOIN audit ON true
    `;
    finalized = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-minutes-finalize", error);
    redirect("/app/sekretariat/notulen?result=error");
  }

  if (!finalized) redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=not-ready`);
  revalidatePath("/app/sekretariat/notulen");
  revalidatePath("/app/sekretariat/rapat");
  redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=finalized`);
}

export async function createSecretariatMinutesRevision(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:minutes:write");
  const meetingId = String(formData.get("meeting_id") ?? "").trim();

  if (!validUuid(meetingId)) redirect("/app/sekretariat/notulen?result=invalid");

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target_meeting AS (
        SELECT id
        FROM v9.secretariat_meetings
        WHERE id = ${meetingId}
          AND organization_id = ${identity.organizationId}
          AND status <> 'cancelled'
      ),
      latest_final AS (
        SELECT minutes.*
        FROM v9.secretariat_minutes AS minutes
        INNER JOIN target_meeting ON target_meeting.id = minutes.meeting_id
        WHERE minutes.status = 'final'
        ORDER BY minutes.revision_no DESC
        LIMIT 1
      ),
      new_revision AS (
        INSERT INTO v9.secretariat_minutes (
          meeting_id, revision_no, status, opening_notes,
          discussion_notes, closing_notes, prepared_by, prepared_by_label
        )
        SELECT
          latest_final.meeting_id,
          (SELECT COALESCE(max(revision_no), 0) + 1
            FROM v9.secretariat_minutes
            WHERE meeting_id = latest_final.meeting_id),
          'draft',
          latest_final.opening_notes,
          latest_final.discussion_notes,
          latest_final.closing_notes,
          ${identity.userId},
          ${identity.name}
        FROM latest_final
        WHERE NOT EXISTS (
          SELECT 1 FROM v9.secretariat_minutes AS current_draft
          WHERE current_draft.meeting_id = latest_final.meeting_id
            AND current_draft.status = 'draft'
        )
        RETURNING id, meeting_id, revision_no
      ),
      copied_decisions AS (
        INSERT INTO v9.secretariat_meeting_decisions (
          minutes_id, order_no, decision_text, responsible_label, due_date,
          status, created_by, updated_by
        )
        SELECT
          new_revision.id,
          old_decisions.order_no,
          old_decisions.decision_text,
          old_decisions.responsible_label,
          old_decisions.due_date,
          old_decisions.status,
          ${identity.userId},
          ${identity.userId}
        FROM new_revision
        INNER JOIN latest_final ON latest_final.meeting_id = new_revision.meeting_id
        INNER JOIN v9.secretariat_meeting_decisions AS old_decisions
          ON old_decisions.minutes_id = latest_final.id
        RETURNING id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_minutes.revision_created',
          'secretariat_minutes',
          new_revision.id::text,
          jsonb_build_object('meeting_id', new_revision.meeting_id, 'revision_no', new_revision.revision_no)
        FROM new_revision
        RETURNING id
      )
      SELECT new_revision.id
      FROM new_revision
      LEFT JOIN audit ON true
    `;
    created = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-minutes-revision", error);
    redirect("/app/sekretariat/notulen?result=error");
  }

  if (!created) redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=revision-blocked`);
  revalidatePath("/app/sekretariat/notulen");
  redirect(`/app/sekretariat/notulen?meeting_id=${meetingId}&result=revision-created`);
}

export async function recordSecretariatAttendance(formData: FormData): Promise<void> {
  const identity = await requireIdentity("secretariat:attendance:write");
  const meetingId = String(formData.get("meeting_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim().replace(/\s+/g, " ");
  const guestRole = String(formData.get("guest_role") ?? "").trim();
  const status = String(formData.get("attendance_status") ?? "hadir").trim();
  const note = String(formData.get("attendance_note") ?? "").trim();
  const signatureRecorded = formData.get("signature_recorded") === "on";

  if (!validUuid(meetingId) || (membershipId && !validUuid(membershipId)) ||
      !["hadir", "izin", "sakit", "alpa"].includes(status) ||
      (membershipId && guestName) || (!membershipId && guestName.length < 2) ||
      guestName.length > 160 || guestRole.length > 160 || note.length > 1000) {
    redirect(`/app/sekretariat/presensi?meeting_id=${meetingId}&result=invalid`);
  }

  let saved = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH meeting AS (
        SELECT id
        FROM v9.secretariat_meetings
        WHERE id = ${meetingId}
          AND organization_id = ${identity.organizationId}
          AND status <> 'cancelled'
      ),
      member AS (
        SELECT membership.id, membership.person_id, person.full_name,
          COALESCE(membership.position_title, 'Anggota') AS role_label
        FROM v9.memberships AS membership
        INNER JOIN v9.people AS person ON person.id = membership.person_id
        WHERE membership.id = NULLIF(${membershipId}, '')::uuid
          AND membership.organization_id = ${identity.organizationId}
          AND membership.status IN ('pending', 'active')
      ),
      source AS (
        SELECT meeting.id AS meeting_id, member.person_id, member.id AS membership_id,
          member.full_name AS display_name, member.role_label
        FROM meeting
        INNER JOIN member ON NULLIF(${membershipId}, '') IS NOT NULL
        UNION ALL
        SELECT meeting.id, NULL::uuid, NULL::uuid, ${guestName}, NULLIF(${guestRole}, '')
        FROM meeting
        WHERE NULLIF(${membershipId}, '') IS NULL
          AND length(btrim(${guestName})) >= 2
      ),
      upserted AS (
        INSERT INTO v9.secretariat_meeting_attendance (
          meeting_id, person_id, membership_id, display_name, role_label,
          attendance_status, attendance_note, signature_recorded, recorded_by
        )
        SELECT
          source.meeting_id,
          source.person_id,
          source.membership_id,
          source.display_name,
          COALESCE(NULLIF(${guestRole}, ''), source.role_label),
          ${status},
          NULLIF(${note}, ''),
          ${signatureRecorded},
          ${identity.userId}
        FROM source
        ON CONFLICT DO UPDATE SET
          attendance_status = EXCLUDED.attendance_status,
          attendance_note = EXCLUDED.attendance_note,
          signature_recorded = EXCLUDED.signature_recorded,
          recorded_by = EXCLUDED.recorded_by,
          updated_at = now()
        RETURNING id, meeting_id, display_name, attendance_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId},
          ${identity.userId},
          'secretariat_meeting_attendance.recorded',
          'secretariat_meeting_attendance',
          upserted.id::text,
          jsonb_build_object(
            'meeting_id', upserted.meeting_id,
            'display_name', upserted.display_name,
            'attendance_status', upserted.attendance_status
          )
        FROM upserted
        RETURNING id
      )
      SELECT upserted.id FROM upserted INNER JOIN audit ON true
    `;
    saved = rowsFromResult<{ id: string }>(result).length === 1;
  } catch (error) {
    logFailure("secretariat-attendance", error);
    redirect(`/app/sekretariat/presensi?meeting_id=${meetingId}&result=error`);
  }

  if (!saved) redirect(`/app/sekretariat/presensi?meeting_id=${meetingId}&result=stale`);
  revalidatePath("/app/sekretariat/presensi");
  revalidatePath("/app/sekretariat/rapat");
  redirect(`/app/sekretariat/presensi?meeting_id=${meetingId}&result=saved`);
}
