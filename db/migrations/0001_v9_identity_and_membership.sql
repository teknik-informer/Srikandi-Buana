-- V9.1 operational foundation
-- Scope: isolated schema; does not alter the existing public schema or legacy databases.
-- Run only against the dedicated V9 development branch first.

CREATE SCHEMA IF NOT EXISTS v9;

CREATE TABLE IF NOT EXISTS v9.schema_migrations (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v9.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  legal_name text NOT NULL,
  short_name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  address text,
  legal_status text NOT NULL DEFAULT 'Belum ditetapkan',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v9.organization_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  parent_id uuid,
  unit_key text NOT NULL,
  name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('executive', 'secretariat', 'finance', 'field', 'support')),
  mandate text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, unit_key),
  UNIQUE (id, organization_id),
  FOREIGN KEY (parent_id, organization_id)
    REFERENCES v9.organization_units(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS v9.field_applications (
  field_key text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL,
  name text NOT NULL,
  short_name text NOT NULL,
  route text NOT NULL UNIQUE,
  mandate text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, unit_id),
  FOREIGN KEY (unit_id, organization_id)
    REFERENCES v9.organization_units(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS v9.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  preferred_name text,
  phone text,
  email text,
  address text,
  village text,
  district text,
  regency text,
  province text,
  country text NOT NULL DEFAULT 'Indonesia',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'deceased', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v9.user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid UNIQUE REFERENCES v9.people(id) ON DELETE RESTRICT,
  email text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'suspended', 'disabled')),
  email_verified_at timestamptz,
  must_change_password boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_email_uq
  ON v9.user_accounts (lower(email));

CREATE TABLE IF NOT EXISTS v9.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES v9.people(id) ON DELETE RESTRICT,
  unit_id uuid,
  member_number text,
  position_title text,
  valid_from date,
  valid_until date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive', 'left', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (unit_id, organization_id)
    REFERENCES v9.organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS memberships_member_number_uq
  ON v9.memberships (organization_id, member_number)
  WHERE member_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS memberships_person_current_uq
  ON v9.memberships (organization_id, person_id)
  WHERE status IN ('pending', 'active');

CREATE TABLE IF NOT EXISTS v9.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE CASCADE,
  role_key text NOT NULL CHECK (role_key IN (
    'platform_admin', 'organization_admin', 'chair', 'secretary', 'treasurer',
    'field_coordinator', 'field_staff', 'cashier', 'member',
    'government_viewer', 'ngo_viewer', 'partner_viewer'
  )),
  scope_kind text NOT NULL DEFAULT 'organization'
    CHECK (scope_kind IN ('organization', 'unit', 'self')),
  scope_unit_id uuid,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(conditions) = 'object'),
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope_kind = 'unit' AND scope_unit_id IS NOT NULL)
    OR (scope_kind <> 'unit' AND scope_unit_id IS NULL)
  ),
  FOREIGN KEY (scope_unit_id, organization_id)
    REFERENCES v9.organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS role_assignments_active_uq
  ON v9.role_assignments (
    organization_id, user_id, role_key, scope_kind, COALESCE(scope_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS role_assignments_user_active_idx
  ON v9.role_assignments (user_id, organization_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS v9.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip_hash char(64),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_live_idx
  ON v9.sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS v9.membership_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'MGB-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.membership_interest_reference_seq')::text, 6, '0')
  ),
  applicant_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  interest_area text,
  message text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn')),
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'website',
  reviewed_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(applicant_name)) >= 3),
  CHECK (length(btrim(phone)) >= 8),
  CHECK (length(btrim(address)) >= 5)
);

CREATE SEQUENCE IF NOT EXISTS v9.membership_interest_reference_seq;

CREATE INDEX IF NOT EXISTS membership_interests_status_created_idx
  ON v9.membership_interests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS membership_interests_phone_idx
  ON v9.membership_interests (phone);

CREATE TABLE IF NOT EXISTS v9.login_rate_limits (
  subject_hash char(64) NOT NULL,
  ip_hash char(64) NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_hash, ip_hash)
);

CREATE TABLE IF NOT EXISTS v9.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  request_id text,
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_org_time_idx
  ON v9.audit_events (organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON v9.audit_events (entity_type, entity_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS v9.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'internal', 'private')),
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, setting_key)
);

CREATE TABLE IF NOT EXISTS v9.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx
  ON v9.outbox_events (next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');

INSERT INTO v9.organizations (slug, legal_name, short_name, address)
VALUES (
  'srikandi-buana',
  'Kelompok Wanita Tani Srikandi Buana',
  'Srikandi Buana',
  'Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung, Jawa Tengah, Indonesia'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO v9.organization_units (organization_id, unit_key, name, unit_type, sort_order)
SELECT id, 'pengurus-harian', 'Pengurus Harian', 'executive', 10
FROM v9.organizations WHERE slug = 'srikandi-buana'
ON CONFLICT (organization_id, unit_key) DO NOTHING;

INSERT INTO v9.organization_units (organization_id, unit_key, name, unit_type, sort_order)
SELECT id, 'sekretariat', 'Sekretariat', 'secretariat', 20
FROM v9.organizations WHERE slug = 'srikandi-buana'
ON CONFLICT (organization_id, unit_key) DO NOTHING;

INSERT INTO v9.organization_units (organization_id, unit_key, name, unit_type, sort_order)
SELECT id, 'keuangan', 'Keuangan & Akuntansi', 'finance', 30
FROM v9.organizations WHERE slug = 'srikandi-buana'
ON CONFLICT (organization_id, unit_key) DO NOTHING;

INSERT INTO v9.organization_units (organization_id, unit_key, name, unit_type, sort_order)
SELECT id, seed.unit_key, seed.name, 'field', seed.display_order
FROM v9.organizations org
CROSS JOIN (VALUES
  ('organisasi', 'Bidang Organisasi & Keanggotaan', 40),
  ('pertanian', 'Bidang Pertanian & Produksi', 50),
  ('pelatihan', 'Bidang Pemberdayaan & Pelatihan', 60),
  ('usaha', 'Bidang Usaha & Kemitraan', 70)
) AS seed(unit_key, name, display_order)
WHERE org.slug = 'srikandi-buana'
ON CONFLICT (organization_id, unit_key) DO NOTHING;

INSERT INTO v9.field_applications (field_key, organization_id, unit_id, name, short_name, route, mandate, display_order)
SELECT seed.field_key, org.id, unit.id, seed.name, seed.short_name, seed.route, seed.mandate, seed.display_order
FROM v9.organizations org
CROSS JOIN (VALUES
  ('organisasi', 'Bidang Organisasi & Keanggotaan', 'Organisasi & Keanggotaan', '/app/bidang/organisasi',
   'Mengelola partisipasi, komunikasi, penguatan organisasi, kaderisasi, kebutuhan anggota, dan koordinasi internal.', 10),
  ('pertanian', 'Bidang Pertanian & Produksi', 'Pertanian & Produksi', '/app/bidang/pertanian',
   'Mengelola lahan/petak, komoditas, kalender tanam, budidaya, kunjungan lapangan, produksi, panen, pascapanen, kualitas, dan sarana pertanian.', 20),
  ('pelatihan', 'Bidang Pemberdayaan & Pelatihan', 'Pemberdayaan & Pelatihan', '/app/bidang/pelatihan',
   'Merencanakan dan mengukur peningkatan pengetahuan, keterampilan, dan kapasitas anggota melalui pelatihan, asesmen, evaluasi, dan tindak lanjut.', 30),
  ('usaha', 'Bidang Usaha & Kemitraan', 'Usaha & Kemitraan', '/app/bidang/usaha',
   'Mengembangkan usaha dan mengelola produk, produsen, HPP, katalog, stok, pesanan, pasar, mitra, proposal, perjanjian, dan milestone kerja sama.', 40)
) AS seed(field_key, name, short_name, route, mandate, display_order)
JOIN v9.organization_units unit
  ON unit.organization_id = org.id AND unit.unit_key = seed.field_key
WHERE org.slug = 'srikandi-buana'
ON CONFLICT (field_key) DO NOTHING;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0001_v9_identity_and_membership.sql', 'sha256:initial-v9-identity-membership')
ON CONFLICT (name) DO NOTHING;
