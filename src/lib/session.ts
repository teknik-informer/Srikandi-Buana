import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { SESSION_COOKIE, type AppIdentity } from "@/lib/identity";

export { SESSION_COOKIE, DEMO_ACCOUNTS, ACCOUNT_BY_KEY, can, FIELD_APP_STATUS_LABEL } from "@/lib/identity";
export type { AppIdentity, DemoIdentity } from "@/lib/identity";

interface IdentityRow {
  user_id: string;
  name: string;
  member_number: string | null;
  role_key: string;
  scope_kind: "organization" | "unit" | "self";
  unit_name: string | null;
  field_key: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  platform_admin: "Administrator Platform",
  organization_admin: "Administrator Organisasi",
  chair: "Ketua",
  secretary: "Sekretaris",
  treasurer: "Bendahara",
  field_coordinator: "Koordinator Bidang",
  field_staff: "Staf Bidang",
  cashier: "Kasir POS",
  member: "Anggota",
  government_viewer: "Akses Pemerintah",
  ngo_viewer: "Akses Mitra Program",
  partner_viewer: "Akses Mitra Usaha",
};

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

function permissionsFor(roleKey: string, fieldKey: string | null): string[] {
  switch (roleKey) {
    case "platform_admin":
    case "organization_admin":
    case "chair":
      return ["*"];
    case "secretary":
      return ["secretariat:*", "documents:*", "cms:publish", "approval:read", "field:read"];
    case "treasurer":
      return ["finance:*", "approval:read"];
    case "field_coordinator":
      return fieldKey
        ? [`field:${fieldKey}:*`, "approval:submit", "finance:request"]
        : ["field:read", "approval:submit"];
    case "field_staff":
      return fieldKey
        ? [`field:${fieldKey}:read`, `field:${fieldKey}:activity:write`]
        : ["field:read"];
    case "cashier":
      return ["pos:sell", "catalog:read"];
    case "member":
      return ["member:self"];
    case "government_viewer":
    case "ngo_viewer":
    case "partner_viewer":
      return ["portal:read", "documents:read"];
    default:
      return [];
  }
}

function homeFor(roleKey: string, fieldKey: string | null): string {
  if ((roleKey === "field_coordinator" || roleKey === "field_staff") && fieldKey) {
    return `/app/bidang/${fieldKey}`;
  }
  return ROLE_HOME[roleKey] ?? "/app";
}

/** Resolve the current account from a hash of the opaque session cookie. */
export async function getIdentity(): Promise<AppIdentity | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sql = getV9Sql();
  const result = await sql`
    SELECT
      account.id AS user_id,
      COALESCE(person.full_name, account.email) AS name,
      membership.member_number,
      assignment.role_key,
      assignment.scope_kind,
      unit.name AS unit_name,
      field_app.field_key
    FROM v9.sessions AS session
    INNER JOIN v9.user_accounts AS account
      ON account.id = session.user_id
    INNER JOIN v9.role_assignments AS assignment
      ON assignment.user_id = account.id
    INNER JOIN v9.organizations AS organization
      ON organization.id = assignment.organization_id
    LEFT JOIN v9.people AS person
      ON person.id = account.person_id
    LEFT JOIN v9.organization_units AS unit
      ON unit.id = assignment.scope_unit_id
      AND unit.organization_id = assignment.organization_id
    LEFT JOIN v9.field_applications AS field_app
      ON field_app.unit_id = unit.id
      AND field_app.organization_id = assignment.organization_id
    LEFT JOIN LATERAL (
      SELECT member.member_number
      FROM v9.memberships AS member
      WHERE member.person_id = person.id
        AND member.organization_id = assignment.organization_id
        AND member.status = 'active'
        AND (member.valid_from IS NULL OR member.valid_from <= current_date)
        AND (member.valid_until IS NULL OR member.valid_until >= current_date)
      ORDER BY member.created_at DESC
      LIMIT 1
    ) AS membership ON true
    WHERE session.token_hash = ${tokenHash}
      AND session.revoked_at IS NULL
      AND session.expires_at > now()
      AND account.status = 'active'
      AND account.email_verified_at IS NOT NULL
      AND organization.status = 'active'
      AND assignment.is_active = true
      AND assignment.valid_from <= now()
      AND (assignment.valid_until IS NULL OR assignment.valid_until > now())
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
  `;

  const row = rowsFromResult<IdentityRow>(result)[0];
  if (!row) return null;

  const roleLabel = ROLE_LABEL[row.role_key] ?? "Pengguna";
  const scope =
    row.scope_kind === "self"
      ? "Data pribadi"
      : row.scope_kind === "unit"
        ? row.unit_name ?? "Unit organisasi"
        : "Organisasi";

  return {
    userId: row.user_id,
    memberId: row.member_number ?? row.user_id,
    name: row.name,
    role: roleLabel,
    roleKey: row.role_key,
    scope,
    home: homeFor(row.role_key, row.field_key),
    field: row.field_key ?? undefined,
    permissions: permissionsFor(row.role_key, row.field_key),
    note: `Hak akses ${roleLabel.toLowerCase()} pada lingkup ${scope.toLowerCase()}.`,
  };
}

/** Require a signed-in account and, when supplied, an effective permission. */
export async function requireIdentity(permission?: string): Promise<AppIdentity> {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  if (permission && !can(identity, permission)) redirect("/app");
  return identity;
}

/** Restrict an application surface to explicit server-resolved role keys. */
export async function requireRoles(allowedRoles: readonly string[]): Promise<AppIdentity> {
  const identity = await requireIdentity();
  if (!allowedRoles.includes(identity.roleKey)) redirect("/app");
  return identity;
}

/** Revoke the server-side session first, then remove the browser cookie. */
export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  try {
    if (token) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const sql = getV9Sql();
      await sql`
        UPDATE v9.sessions
        SET revoked_at = now()
        WHERE token_hash = ${tokenHash}
          AND revoked_at IS NULL
      `;
    }
  } catch (error) {
    console.error(
      "[auth] Session revocation failed:",
      error instanceof Error ? error.message : "Unknown session error",
    );
  } finally {
    jar.delete(SESSION_COOKIE);
  }
}
