-- Migrasi: dokumen state operasional bersama.
--
-- Satu baris per organisasi. Isinya dokumen JSONB utuh (anggota, lahan, kas,
-- program, agenda, tugas, persetujuan, arsip). Pemecahan ke tabel relasional
-- per entitas adalah migrasi terpisah; yang penting lebih dulu adalah satu
-- data yang sama dilihat semua perangkat.
--
-- Jalankan: psql "$V9_DATABASE_URL" -f migrations/0001_app_state.sql

CREATE SCHEMA IF NOT EXISTS v9;

CREATE TABLE IF NOT EXISTS v9.app_state (
  org_slug    text PRIMARY KEY,
  payload     jsonb NOT NULL,
  rev         integer NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text NOT NULL DEFAULT 'sistem'
);

COMMENT ON TABLE v9.app_state IS
  'Dokumen operasional organisasi. rev dipakai untuk penulisan optimistis; setiap aksi diterapkan server pada versi terbaru.';
COMMENT ON COLUMN v9.app_state.rev IS
  'Naik setiap tulis. Klien membawa rev yang dipegang; selisih berarti ada penulis lain.';
COMMENT ON COLUMN v9.app_state.updated_by IS
  'Nama pengurus yang terakhir menyimpan — tampil di antarmuka bila diinginkan.';

-- Cek cepat setelah migrasi:
--   SELECT org_slug, rev, pg_column_size(payload), updated_by, updated_at FROM v9.app_state;
