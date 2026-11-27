import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { env } from "@/lib/runtime";
import { getAdminUser } from "../../admin-auth";
import { isModuleAvailableForUser } from "@/features/identity/access-policy";
import { getPolicyDocuments, validatePolicyDocuments } from "@/lib/policy-documents";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function authorize() {
  const user = await getAdminUser();
  if (!user) return { user: null, response: json({ error: "Akses khusus pengelola." }, 401) };
  if (!isModuleAvailableForUser(user, "cms")) return { user: null, response: json({ error: "Layanan CMS sedang dinonaktifkan atau diblokir untuk akun ini." }, 403) };
  if (!env.DB) return { user: null, response: json({ error: "Database belum tersedia." }, 503) };
  return { user, response: null };
}

export async function GET() {
  const access = await authorize();
  if (access.response) return access.response;
  return json({ documents: await getPolicyDocuments() });
}

export async function PUT(request: Request) {
  const access = await authorize();
  if (access.response || !access.user) return access.response;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Permintaan ditolak." }, 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Permintaan lintas situs ditolak." }, 403);
  try {
    const body = await readJsonObject(request, 260000);
    const documents = validatePolicyDocuments(body.documents);
    const now = new Date().toISOString();
    await env.DB!.batch([
      env.DB!.prepare("INSERT INTO settings(key,owner,data,updated) VALUES('legal-documents',?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,data=excluded.data,updated=excluded.updated")
        .bind(access.user.userId, JSON.stringify(documents), now),
      env.DB!.prepare("INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)")
        .bind(crypto.randomUUID(), access.user.userId, "Diperbarui", "Dokumen dan kebijakan situs", now)
    ]);
    return json({ ok: true, documents });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "Dokumen belum tersimpan." }, 400);
  }
}
