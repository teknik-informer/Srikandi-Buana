import { consumeRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/runtime";
import { createSession, digest, safeReturn } from "@/lib/auth";
import { createExternalSession } from "@/lib/external-auth";
import { verifyPassword } from "@/lib/password.mjs";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { logServerFailure } from "@/lib/server-diagnostics";

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) },
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Permintaan lintas situs ditolak." }, 403);
  }

  let stage = "resolve_database";
  try {
    const database = env.DB;
    if (!database || !process.env.ADMIN_EMAIL) {
      return json({ error: "Layanan masuk belum dikonfigurasi oleh administrator." }, 503);
    }

    stage = "read_request";
    const raw = await readJsonObject(request, 4000);
    const email = String(raw.email || "").trim().toLowerCase();
    const password = String(raw.password || "");
    if (!email || !password || email.length > 180 || password.length > 128) {
      return json({ error: "Periksa email dan password Anda." }, 400);
    }

    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const fingerprint = "login:" + digest(ip + "|" + email);

    stage = "rate_limit";
    if (!await consumeRateLimit(database, fingerprint, 5, 900000)) {
      return json({ error: "Terlalu banyak percobaan. Coba lagi setelah 15 menit." }, 429);
    }

    stage = "lookup_internal_account";
    const internal = await database.prepare(
      "SELECT u.id,u.email,u.password_hash,u.enabled,o.email AS owner_email,o.enabled AS owner_enabled,o.role AS owner_role " +
      "FROM users u JOIN users o ON o.id=u.workspace_owner WHERE lower(u.email)=?"
    ).bind(email).first();

    stage = "verify_internal_password";
    const internalPasswordValid = await verifyPassword(password, internal?.password_hash);
    if (internal) {
      if (!internal.enabled || !internalPasswordValid || !internal.owner_enabled ||
        internal.owner_role !== "admin" ||
        String(internal.owner_email).toLowerCase() !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
        return json({ error: "Email atau password tidak sesuai." }, 401);
      }

      stage = "create_internal_session";
      await createSession(String(internal.id), raw.remember === true);
      const now = new Date().toISOString();

      stage = "cleanup_rate_limits";
      await database.prepare("DELETE FROM rate_limits WHERE key=? OR window_start<?")
        .bind(fingerprint, Date.now() - 86400000).run();

      stage = "cleanup_internal_sessions";
      await database.prepare("DELETE FROM sessions WHERE expires<?").bind(now).run();
      return json({ ok: true, redirect: safeReturn(String(raw.returnTo || "")) });
    }

    // External identities are stored separately and never receive an internal RBAC role.
    const now = new Date().toISOString();
    stage = "lookup_external_account";
    const external = await database.prepare(
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

    stage = "verify_external_password";
    const externalPasswordValid = await verifyPassword(password, external?.password_hash);
    if (!external || !externalPasswordValid) {
      return json({ error: "Email atau password tidak sesuai." }, 401);
    }

    stage = "create_external_session";
    await createExternalSession(String(external.id), raw.remember === true);

    stage = "update_external_account_login";
    await database.prepare("UPDATE external_portal_accounts SET last_login_at=?,updated_at=? WHERE id=? AND status='active'")
      .bind(now, now, external.id).run();

    stage = "cleanup_rate_limits";
    await database.prepare("DELETE FROM rate_limits WHERE key=? OR window_start<?")
      .bind(fingerprint, Date.now() - 86400000).run();

    stage = "cleanup_internal_sessions";
    await database.prepare("DELETE FROM sessions WHERE expires<?").bind(now).run();

    stage = "cleanup_external_sessions";
    await database.prepare("DELETE FROM external_portal_sessions WHERE expires_at<?").bind(now).run();
    return json({ ok: true, redirect: "/portal-eksternal" });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    logServerFailure(
      "auth_login_failed",
      stage,
      error,
      request.headers.get("x-vercel-id"),
    );
    return json({ error: "Layanan masuk belum dapat diakses. Silakan coba kembali." }, 503);
  }
}
