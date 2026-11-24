"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

type TaskUpdateResult = { ok: boolean; message: string };

function safeErrorName(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

/** Members may advance only a task explicitly assigned to their own account. */
export async function updateOwnTaskStatus(
  taskId: string,
  nextStatus: "proses" | "selesai",
): Promise<TaskUpdateResult> {
  const identity = await requireIdentity("member:self");
  const id = String(taskId ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, message: "Identitas tugas tidak valid." };
  }
  if (!["proses", "selesai"].includes(nextStatus)) {
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
          AND assigned_to_user_id = ${identity.userId}
          AND (
            (status = 'belum' AND ${nextStatus} = 'proses')
            OR (status = 'proses' AND ${nextStatus} = 'selesai')
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
          'member_task.status.' || changed.status,
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
      return { ok: false, message: "Status tidak berubah. Tugas mungkin sudah ditutup atau tidak dialokasikan kepada akun Anda." };
    }

    revalidatePath("/app/anggota");
    revalidatePath("/app/anggota/tugas");
    revalidatePath("/app/pengurus/tugas");
    revalidatePath(`/app/bidang/${rows[0].field_key}/tugas`);
    return {
      ok: true,
      message: nextStatus === "proses" ? "Tugas ditandai sedang dikerjakan." : "Tugas berhasil ditandai selesai.",
    };
  } catch (reason) {
    const errorType = safeErrorName(reason);
    console.warn("[member-task-status] Update failed", errorType);
    return { ok: false, message: "Status tugas belum dapat disimpan. Silakan coba kembali." };
  }
}
