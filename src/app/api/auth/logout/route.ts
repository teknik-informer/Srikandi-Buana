import { cookies } from "next/headers";
import { env } from "@/lib/runtime";
import { sessionCookie, digest } from "@/lib/auth";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  return Response.redirect(new URL("/keluar", request.url), 303);
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "Permintaan lintas situs ditolak." }, 403);
  const jar = await cookies(),
    token = jar.get(sessionCookie)?.value;
  try {
    if (token) {
      if (!env.DB)
        return json({ error: "Sesi belum dapat diakhiri. Layanan sedang tidak tersedia; coba kembali." }, 503);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(digest(token)).run();
    }
    jar.delete(sessionCookie);
    return request.headers.get("accept")?.includes("application/json")
      ? json({ ok: true })
      : Response.redirect(new URL("/masuk?logged_out=1", request.url), 303);
  } catch {
    return json({ error: "Sesi belum dapat diakhiri. Periksa koneksi lalu coba kembali." }, 503);
  }
}
