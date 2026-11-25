import "server-only";

/**
 * Koneksi PostgreSQL untuk data bersama.
 *
 * Memakai `pg` (TCP biasa), bukan `@neondatabase/serverless`, karena:
 *  - proyek ini juga dijalankan portabel (paket macOS mandiri), termasuk
 *    terhadap PostgreSQL lokal — bukan hanya Neon di Vercel;
 *  - `pg` bekerja pada semua penyedia PostgreSQL tanpa proxy HTTP.
 *
 * NAMA VARIABEL
 * --------------
 * `V9_DATABASE_URL` diutamakan (pengembangan lokal dan pemasangan mandiri),
 * lalu `POSTGRES_URL` / `DATABASE_URL` — begitulah integrasi Neon di Vercel
 * menamai koneksinya, sehingga basis data yang sudah terpasang langsung
 * terpakai tanpa menyalin rahasia ke tempat kedua.
 *
 * Bila variabel itu kosong, modul ini TIDAK melempar saat impor: aplikasi tetap
 * terbuka dalam mode lokal dan antarmuka memberi tahu bahwa data belum tersiar.
 * Yang dilempar hanya di dalam fungsi, saat benar-benar dipakai.
 */
import { Pool } from "pg";

type PgPool = Pool;

const globalForDb = globalThis as typeof globalThis & {
  __srikandiPool?: PgPool;
};

/** Urutan pencarian; yang pertama terisi dan sah dipakai. */
const KANDIDAT = ["V9_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL"] as const;

export function databaseUrl(): string | null {
  for (const key of KANDIDAT) {
    const raw = process.env[key]?.trim();
    // `POSTGRES_URL` dari Neon kadang berisi parameter pooling; keduanya sah.
    if (raw && /^postgres(?:ql)?:\/\//i.test(raw)) return raw;
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl() !== null;
}

/**
 * Ukuran pool disesuaikan dengan lingkungan.
 *
 * Fungsi serverless di Vercel berumur pendek dan berjalan paralel; tiap
 * instance yang membuka 5 koneksi akan menghabiskan kuota Neon dalam hitungan
 * menit. Dengan pooling dari Neon (`-pooler` di host) satu koneksi per instance
 * sudah cukup, dan koneksi menganggur ditutup cepat supaya tidak menggantung.
 */
const SERVERLESS = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

export function getPool(): PgPool {
  const url = databaseUrl();
  if (!url) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  if (!globalForDb.__srikandiPool) {
    globalForDb.__srikandiPool = new Pool({
      connectionString: url,
      max: SERVERLESS ? 1 : 5,
      idleTimeoutMillis: SERVERLESS ? 5_000 : 30_000,
      // Jangan biarkan satu permintaan menggantung menunggu koneksi.
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: SERVERLESS,
      // Neon dan sebagian penyedia memerlukan TLS; sertifikat tidak selalu
      // tersedia di lingkungan build. `require` tanpa CA tetap terenkripsi.
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalForDb.__srikandiPool;
}

/** Normalisasi keluaran query menjadi array baris. */
export function rowsFromResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }
  return [];
}

/**
 * Jalankan satu pernyataan SQL. Hanya menerima nilai terikat (`$1`, `$2`, …)
 * — tidak pernah menyisipkan string ke dalam SQL.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(text, values);
  return rowsFromResult<T>(res);
}
