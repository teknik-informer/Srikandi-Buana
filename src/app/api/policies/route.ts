import { env } from "@/lib/runtime";
import { getAdminUser } from "../../admin-auth";
import { isModuleAvailableForUser } from "@/features/identity/access-policy";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { defaultPublicPolicySettings, validatePublicPolicySettings } from "@/lib/public-policies";
import { getPublicPolicySettings } from "@/lib/public-policy-store";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const user = await getAdminUser();
  if (!user) return json({ error: "Akses khusus administrator." }, 401);
  if (!isModuleAvailableForUser(user, "cms")) return json({ error: "Layanan CMS sedang dinonaktifkan atau diblokir untuk akun ini." }, 403);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  return json({ settings: await getPublicPolicySettings() });
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return json({ error: "Akses khusus administrator." }, 401);
  if (!isModuleAvailableForUser(user, "cms")) return json({ error: "Layanan CMS sedang dinonaktifkan atau diblokir untuk akun ini." }, 403);
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || (!origin && request.headers.get("sec-fetch-site") !== "same-origin")) {
    return json({ error: "Permintaan ditolak." }, 403);
  }
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const raw = await readJsonObject(request, 160000);
    const settings = validatePublicPolicySettings(raw);
    if (settings.documents.length === 0 && settings.enabled) {
      throw new Error("Minimal satu dokumen harus tersedia saat pusat kebijakan diaktifkan.");
    }
    const now = new Date().toISOString();
    const persisted = { ...settings, updatedAt: now };
    await env.DB.batch([
      env.DB.prepare("INSERT INTO settings(key,owner,data,updated) VALUES('public-policies',?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,data=excluded.data,updated=excluded.updated")
        .bind(user.userId, JSON.stringify(persisted), now),
      env.DB.prepare("INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)")
        .bind(crypto.randomUUID(), user.userId, "Diperbarui", "Pengelolaan dokumen kebijakan situs", now)
    ]);
    return json({ ok: true, settings: persisted });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "Pengaturan kebijakan belum tersimpan." }, 400);
  }
}
