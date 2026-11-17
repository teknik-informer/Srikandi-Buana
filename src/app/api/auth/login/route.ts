import { consumeRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/runtime";
import { createSession, digest, safeReturn } from "@/lib/auth";
import { createExternalSession } from "@/lib/external-auth";
import { verifyPassword } from "@/lib/password.mjs";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { normalizeIndonesianMobilePhone } from "@/lib/phone";

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) },
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Permintaan lintas situs ditolak." }, 403);
  }
  if (!env.DB || !process.env.ADMIN_EMAIL) {
    return json({ error: "Layanan masuk belum dikonfigurasi oleh administrator." }, 503);
  }
  try {
    const raw = await readJsonObject(request, 4000);
    const identity = String(raw.identity || raw.email || "").trim();
    const email = identity.toLowerCase();
    const phone = normalizeIndonesianMobilePhone(identity);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPhone = /^\+628[0-9]{7,12}$/.test(phone);
    const password = String(raw.password || "");
    if ((!isEmail && !isPhone) || !password || identity.length > 180 || password.length > 128) {
      return json({ error: "Masukkan email atau nomor WhatsApp terdaftar dan kata sandi Anda." }, 400);
    }
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const fingerprint = "login:" + digest(ip + "|" + (isPhone ? phone : email));
    if (!await consumeRateLimit(env.DB, fingerprint, 5, 900000)) {
      return json({ error: "Terlalu banyak percobaan. Coba lagi setelah 15 menit." }, 429);
    }

    let internal: Record<string, unknown> | null = null;
    if (isPhone) {
      // Phone identity is resolved from the verified member record. This keeps
      // login compatible with existing Production schemas without requiring
      // a new users.login_phone column or a Production migration.
      const candidates = await env.DB.prepare(
        "SELECT u.id,u.email,u.password_hash,u.enabled,u.member_id,u.workspace_owner,r.data AS member_data " +
        "FROM users u JOIN records r ON r.id=u.member_id AND r.owner=u.workspace_owner AND r.kind='anggota' " +
        "WHERE u.enabled=TRUE AND r.data::jsonb ->> 'status'='Aktif' " +
        "AND r.data::jsonb ->> 'verification'='Terverifikasi'"
      ).all();
      internal = candidates.results.find((row: Record<string, unknown>) => {
        try {
          const member = JSON.parse(String(row.member_data || "{}"));
          return normalizeIndonesianMobilePhone(member.phone) === phone;
        } catch { return false; }
      }) || null;
    } else {
      internal = await env.DB.prepare(
        "SELECT u.id,u.email,u.password_hash,u.enabled,u.member_id,u.workspace_owner FROM users u WHERE lower(u.email)=?"
      ).bind(email).first();
    }
    const owner = internal ? await env.DB.prepare("SELECT email,enabled,role FROM users WHERE id=?").bind(internal.workspace_owner).first() : null;
    const internalPasswordValid = await verifyPassword(password, internal?.password_hash);
    if (internal) {
      if (!internal.enabled || !internalPasswordValid || !owner?.enabled ||
        owner.role !== "admin" ||
        String(owner.email).toLowerCase() !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
        return json({ error: "Email atau password tidak sesuai." }, 401);
      }
      if (isPhone) {
        let currentPhone = "";
        try {
          const data = JSON.parse(String(internal.member_data || "{}"));
          currentPhone = normalizeIndonesianMobilePhone(data.phone);
          if (data.status !== "Aktif" || data.verification !== "Terverifikasi") currentPhone = "";
        } catch { currentPhone = ""; }
        if (!internal.member_id || currentPhone !== phone) {
          return json({ error: "Nomor WhatsApp tidak cocok dengan data anggota aktif yang telah terverifikasi." }, 401);
        }
      }
      await createSession(String(internal.id), raw.remember === true);
      const now = new Date().toISOString();
      await env.DB.prepare("DELETE FROM rate_limits WHERE key=? OR window_start<?")
        .bind(fingerprint, Date.now() - 86400000).run();
      await env.DB.prepare("DELETE FROM sessions WHERE expires<?").bind(now).run();
      return json({ ok: true, redirect: safeReturn(String(raw.returnTo || "")) });
    }

    // External identities are stored separately and never receive an internal RBAC role.
    const now = new Date().toISOString();
    if (isPhone) return json({ error: "Nomor WhatsApp atau kata sandi tidak sesuai, atau nomor belum dikonfirmasi Admin." }, 401);

    const external = await env.DB.prepare(
      "SELECT a.id,a.password_hash,a.email FROM external_portal_accounts a " +
      "JOIN external_organizations org ON org.id=a.organization_id AND org.workspace_owner=a.workspace_owner " +
      "JOIN users owner ON owner.id=a.workspace_owner " +
      "WHERE lower(a.email)=? AND a.status='active' AND org.verification_status='verified' " +
      "AND owner.enabled=TRUE AND owner.role='admin' AND lower(owner.email)=lower(?) " +
      "AND EXISTS (SELECT 1 FROM external_access_grants g JOIN external_access_grant_scopes s " +
      "ON s.grant_id=g.id AND s.workspace_owner=g.workspace_owner " +
      "WHERE g.account_id=a.id AND g.workspace_owner=a.workspace_owner AND g.status='active' " +
      "AND g.audience=org.organization_type AND g.valid_from<=? AND g.valid_until>? AND s.permission IN ('read','aggregate'))"
    ).bind(email, process.env.ADMIN_EMAIL.trim(), now, now).first();
    const externalPasswordValid = await verifyPassword(password, external?.password_hash);
    if (!external || !externalPasswordValid) {
      return json({ error: "Email atau password tidak sesuai." }, 401);
    }

    await createExternalSession(String(external.id), raw.remember === true);
    await env.DB.prepare("UPDATE external_portal_accounts SET last_login_at=?,updated_at=? WHERE id=? AND status='active'")
      .bind(now, now, external.id).run();
    await env.DB.prepare("DELETE FROM rate_limits WHERE key=? OR window_start<?")
      .bind(fingerprint, Date.now() - 86400000).run();
    await env.DB.prepare("DELETE FROM sessions WHERE expires<?").bind(now).run();
    await env.DB.prepare("DELETE FROM external_portal_sessions WHERE expires_at<?").bind(now).run();
    return json({ ok: true, redirect: "/portal-eksternal" });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({ error: "Layanan masuk belum dapat diakses. Silakan coba kembali." }, 503);
  }
}
