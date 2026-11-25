import "server-only";

/**
 * PERSISTENSI OPERASIONAL — satu sumber kebenaran untuk seluruh aplikasi.
 *
 * MASALAH YANG DIPERBAIKI
 * -----------------------
 * Sebelum modul ini, `src/lib/store.tsx` menulis seluruh state operasional
 * (anggota, lahan, kas, program, agenda, persetujuan, tugas, dokumen, stok,
 * jurnal) ke `localStorage` peramban, masing-masing perangkat. Akibatnya:
 *
 *   - Pengurus A menambah anggota; pengurus B tidak pernah melihatnya.
 *   - Bendahara mencatat kas; laporan di perangkat ketua tetap angka lama.
 *   - Ganti perangkat berarti semua pekerjaan hilang.
 *
 * Dengan kata lain aplikasi tidak dapat dipakai untuk mengelola apa pun; ia
 * hanya mendemonstrasikan tampilan pengelolaan. Slogan "Satu layar, semua
 * urusan" menuntut kebalikannya: satu data yang sama, dilihat semua orang.
 *
 * CARA KERJA
 * ----------
 * Satu tabel `v9.app_state` menyimpan dokumen state sebagai JSONB, satu baris
 * per organisasi. Baca dan tulis melewati server action sehingga tidak ada
 * perangkat yang memegang salinan otoritatif sendiri.
 *
 * Optimistic concurrency: setiap tulis membawa `rev` yang dipegang klien. Bila
 * rev di server sudah berbeda, tulis ditolak dengan `conflict: true` dan klien
 * memuat ulang — mencegah dua pengurus saling menimpa tanpa sadar.
 *
 * CATATAN CAKUPAN
 * ---------------
 * Dokumen state disimpan utuh sebagai JSONB, bukan dinormalisasi ke tabel
 * relasional per entitas. Itu pilihan sadar untuk tahap ini: 32 aksi reducer
 * sudah teruji terhadap bentuk dokumen ini, dan memecahnya ke 51 tabel V9
 * adalah migrasi tersendiri. Yang lebih dulu penting adalah *satu data
 * bersama*; normalisasi menyusul tanpa mengubah kontrak pemakaian.
 */
import { createHash } from "node:crypto";
import { isDatabaseConfigured, query } from "@/lib/db";

/** Slug organisasi tunggal pada instalasi ini. */
const ORG_SLUG = "srikandi-buana";

export interface StateRow {
  payload: unknown;
  rev: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Pastikan tabel ada. Aman diulang. Ditaruh di kode supaya lingkungan yang
 * belum menjalankan migrasi tetap dapat membuka aplikasi; versi resminya juga
 * ditulis sebagai berkas migrasi agar tidak ada skema liar.
 */
let ensured = false;
export async function ensureStateTable(): Promise<void> {
  if (ensured) return;
  if (!isDatabaseConfigured()) throw new Error("DATABASE_NOT_CONFIGURED");
  await query(`
    CREATE TABLE IF NOT EXISTS v9.app_state (
      org_slug    text PRIMARY KEY,
      payload     jsonb NOT NULL,
      rev         integer NOT NULL DEFAULT 1,
      updated_at  timestamptz NOT NULL DEFAULT now(),
      updated_by  text NOT NULL DEFAULT 'sistem'
    )
  `);
  ensured = true;
}

export async function readState(): Promise<StateRow | null> {
  await ensureStateTable();
  const rows = await query<{
    payload: unknown;
    rev: number;
    updated_at: string;
    updated_by: string;
  }>(
    `SELECT payload, rev, updated_at, updated_by
       FROM v9.app_state
      WHERE org_slug = $1`,
    [ORG_SLUG],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    payload: r.payload,
    rev: Number(r.rev),
    updatedAt: new Date(r.updated_at).toISOString(),
    updatedBy: r.updated_by,
  };
}

export interface WriteResult {
  ok: boolean;
  rev: number;
  /** true bila rev klien sudah usang — klien harus memuat ulang. */
  conflict?: boolean;
  updatedAt?: string;
}

/**
 * Tulis state. `expectedRev` 0 berarti "buat baris pertama".
 * Perbandingan rev terjadi di dalam satu pernyataan sehingga tidak ada celah
 * antara membaca dan menulis.
 */
export async function writeState(
  payload: unknown,
  expectedRev: number,
  updatedBy: string,
): Promise<WriteResult> {
  await ensureStateTable();
  const json = JSON.stringify(payload);
  // Dipakai hanya untuk jejak singkat bila log diaktifkan; tidak disimpan.
  const fingerprint = createHash("sha256").update(json).digest("hex").slice(0, 16);
  void fingerprint;

  if (expectedRev === 0) {
    const rows = await query<{ rev: number; updated_at: string }>(
      `INSERT INTO v9.app_state (org_slug, payload, rev, updated_by)
       VALUES ($1, $2::jsonb, 1, $3)
       ON CONFLICT (org_slug) DO NOTHING
       RETURNING rev, updated_at`,
      [ORG_SLUG, json, updatedBy],
    );
    if (rows.length) {
      return { ok: true, rev: 1, updatedAt: new Date(rows[0].updated_at).toISOString() };
    }
    // Baris sudah ada: kemungkinan dua klien menyimpan bersamaan.
    return { ok: false, conflict: true, rev: -1 };
  }

  const rows = await query<{ rev: number; updated_at: string }>(
    `UPDATE v9.app_state
        SET payload = $2::jsonb,
            rev = rev + 1,
            updated_at = now(),
            updated_by = $3
      WHERE org_slug = $1 AND rev = $4
      RETURNING rev, updated_at`,
    [ORG_SLUG, json, updatedBy, expectedRev],
  );

  if (!rows.length) {
    // Ditolak: rev klien usang, atau baris belum ada.
    const current = await readState();
    return { ok: false, conflict: true, rev: current?.rev ?? 0 };
  }

  return {
    ok: true,
    rev: Number(rows[0].rev),
    updatedAt: new Date(rows[0].updated_at).toISOString(),
  };
}
