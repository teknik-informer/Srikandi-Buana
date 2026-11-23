"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string };

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

function path(result: string, sessionId?: string): string {
  const query = new URLSearchParams({ result });
  if (sessionId && validUuid(sessionId)) query.set("session_id", sessionId);
  return `/app/bidang/pelatihan/data?${query.toString()}`;
}

function ensureTrainingWrite(identity: Awaited<ReturnType<typeof requireIdentity>>): void {
  if (!can(identity, "field:pelatihan:data:write")) redirect("/app");
}

function logFailure(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function refreshTraining(): void {
  revalidatePath("/app/bidang/pelatihan");
  revalidatePath("/app/bidang/pelatihan/data");
  revalidatePath("/app/bidang/pelatihan/rencana");
  revalidatePath("/app/bidang/pelatihan/laporan");
}

export async function createTrainingSession(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  ensureTrainingWrite(identity);

  const title = normalize(String(formData.get("title") ?? ""));
  const programId = String(formData.get("program_id") ?? "").trim();
  const topic = normalize(String(formData.get("topic") ?? ""));
  const sessionDate = String(formData.get("session_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const location = normalize(String(formData.get("location") ?? ""));
  const trainer = normalize(String(formData.get("trainer_label") ?? ""));
  const capacityText = String(formData.get("max_participants") ?? "").trim();
  const capacity = capacityText === "" ? null : Number(capacityText);
  const description = String(formData.get("description") ?? "").trim();

  if (
    title.length < 3 || title.length > 300 ||
    (programId && !validUuid(programId)) ||
    topic.length > 240 || !validDate(sessionDate) ||
    (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) ||
    (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) ||
    (startTime && endTime && endTime <= startTime) ||
    location.length > 300 || trainer.length > 160 ||
    (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 50000)) ||
    description.length > 5000
  ) {
    redirect(path("invalid"));
  }

  let created: MutationRow | undefined;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.training_sessions (
          organization_id, field_key, program_id, title, topic, session_date,
          start_time, end_time, location, trainer_label, max_participants,
          description, status, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          program.id,
          ${title},
          NULLIF(${topic}, ''),
          ${sessionDate}::date,
          NULLIF(${startTime}, '')::time,
          NULLIF(${endTime}, '')::time,
          NULLIF(${location}, ''),
          NULLIF(${trainer}, ''),
          ${capacity},
          NULLIF(${description}, ''),
          'planned',
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        LEFT JOIN v9.field_programs AS program
          ON program.id = NULLIF(${programId}, '')::uuid
          AND program.organization_id = application.organization_id
          AND program.field_key = application.field_key
          AND program.status <> 'cancelled'
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'pelatihan'
          AND application.is_enabled = true
          AND (NULLIF(${programId}, '') IS NULL OR program.id IS NOT NULL)
        RETURNING id, organization_id, field_key, reference_no, title, session_date, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'training_session.created',
          'training_session',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'reference_no', reference_no,
            'title', title,
            'session_date', session_date,
            'status', status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result)[0];
  } catch (reason) {
    logFailure("training-session-create", reason);
    redirect(path("error"));
  }

  if (!created) redirect(path("program-unavailable"));
  refreshTraining();
  redirect(path("session-created", created.id));
}

export async function updateTrainingSessionStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  ensureTrainingWrite(identity);

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();
  if (!validUuid(sessionId) || !["registration_open","in_progress","completed","cancelled"].includes(nextStatus)) {
    redirect(path("invalid", sessionId));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.training_sessions
        SET
          status = ${nextStatus},
          updated_by = ${identity.userId},
          updated_at = now(),
          completed_at = CASE WHEN ${nextStatus} = 'completed' THEN now() ELSE NULL END,
          cancelled_at = CASE WHEN ${nextStatus} = 'cancelled' THEN now() ELSE NULL END
        WHERE id = ${sessionId}
          AND organization_id = ${identity.organizationId}
          AND field_key = 'pelatihan'
          AND (
            (status = 'planned' AND ${nextStatus} IN ('registration_open','cancelled'))
            OR (status = 'registration_open' AND ${nextStatus} IN ('in_progress','cancelled'))
            OR (
              status = 'in_progress'
              AND ${nextStatus} = 'cancelled'
            )
            OR (
              status = 'in_progress'
              AND ${nextStatus} = 'completed'
              AND session_date <= current_date
              AND EXISTS (
                SELECT 1
                FROM v9.training_enrollments AS enrollment
                WHERE enrollment.session_id = v9.training_sessions.id
                  AND enrollment.organization_id = v9.training_sessions.organization_id
                  AND enrollment.registration_status <> 'cancelled'
                  AND enrollment.attendance_status = 'hadir'
              )
            )
          )
        RETURNING id, organization_id, field_key, reference_no, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'training_session.status.' || status,
          'training_session', id::text,
          jsonb_build_object('field_key', field_key, 'reference_no', reference_no, 'title', title, 'status', status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("training-session-status", reason);
    redirect(path("error", sessionId));
  }

  if (!changed) redirect(path("session-transition-blocked", sessionId));
  refreshTraining();
  redirect(path("session-updated", sessionId));
}

export async function enrollTrainingParticipant(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  ensureTrainingWrite(identity);

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const participantName = normalize(String(formData.get("participant_name") ?? ""));
  const affiliation = normalize(String(formData.get("affiliation_label") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (
    !validUuid(sessionId) ||
    (membershipId && !validUuid(membershipId)) ||
    (!membershipId && participantName.length < 2) ||
    participantName.length > 160 ||
    affiliation.length > 160 ||
    note.length > 1000
  ) {
    redirect(path("invalid", sessionId));
  }

  let enrolled = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        SELECT
          session.id,
          session.organization_id,
          session.field_key,
          session.max_participants
        FROM v9.training_sessions AS session
        WHERE session.id = ${sessionId}
          AND session.organization_id = ${identity.organizationId}
          AND session.field_key = 'pelatihan'
          AND session.status = 'registration_open'
        FOR UPDATE
      ),
      member AS (
        SELECT membership.id, person.full_name
        FROM v9.memberships AS membership
        INNER JOIN v9.people AS person ON person.id = membership.person_id
        WHERE membership.id = NULLIF(${membershipId}, '')::uuid
          AND membership.organization_id = ${identity.organizationId}
          AND membership.status = 'active'
      ),
      capacity AS (
        SELECT
          target.id AS session_id,
          target.organization_id,
          target.field_key,
          CASE
            WHEN target.max_participants IS NULL THEN 'registered'
            WHEN (
              SELECT count(*)
              FROM v9.training_enrollments AS enrollment
              WHERE enrollment.session_id = target.id
                AND enrollment.registration_status IN ('registered','confirmed')
            ) < target.max_participants THEN 'registered'
            ELSE 'waitlisted'
          END AS registration_status
        FROM target
      ),
      inserted AS (
        INSERT INTO v9.training_enrollments (
          organization_id, field_key, session_id, membership_id,
          participant_name, affiliation_label, registration_status,
          attendance_status, recorded_by, note
        )
        SELECT
          capacity.organization_id,
          capacity.field_key,
          capacity.session_id,
          member.id,
          COALESCE(member.full_name, ${participantName}),
          NULLIF(${affiliation}, ''),
          capacity.registration_status,
          'not_marked',
          ${identity.userId},
          NULLIF(${note}, '')
        FROM capacity
        LEFT JOIN member ON NULLIF(${membershipId}, '') IS NOT NULL
        WHERE NULLIF(${membershipId}, '') IS NULL OR member.id IS NOT NULL
        RETURNING id, organization_id, field_key, session_id, membership_id,
          participant_name, registration_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'training_enrollment.created',
          'training_enrollment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'session_id', session_id,
            'membership_id', membership_id,
            'participant_name', participant_name,
            'registration_status', registration_status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    enrolled = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("training-enrollment-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(path("duplicate-participant", sessionId));
    redirect(path("error", sessionId));
  }

  if (!enrolled) redirect(path("session-closed-or-member-unavailable", sessionId));
  refreshTraining();
  redirect(path("participant-enrolled", sessionId));
}

export async function updateTrainingAttendance(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  ensureTrainingWrite(identity);

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const attendanceStatus = String(formData.get("attendance_status") ?? "").trim();
  if (
    !validUuid(sessionId) || !validUuid(enrollmentId) ||
    !["hadir","izin","sakit","alpa"].includes(attendanceStatus)
  ) {
    redirect(path("invalid", sessionId));
  }

  let updated = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.training_enrollments AS enrollment
        SET
          attendance_status = ${attendanceStatus},
          attendance_recorded_by = ${identity.userId},
          attendance_recorded_at = now(),
          updated_at = now()
        FROM v9.training_sessions AS session
        WHERE enrollment.id = ${enrollmentId}
          AND enrollment.session_id = ${sessionId}
          AND enrollment.organization_id = ${identity.organizationId}
          AND enrollment.field_key = 'pelatihan'
          AND enrollment.registration_status <> 'cancelled'
          AND session.id = enrollment.session_id
          AND session.organization_id = enrollment.organization_id
          AND session.field_key = enrollment.field_key
          AND session.status IN ('in_progress','completed')
        RETURNING enrollment.id, enrollment.organization_id, enrollment.field_key,
          enrollment.session_id, enrollment.participant_name, enrollment.attendance_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'training_attendance.' || attendance_status,
          'training_enrollment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'session_id', session_id,
            'participant_name', participant_name,
            'attendance_status', attendance_status
          )
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    updated = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("training-attendance-update", reason);
    redirect(path("error", sessionId));
  }

  if (!updated) redirect(path("attendance-session-not-ready", sessionId));
  refreshTraining();
  redirect(path("attendance-updated", sessionId));
}

export async function recordTrainingAssessment(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  ensureTrainingWrite(identity);

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const assessmentType = String(formData.get("assessment_type") ?? "").trim();
  const scoreText = String(formData.get("score") ?? "").trim();
  const score = Number(scoreText);
  const assessmentNote = String(formData.get("assessment_note") ?? "").trim();

  if (
    !validUuid(sessionId) || !validUuid(enrollmentId) ||
    !["pre","post"].includes(assessmentType) ||
    !Number.isFinite(score) || score < 0 || score > 100 ||
    assessmentNote.length > 2000
  ) {
    redirect(path("invalid", sessionId));
  }

  let recorded = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        SELECT
          enrollment.id,
          enrollment.organization_id,
          enrollment.field_key,
          enrollment.session_id,
          enrollment.attendance_status,
          session.status AS session_status
        FROM v9.training_enrollments AS enrollment
        INNER JOIN v9.training_sessions AS session
          ON session.id = enrollment.session_id
          AND session.organization_id = enrollment.organization_id
          AND session.field_key = enrollment.field_key
        WHERE enrollment.id = ${enrollmentId}
          AND enrollment.session_id = ${sessionId}
          AND enrollment.organization_id = ${identity.organizationId}
          AND enrollment.field_key = 'pelatihan'
          AND enrollment.registration_status <> 'cancelled'
          AND session.status IN ('in_progress','completed')
          AND enrollment.attendance_status = 'hadir'
          AND (
            ${assessmentType} <> 'post'
            OR session.status = 'completed'
          )
      ),
      saved AS (
        INSERT INTO v9.training_assessments (
          organization_id, field_key, enrollment_id, assessment_type,
          score, assessment_note, assessed_by
        )
        SELECT
          target.organization_id,
          target.field_key,
          target.id,
          ${assessmentType},
          ${score},
          NULLIF(${assessmentNote}, ''),
          ${identity.userId}
        FROM target
        ON CONFLICT (enrollment_id, assessment_type)
        DO UPDATE SET
          score = EXCLUDED.score,
          assessment_note = EXCLUDED.assessment_note,
          assessed_by = EXCLUDED.assessed_by,
          assessed_at = now(),
          updated_at = now()
        RETURNING id, organization_id, field_key, enrollment_id, assessment_type, score
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'training_assessment.' || assessment_type,
          'training_assessment',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'enrollment_id', enrollment_id,
            'assessment_type', assessment_type,
            'score', score
          )
        FROM saved
        RETURNING id
      )
      SELECT saved.id::text AS id
      FROM saved
      INNER JOIN audit ON true
    `;
    recorded = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("training-assessment-save", reason);
    redirect(path("error", sessionId));
  }

  if (!recorded) redirect(path("assessment-not-ready", sessionId));
  refreshTraining();
  redirect(path("assessment-saved", sessionId));
}

export async function issueTrainingCertificate(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  if (!can(identity, "field:pelatihan:certificate:issue")) redirect("/app");

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const issueDate = String(formData.get("issue_date") ?? "").trim();
  const issuer = normalize(String(formData.get("issuer_label") ?? ""));

  if (!validUuid(sessionId) || !validUuid(enrollmentId) || !validDate(issueDate) || issuer.length < 2 || issuer.length > 160) {
    redirect(path("invalid", sessionId));
  }

  let issued = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH eligible AS (
        SELECT enrollment.id, enrollment.organization_id, enrollment.field_key,
          enrollment.session_id, enrollment.participant_name
        FROM v9.training_enrollments AS enrollment
        INNER JOIN v9.training_sessions AS session
          ON session.id = enrollment.session_id
          AND session.organization_id = enrollment.organization_id
          AND session.field_key = enrollment.field_key
        WHERE enrollment.id = ${enrollmentId}
          AND enrollment.session_id = ${sessionId}
          AND enrollment.organization_id = ${identity.organizationId}
          AND enrollment.field_key = 'pelatihan'
          AND enrollment.registration_status <> 'cancelled'
          AND enrollment.attendance_status = 'hadir'
          AND session.status = 'completed'
          AND ${issueDate}::date >= session.session_date
      ),
      inserted AS (
        INSERT INTO v9.training_certificates (
          organization_id, field_key, enrollment_id, issue_date, issuer_label, issued_by
        )
        SELECT
          eligible.organization_id,
          eligible.field_key,
          eligible.id,
          ${issueDate}::date,
          ${issuer},
          ${identity.userId}
        FROM eligible
        RETURNING id, organization_id, field_key, enrollment_id, reference_no, issue_date, issuer_label
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'training_certificate.issued',
          'training_certificate',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'enrollment_id', enrollment_id,
            'reference_no', reference_no,
            'issue_date', issue_date,
            'issuer_label', issuer_label
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    issued = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("training-certificate-issue", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(path("certificate-exists", sessionId));
    redirect(path("error", sessionId));
  }

  if (!issued) redirect(path("certificate-not-eligible", sessionId));
  refreshTraining();
  redirect(path("certificate-issued", sessionId));
}

export async function revokeTrainingCertificate(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  if (!can(identity, "organization:team:approve")) redirect("/app");

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const certificateId = String(formData.get("certificate_id") ?? "").trim();
  const reason = String(formData.get("revocation_note") ?? "").trim();

  if (!validUuid(sessionId) || !validUuid(certificateId) || reason.length < 3 || reason.length > 1000) {
    redirect(path("invalid", sessionId));
  }

  let revoked = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.training_certificates AS certificate
        SET
          status = 'revoked',
          revoked_by = ${identity.userId},
          revoked_at = now(),
          revocation_note = ${reason},
          updated_at = now()
        WHERE certificate.id = ${certificateId}
          AND certificate.organization_id = ${identity.organizationId}
          AND certificate.field_key = 'pelatihan'
          AND certificate.status = 'issued'
          AND EXISTS (
            SELECT 1
            FROM v9.training_enrollments AS enrollment
            WHERE enrollment.id = certificate.enrollment_id
              AND enrollment.session_id = ${sessionId}
              AND enrollment.organization_id = certificate.organization_id
          )
        RETURNING certificate.id, certificate.organization_id, certificate.field_key,
          certificate.enrollment_id, certificate.reference_no, certificate.revocation_note
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'training_certificate.revoked',
          'training_certificate', id::text,
          jsonb_build_object('field_key', field_key, 'enrollment_id', enrollment_id,
            'reference_no', reference_no, 'revocation_note', revocation_note)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    revoked = rowsFromResult<MutationRow>(result).length === 1;
  } catch (error) {
    logFailure("training-certificate-revoke", error);
    redirect(path("error", sessionId));
  }

  if (!revoked) redirect(path("certificate-stale", sessionId));
  refreshTraining();
  redirect(path("certificate-revoked", sessionId));
}

export async function cancelTrainingEnrollment(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pelatihan:read");
  ensureTrainingWrite(identity);

  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  if (!validUuid(enrollmentId)) redirect(path("invalid"));

  let cancelled = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH target AS (
        SELECT
          enrollment.id,
          enrollment.session_id,
          enrollment.organization_id,
          enrollment.field_key,
          enrollment.registration_status AS previous_status
        FROM v9.training_enrollments AS enrollment
        INNER JOIN v9.training_sessions AS session
          ON session.id = enrollment.session_id
          AND session.organization_id = enrollment.organization_id
          AND session.field_key = enrollment.field_key
        WHERE enrollment.id = ${enrollmentId}
          AND enrollment.organization_id = ${identity.organizationId}
          AND enrollment.field_key = 'pelatihan'
          AND enrollment.registration_status IN ('registered','confirmed','waitlisted')
          AND enrollment.attendance_status = 'not_marked'
          AND session.status = 'registration_open'
        FOR UPDATE OF session, enrollment
      ),
      changed AS (
        UPDATE v9.training_enrollments AS enrollment
        SET
          registration_status = 'cancelled',
          updated_at = now()
        FROM target
        WHERE enrollment.id = target.id
        RETURNING enrollment.id, enrollment.organization_id, enrollment.field_key,
          enrollment.session_id, enrollment.participant_name
      ),
      next_waitlist AS (
        SELECT
          candidate.id,
          changed.session_id
        FROM changed
        INNER JOIN target ON target.id = changed.id
        INNER JOIN v9.training_enrollments AS candidate
          ON candidate.session_id = changed.session_id
          AND candidate.organization_id = changed.organization_id
          AND candidate.field_key = changed.field_key
        WHERE target.previous_status IN ('registered','confirmed')
          AND candidate.registration_status = 'waitlisted'
          AND candidate.attendance_status = 'not_marked'
        ORDER BY candidate.registered_at, candidate.id
        LIMIT 1
        FOR UPDATE OF candidate SKIP LOCKED
      ),
      promoted AS (
        UPDATE v9.training_enrollments AS enrollment
        SET
          registration_status = 'registered',
          updated_at = now()
        FROM next_waitlist
        WHERE enrollment.id = next_waitlist.id
        RETURNING enrollment.id, enrollment.organization_id, enrollment.field_key,
          enrollment.session_id, enrollment.participant_name
      ),
      audit_rows AS (
        SELECT
          changed.organization_id,
          changed.id,
          'training_enrollment.cancelled'::text AS action,
          changed.session_id,
          changed.participant_name
        FROM changed
        UNION ALL
        SELECT
          promoted.organization_id,
          promoted.id,
          'training_enrollment.promoted_from_waitlist'::text AS action,
          promoted.session_id,
          promoted.participant_name
        FROM promoted
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          audit_rows.organization_id,
          ${identity.userId},
          audit_rows.action,
          'training_enrollment',
          audit_rows.id::text,
          jsonb_build_object(
            'field_key', 'pelatihan',
            'session_id', audit_rows.session_id,
            'participant_name', audit_rows.participant_name
          )
        FROM audit_rows
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      WHERE EXISTS (SELECT 1 FROM audit)
    `;
    cancelled = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("training-enrollment-cancel", reason);
    redirect(path("error"));
  }

  if (!cancelled) redirect(path("enrollment-cancel-blocked"));
  refreshTraining();
  redirect(path("participant-cancelled"));
}
