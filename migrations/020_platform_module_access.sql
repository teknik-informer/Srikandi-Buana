-- v13 Platform Core: persistent module availability and user-level launch overrides.
-- These grants control application entry only. Existing role/record policies remain
-- the hard boundary for reading, creating, updating, approving or exporting business data.

CREATE TABLE IF NOT EXISTS platform_modules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 2 AND 120),
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('application','support','platform')),
  route TEXT,
  readiness TEXT NOT NULL CHECK (readiness IN ('planned','foundation','partial','preview','ready')),
  lifecycle_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (lifecycle_status IN ('planned','available','active','suspended','maintenance','deprecated')),
  default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_module_settings (
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  module_id TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 12 AND 500),
  updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner, module_id)
);
CREATE INDEX IF NOT EXISTS workspace_module_settings_owner_enabled
  ON workspace_module_settings(owner, enabled, module_id);

CREATE TABLE IF NOT EXISTS platform_module_access_grants (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  module_id TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE RESTRICT,
  effect TEXT NOT NULL CHECK (effect IN ('allow','deny')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 12 AND 500),
  granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id <> owner),
  CHECK (expires_at IS NULL OR expires_at > valid_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_module_access_one_current_override
  ON platform_module_access_grants(owner, user_id, module_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS platform_module_access_user_lookup
  ON platform_module_access_grants(owner, user_id, module_id, valid_from DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS platform_module_access_audit (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN (
    'module_enabled','module_disabled',
    'module_access_allowed','module_access_denied','module_access_inherited'
  )),
  module_id TEXT NOT NULL REFERENCES platform_modules(id) ON DELETE RESTRICT,
  target_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 12 AND 500),
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_module_access_audit_owner_created
  ON platform_module_access_audit(owner, created_at DESC);

CREATE OR REPLACE FUNCTION srikandi_reject_platform_module_access_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Platform module access audit is append-only.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_module_access_audit_immutable ON platform_module_access_audit;
CREATE TRIGGER platform_module_access_audit_immutable
  BEFORE UPDATE OR DELETE ON platform_module_access_audit
  FOR EACH ROW EXECUTE FUNCTION srikandi_reject_platform_module_access_audit_mutation();

INSERT INTO platform_modules
  (id,label,description,category,route,readiness,lifecycle_status,default_enabled,sort_order)
VALUES
  ('hrm','HRM · SDM & Keanggotaan','Anggota, pengurus, struktur, kehadiran dan administrasi sumber daya manusia.','application','/dashboard/hrm','partial','active',TRUE,10),
  ('accounting','Accounting · Keuangan','Buku kas, akun perkiraan, jurnal, aset dan pelaporan keuangan.','application','/dashboard/accounting','partial','active',TRUE,20),
  ('crm','CRM · Relasi & Kemitraan','Organisasi eksternal, mitra, komunikasi dan publikasi.','application','/dashboard/crm','partial','active',TRUE,30),
  ('projects','Project Management · Program','Program kerja, kegiatan, tugas, tindak lanjut dan dokumen proyek.','application','/dashboard/projects','partial','active',TRUE,40),
  ('pos','POS · Penjualan','Katalog produk, pesanan, komoditas dan transaksi penjualan.','application','/dashboard/pos','partial','active',TRUE,50),
  ('analytics','BI & Analitik','Indikator, tren data, distribusi domain dan kualitas informasi.','application','/dashboard/analytics','preview','active',TRUE,60),
  ('agriculture','Agriculture Management','Lahan, komoditas, siklus budidaya dan pencatatan panen.','support','/dashboard/pertanian','partial','active',TRUE,70),
  ('inventory','Inventory & Procurement','Persediaan, gudang, pergerakan stok dan pengadaan.','support',NULL,'foundation','planned',FALSE,80),
  ('documents','Document Management','Arsip berkas, register surat, versi dokumen dan generator.','support','/dashboard/dokumen','partial','active',TRUE,90),
  ('collaboration','Collaboration & Communication','Komunikasi tim, kalender bersama dan ruang kolaborasi.','support',NULL,'foundation','planned',FALSE,100),
  ('mel','Monitoring, Evaluation & Learning','Indikator, target, hasil, verifikasi dan bukti dampak.','support',NULL,'foundation','planned',FALSE,110),
  ('cms','Public Website CMS','Pengaturan situs, publikasi dan galeri konten publik.','support','/dashboard/publikasi','partial','active',TRUE,120),
  ('system-admin','System Administration','Identitas, konfigurasi, keamanan, integrasi dan pemantauan platform.','platform','/dashboard/module-center','foundation','active',TRUE,130)
ON CONFLICT (id) DO NOTHING;
