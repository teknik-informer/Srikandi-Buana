"use server";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { hashPassword, isLegacyPasswordHash, verifyPasswordOrDummy } from "@/lib/password";
import { SESSION_COOKIE } from "@/lib/identity";
import { revokeCurrentSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

interface AccountRow {
  id: string;
  password_hash: string;
  status: "invited" | "active" | "suspended" | "disabled";
  email_verified_at: string | null;
  legacy_auth_eligible: boolean;
}

interface RoleRow {
  role_key: string;
  field_key: string | null;
}

const ROLE_HOME: Record<string, string> = {
  platform_admin: "/studio",
  organization_admin: "/app/pengurus",
  chair: "/app/pengurus",
  secretary: "/app/sekretariat",
  treasurer: "/app/keuangan",
  field_coordinator: "/app/bidang",
  field_staff: "/app/bidang",
  cashier: "/app/pos",
  member: "/app/anggota",
  government_viewer: "/portal",
  ngo_viewer: "/portal",
  partner_viewer: "/portal",
};

function hmac(pepper: string, value: string): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

function homeFor(role: RoleRow): string {
  if (
    (role.role_key === "field_coordinator" || role.role_key === "field_staff") &&
    role.field_key
  ) {
    return `/app/bidang/${role.field_key}`;
  }
  return ROLE_HOME[role.role_key] ?? "/app";
}

async function recordFailedAttempt(
  sql: ReturnType<typeof getV9Sql>,
  subjectHash: string,
  ipHash: string,
): Promise<void> {
  await sql`
    INSERT INTO v9.login_rate_limits (
      subject_hash,
      ip_hash,
      attempt_count,
      window_started_at,
      updated_at
    )
    VALUES (${subjectHash}, ${ipHash}, 1, now(), now())
    ON CONFLICT (subject_hash, ip_hash)
    DO UPDATE SET
      attempt_count = CASE
        WHEN v9.login_rate_limits.window_started_at < now() - interval '15 minutes'
          THEN 1
        ELSE v9.login_rate_limits.attempt_count + 1
      END,
      window_started_at = CASE
        WHEN v9.login_rate_limits.window_started_at < now() - interval '15 minutes'
          THEN now()
        ELSE v9.login_rate_limits.window_started_at
      END,
      locked_until = CASE
        WHEN v9.login_rate_limits.window_started_at < now() - interval '15 minutes'
          THEN NULL
        WHEN v9.login_rate_limits.attempt_count + 1 >= 8
          THEN now() + interval '15 minutes'
        ELSE v9.login_rate_limits.locked_until
      END,
      updated_at = now()
  `;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Masukkan alamat surel yang valid." };
  }
  if (!password || password.length > 256) {
    return { error: "Masukkan kata sandi akun." };
  }

  let redirectTo = "/app";

  try {
    const pepper = process.env.V9_HASH_PEPPER;
    if (!pepper || pepper.length < 32) {
      throw new Error("V9_HASH_PEPPER is not configured.");
    }

    const requestHeaders = await headers();
    const forwardedIp =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const subjectHash = hmac(pepper, `email:${email}`);
    const ipHash = hmac(pepper, `ip:${forwardedIp}`);
    const sql = getV9Sql();

    const limitRows = rowsFromResult<{ locked_until: string | null }>(
      await sql`
        SELECT locked_until
        FROM v9.login_rate_limits
        WHERE subject_hash = ${subjectHash}
          AND ip_hash = ${ipHash}
        LIMIT 1
      `,
    );
    const lockedUntil = limitRows[0]?.locked_until;
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      return {
        error: "Percobaan masuk terlalu banyak. Silakan coba kembali setelah 15 menit.",
      };
    }

    const accountRows = rowsFromResult<AccountRow>(
      await sql`
        SELECT id, password_hash, status, email_verified_at, legacy_auth_eligible
        FROM v9.user_accounts
        WHERE lower(email) = ${email}
        LIMIT 1
      `,
    );
    const account = accountRows[0];
    const passwordValid = await verifyPasswordOrDummy(password, account?.password_hash);

    if (
      !account ||
      !passwordValid ||
      account.status !== "active" ||
      (!account.email_verified_at && !account.legacy_auth_eligible)
    ) {
      await recordFailedAttempt(sql, subjectHash, ipHash);
      return { error: "Surel atau kata sandi tidak cocok, atau akun belum aktif." };
    }

    const roleRows = rowsFromResult<RoleRow>(
      await sql`
        SELECT
          assignment.role_key,
          field_app.field_key
        FROM v9.role_assignments AS assignment
        INNER JOIN v9.organizations AS organization
          ON organization.id = assignment.organization_id
        LEFT JOIN v9.field_applications AS field_app
          ON field_app.unit_id = assignment.scope_unit_id
          AND field_app.organization_id = assignment.organization_id
        WHERE assignment.user_id = ${account.id}
          AND assignment.is_active = true
          AND assignment.valid_from <= now()
          AND (assignment.valid_until IS NULL OR assignment.valid_until > now())
          AND organization.status = 'active'
        ORDER BY
          CASE assignment.role_key
            WHEN 'platform_admin' THEN 1
            WHEN 'organization_admin' THEN 2
            WHEN 'chair' THEN 3
            WHEN 'secretary' THEN 4
            WHEN 'treasurer' THEN 5
            WHEN 'field_coordinator' THEN 6
            WHEN 'field_staff' THEN 7
            WHEN 'cashier' THEN 8
            WHEN 'member' THEN 9
            ELSE 10
          END,
          assignment.created_at
        LIMIT 1
      `,
    );
    const role = roleRows[0];

    if (!role) {
      await recordFailedAttempt(sql, subjectHash, ipHash);
      return { error: "Akun belum memiliki penugasan akses yang aktif. Hubungi pengurus." };
    }

    // Upgrade the old credential format after a successful legacy sign-in.
    // Keep legacy_auth_eligible until a real email-verification flow exists.
    if (isLegacyPasswordHash(account.password_hash)) {
      const upgradedHash = await hashPassword(password);
      await sql`
        UPDATE v9.user_accounts
        SET password_hash = ${upgradedHash}, password_changed_at = now(), updated_at = now()
        WHERE id = ${account.id}
          AND password_hash = ${account.password_hash}
          AND legacy_auth_eligible = true
      `;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const userAgent = requestHeaders.get("user-agent")?.slice(0, 512) ?? null;

    const sessionRows = rowsFromResult<{ id: string }>(
      await sql`
        WITH created_session AS (
          INSERT INTO v9.sessions (
            user_id,
            token_hash,
            expires_at,
            ip_hash,
            user_agent
          )
          VALUES (
            ${account.id},
            ${tokenHash},
            now() + interval '8 hours',
            ${ipHash},
            ${userAgent}
          )
          RETURNING user_id
        )
        UPDATE v9.user_accounts AS user_account
        SET last_login_at = now(), updated_at = now()
        FROM created_session
        WHERE user_account.id = created_session.user_id
        RETURNING user_account.id
      `,
    );

    if (!sessionRows[0]) {
      throw new Error("The V9 session could not be created.");
    }

    await sql`
      DELETE FROM v9.login_rate_limits
      WHERE subject_hash = ${subjectHash}
        AND ip_hash = ${ipHash}
    `;

    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    redirectTo = homeFor(role);
  } catch (error) {
    // Next.js redirect is performed after this block; only operational errors are logged.
    console.error(
      "[auth] Login service failed:",
      error instanceof Error ? error.message : "Unknown authentication error",
    );
    return { error: "Layanan masuk sedang tidak tersedia. Silakan coba kembali." };
  }

  redirect(redirectTo);
}

export async function logout(): Promise<void> {
  await revokeCurrentSession();
  redirect("/masuk");
}
