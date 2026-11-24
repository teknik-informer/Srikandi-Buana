import type { Metadata } from "next";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { FIELDS_BY_SLUG } from "@/config/fields";
import { TugasClient, type ManagementTask } from "./tugas-client";

export const metadata: Metadata = { title: "Tugas Pengurus" };

interface TaskRow {
  id: string;
  reference_no: string;
  title: string;
  field_key: string;
  assignee_label: string | null;
  assigned_to_user_id: string | null;
  due_date: string | null;
  priority: "tinggi" | "sedang" | "rendah";
  status: "belum" | "proses" | "selesai" | "dibatalkan";
  program_code: string | null;
  is_overdue: boolean;
}

interface AssigneeRow {
  user_id: string;
  name: string;
  member_number: string | null;
}

export default async function TugasPengurusPage() {
  const identity = await requireIdentity("organization:read");
  const canManage = can(identity, "organization:tasks:write");

  let tasks: ManagementTask[] = [];
  let assignees: { userId: string; name: string; memberNumber: string | null }[] = [];
  let loadError = false;
  let assigneeLoadError = false;

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<TaskRow>(await sql`
      SELECT
        task.id::text AS id,
        task.reference_no,
        task.title,
        task.field_key,
        task.assignee_label,
        task.assigned_to_user_id::text AS assigned_to_user_id,
        to_char(task.due_date, 'YYYY-MM-DD') AS due_date,
        task.priority,
        task.status,
        program.reference_no AS program_code,
        (
          task.due_date < current_date
          AND task.status NOT IN ('selesai', 'dibatalkan')
        ) AS is_overdue
      FROM v9.field_tasks AS task
      LEFT JOIN v9.field_programs AS program
        ON program.id = task.program_id
        AND program.organization_id = task.organization_id
        AND program.field_key = task.field_key
      WHERE task.organization_id = ${identity.organizationId}
      ORDER BY
        CASE WHEN task.status IN ('selesai', 'dibatalkan') THEN 1 ELSE 0 END,
        task.due_date ASC NULLS LAST,
        task.created_at DESC
    `);

    tasks = rows.map((row) => ({
      id: row.id,
      referenceNo: row.reference_no,
      title: row.title,
      fieldKey: row.field_key,
      fieldName: FIELDS_BY_SLUG[row.field_key]?.shortName ?? row.field_key,
      assigneeLabel: row.assignee_label ?? "",
      assignedToUserId: row.assigned_to_user_id,
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      programCode: row.program_code,
      isOverdue: row.is_overdue,
    }));
  } catch (reason) {
    const errorType =
      reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
        ? reason.name
        : "UnknownError";
    console.warn("[management-task-list] Source unavailable", errorType);
    loadError = true;
  }

  if (canManage) {
    try {
      const sql = getV9Sql();
      const rows = rowsFromResult<AssigneeRow>(await sql`
        SELECT
          account.id::text AS user_id,
          COALESCE(person.preferred_name, person.full_name) AS name,
          membership.member_number
        FROM v9.user_accounts AS account
        INNER JOIN v9.people AS person
          ON person.id = account.person_id
        INNER JOIN LATERAL (
          SELECT member.member_number
          FROM v9.memberships AS member
          WHERE member.person_id = person.id
            AND member.organization_id = ${identity.organizationId}
            AND member.status = 'active'
            AND (member.valid_from IS NULL OR member.valid_from <= current_date)
            AND (member.valid_until IS NULL OR member.valid_until >= current_date)
          ORDER BY member.created_at DESC
          LIMIT 1
        ) AS membership ON true
        WHERE account.status = 'active'
          AND person.status = 'active'
        ORDER BY name ASC
      `);
      assignees = rows;
    } catch (reason) {
      const errorType =
        reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
          ? reason.name
          : "UnknownError";
      console.warn("[management-task-assignees] Source unavailable", errorType);
      assigneeLoadError = true;
    }
  }

  return (
    <TugasClient
      tasks={tasks}
      assignees={assignees}
      assigneeLoadError={assigneeLoadError}
      canManage={canManage}
      loadError={loadError}
    />
  );
}
