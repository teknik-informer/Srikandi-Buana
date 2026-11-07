import {timingSafeEqual} from 'node:crypto';
import {env} from '@/lib/runtime';
import {digest} from '@/lib/auth';
import {hashPassword} from '@/lib/password.mjs';
import {consumeRateLimit} from '@/lib/rate-limit';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';

const QA_EMAIL = 'qa-admin@srikandibuana.test';
const TARGET_BRANCH = 'feat/enterprise-v12-foundation';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' } });

function isAuthorizedPreview() {
  return process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === TARGET_BRANCH &&
    process.env.ADMIN_EMAIL?.trim().toLowerCase() === QA_EMAIL;
}

export async function POST(request: Request) {
  if (!isAuthorizedPreview()) return json({ error: 'Pemulihan tidak tersedia pada lingkungan ini.' }, 404);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Permintaan lintas situs ditolak.' }, 403);
  if (!env.DB) return json({ error: 'Database QA belum tersedia.' }, 503);

  const configuredHash = process.env.QA_ADMIN_RECOVERY_TOKEN_HASH || '';
  const expiresAt = Date.parse(process.env.QA_ADMIN_RECOVERY_EXPIRES || '');
  const now = Date.now();
  if (!/^[a-f0-9]{64}$/.test(configuredHash) || !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + 2 * 60 * 60 * 1000) {
    return json({ error: 'Token pemulihan belum dikonfigurasi atau sudah kedaluwarsa.' }, 403);
  }

  try {
    const raw = await readJsonObject(request, 5000);
    const token = String(raw.token || '');
    const email = String(raw.email || '').trim().toLowerCase();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token) || email !== QA_EMAIL) {
      return json({ error: 'Token atau email administrator QA tidak valid.' }, 400);
    }
    const suppliedHash = Buffer.from(digest(token), 'hex');
    const expectedHash = Buffer.from(configuredHash, 'hex');
    if (suppliedHash.length !== expectedHash.length || !timingSafeEqual(suppliedHash, expectedHash)) {
      return json({ error: 'Token pemulihan tidak valid.' }, 403);
    }

    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const fingerprint = 'qa-recovery:' + digest(ip + '|' + email);
    if (!await consumeRateLimit(env.DB, fingerprint, 5, 15 * 60 * 1000)) {
      return json({ error: 'Terlalu banyak percobaan. Coba kembali setelah 15 menit.' }, 429);
    }

    const admins = await env.DB.prepare(
      "SELECT id,email,role,workspace_owner,enabled FROM users WHERE lower(email)=? AND role='admin' LIMIT 2"
    ).bind(QA_EMAIL).all();
    const rows = admins.results || [];
    if (rows.length !== 1) return json({ error: 'Akun administrator QA tidak ditemukan secara unik.' }, 404);
    const admin = rows[0];
    if (String(admin.email).trim().toLowerCase() !== QA_EMAIL ||
        admin.role !== 'admin' || admin.enabled !== true ||
        String(admin.id) !== String(admin.workspace_owner)) {
      return json({ error: 'Akun administrator QA tidak memenuhi pemeriksaan keamanan.' }, 403);
    }

    const password = String(raw.password || '');
    if (password !== String(raw.confirmation || '')) return json({ error: 'Konfirmasi password tidak cocok.' }, 400);
    const passwordHash = await hashPassword(password);
    const changed = await env.DB.prepare(
      `WITH changed AS (
        UPDATE users SET password_hash=?
        WHERE id=? AND lower(email)=? AND role='admin' AND enabled=TRUE AND workspace_owner=id
        RETURNING id
      ), cleared AS (
        DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed) RETURNING user_id
      )
      SELECT id FROM changed`
    ).bind(passwordHash, String(admin.id), QA_EMAIL).first();

    if (!changed) return json({ error: 'Password tidak diubah. Akun QA mungkin sudah berubah; muat ulang dan periksa kembali.' }, 409);
    try {
      await env.DB.prepare('INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)')
        .bind(crypto.randomUUID(), String(admin.id), String(admin.id), 'QA admin password recovery', QA_EMAIL, new Date().toISOString()).run();
    } catch {
      // The password change is already committed; audit availability must not misreport it as a failed reset.
    }
    return json({ ok: true, redirect: '/masuk', message: 'Password administrator QA berhasil diperbarui. Token pemulihan harus segera dicabut dari environment Preview.' });
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    if (error instanceof Error && error.message.startsWith('Password harus')) return json({ error: error.message }, 400);
    return json({ error: 'Pemulihan belum berhasil. Silakan periksa kembali dan coba lagi.' }, 503);
  }
}
