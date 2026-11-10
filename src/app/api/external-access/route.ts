import { randomBytes } from "node:crypto";
import { env } from "@/lib/runtime";
import { getAdminUser } from "../../admin-auth";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { digest } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/account-access";
import type { ExternalOrganizationType, ExternalScope, ExternalScopeType } from "@/lib/external-access-policy";
import { programs } from "@/lib/srikandi";

export const dynamic = "force-dynamic";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const aggregateKeys = new Set(["members","land","harvest","aid","project_progress","project_finance"]);

function requiredText(value: unknown, label: string, min: number, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length < min || result.length > max) throw new Error(label + " harus berisi " + min + "–" + max + " karakter.");
  return result;
}
function normalizedEmail(value: unknown) {
  const result = String(value || "").trim().toLowerCase();
  if (result.length > 180 || !emailPattern.test(result)) throw new Error("Masukkan alamat email yang valid.");
  return result;
}
function dateValue(value: unknown, fallback?: string, endOfDay = false) {
  const result = typeof value === "string" && value.trim() ? value.trim() : fallback;
  if (!result) throw new Error("Masa berlaku izin harus menggunakan tanggal yang valid.");
  if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    const [year, month, day] = result.split("-").map(Number);
    const dateCheck = new Date(Date.UTC(year, month - 1, day));
    if (dateCheck.getUTCFullYear() !== year || dateCheck.getUTCMonth() + 1 !== month || dateCheck.getUTCDate() !== day) {
      throw new Error("Tanggal izin tidak valid.");
    }
    const localDate = new Date(result + (endOfDay ? "T23:59:59.999+07:00" : "T00:00:00.000+07:00"));
    return localDate.toISOString();
  }
  if (!Number.isFinite(Date.parse(result))) throw new Error("Masa berlaku izin harus menggunakan tanggal yang valid.");
  return new Date(result).toISOString();
}
function parseScopes(value: unknown): ExternalScope[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) throw new Error("Pilih 1–30 ruang lingkup akses.");
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Ruang lingkup akses tidak valid.");
    const raw = item as Record<string, unknown>;
    const type = String(raw.type || "") as ExternalScopeType;
    const ref = requiredText(raw.ref, "Referensi ruang lingkup", 1, 160);
    if (!["program","aggregate"].includes(type)) throw new Error("Scope proyek dan wilayah baru dapat diberikan setelah modul proyek/wilayah beserta registry terverifikasi tersedia.");
    if (type === "program" && !programs.some((program) => program.id === ref)) throw new Error("Pilih ID program yang benar-benar terdaftar.");
    if (type === "aggregate" && !aggregateKeys.has(ref)) throw new Error("Jenis ringkasan agregat tidak diizinkan.");
    const key = type + ":" + ref;
    if (seen.has(key)) throw new Error("Ruang lingkup yang sama tidak boleh dipilih dua kali.");
    seen.add(key);
    return { type, ref, permission: type === "aggregate" ? "aggregate" : "read" };
  });
}
function activationUrl(request: Request, token: string) {
  const base = new URL(process.env.APP_URL || new URL(request.url).origin);
  if (base.protocol !== "https:" && base.hostname !== "localhost") throw new Error("Alamat aplikasi harus HTTPS.");
  return new URL("/aktivasi?audience=external", base).toString() + "#token=" + token;
}
async function audit(owner: string, actor: string, action: string, targetType: string, targetId: string, reason = "") {
  if (!env.DB) throw new Error("Database belum tersedia.");
  return env.DB.prepare("INSERT INTO external_access_audit(id,workspace_owner,actor_id,actor_type,action,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), owner, actor, "internal", action, targetType, targetId, reason, new Date().toISOString());
}
async function writeScopes(grantId: string, owner: string, scopes: ExternalScope[]) {
  if (!env.DB) throw new Error("Database belum tersedia.");
  return scopes.map((scope) => env.DB!.prepare(
    "INSERT INTO external_access_grant_scopes(id,workspace_owner,grant_id,scope_type,scope_ref,permission,created_at) VALUES(?,?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(), owner, grantId, scope.type, scope.ref, scope.permission, new Date().toISOString()));
}
function failure(error: unknown) {
  if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
  return json({ error: error instanceof Error ? error.message : "Permintaan belum dapat diproses." }, 400);
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return json({ error: "Akses khusus administrator." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const [organizations, accounts, grants, auditRows] = await Promise.all([
      env.DB.prepare("SELECT id,organization_type,legal_name,registration_ref,contact_email,verification_status,created_at,updated_at FROM external_organizations WHERE workspace_owner=? ORDER BY created_at DESC").bind(user.userId).all(),
      env.DB.prepare("SELECT id,organization_id,email,full_name,status,created_at,updated_at,last_login_at FROM external_portal_accounts WHERE workspace_owner=? ORDER BY created_at DESC").bind(user.userId).all(),
      env.DB.prepare("SELECT g.id,g.account_id,g.organization_id,g.audience,g.purpose,g.status,g.valid_from,g.valid_until,g.approved_by,g.approved_at,g.revoked_by,g.revoked_at,g.created_at,a.email,a.full_name,o.legal_name FROM external_access_grants g JOIN external_portal_accounts a ON a.id=g.account_id AND a.workspace_owner=g.workspace_owner JOIN external_organizations o ON o.id=g.organization_id AND o.workspace_owner=g.workspace_owner WHERE g.workspace_owner=? ORDER BY g.created_at DESC").bind(user.userId).all(),
      env.DB.prepare("SELECT actor_id,actor_type,action,target_type,target_id,reason,created_at FROM external_access_audit WHERE workspace_owner=? ORDER BY created_at DESC LIMIT 100").bind(user.userId).all(),
    ]);
    const scopeRows = grants.results.length
      ? await env.DB.prepare("SELECT s.grant_id,s.scope_type,s.scope_ref,s.permission FROM external_access_grant_scopes s JOIN external_access_grants g ON g.id=s.grant_id AND g.workspace_owner=s.workspace_owner WHERE s.workspace_owner=? ORDER BY s.created_at").bind(user.userId).all()
      : { results: [] as Record<string, unknown>[] };
    const scopes = new Map<string, { type: string; ref: string; permission: string }[]>();
    for (const row of scopeRows.results) {
      const id = String(row.grant_id);
      if (!scopes.has(id)) scopes.set(id, []);
      scopes.get(id)!.push({ type: String(row.scope_type), ref: String(row.scope_ref), permission: String(row.permission) });
    }
    return json({
      organizations: organizations.results,
      accounts: accounts.results,
      grants: grants.results.map((grant) => ({ ...grant, scopes: scopes.get(String(grant.id)) || [] })),
      audit: auditRows.results,
    });
  } catch {
    return json({ error: "Data akses eksternal belum dapat dimuat." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return json({ error: "Akses khusus administrator." }, 403);
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const raw = await readJsonObject(request, 16000);
    const action = String(raw.action || "");
    const now = new Date().toISOString();

    if (action === "organization") {
      const type = String(raw.organizationType || "") as ExternalOrganizationType;
      if (!["government","ngo","partner"].includes(type)) throw new Error("Pilih jenis instansi atau mitra yang valid.");
      const legalName = requiredText(raw.legalName, "Nama resmi organisasi", 2, 180);
      const registrationRef = String(raw.registrationRef || "").trim();
      const contactEmail = raw.contactEmail ? normalizedEmail(raw.contactEmail) : "";
      if (registrationRef.length > 120) throw new Error("Nomor registrasi maksimal 120 karakter.");
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO external_organizations(id,workspace_owner,organization_type,legal_name,registration_ref,contact_email,verification_status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,'pending',?,?,?)")
          .bind(id, user.userId, type, legalName, registrationRef, contactEmail, user.accountId, now, now),
        await audit(user.userId, user.accountId, "Organisasi eksternal didaftarkan; menunggu verifikasi", "organization", id),
      ]);
      return json({ ok: true, id, verificationStatus: "pending" }, 201);
    }

    if (action === "invite") {
      const organizationId = requiredText(raw.organizationId, "Organisasi", 1, 100);
      const organization = await env.DB.prepare("SELECT id,organization_type,legal_name,verification_status FROM external_organizations WHERE id=? AND workspace_owner=?")
        .bind(organizationId, user.userId).first();
      if (!organization) return json({ error: "Organisasi eksternal tidak ditemukan dalam workspace ini." }, 404);
      const email = normalizedEmail(raw.email);
      const fullName = requiredText(raw.fullName, "Nama pengguna", 2, 120);
      const purpose = requiredText(raw.purpose, "Tujuan pemberian akses", 12, 500);
      const validFrom = dateValue(raw.validFrom, now);
      const validUntil = dateValue(raw.validUntil, undefined, true);
      const fromTime = Date.parse(validFrom), untilTime = Date.parse(validUntil);
      if (untilTime <= fromTime || untilTime > Date.now() + 731 * 86400000) throw new Error("Masa berlaku harus sesudah tanggal mulai dan tidak lebih dari dua tahun.");
      const scopes = parseScopes(raw.scopes);
      const existing = await env.DB.prepare("SELECT id FROM external_portal_accounts WHERE email=? UNION SELECT id FROM users WHERE lower(email)=?")
        .bind(email, email).first();
      if (existing) return json({ error: "Email sudah terdaftar. Gunakan akun yang sudah ada atau alamat email organisasi yang berbeda." }, 409);
      const audience = String(organization.organization_type) as ExternalOrganizationType;
      const accountId = crypto.randomUUID(), grantId = crypto.randomUUID(), invitationId = crypto.randomUUID();
      const token = randomBytes(32).toString("base64url");
      const tokenHash = digest(token);
      const inviteExpires = new Date(Date.now() + 48 * 3600000).toISOString();
      const url = activationUrl(request, token);
      const statements = [
        env.DB.prepare("INSERT INTO external_portal_accounts(id,workspace_owner,organization_id,email,full_name,password_hash,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,'','invited',?,?,?)")
          .bind(accountId, user.userId, organizationId, email, fullName, user.accountId, now, now),
        env.DB.prepare("INSERT INTO external_access_grants(id,workspace_owner,account_id,organization_id,audience,purpose,status,valid_from,valid_until,approved_by,approved_at,created_at) VALUES(?,?,?,?,?,?,'active',?,?,?,?,?)")
          .bind(grantId, user.userId, accountId, organizationId, audience, purpose, validFrom, validUntil, user.accountId, now, now),
        ...await writeScopes(grantId, user.userId, scopes),
        env.DB.prepare("INSERT INTO external_access_invitations(id,workspace_owner,account_id,token_hash,email,expires_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)")
          .bind(invitationId, user.userId, accountId, tokenHash, email, inviteExpires, user.accountId, now),
        await audit(user.userId, user.accountId, "Akun eksternal diundang dan grant dibuat", "external_account", accountId, purpose),
      ];
      await env.DB.batch(statements);
      return json({ ok: true, accountId, grantId, email, invitationUrl: url, invitationExpiresAt: inviteExpires, organizationStatus: String(organization.verification_status) }, 201);
    }

    if (action === "grant") {
      const accountId = requiredText(raw.accountId, "Akun eksternal", 1, 100);
      const account = await env.DB.prepare("SELECT a.id,a.organization_id,o.organization_type,o.verification_status FROM external_portal_accounts a JOIN external_organizations o ON o.id=a.organization_id AND o.workspace_owner=a.workspace_owner WHERE a.id=? AND a.workspace_owner=? AND a.status='active'")
        .bind(accountId, user.userId).first();
      if (!account) return json({ error: "Akun aktif tidak ditemukan dalam workspace ini." }, 404);
      if (account.verification_status !== "verified") return json({ error: "Organisasi belum terverifikasi." }, 409);
      const purpose = requiredText(raw.purpose, "Tujuan pemberian akses", 12, 500);
      const validFrom = dateValue(raw.validFrom, now);
      const validUntil = dateValue(raw.validUntil, undefined, true);
      if (Date.parse(validUntil) <= Date.parse(validFrom) || Date.parse(validUntil) > Date.now() + 731 * 86400000) throw new Error("Masa berlaku harus sesudah tanggal mulai dan tidak lebih dari dua tahun.");
      const scopes = parseScopes(raw.scopes);
      const grantId = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO external_access_grants(id,workspace_owner,account_id,organization_id,audience,purpose,status,valid_from,valid_until,approved_by,approved_at,created_at) VALUES(?,?,?,?,?,?,'active',?,?,?,?,?)")
          .bind(grantId, user.userId, accountId, account.organization_id, account.organization_type, purpose, validFrom, validUntil, user.accountId, now, now),
        ...await writeScopes(grantId, user.userId, scopes),
        await audit(user.userId, user.accountId, "Grant akses tambahan dibuat", "grant", grantId, purpose),
      ]);
      return json({ ok: true, grantId }, 201);
    }

    return json({ error: "Tindakan tidak dikenal." }, 400);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  const user = await getAdminUser();
  if (!user) return json({ error: "Akses khusus administrator." }, 403);
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const raw = await readJsonObject(request, 8000);
    const action = String(raw.action || "");
    const id = requiredText(raw.id, "ID", 1, 100);
    const reason = requiredText(raw.reason, "Alasan perubahan", 10, 500);
    const now = new Date().toISOString();

    if (action === "verify_organization") {
      const status = String(raw.status || "");
      if (!["verified","suspended","rejected"].includes(status)) throw new Error("Status verifikasi tidak valid.");
      const existing = await env.DB.prepare("SELECT id FROM external_organizations WHERE id=? AND workspace_owner=?")
        .bind(id, user.userId).first();
      if (!existing) return json({ error: "Organisasi tidak ditemukan dalam workspace ini." }, 404);
      await env.DB.batch([
        env.DB.prepare("UPDATE external_organizations SET verification_status=?,updated_at=? WHERE id=? AND workspace_owner=?")
          .bind(status, now, id, user.userId),
        await audit(user.userId, user.accountId, "Status verifikasi organisasi diubah", "organization", id, reason),
      ]);
      return json({ ok: true, status });
    }
    if (action === "revoke_grant") {
      const existing = await env.DB.prepare("SELECT id FROM external_access_grants WHERE id=? AND workspace_owner=? AND status<>'revoked'")
        .bind(id, user.userId).first();
      if (!existing) return json({ error: "Grant tidak ditemukan atau sudah dicabut." }, 404);
      await env.DB.batch([
        env.DB.prepare("UPDATE external_access_grants SET status='revoked',revoked_by=?,revoked_at=? WHERE id=? AND workspace_owner=? AND status<>'revoked'")
          .bind(user.accountId, now, id, user.userId),
        await audit(user.userId, user.accountId, "Grant akses dicabut", "grant", id, reason),
      ]);
      return json({ ok: true });
    }
    if (action === "disable_account") {
      const existing = await env.DB.prepare("SELECT id FROM external_portal_accounts WHERE id=? AND workspace_owner=? AND status<>'disabled'")
        .bind(id, user.userId).first();
      if (!existing) return json({ error: "Akun tidak ditemukan atau sudah dinonaktifkan." }, 404);
      await env.DB.batch([
        env.DB.prepare("UPDATE external_portal_accounts SET status='disabled',updated_at=? WHERE id=? AND workspace_owner=? AND status<>'disabled'").bind(now, id, user.userId),
        env.DB.prepare("DELETE FROM external_portal_sessions WHERE account_id=?").bind(id),
        await audit(user.userId, user.accountId, "Akun eksternal dinonaktifkan; seluruh sesi dicabut", "external_account", id, reason),
      ]);
      return json({ ok: true });
    }
    if (action === "revoke_invitation") {
      const existing = await env.DB.prepare("SELECT account_id FROM external_access_invitations WHERE id=? AND workspace_owner=? AND consumed_at IS NULL AND revoked_at IS NULL")
        .bind(id, user.userId).first();
      if (!existing) return json({ error: "Undangan tidak ditemukan, sudah digunakan, atau sudah dicabut." }, 404);
      await env.DB.batch([
        env.DB.prepare("UPDATE external_access_invitations SET revoked_at=? WHERE id=? AND workspace_owner=? AND consumed_at IS NULL AND revoked_at IS NULL").bind(now, id, user.userId),
        env.DB.prepare("UPDATE external_portal_accounts SET status='disabled',updated_at=? WHERE id=? AND workspace_owner=? AND status='invited'").bind(now, existing.account_id, user.userId),
        await audit(user.userId, user.accountId, "Undangan akun eksternal dicabut", "invitation", id, reason),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Tindakan perubahan tidak dikenal." }, 400);
  } catch (error) {
    return failure(error);
  }
}
