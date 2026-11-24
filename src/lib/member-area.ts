import "server-only";

import { getV9Sql, rowsFromResult } from "@/lib/db";
import type { AppIdentity } from "@/lib/identity";

export interface MemberProfileSummary {
  personId: string;
  legalName: string;
  preferredName: string | null;
  memberNumber: string | null;
  village: string | null;
  membershipId: string | null;
  membershipStatus: string | null;
  joinedOn: string | null;
}

export interface MemberEventItem {
  id: string;
  title: string;
  date: string;
  timeLabel: string | null;
  location: string | null;
  kind: "kegiatan" | "rapat";
  referenceNo: string;
}

export interface MemberTrainingItem {
  id: string;
  referenceNo: string;
  title: string;
  topic: string | null;
  date: string;
  startTime: string | null;
  location: string | null;
  trainer: string | null;
  maxParticipants: number | null;
  registeredCount: number;
  status: "planned" | "registration_open";
  registrationStatus: "registered" | "confirmed" | "waitlisted" | "cancelled" | null;
  attendanceStatus: "not_marked" | "hadir" | "izin" | "sakit" | "alpa" | null;
}

export interface MemberTaskItem {
  id: string;
  referenceNo: string;
  title: string;
  fieldKey: string;
  dueDate: string | null;
  priority: "tinggi" | "sedang" | "rendah";
  status: "belum" | "proses" | "selesai" | "dibatalkan";
  isOverdue: boolean;
}

export interface MemberAreaData {
  profile: MemberProfileSummary | null;
  events: MemberEventItem[];
  trainings: MemberTrainingItem[];
  tasks: MemberTaskItem[];
  errors: ("profile" | "events" | "trainings" | "tasks")[];
}

function warn(area: string, reason: unknown): void {
  const errorType =
    reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
  console.warn(`[${area}] Source unavailable`, errorType);
}

export async function loadMemberAreaData(identity: AppIdentity): Promise<MemberAreaData> {
  const data: MemberAreaData = {
    profile: null,
    events: [],
    trainings: [],
    tasks: [],
    errors: [],
  };

  let sql;
  try {
    sql = getV9Sql();
  } catch (reason) {
    warn("member-area-connection", reason);
    data.errors = ["profile", "events", "trainings", "tasks"];
    return data;
  }

  const profileJob = (async () => {
    try {
      const rows = rowsFromResult<{
        person_id: string;
        full_name: string;
        preferred_name: string | null;
        member_number: string | null;
        village: string | null;
        membership_id: string | null;
        membership_status: string | null;
        joined_on: string | null;
      }>(await sql`
        SELECT
          person.id::text AS person_id,
          person.full_name,
          person.preferred_name,
          person.village,
          membership.id::text AS membership_id,
          membership.member_number,
          membership.status AS membership_status,
          to_char(membership.valid_from, 'YYYY-MM-DD') AS joined_on
        FROM v9.user_accounts AS account
        INNER JOIN v9.people AS person
          ON person.id = account.person_id
        LEFT JOIN LATERAL (
          SELECT
            member.id,
            member.member_number,
            member.status,
            member.valid_from
          FROM v9.memberships AS member
          WHERE member.person_id = person.id
            AND member.organization_id = ${identity.organizationId}
          ORDER BY
            CASE
              WHEN member.status = 'active'
                AND (member.valid_from IS NULL OR member.valid_from <= current_date)
                AND (member.valid_until IS NULL OR member.valid_until >= current_date)
                THEN 0
              WHEN member.status = 'pending' THEN 1
              WHEN member.status = 'inactive' THEN 2
              WHEN member.status = 'left' THEN 3
              ELSE 4
            END,
            member.created_at DESC
          LIMIT 1
        ) AS membership ON true
        WHERE account.id = ${identity.userId}
          AND person.status = 'active'
        LIMIT 1
      `);
      const row = rows[0];
      if (row) {
        data.profile = {
          personId: row.person_id,
          legalName: row.full_name,
          preferredName: row.preferred_name,
          memberNumber: row.member_number,
          village: row.village,
          membershipId:
            row.membership_status === "active" ? row.membership_id : null,
          membershipStatus: row.membership_status,
          joinedOn: row.joined_on,
        };
      }
    } catch (reason) {
      warn("member-area-profile", reason);
      data.errors.push("profile");
    }
  })();

  const eventsJob = (async () => {
    try {
      const rows = rowsFromResult<MemberEventItem>(await sql`
        SELECT
          activity.id::text AS id,
          activity.title,
          to_char(activity.activity_date, 'YYYY-MM-DD') AS date,
          CASE
            WHEN activity.start_time IS NULL THEN NULL
            ELSE to_char(activity.start_time, 'HH24:MI')
          END AS time_label,
          activity.location,
          'kegiatan'::text AS kind,
          activity.reference_no
        FROM v9.field_activities AS activity
        WHERE activity.organization_id = ${identity.organizationId}
          AND activity.open_to_public = true
          AND activity.status IN ('scheduled', 'in_progress')
          AND activity.activity_date >= current_date

        UNION ALL

        SELECT
          meeting.id::text AS id,
          meeting.title,
          to_char(meeting.meeting_date, 'YYYY-MM-DD') AS date,
          meeting.time_label,
          meeting.location,
          'rapat'::text AS kind,
          meeting.reference_no
        FROM v9.secretariat_meetings AS meeting
        WHERE meeting.organization_id = ${identity.organizationId}
          AND meeting.meeting_type = 'anggota'
          AND meeting.open_to_public = true
          AND meeting.status = 'scheduled'
          AND meeting.meeting_date >= current_date

        ORDER BY date ASC, time_label ASC NULLS LAST
        LIMIT 12
      `);
      data.events = rows;
    } catch (reason) {
      warn("member-area-events", reason);
      data.errors.push("events");
    }
  })();

  const tasksJob = (async () => {
    try {
      const rows = rowsFromResult<MemberTaskItem>(await sql`
        SELECT
          task.id::text AS id,
          task.reference_no,
          task.title,
          task.field_key,
          to_char(task.due_date, 'YYYY-MM-DD') AS due_date,
          task.priority,
          task.status,
          (
            task.due_date < current_date
            AND task.status NOT IN ('selesai', 'dibatalkan')
          ) AS is_overdue
        FROM v9.field_tasks AS task
        WHERE task.organization_id = ${identity.organizationId}
          AND task.assigned_to_user_id = ${identity.userId}
        ORDER BY
          CASE WHEN task.status IN ('selesai', 'dibatalkan') THEN 1 ELSE 0 END,
          task.due_date ASC NULLS LAST,
          task.created_at DESC
        LIMIT 10
      `);
      data.tasks = rows.map((row) => ({
        ...row,
        dueDate: (row as unknown as { due_date: string | null }).due_date,
      }));
      data.tasks = data.tasks.map((row) => {
        const { due_date: _legacy, ...rest } = row as MemberTaskItem & { due_date?: string | null };
        return rest;
      });
    } catch (reason) {
      warn("member-area-tasks", reason);
      data.errors.push("tasks");
    }
  })();

  await Promise.all([profileJob, eventsJob, tasksJob]);

  const trainingJob = (async () => {
    try {
      const memberId = data.profile?.membershipId ?? null;
      const rows = rowsFromResult<MemberTrainingItem>(await sql`
        SELECT
          session.id::text AS id,
          session.reference_no,
          session.title,
          session.topic,
          to_char(session.session_date, 'YYYY-MM-DD') AS date,
          CASE
            WHEN session.start_time IS NULL THEN NULL
            ELSE to_char(session.start_time, 'HH24:MI')
          END AS start_time,
          session.location,
          session.trainer_label AS trainer,
          session.max_participants,
          session.registered_count,
          session.status,
          enrollment.registration_status,
          enrollment.attendance_status
        FROM v9.training_sessions AS session
        LEFT JOIN v9.training_enrollments AS enrollment
          ON enrollment.session_id = session.id
          AND enrollment.organization_id = session.organization_id
          AND enrollment.field_key = session.field_key
          AND enrollment.membership_id = ${memberId}::uuid
        WHERE session.organization_id = ${identity.organizationId}
          AND session.field_key = 'pelatihan'
          AND session.status IN ('planned', 'registration_open')
          AND session.session_date >= current_date
        ORDER BY session.session_date ASC, session.start_time ASC NULLS LAST
        LIMIT 10
      `);
      data.trainings = rows;
    } catch (reason) {
      warn("member-area-trainings", reason);
      data.errors.push("trainings");
    }
  })();

  await trainingJob;
  return data;
}
