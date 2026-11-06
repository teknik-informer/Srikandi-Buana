import {readLimitedMultipart, MultipartLimitError} from "@/lib/multipart-limit";
import sharp from "sharp";
import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";
import { avatarObjectKey, profileAvatarKey } from "@/lib/account-profile";
import { sanitizeUploadedImage } from "@/lib/uploaded-image";
import { consumeRateLimit } from "@/lib/rate-limit";
import { json, sameOrigin } from "@/lib/account-access";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return json({ error: "Silakan masuk." }, 401);
  if (!user.avatarUrl || !env.BUCKET) return new Response("Foto profil belum tersedia.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const photo = await env.BUCKET.get(avatarObjectKey(user.userId, user.accountId));
  if (!photo) return new Response("Foto profil belum tersedia.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new Response(photo.body, { headers: { "Content-Type": "image/png", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return json({ error: "Silakan masuk." }, 401);
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (request.headers.get("x-profile-account") !== user.accountId) return json({ error: "Akun aktif berubah. Muat ulang halaman sebelum memperbarui profil." }, 409);
  if (!env.DB) return json({ error: "Penyimpanan belum tersedia." }, 503);
  if (Number(request.headers.get("content-length") || 0) > 4 * 1024 * 1024) return json({ error: "Foto maksimal 3 MB." }, 413);
  try {
    const form = await readLimitedMultipart(request), file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024 || !/\.(jpe?g|png)$/i.test(file.name)) return json({ error: "Pilih foto JPG/PNG, 1 byte hingga 3 MB." }, 400);
    if (!await consumeRateLimit(env.DB, "avatar:" + user.accountId, 10, 900000)) return json({ error: "Terlalu banyak perubahan foto. Coba setelah 15 menit." }, 429);
    let bytes: Buffer;
    try {
      const mime = /\.png$/i.test(file.name) ? "image/png" : "image/jpeg";
      const safe = await sanitizeUploadedImage(await file.arrayBuffer(), mime);
      bytes = await sharp(Buffer.from(safe)).resize(256, 256, { fit: "cover", position: "centre" }).png().toBuffer();
    } catch (error) { return json({ error: error instanceof Error ? error.message : "Foto tidak dapat dibaca." }, 400); }
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO file_objects(key,content,content_type) VALUES(?,decode(?,'base64'),?) ON CONFLICT(key) DO UPDATE SET content=excluded.content,content_type=excluded.content_type").bind(avatarObjectKey(user.userId, user.accountId), bytes.toString("base64"), "image/png"),
      env.DB.prepare("INSERT INTO settings(key,owner,data,updated) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated=excluded.updated").bind(profileAvatarKey(user.accountId), user.userId, JSON.stringify({ id }), now),
      env.DB.prepare("INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), user.userId, user.accountId, "Foto profil diperbarui", user.email, now),
    ]);
    return json({ ok: true, user: { accountId: user.accountId, displayName: user.displayName, avatarUrl: "/api/account/avatar?v=" + id } });
  } catch (error) { if (error instanceof MultipartLimitError) return json({ error: error.message }, error.status); return json({ error: "Foto belum tersimpan. Coba lagi." }, 503); }
}
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return json({ error: "Silakan masuk." }, 401);
  if (!sameOrigin(request)) return json({ error: "Permintaan lintas situs ditolak." }, 403);
  if (request.headers.get("x-profile-account") !== user.accountId) return json({ error: "Akun aktif berubah. Muat ulang halaman sebelum memperbarui profil." }, 409);
  if (!env.DB) return json({ error: "Penyimpanan belum tersedia." }, 503);
  try {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM file_objects WHERE key=?").bind(avatarObjectKey(user.userId, user.accountId)),
      env.DB.prepare("DELETE FROM settings WHERE key=? AND owner=?").bind(profileAvatarKey(user.accountId), user.userId),
      env.DB.prepare("INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), user.userId, user.accountId, "Foto profil dihapus", user.email, now),
    ]);
    return json({ ok: true, user: { accountId: user.accountId, displayName: user.displayName, avatarUrl: "" } });
  } catch { return json({ error: "Foto belum dihapus. Coba lagi." }, 503); }
}
