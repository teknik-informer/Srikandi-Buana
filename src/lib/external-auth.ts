import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { env } from "./runtime";
import { digest } from "./auth";
import { sessionCookie } from "./session-config";
import { activeExternalGrants, type ExternalGrant, type ExternalOrganizationType, type ExternalPrincipal, type ExternalScope } from "./external-access-policy";

export async function createExternalSession(accountId: string, remember: boolean) {
  if (!env.DB) throw new Error("Database belum tersedia.");
  const token = randomBytes(32).toString("base64url");
  const maxAge = remember ? 30 * 86400 : 8 * 3600;
  const now = new Date();
  const expires = new Date(now.getTime() + maxAge * 1000).toISOString();
  await env.DB.prepare("INSERT INTO external_portal_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)")
    .bind(digest(token), accountId, expires, now.toISOString()).run();
  const jar = await cookies();
  jar.set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getAuthenticatedExternalUser(): Promise<ExternalPrincipal | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !env.DB || !process.env.ADMIN_EMAIL) return null;
  const now = new Date().toISOString();
  const account = await env.DB.prepare(
    "SELECT a.id,a.workspace_owner,a.organization_id,a.email,a.full_name,a.status,o.organization_type,o.legal_name,o.verification_status,owner.enabled AS owner_enabled,owner.role AS owner_role,owner.email AS owner_email " +
    "FROM external_portal_sessions s JOIN external_portal_accounts a ON a.id=s.account_id " +
    "JOIN external_organizations o ON o.id=a.organization_id AND o.workspace_owner=a.workspace_owner " +
    "JOIN users owner ON owner.id=a.workspace_owner " +
    "WHERE s.token_hash=? AND s.expires_at>? AND a.status='active' AND o.verification_status='verified' " +
    "AND owner.enabled=TRUE AND owner.role='admin' AND lower(owner.email)=lower(?)"
  ).bind(digest(token), now, process.env.ADMIN_EMAIL.trim()).first();
  if (!account) return null;
  const rows = await env.DB.prepare(
    "SELECT g.id,g.audience,g.purpose,g.status,g.valid_from,g.valid_until,s.scope_type,s.scope_ref,s.permission " +
    "FROM external_access_grants g LEFT JOIN external_access_grant_scopes s ON s.grant_id=g.id AND s.workspace_owner=g.workspace_owner " +
    "WHERE g.workspace_owner=? AND g.account_id=? ORDER BY g.created_at DESC"
  ).bind(account.workspace_owner, account.id).all();
  const grants = new Map<string, ExternalGrant>();
  for (const row of rows.results) {
    const id = String(row.id);
    if (!grants.has(id)) grants.set(id, {
      id,
      audience: String(row.audience) as ExternalOrganizationType,
      purpose: String(row.purpose),
      status: String(row.status) as ExternalGrant["status"],
      validFrom: String(row.valid_from),
      validUntil: String(row.valid_until),
      scopes: [],
    });
    if (row.scope_type && row.scope_ref) grants.get(id)!.scopes.push({
      type: String(row.scope_type) as ExternalScope["type"],
      ref: String(row.scope_ref),
      permission: String(row.permission) as ExternalScope["permission"],
    });
  }
  const activeGrants = activeExternalGrants([...grants.values()]);
  if (activeGrants.length === 0) return null;
  return {
    accountId: String(account.id),
    workspaceOwner: String(account.workspace_owner),
    organizationId: String(account.organization_id),
    organizationType: String(account.organization_type) as ExternalOrganizationType,
    organizationName: String(account.legal_name),
    email: String(account.email),
    fullName: String(account.full_name),
    accountStatus: String(account.status) as ExternalPrincipal["accountStatus"],
    grants: activeGrants,
  };
}

export async function revokeExternalSession(token: string) {
  if (!env.DB) return;
  await env.DB.prepare("DELETE FROM external_portal_sessions WHERE token_hash=?").bind(digest(token)).run();
}
