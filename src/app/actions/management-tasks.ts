"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { FIELDS_BY_SLUG } from "@/config/fields";

type MutationResult = { ok: boolean; message: string };

type CreateTaskInput = {
  title: string;
  fieldKey: string;
  assigneeLabel: string;
  dueDate: string;
  priority: "tinggi" | "sedang" | "rendah";
};

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function safeErrorName(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function failed(area: string, reason: unknown): MutationResult {
  console.warn(`[${area}] Persistence failed`, safeErrorName(reason));
  return {
    ok: false,
    message: "Perubahan belum tersimpan. Periksa koneksi lalu coba kembali.",
  };
}

/** Create an organization-scoped task and audit event in one database statement. */
export async function createManagementTask(input: CreateTaskInput): Promise<MutationResult> {
  const identity = await requireIdentity("organization:tasks:write");

  const title = normalize(String(input?.title ?? ""));
  const fieldKey = String(input?.fieldKey ?? "").trim();
  const assigneeLabel = normalize(String(input?.assigneeLabel ?? ""));
  const dueDate = String(input?.dueDate ?? "").trim();
  const priority = String(input?.priority ?? "");

  if (
    title.length < 3 || title.length > 300 ||
    !FIELDS_BY_SLUG[fieldKey] ||
    assigneeLabel.length > 160 ||
    !validDate(dueDate) ||
    !["tinggi", "sedang", "rendah"].includes(priority)
  ) {
    return { ok: false, message: "Periksa judul, bidang, penanggung jawab, tenggat, dan prioritas." };
  }

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<{ id: string }>(await sql`
      WITH inserted AS (
        INSERT INTO v9.field_tasks (
          organization_id,
          field_key,
          title,
          assignee_label,
          due_date,
          priority,
          status,
          created_by,
          updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          ${title},
          NULLIF(${assigneeLabel}, ''),
          ${dueDate}::date,
          ${priority},
          'belum',
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = ${fieldKey}
          AND application.is_enabled = true
        RETURNING id, reference_no, organization_id, field_key, title, status, priority, due_date
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          inserted.organization_id,
          ${identity.userId},
          'field_task.created_by_management',
          'field_task',
          inserted.id::text,
          jsonb_build_object(
            'reference_no', inserted.reference_no,
            'field_key', inserted.field_key,
            'title', inserted.title,
            'status', inserted.status,
            'priority', inserted.priority,
            'due_date', inserted.due_date
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `);

    if (rows.length !== 1) {
      return { ok: false, message: "Bidang belum aktif untuk menerima tugas." };
    }

    revalidatePath("/app/pengurus/tugas");
    revalidatePath(`/app/bidang/${fieldKey}/tugas`);
    return { ok: true, message: "Tugas berhasil disimpan." };
  } catch (reason) {
    return failed("management-task-create", reason);
  }
}

/** Change status using the task state machine; organization scope is enforced in SQL. */
export async function updateManagementTaskStatus(
  taskId: string,
  nextStatus: "belum" | "proses" | "selesai" | "dibatalkan",
): Promise<MutationResult> {
  const identity = await requireIdentity("organization:tasks:write");
  const id = String(taskId ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, message: "Identitas tugas tidak valid." };
  }
  if (!["belum", "proses", "selesai", "dibatalkan"].includes(nextStatus)) {
    return { ok: false, message: "Status tugas tidak dikenali." };
  }

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<{ id: string; field_key: string }>(await sql`
      WITH changed AS (
        UPDATE v9.field_tasks
        SET
          status = ${nextStatus},
          completed_at = CASE WHEN ${nextStatus} = 'selesai' THEN now() ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND (
            (status = 'belum' AND ${nextStatus} IN ('proses', 'dibatalkan'))
            OR (status = 'proses' AND ${nextStatus} IN ('belum', 'selesai', 'dibatalkan'))
          )
        RETURNING id, organization_id, field_key, reference_no, title, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          changed.organization_id,
          ${identity.userId},
          'field_task.status.' || changed.status,
          'field_task',
          changed.id::text,
          jsonb_build_object(
            'reference_no', changed.reference_no,
            'field_key', changed.field_key,
            'title', changed.title,
            'status', changed.status
          )
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id, changed.field_key
      FROM changed
      INNER JOIN audit ON true
    `);

    if (!rows[0]) {
      return { ok: false, message: "Status tidak berubah. Tugas mungkin sudah diproses oleh pengguna lain." };
    }

    revalidatePath("/app/pengurus/tugas");
    revalidatePath(`/app/bidang/${rows[0].field_key}/tugas`);
    return { ok: true, message: "Status tugas berhasil diperbarui." };
  } catch (reason) {
    return failed("management-task-status", reason);
  }
}

/** Reassign a task and change its deadline without leaving the Pengurus workspace. */
export async function reassignManagementTask(
  taskId: string,
  assigneeLabelValue: string,
  dueDateValue: string,
): Promise<MutationResult> {
  const identity = await requireIdentity("organization:tasks:write");
  const id = String(taskId ?? "").trim();
  const assigneeLabel = normalize(String(assigneeLabelValue ?? ""));
  const dueDate = String(dueDateValue ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, message: "Identitas tugas tidak valid." };
  }
  if (assigneeLabel.length > 160 || !validDate(dueDate)) {
    return { ok: false, message: "Penanggung jawab atau tenggat tidak valid." };
  }

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<{ id: string; field_key: string }>(await sql`
      WITH changed AS (
        UPDATE v9.field_tasks
        SET
          assignee_label = NULLIF(${assigneeLabel}, ''),
          assigned_to_user_id = NULL,
          due_date = ${dueDate}::date,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE id = ${id}
          AND organization_id = ${identity.organizationId}
          AND status IN ('belum', 'proses')
        RETURNING id, organization_id, field_key, reference_no, title, assignee_label, due_date, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          changed.organization_id,
          ${identity.userId},
          'field_task.reassigned',
          'field_task',
          changed.id::text,
          jsonb_build_object(
            'reference_no', changed.reference_no,
            'field_key', changed.field_key,
            'title', changed.title,
            'assignee_label', changed.assignee_label,
            'due_date', changed.due_date,
            'status', changed.status
          )
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id, changed.field_key
      FROM changed
      INNER JOIN audit ON true
    `);

    if (!rows[0]) {
      return { ok: false, message: "Tugas tidak ditemukan atau sudah ditutup." };
    }

    revalidatePath("/app/pengurus/tugas");
    revalidatePath(`/app/bidang/${rows[0].field_key}/tugas`);
    return { ok: true, message: "Delegasi dan tenggat berhasil diperbarui." };
  } catch (reason) {
    return failed("management-task-reassign", reason);
  }
}
