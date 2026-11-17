import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function cleanReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 12 || reason.length > 500) {
    throw new Error("Alasan perubahan wajib diisi 12–500 karakter.");
  }
  return reason;
}

function effectiveEnabled(module: Record<string, unknown>, override?: boolean) {
  const lifecycle = String(module.lifecycle_status);
  return ["active", "available"].includes(lifecycle)
    && (override === undefined ? Boolean(module.default_enabled) : override);
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "admin") return json({ error: "Pusat pengelolaan modul hanya tersedia bagi Administrator Sistem." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);

  try {
    const owner = user.userId;
    const [moduleRows, settingRows, userRows, grantRows, auditRows] = await Promise.all([
      env.DB.prepare("SELECT id,label,description,category,route,readiness,lifecycle_status,default_enabled,sort_order FROM platform_modules ORDER BY sort_order,id").all(),
      env.DB.prepare("SELECT module_id,enabled,reason,updated_by,updated_at FROM workspace_module_settings WHERE owner=? ORDER BY module_id").bind(owner).all(),
      env.DB.prepare("SELECT id,email,full_name,role,position,enabled,created FROM users WHERE workspace_owner=? ORDER BY enabled DESC,full_name,id").bind(owner).all(),
      env.DB.prepare("SELECT id,user_id,module_id,effect,reason,valid_from,expires_at,created_at FROM platform_module_access_grants WHERE owner=? AND revoked_at IS NULL ORDER BY created_at DESC").bind(owner).all(),
      env.DB.prepare("SELECT a.action,a.module_id,a.target_user_id,a.reason,a.created_at,u.full_name AS actor_name,t.full_name AS target_name FROM platform_module_access_audit a JOIN users u ON u.id=a.actor_id LEFT JOIN users t ON t.id=a.target_user_id WHERE a.owner=? ORDER BY a.created_at DESC LIMIT 40").bind(owner).all(),
    ]);

    const settings = new Map<string, Record<string, unknown>>(
      settingRows.results.map((row) => [String(row.module_id), row as Record<string, unknown>]),
    );
    const modules = moduleRows.results.map((row) => {
      const override = settings.get(String(row.id));
      const enabledOverride = override ? Boolean(override.enabled) : undefined;
      return {
        ...row,
        enabled: effectiveEnabled(row as Record<string, unknown>, enabledOverride),
        workspaceOverride: override ? Boolean(override.enabled) : null,
        workspaceReason: override ? String(override.reason) : null,
        workspaceUpdatedAt: override ? String(override.updated_at) : null,
        canEnable: ["active", "available"].includes(String(row.lifecycle_status)) && Boolean(row.route),
      };
    });
    const accounts = userRows.results.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      fullName: String(row.full_name),
      role: String(row.role),
      position: String(row.position || ""),
      enabled: Boolean(row.enabled),
      createdAt: String(row.created),
      assignable: Boolean(row.enabled) && row.role !== "admin" && String(row.id) !== user.accountId,
    }));
    return json({
      modules,
      accounts,
      grants: grantRows.results.map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        moduleId: String(row.module_id),
        effect: String(row.effect),
        reason: String(row.reason),
        validFrom: String(row.valid_from),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        createdAt: String(row.created_at),
        expired: Boolean(row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()),
      })),
      audit: auditRows.results.map((row) => ({
        action: String(row.action),
        moduleId: String(row.module_id),
        targetUserId: row.target_user_id ? String(row.target_user_id) : null,
        targetName: row.target_name ? String(row.target_name) : null,
        actorName: String(row.actor_name),
        reason: String(row.reason),
        createdAt: String(row.created_at),
      })),
    });
  } catch {
    return json({ error: "Registri modul belum tersedia. Pastikan migrasi platform access telah diterapkan pada database Preview." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "admin") return json({ error: "Tindakan ini hanya dapat dilakukan Administrator Sistem." }, 403);
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);

  try {
    const raw = await readJsonObject(request, 8000);
    const action = String(raw.action || "");
    const moduleId = String(raw.moduleId || "").trim();
    const reason = cleanReason(raw.reason);
    const module = await env.DB.prepare(
      "SELECT id,route,lifecycle_status,default_enabled FROM platform_modules WHERE id=?",
    ).bind(moduleId).first();
    if (!module) return json({ error: "Modul tidak ditemukan pada registri platform." }, 404);

    const now = new Date().toISOString();
    const auditId = crypto.randomUUID();

    if (action === "set_module_enabled") {
      if (typeof raw.enabled !== "boolean") return json({ error: "Status modul tidak valid." }, 400);
      if (raw.enabled && (!module.route || !["active", "available"].includes(String(module.lifecycle_status)))) {
        return json({ error: "Domain ini belum memiliki ruang kerja siap pakai dan tidak dapat diaktifkan." }, 409);
      }
      const currentSetting = await env.DB.prepare(
        "SELECT enabled,reason FROM workspace_module_settings WHERE owner=? AND module_id=?",
      ).bind(user.userId, moduleId).first();
      const beforeEnabled = currentSetting ? Boolean(currentSetting.enabled) : Boolean(module.default_enabled);
      if (beforeEnabled === raw.enabled) return json({ ok: true, unchanged: true });

      const actionName = raw.enabled ? "module_enabled" : "module_disabled";
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO workspace_module_settings(owner,module_id,enabled,reason,updated_by,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner,module_id) DO UPDATE SET enabled=excluded.enabled,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
        ).bind(user.userId, moduleId, raw.enabled, reason, user.accountId, now),
        env.DB.prepare(
          "INSERT INTO platform_module_access_audit(id,owner,actor_id,action,module_id,target_user_id,reason,before_state,after_state,created_at) VALUES(?,?,?,?,?,NULL,?,?::jsonb,?::jsonb,?)",
        ).bind(
          auditId, user.userId, user.accountId, actionName, moduleId, reason,
          JSON.stringify({ enabled: beforeEnabled }),
          JSON.stringify({ enabled: raw.enabled }),
          now,
        ),
      ]);
      return json({ ok: true, enabled: raw.enabled });
    }

    if (action === "set_user_module_access") {
      const targetUserId = String(raw.userId || "").trim();
      const effect = String(raw.effect || "");
      if (!targetUserId || !["allow", "deny", "inherit"].includes(effect)) {
        return json({ error: "Akun atau tindakan akses tidak valid." }, 400);
      }
      const target = await env.DB.prepare(
        "SELECT id,role,enabled FROM users WHERE id=? AND workspace_owner=?",
      ).bind(targetUserId, user.userId).first();
      if (!target || !target.enabled || target.role === "admin" || targetUserId === user.accountId) {
        return json({ error: "Pilih akun struktural/anggota aktif dalam workspace ini. Akun Administrator Sistem tidak dapat diberi hak bisnis melalui menu ini." }, 403);
      }

      const currentSetting = await env.DB.prepare(
        "SELECT enabled FROM workspace_module_settings WHERE owner=? AND module_id=?",
      ).bind(user.userId, moduleId).first();
      const currentlyEnabled = effectiveEnabled(
        module as Record<string, unknown>,
        currentSetting ? Boolean(currentSetting.enabled) : undefined,
      );
      if (effect !== "inherit" && (!currentlyEnabled || !module.route)) {
        return json({ error: "Aktifkan ruang aplikasi terlebih dahulu sebelum menetapkan override akses." }, 409);
      }

      let expiresAt: string | null = null;
      if (raw.expiresAt !== undefined && raw.expiresAt !== null && String(raw.expiresAt).trim()) {
        const parsed = Date.parse(String(raw.expiresAt));
        if (!Number.isFinite(parsed) || parsed <= Date.now() || parsed > Date.now() + 366 * 24 * 60 * 60 * 1000) {
          return json({ error: "Masa berlaku harus di masa depan dan tidak boleh melebihi 366 hari." }, 400);
        }
        expiresAt = new Date(parsed).toISOString();
      }

      const existing = await env.DB.prepare(
        "SELECT effect,reason,expires_at FROM platform_module_access_grants WHERE owner=? AND user_id=? AND module_id=? AND revoked_at IS NULL",
      ).bind(user.userId, targetUserId, moduleId).first();
      const beforeState = existing
        ? { effect: String(existing.effect), expiresAt: existing.expires_at ? String(existing.expires_at) : null }
        : { effect: "inherit" };
      const nextState = effect === "inherit" ? { effect: "inherit" } : { effect, expiresAt };
      const statements = [
        env.DB.prepare(
          "UPDATE platform_module_access_grants SET revoked_at=? WHERE owner=? AND user_id=? AND module_id=? AND revoked_at IS NULL",
        ).bind(now, user.userId, targetUserId, moduleId),
      ];
      if (effect === "allow" || effect === "deny") {
        statements.push(env.DB.prepare(
          "INSERT INTO platform_module_access_grants(id,owner,user_id,module_id,effect,reason,granted_by,valid_from,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        ).bind(crypto.randomUUID(), user.userId, targetUserId, moduleId, effect, reason, user.accountId, now, expiresAt, now));
      }
      const auditAction = effect === "allow"
        ? "module_access_allowed"
        : effect === "deny" ? "module_access_denied" : "module_access_inherited";
      statements.push(env.DB.prepare(
        "INSERT INTO platform_module_access_audit(id,owner,actor_id,action,module_id,target_user_id,reason,before_state,after_state,created_at) VALUES(?,?,?,?,?,?,?,?,?::jsonb,?)",
      ).bind(
        auditId, user.userId, user.accountId, auditAction, moduleId, targetUserId, reason,
        JSON.stringify(beforeState), JSON.stringify(nextState), now,
      ));
      await env.DB.batch(statements);
      return json({ ok: true, effect, expiresAt });
    }

    return json({ error: "Tindakan pengelolaan modul tidak dikenal." }, 400);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    if (error instanceof Error && /Alasan perubahan|maksimal|wajib/.test(error.message)) return json({ error: error.message }, 400);
    return json({ error: "Perubahan akses modul belum tersimpan. Muat ulang dan periksa kembali." }, 503);
  }
}
