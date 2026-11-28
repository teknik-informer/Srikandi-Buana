"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/identity";
import { hashPassword, verifyPasswordOrDummy } from "@/lib/password";

export type AccountSettingsResult = { ok: boolean; message: string; revokedSessions?: number };

export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AccountSettingsResult> {
  const identity = await requireIdentity();
  const currentPassword = String(input?.currentPassword ?? "");
  const newPassword = String(input?.newPassword ?? "");
  const confirmPassword = String(input?.confirmPassword ?? "");

  if (!currentPassword || newPassword.length < 12 || newPassword.length > 256) {
    return { ok: false, message: "Kata sandi baru harus berisi sedikitnya 12 karakter." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Konfirmasi kata sandi baru tidak sama." };
  }
  if (newPassword === currentPassword) {
    return { ok: false, message: "Gunakan kata sandi baru yang berbeda dari kata sandi saat ini." };
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, message: "Sesi akun tidak ditemukan. Silakan masuk kembali." };
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const sql = getV9Sql();
    const accounts = rowsFromResult<{ password_hash: string }>(await sql`
      SELECT password_hash
      FROM v9.user_accounts
      WHERE id = ${identity.userId} AND status = 'active'
      LIMIT 1
    `);
    const account = accounts[0];
    if (!account || !(await verifyPasswordOrDummy(currentPassword, account.password_hash))) {
      return { ok: false, message: "Kata sandi saat ini tidak cocok." };
    }

    const newHash = await hashPassword(newPassword);
    const changed = rowsFromResult<{ id: string; revoked_sessions: number }>(await sql`
      WITH updated_account AS (
        UPDATE v9.user_accounts
        SET password_hash = ${newHash}, password_changed_at = now(), updated_at = now()
        WHERE id = ${identity.userId}
          AND status = 'active'
          AND password_hash = ${account.password_hash}
        RETURNING id
      ),
      revoked_sessions AS (
        UPDATE v9.sessions
        SET revoked_at = now()
        WHERE user_id IN (SELECT id FROM updated_account)
          AND token_hash <> ${tokenHash}
          AND revoked_at IS NULL
        RETURNING id
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          ${identity.organizationId}, ${identity.userId},
          'user.password.changed', 'user_account', updated_account.id::text,
          jsonb_build_object('password_changed', true, 'other_sessions_revoked', (SELECT count(*) FROM revoked_sessions))
        FROM updated_account
        RETURNING id
      )
      SELECT updated_account.id::text AS id,
        (SELECT count(*)::int FROM revoked_sessions) AS revoked_sessions
      FROM updated_account
      INNER JOIN audit ON true
    `);
    if (!changed[0]) {
      return { ok: false, message: "Kata sandi berubah oleh proses lain. Muat ulang lalu coba kembali." };
    }

    revalidatePath("/app/profil");
    return {
      ok: true,
      message: "Kata sandi berhasil diperbarui. Sesi perangkat lain telah dicabut.",
      revokedSessions: changed[0].revoked_sessions,
    };
  } catch (error) {
    console.warn("[account-settings] Password update failed", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, message: "Pengaturan keamanan belum dapat disimpan. Periksa koneksi lalu coba kembali." };
  }
}
