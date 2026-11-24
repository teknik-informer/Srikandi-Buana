"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

type EnrollmentResult = {
  ok: boolean;
  message: string;
  status?: "registered" | "waitlisted";
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeErrorName(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

/** Let an active member register only themselves, against a server-locked session capacity. */
export async function enrollOwnTrainingSession(sessionId: string): Promise<EnrollmentResult> {
  const identity = await requireIdentity("member:self");
  const id = String(sessionId ?? "").trim();

  if (!validUuid(id)) {
    return { ok: false, message: "Identitas pelatihan tidak valid." };
  }

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<{ id: string; registration_status: "registered" | "waitlisted" }>(await sql`
      WITH member AS (
        SELECT
          membership.id,
          person.full_name
        FROM v9.user_accounts AS account
        INNER JOIN v9.people AS person
          ON person.id = account.person_id
        INNER JOIN v9.memberships AS membership
          ON membership.person_id = person.id
          AND membership.organization_id = ${identity.organizationId}
        WHERE account.id = ${identity.userId}
          AND account.status = 'active'
          AND person.status = 'active'
          AND membership.status = 'active'
          AND (membership.valid_from IS NULL OR membership.valid_from <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
          AND (membership.valid_until IS NULL OR membership.valid_until >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
        ORDER BY membership.created_at DESC
        LIMIT 1
      ),
      target AS (
        SELECT
          session.id,
          session.organization_id,
          session.field_key,
          session.max_participants,
          session.registered_count,
          member.id AS membership_id,
          member.full_name AS participant_name,
          (
            session.max_participants IS NULL
            OR session.registered_count < session.max_participants
          ) AS has_slot
        FROM v9.training_sessions AS session
        CROSS JOIN member
        WHERE session.id = ${id}
          AND session.organization_id = ${identity.organizationId}
          AND session.field_key = 'pelatihan'
          AND session.status = 'registration_open'
          AND session.session_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
        FOR UPDATE OF session
      ),
      capacity_update AS (
        UPDATE v9.training_sessions AS session
        SET
          registered_count = session.registered_count
            + CASE WHEN target.has_slot THEN 1 ELSE 0 END,
          updated_at = now()
        FROM target
        WHERE session.id = target.id
        RETURNING session.id
      ),
      inserted AS (
        INSERT INTO v9.training_enrollments (
          organization_id,
          field_key,
          session_id,
          membership_id,
          participant_name,
          registration_status,
          attendance_status,
          recorded_by
        )
        SELECT
          target.organization_id,
          target.field_key,
          target.id,
          target.membership_id,
          target.participant_name,
          CASE WHEN target.has_slot THEN 'registered' ELSE 'waitlisted' END,
          'not_marked',
          ${identity.userId}
        FROM target
        INNER JOIN capacity_update ON capacity_update.id = target.id
        RETURNING id, organization_id, field_key, session_id, membership_id,
          participant_name, registration_status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          inserted.organization_id,
          ${identity.userId},
          'training_enrollment.created_by_member',
          'training_enrollment',
          inserted.id::text,
          jsonb_build_object(
            'field_key', inserted.field_key,
            'session_id', inserted.session_id,
            'membership_id', inserted.membership_id,
            'participant_name', inserted.participant_name,
            'registration_status', inserted.registration_status
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id, inserted.registration_status
      FROM inserted
      INNER JOIN audit ON true
    `);

    const row = rows[0];
    if (!row) {
      return {
        ok: false,
        message: "Pendaftaran tidak tersedia. Pastikan keanggotaan aktif dan jadwal masih membuka pendaftaran.",
      };
    }

    revalidatePath("/app/anggota");
    revalidatePath("/app/anggota/agenda");
    return row.registration_status === "registered"
      ? { ok: true, status: "registered", message: "Pendaftaran Anda berhasil dicatat." }
      : { ok: true, status: "waitlisted", message: "Kuota utama telah penuh. Nama Anda masuk daftar tunggu." };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    const errorType = safeErrorName(reason);
    console.warn("[member-training-enrollment] Registration failed", errorType);

    if (message.includes("training_enrollments_member_session_uq")) {
      return { ok: false, message: "Anda sudah terdaftar pada pelatihan ini." };
    }
    return { ok: false, message: "Pendaftaran belum dapat disimpan. Periksa koneksi lalu coba kembali." };
  }
}
