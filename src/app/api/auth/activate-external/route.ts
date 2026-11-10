import { env } from "@/lib/runtime";
import { digest } from "@/lib/auth";
import { createExternalSession } from "@/lib/external-auth";
import { hashPassword } from "@/lib/password.mjs";
import { consumeRateLimit } from "@/lib/rate-limit";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { json, sameOrigin } from "@/lib/account-access";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const raw = await readJsonObject(request, 5000);
    const token = String(raw.token || "");
    const email = String(raw.email || "").trim().toLowerCase();
    const password = String(raw.password || "");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
      return json({ error: "Tautan atau email tidak valid." }, 400);
    }
    if (password !== raw.confirmation) return json({ error: "Konfirmasi password tidak cocok." }, 400);
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!await consumeRateLimit(env.DB, "external-activation:" + digest(ip), 10, 900000)) {
      return json({ error: "Terlalu banyak percobaan. Coba setelah 15 menit." }, 429);
    }
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const auditId = crypto.randomUUID();
    const changed = await env.DB.prepare(
      "WITH claimed AS (" +
      " UPDATE external_access_invitations i SET consumed_at=? " +
      " WHERE i.token_hash=? AND lower(i.email)=? AND i.consumed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? " +
      " AND EXISTS (SELECT 1 FROM external_portal_accounts a JOIN external_organizations o ON o.id=a.organization_id AND o.workspace_owner=a.workspace_owner " +
      " JOIN users owner ON owner.id=a.workspace_owner WHERE a.id=i.account_id AND a.workspace_owner=i.workspace_owner " +
      " AND a.email=i.email AND a.status='invited' AND o.verification_status='verified' " +
      " AND owner.enabled=TRUE AND owner.role='admin' AND lower(owner.email)=lower(?)" +
      " AND EXISTS (SELECT 1 FROM external_access_grants g JOIN external_access_grant_scopes sc ON sc.grant_id=g.id AND sc.workspace_owner=g.workspace_owner" +
      " WHERE g.account_id=a.id AND g.workspace_owner=a.workspace_owner AND g.organization_id=a.organization_id" +
      " AND g.audience=o.organization_type AND g.status='active' AND g.valid_from<=? AND g.valid_until>? " +
      " AND sc.permission IN ('read','aggregate'))) RETURNING i.account_id,i.workspace_owner" +
      "), changed AS (" +
      " UPDATE external_portal_accounts a SET password_hash=?,status='active',updated_at=? " +
      " FROM claimed c WHERE a.id=c.account_id AND a.workspace_owner=c.workspace_owner RETURNING a.id,a.workspace_owner" +
      "), audited AS (" +
      " INSERT INTO external_access_audit(id,workspace_owner,actor_id,actor_type,action,target_type,target_id,reason,created_at) " +
      " SELECT ?,c.workspace_owner,c.id,'external','Akun eksternal diaktifkan','external_account',c.id,'Aktivasi melalui undangan sekali pakai',? FROM changed c RETURNING id" +
      ") SELECT c.id,c.workspace_owner FROM changed c CROSS JOIN audited"
    ).bind(now, digest(token), email, now, process.env.ADMIN_EMAIL?.trim() || "", now, now, passwordHash, now, auditId, now).first();
    if (!changed) {
      return json({ error: "Undangan tidak valid, sudah digunakan, dicabut, kedaluwarsa, atau organisasi belum diverifikasi. Hubungi pengelola." }, 409);
    }
    return json({ ok: true, redirect: "/portal-eksternal" });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    if (error instanceof Error && error.message.startsWith("Password harus")) return json({ error: error.message }, 400);
    return json({ error: "Aktivasi akun eksternal belum berhasil. Periksa tautan dan coba kembali." }, 503);
  }
}
