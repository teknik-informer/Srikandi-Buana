import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { env } from "@/lib/runtime";
import { getAdminUser } from "../../admin-auth";

const defaults = {
  name: "KWT Srikandi Buana",
  shortName: "Srikandi Buana",
  village: "Ngadimulyo",
  district: "Kedu",
  regency: "Temanggung",
  province: "Jawa Tengah",
  postalCode: "56252",
  country: "Indonesia",
  description: "",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function validate(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Data organisasi tidak valid.");
  const input = raw as Record<string, unknown>;
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    const value = String(input[key] ?? "").trim();
    const limit = key === "description" ? 1000 : key === "name" ? 140 : 100;
    if (value.length > limit) throw new Error("Kolom " + key + " melebihi batas karakter.");
    if (key !== "description" && !value) throw new Error("Kolom " + key + " wajib diisi.");
    result[key] = value;
  }
  if (!/^\d{5}$/.test(result.postalCode)) throw new Error("Kode pos harus terdiri dari 5 angka.");
  return result;
}

export async function GET() {
  if (!await getAdminUser()) return json({ error: "Akses khusus administrator." }, 401);
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const row = await env.DB.prepare("SELECT data FROM settings WHERE key='organization'").first();
    return json({ settings: row ? { ...defaults, ...JSON.parse(String(row.data)) } : defaults });
  } catch {
    return json({ error: "Pengaturan organisasi belum dapat dimuat." }, 503);
  }
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return json({ error: "Akses khusus administrator." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "same-origin") {
    return json({ error: "Permintaan lintas situs ditolak." }, 403);
  }
  if (!env.DB) return json({ error: "Database belum tersedia." }, 503);
  try {
    const data = validate(await readJsonObject(request, 10000));
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO settings(key,owner,data,updated) VALUES('organization',?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,data=excluded.data,updated=excluded.updated").bind(user.userId, JSON.stringify(data), now),
      env.DB.prepare("INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(), user.userId, "Diperbarui", "Pengaturan identitas organisasi", now),
    ]);
    return json({ ok: true, settings: data });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({ error: error instanceof Error ? error.message : "Pengaturan organisasi belum tersimpan." }, 400);
  }
}
