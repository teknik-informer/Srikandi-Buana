import type { FieldAppStatus } from "@/config/fields";

/** Opaque cookie containing a random V9 session token (never an account key). */
export const SESSION_COOKIE = "sb_v9_session";

export interface AppIdentity {
  userId: string;
  organizationId: string;
  memberId: string;
  name: string;
  role: string;
  roleKey: string;
  scope: string;
  home: string;
  field?: string;
  permissions: string[];
  note: string;
}

/** Kept as a temporary compatibility alias while UI components are migrated. */
export type DemoIdentity = AppIdentity;

export function can(identity: AppIdentity, permission: string): boolean {
  if (identity.permissions.includes("*")) return true;

  return identity.permissions.some((grant) => {
    if (grant === permission) return true;
    if (grant === "field:read" && permission.startsWith("field:") && permission.endsWith(":read")) {
      return true;
    }
    if (grant.endsWith(":*") && permission.startsWith(grant.slice(0, -1))) return true;
    if (grant.endsWith("*") && permission.startsWith(grant.slice(0, -1))) return true;
    return false;
  });
}

/**
 * The demo identity catalogue has been removed from the operational build.
 * Runtime identities are created from v9.user_accounts + v9.role_assignments.
 */
export const DEMO_ACCOUNTS: never[] = [];
export const ACCOUNT_BY_KEY: Record<string, never> = {};

export const FIELD_APP_STATUS_LABEL: Record<FieldAppStatus, string> = {
  disiapkan: "Disiapkan",
  diuji: "Diuji",
  aktif: "Aktif",
  ditangguhkan: "Ditangguhkan sementara",
};
