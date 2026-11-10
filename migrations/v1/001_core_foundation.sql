-- SRIKANDI BUANA Core v1.0
-- Initial schema: one organization-scoped source of truth.
-- All mutating business operations must also be authorized by server-side application services.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL DEFAULT 'community',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','invited')),
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_active_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deceased','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  parent_id UUID,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'unit',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (parent_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX organization_units_org_parent_idx ON organization_units(organization_id, parent_id);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  unit_id UUID,
  member_number TEXT,
  position_title TEXT,
  valid_from DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','inactive','left','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);
CREATE UNIQUE INDEX memberships_org_member_number_uq ON memberships(organization_id, member_number) WHERE member_number IS NOT NULL;
CREATE INDEX memberships_org_status_idx ON memberships(organization_id, status);

CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  unit_id UUID,
  role_key TEXT NOT NULL CHECK (role_key IN ('super_admin','organization_admin','chair','secretary','treasurer','manager','editor','reporter','member','viewer')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, unit_id, role_key),
  FOREIGN KEY (unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX role_assignments_user_org_idx ON role_assignments(user_id, organization_id);

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  unit_id UUID,
  code TEXT,
  title TEXT NOT NULL,
  objective TEXT,
  starts_on DATE,
  ends_on DATE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','active','completed','cancelled','archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX programs_org_status_period_idx ON programs(organization_id, status, starts_on, ends_on);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  program_id UUID,
  unit_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location TEXT,
  responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  objective TEXT,
  outcome TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','in_progress','needs_review','approved','completed','cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (program_id, organization_id) REFERENCES programs(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX activities_org_date_idx ON activities(organization_id, starts_at DESC);
CREATE INDEX activities_program_idx ON activities(program_id);

CREATE TABLE activity_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  activity_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  participation_status TEXT NOT NULL DEFAULT 'registered' CHECK (participation_status IN ('registered','attended','absent','excused')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, person_id),
  FOREIGN KEY (activity_id, organization_id) REFERENCES activities(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  checksum_sha256 TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','organization','public')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
);
CREATE INDEX media_assets_org_created_idx ON media_assets(organization_id, created_at DESC);

CREATE TABLE activity_media (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  activity_id UUID NOT NULL,
  media_asset_id UUID NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, media_asset_id),
  FOREIGN KEY (activity_id, organization_id) REFERENCES activities(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id, organization_id) REFERENCES media_assets(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  activity_id UUID,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  cover_media_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published','rejected','archived')),
  published_at TIMESTAMPTZ,
  public_snapshot JSONB,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, slug),
  FOREIGN KEY (activity_id, organization_id) REFERENCES activities(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (cover_media_id, organization_id) REFERENCES media_assets(id, organization_id) ON DELETE RESTRICT,
  CHECK ((status <> 'published') OR (published_at IS NOT NULL))
);
CREATE INDEX publications_public_idx ON publications(organization_id, published_at DESC) WHERE status = 'published';

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  media_asset_id UUID NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'internal' CHECK (classification IN ('public','internal','confidential','restricted')),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (media_asset_id, organization_id) REFERENCES media_assets(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX documents_org_type_idx ON documents(organization_id, document_type, created_at DESC);

CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','income','expense')),
  parent_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, code),
  FOREIGN KEY (parent_id, organization_id) REFERENCES financial_accounts(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  activity_id UUID,
  program_id UUID,
  transaction_date DATE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inflow','outflow')),
  amount_idr BIGINT NOT NULL CHECK (amount_idr > 0),
  description TEXT NOT NULL,
  counterparty TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','verified','posted','voided')),
  evidence_media_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (activity_id, organization_id) REFERENCES activities(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, organization_id) REFERENCES programs(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_media_id, organization_id) REFERENCES media_assets(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX financial_transactions_org_date_idx ON financial_transactions(organization_id, transaction_date DESC);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  transaction_id UUID,
  entry_date DATE NOT NULL,
  memo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (transaction_id, organization_id) REFERENCES financial_transactions(id, organization_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX journal_entries_transaction_uq ON journal_entries(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  journal_entry_id UUID NOT NULL,
  account_id UUID NOT NULL,
  debit_idr BIGINT NOT NULL DEFAULT 0 CHECK (debit_idr >= 0),
  credit_idr BIGINT NOT NULL DEFAULT 0 CHECK (credit_idr >= 0),
  description TEXT,
  FOREIGN KEY (journal_entry_id, organization_id) REFERENCES journal_entries(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id) REFERENCES financial_accounts(id, organization_id) ON DELETE RESTRICT,
  CHECK ((debit_idr > 0 AND credit_idr = 0) OR (credit_idr > 0 AND debit_idr = 0))
);
CREATE INDEX journal_lines_entry_idx ON journal_lines(journal_entry_id);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  asset_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  acquired_on DATE,
  acquisition_cost_idr BIGINT CHECK (acquisition_cost_idr IS NULL OR acquisition_cost_idr >= 0),
  condition TEXT NOT NULL DEFAULT 'unknown' CHECK (condition IN ('good','maintenance','damaged','unknown','disposed')),
  location_unit_id UUID,
  custodian_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','disposed','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, asset_code),
  UNIQUE (id, organization_id),
  FOREIGN KEY (location_unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE asset_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL,
  from_unit_id UUID,
  to_unit_id UUID,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('placement','transfer','maintenance','disposal','correction')),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id, organization_id) REFERENCES assets(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (from_unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (to_unit_id, organization_id) REFERENCES organization_units(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  report_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_version JSONB NOT NULL,
  rendered_content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','archived')),
  prepared_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  request_id TEXT,
  before_state JSONB,
  after_state JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_org_time_idx ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, occurred_at DESC);

CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  key TEXT NOT NULL,
  operation TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key, operation)
);
