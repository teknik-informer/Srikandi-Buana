import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { env } from "@/lib/runtime";
import { getAdminUser } from "../../admin-auth";
import { isModuleAvailableForUser } from "@/features/identity/access-policy";
import {
  getPublicPolicySettings,
  validatePublicPolicySettings,
} from "@/lib/public-policies";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function authorizedUser() {
  const user = await getAdminUser();
  if (!user) return { user: null, response: json({ error: "Akses khusus administrator sistem." }, 401) };
  if (!isModuleAvailableForUser(user, "cms")) {
    return { user: null, response: json({ error: "Layanan CMS sedang dinonaktifkan atau diblokir untuk akun ini." }, 403) };
  }
  if (!env.DB) return { user: null, response: json({ error: "Database belum tersedia." }, 503) };
  return { user, response: null };
}

export async function GET() {
  const access = await authorizedUser();
  if (access.response) return access.response;
  try {
    return json({ settings: await getPublicPolicySettings() });
  } catch {
    return json({ error: "Dokumen kebijakan belum dapat dimuat. Coba kembali." }, 503);
  }
}

export async function PUT(request: Request) {
  const access = await authorizedUser();
  if (access.response || !access.user) return access.response;
  if (
    request.headers.get("origin") !== new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "same-origin"
  ) {
    return json({ error: "Permintaan ditolak." }, 403);
  }

  try {
    const submitted = validatePublicPolicySettings(await readJsonObject(request, 200000));
    const now = new Date().toISOString();
    const data = {
      ...submitted,
      documents: submitted.documents.map((document) => ({ ...document, updatedAt: now })),
    };
    await env.DB!.batch([
      env.DB!.prepare(
        "INSERT INTO settings(key,owner,data,updated) VALUES('public_policies',?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,data=excluded.data,updated=excluded.updated",
      ).bind(access.user.userId, JSON.stringify(data), now),
      env.DB!.prepare(
        "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        access.user.userId,
        "Diperbarui",
        "Dokumen kebijakan publik (" + data.documents.length + " dokumen)",
        now,
      ),
    ]);
    return json({ ok: true, settings: data });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({
      error: error instanceof Error && !/database|sql/i.test(error.message)
        ? error.message
        : "Dokumen kebijakan belum tersimpan.",
    }, 400);
  }
}
