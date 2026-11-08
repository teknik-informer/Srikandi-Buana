-- SRIKANDI BUANA v14.0 — additive normalized organization/domain foundation.
-- Apply to a verified QA/rehearsal branch first. This migration never drops,
-- truncates or rewrites v11/v12 tables. Legacy rows are mapped by source ID only.

CREATE SCHEMA IF NOT EXISTS workspace_v14;

CREATE TABLE IF NOT EXISTS workspace_v14.organizations (
  id TEXT PRIMARY KEY,
  parent_organization_id TEXT REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_owner_user_id TEXT UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  display_name TEXT,
  legal_name TEXT,
  organization_type TEXT NOT NULL DEFAULT 'unclassified'
    CHECK (organization_type IN ('unclassified','community_group','cooperative','enterprise','ngo','public_agency','buyer','other')),
  verification_status TEXT NOT NULL DEFAULT 'needs_identity_review'
    CHECK (verification_status IN ('needs_identity_review','pending_verification','verified','suspended','archived')),
  country_code CHAR(2),
  time_zone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (parent_organization_id IS NULL OR parent_organization_id <> id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_organizations_parent
  ON workspace_v14.organizations(parent_organization_id);

CREATE TABLE IF NOT EXISTS workspace_v14.organization_units (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  parent_unit_id TEXT,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'team',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (parent_unit_id, organization_id)
    REFERENCES workspace_v14.organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (parent_unit_id IS NULL OR parent_unit_id <> id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_units_org
  ON workspace_v14.organization_units(organization_id, status, name);

CREATE TABLE IF NOT EXISTS workspace_v14.organization_memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  role_key TEXT NOT NULL CHECK (role_key IN ('admin','ketua','sekretaris','bendahara','koordinator','anggota')),
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (membership_status IN ('invited','active','suspended','ended')),
  scope_json JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scope_json) = 'object'),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  source_legacy_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id),
  UNIQUE (organization_id, source_legacy_user_id),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS workspace_v14_membership_user
  ON workspace_v14.organization_memberships(user_id, membership_status);
CREATE INDEX IF NOT EXISTS workspace_v14_membership_scope
  ON workspace_v14.organization_memberships USING GIN(scope_json);

-- Extensible grants for programme/site assignments. A role grant does not
-- replace the mandatory organization membership or the API authorization check.
CREATE TABLE IF NOT EXISTS workspace_v14.role_grants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  role_key TEXT NOT NULL CHECK (role_key IN (
    'member','field_enumerator','group_leader','programme_coordinator','finance_officer',
    'quality_officer','supply_chain_operator','executive','finance_reviewer',
    'quality_reviewer','internal_reviewer','partner_viewer','platform_admin'
  )),
  scope_type TEXT NOT NULL DEFAULT 'organization' CHECK (scope_type IN ('organization','programme','site','resource')),
  scope_id TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  granted_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= valid_from),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES workspace_v14.organization_memberships(organization_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_role_grants_active
  ON workspace_v14.role_grants(organization_id,user_id,role_key,valid_until)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS workspace_v14.member_profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_record_id TEXT,
  display_name TEXT NOT NULL,
  preferred_name TEXT,
  village TEXT,
  phone TEXT,
  membership_status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (membership_status IN ('pending_verification','active','inactive','suspended','exited')),
  identity_verification_status TEXT NOT NULL DEFAULT 'not_collected'
    CHECK (identity_verification_status IN ('not_collected','pending','verified','rejected')),
  data_consent_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (data_consent_status IN ('not_requested','granted','declined','withdrawn','needs_clarification')),
  data_notice_version TEXT,
  consented_at TIMESTAMPTZ,
  consent_evidence_id TEXT,
  photo_consent_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (photo_consent_status IN ('not_requested','granted','declined','withdrawn')),
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(profile_data) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_legacy_record_id),
  UNIQUE (id, organization_id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_search
  ON workspace_v14.member_profiles(organization_id, membership_status, display_name);

CREATE TABLE IF NOT EXISTS workspace_v14.partner_organizations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_record_id TEXT,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  organization_type TEXT NOT NULL DEFAULT 'unclassified'
    CHECK (organization_type IN ('unclassified','ngo','government','buyer','cooperative','trainer','certification_body','supplier','other')),
  website TEXT,
  relationship_stage TEXT NOT NULL DEFAULT 'reference'
    CHECK (relationship_stage IN ('reference','initial_contact','training_of_trainers','documents_pending','proposal_received','proposal_preparation','proposal_submitted','negotiation','agreement_signed','ready_for_activation','active','completed','declined','paused')),
  relationship_status TEXT NOT NULL DEFAULT 'pre_agreement'
    CHECK (relationship_status IN ('pre_agreement','agreement_pending','active','completed','declined','paused')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','source_received','source_verified','rejected')),
  official_contact_confirmed BOOLEAN NOT NULL DEFAULT false,
  contact_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(contact_data) = 'object'),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_legacy_record_id),
  UNIQUE (id, organization_id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_partners_search
  ON workspace_v14.partner_organizations(organization_id, relationship_stage, display_name);

CREATE TABLE IF NOT EXISTS workspace_v14.partner_interactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  partner_organization_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('introductory_contact','meeting','training','document_exchange','proposal','review','other')),
  occurred_at TIMESTAMPTZ NOT NULL,
  channel TEXT,
  summary TEXT NOT NULL,
  next_action TEXT,
  next_action_owner TEXT,
  next_review_at TIMESTAMPTZ,
  evidence_document_id TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (partner_organization_id, organization_id)
    REFERENCES workspace_v14.partner_organizations(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_partner_interactions_timeline
  ON workspace_v14.partner_interactions(organization_id, partner_organization_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.programmes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_record_id TEXT,
  partner_organization_id TEXT,
  programme_code TEXT,
  name TEXT NOT NULL,
  purpose TEXT,
  geographic_scope JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(geographic_scope) = 'object'),
  commodity_scope JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(commodity_scope) = 'array'),
  lifecycle_status TEXT NOT NULL DEFAULT 'preparation'
    CHECK (lifecycle_status IN ('preparation','approved','active','paused','completed','cancelled')),
  agreement_status TEXT NOT NULL DEFAULT 'not_received'
    CHECK (agreement_status IN ('not_received','draft','received','verified','signed','expired','not_applicable')),
  agreement_document_id TEXT,
  approved_at TIMESTAMPTZ,
  starts_at DATE,
  ends_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_legacy_record_id),
  UNIQUE (id, organization_id),
  FOREIGN KEY (partner_organization_id, organization_id)
    REFERENCES workspace_v14.partner_organizations(id, organization_id) ON DELETE RESTRICT,
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CHECK (lifecycle_status NOT IN ('approved','active') OR (agreement_status = 'signed' AND agreement_document_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workspace_v14_programmes_status
  ON workspace_v14.programmes(organization_id,lifecycle_status,starts_at);

CREATE TABLE IF NOT EXISTS workspace_v14.programme_enrolments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  programme_id TEXT NOT NULL,
  member_profile_id TEXT NOT NULL,
  eligibility_status TEXT NOT NULL DEFAULT 'not_assessed'
    CHECK (eligibility_status IN ('not_assessed','under_review','eligible','ineligible','appeal')),
  enrolment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (enrolment_status IN ('pending','active','completed','withdrawn','rejected')),
  eligibility_rule_version TEXT,
  consent_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (consent_status IN ('not_requested','granted','declined','withdrawn')),
  enrolled_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_json) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (programme_id, organization_id)
    REFERENCES workspace_v14.programmes(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (programme_id, member_profile_id),
  CHECK (exited_at IS NULL OR enrolled_at IS NULL OR exited_at >= enrolled_at)
);
CREATE INDEX IF NOT EXISTS workspace_v14_enrolments_member
  ON workspace_v14.programme_enrolments(organization_id,member_profile_id,enrolment_status);

CREATE TABLE IF NOT EXISTS workspace_v14.activities (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_record_id TEXT,
  programme_id TEXT,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','scheduled','in_progress','completed','cancelled','postponed')),
  responsible_user_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  result_summary TEXT,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_json) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_legacy_record_id),
  UNIQUE (id, organization_id),
  FOREIGN KEY (programme_id, organization_id)
    REFERENCES workspace_v14.programmes(id, organization_id) ON DELETE RESTRICT,
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS workspace_v14_activities_calendar
  ON workspace_v14.activities(organization_id, starts_at, status);

CREATE TABLE IF NOT EXISTS workspace_v14.activity_attendance (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  activity_id TEXT NOT NULL,
  member_profile_id TEXT,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('member','external')),
  display_name TEXT NOT NULL,
  organization_name TEXT,
  participant_role TEXT,
  attendance_status TEXT NOT NULL DEFAULT 'unmarked'
    CHECK (attendance_status IN ('unmarked','present_full','present_partial','excused','absent')),
  photo_consent_status TEXT NOT NULL DEFAULT 'not_asked'
    CHECK (photo_consent_status IN ('not_asked','granted_for_stated_purpose','declined','withdrawn')),
  consent_notice_version TEXT,
  consented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (activity_id, organization_id)
    REFERENCES workspace_v14.activities(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  CHECK ((participant_type = 'member' AND member_profile_id IS NOT NULL)
      OR (participant_type = 'external' AND member_profile_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_v14_activity_attendance_member
  ON workspace_v14.activity_attendance(activity_id,member_profile_id)
  WHERE member_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workspace_v14_activity_attendance_org
  ON workspace_v14.activity_attendance(organization_id,activity_id,attendance_status);

CREATE TABLE IF NOT EXISTS workspace_v14.tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_record_id TEXT,
  programme_id TEXT,
  activity_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','waiting_review','completed','blocked','cancelled')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_summary TEXT,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_json) = 'array'),
  created_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_legacy_record_id),
  UNIQUE (id, organization_id),
  FOREIGN KEY (programme_id, organization_id)
    REFERENCES workspace_v14.programmes(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (activity_id, organization_id)
    REFERENCES workspace_v14.activities(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_tasks_board
  ON workspace_v14.tasks(organization_id,status,due_at);
CREATE INDEX IF NOT EXISTS workspace_v14_tasks_owner
  ON workspace_v14.tasks(organization_id,assigned_user_id,status);

CREATE TABLE IF NOT EXISTS workspace_v14.documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_file_id TEXT,
  document_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  source_party TEXT,
  source_version TEXT,
  document_status TEXT NOT NULL DEFAULT 'received'
    CHECK (document_status IN ('requested','promised','received','version_review','source_verified','approved','expired','withdrawn')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected','not_applicable')),
  private_file_id TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  issued_at DATE,
  expires_at DATE,
  uploaded_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source_legacy_file_id),
  UNIQUE (id, organization_id),
  CHECK (expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at)
);
CREATE INDEX IF NOT EXISTS workspace_v14_documents_register
  ON workspace_v14.documents(organization_id,document_type,document_status,updated_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.evidence_links (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  document_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  evidence_purpose TEXT NOT NULL,
  created_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, document_id, entity_type, entity_id, evidence_purpose)
);
CREATE INDEX IF NOT EXISTS workspace_v14_evidence_entity
  ON workspace_v14.evidence_links(organization_id,entity_type,entity_id);

CREATE TABLE IF NOT EXISTS workspace_v14.inventory_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_legacy_product_id TEXT,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'product'
    CHECK (item_type IN ('product','raw_material','packaging','consumable','equipment')),
  unit_of_measure TEXT NOT NULL,
  reorder_level NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  published BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id,sku),
  UNIQUE (organization_id,source_legacy_product_id),
  UNIQUE (id,organization_id)
);
CREATE TABLE IF NOT EXISTS workspace_v14.stock_movements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  inventory_item_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('opening','purchase','sale','production_input','production_output','adjustment','transfer_in','transfer_out','return')),
  quantity NUMERIC(20,4) NOT NULL CHECK (quantity <> 0),
  unit_of_measure TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (inventory_item_id,organization_id)
    REFERENCES workspace_v14.inventory_items(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_stock_movements_item
  ON workspace_v14.stock_movements(organization_id,inventory_item_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.supply_lots (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  inventory_item_id TEXT NOT NULL,
  lot_code TEXT NOT NULL,
  product_form TEXT NOT NULL,
  quantity NUMERIC(20,4) NOT NULL CHECK (quantity >= 0),
  unit_of_measure TEXT NOT NULL,
  source_type TEXT,
  source_reference TEXT,
  received_at TIMESTAMPTZ,
  location TEXT,
  traceability_status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (traceability_status IN ('incomplete','recorded','reviewed','verified','blocked')),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (inventory_item_id,organization_id)
    REFERENCES workspace_v14.inventory_items(id,organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id,lot_code),
  UNIQUE (id,organization_id)
);
CREATE TABLE IF NOT EXISTS workspace_v14.supply_lot_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('received','weighed','sampled','graded','stored','moved','sold','shipped','transformed','corrected')),
  occurred_at TIMESTAMPTZ NOT NULL,
  quantity NUMERIC(20,4),
  unit_of_measure TEXT,
  location TEXT,
  actor_user_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  evidence_document_id TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (lot_id,organization_id)
    REFERENCES workspace_v14.supply_lots(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_lot_event_timeline
  ON workspace_v14.supply_lot_events(organization_id,lot_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.funds (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  fund_name TEXT NOT NULL,
  fund_type TEXT NOT NULL CHECK (fund_type IN ('organization','programme_grant','business','restricted','other')),
  restriction_note TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  fund_status TEXT NOT NULL DEFAULT 'planning' CHECK (fund_status IN ('planning','active','closed','suspended')),
  source_agreement_document_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id,organization_id)
);
CREATE TABLE IF NOT EXISTS workspace_v14.budget_allocations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  fund_id TEXT NOT NULL,
  programme_id TEXT,
  budget_code TEXT NOT NULL,
  description TEXT NOT NULL,
  approved_amount NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  period_start DATE,
  period_end DATE,
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft','submitted','approved','rejected','closed')),
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (fund_id,organization_id)
    REFERENCES workspace_v14.funds(id,organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (programme_id,organization_id)
    REFERENCES workspace_v14.programmes(id,organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id,budget_code),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS workspace_v14.procurement_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  programme_id TEXT,
  fund_id TEXT,
  requested_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(20,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_of_measure TEXT NOT NULL DEFAULT 'unit',
  estimated_amount NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (estimated_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','review','approved','rejected','ordered','received','cancelled')),
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  source_legacy_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (programme_id,organization_id)
    REFERENCES workspace_v14.programmes(id,organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (fund_id,organization_id)
    REFERENCES workspace_v14.funds(id,organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id,source_legacy_request_id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_procurement_status
  ON workspace_v14.procurement_requests(organization_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  actor_user_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correlation_id TEXT
);
CREATE INDEX IF NOT EXISTS workspace_v14_audit_entity
  ON workspace_v14.audit_events(organization_id,entity_type,entity_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS workspace_v14_audit_actor
  ON workspace_v14.audit_events(organization_id,actor_user_id,occurred_at DESC);

-- Record-level lineage: this is a manifest, not a destructive or blind copy.
-- The source record remains intact until each domain backfill is reconciled.
CREATE TABLE IF NOT EXISTS workspace_v14.legacy_record_map (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  source_schema TEXT NOT NULL DEFAULT 'public',
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_kind TEXT,
  source_checksum TEXT,
  target_domain TEXT NOT NULL,
  target_id TEXT,
  migration_status TEXT NOT NULL DEFAULT 'pending_transform'
    CHECK (migration_status IN ('pending_transform','transformed','verified','excluded','conflict')),
  reconciliation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reconciled_at TIMESTAMPTZ,
  UNIQUE (organization_id,source_schema,source_table,source_id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_legacy_map_status
  ON workspace_v14.legacy_record_map(organization_id,migration_status,target_domain);


-- Locations and plots keep geospatial data purpose-limited and permission-aware.
CREATE TABLE IF NOT EXISTS workspace_v14.sites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  site_type TEXT NOT NULL CHECK (site_type IN ('farm','plot','warehouse','processing_site','office','collection_point','other')),
  name TEXT NOT NULL,
  village TEXT,
  district TEXT,
  province TEXT,
  country_code CHAR(2),
  geodata_status TEXT NOT NULL DEFAULT 'not_collected'
    CHECK (geodata_status IN ('not_collected','consent_pending','collected_restricted','reviewed','verified')),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_precision TEXT,
  location_evidence_id TEXT,
  access_classification TEXT NOT NULL DEFAULT 'restricted'
    CHECK (access_classification IN ('public','organization','programme','restricted')),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id,organization_id),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE INDEX IF NOT EXISTS workspace_v14_sites_search
  ON workspace_v14.sites(organization_id,site_type,name);

CREATE TABLE IF NOT EXISTS workspace_v14.farm_plots (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  site_id TEXT NOT NULL,
  member_profile_id TEXT,
  plot_code TEXT NOT NULL,
  area_value NUMERIC(20,4),
  area_unit TEXT,
  production_practice JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(production_practice) = 'object'),
  mapping_consent_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (mapping_consent_status IN ('not_requested','granted','declined','withdrawn')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','reviewed','verified','rejected')),
  evidence_document_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id,organization_id)
    REFERENCES workspace_v14.sites(id,organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_profile_id,organization_id)
    REFERENCES workspace_v14.member_profiles(id,organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id,plot_code),
  UNIQUE (id,organization_id),
  CHECK (area_value IS NULL OR area_value > 0)
);

-- Every physical lot change records the input and output lots. The application
-- must compare quantities in the same product form, unit, site and time window.
CREATE TABLE IF NOT EXISTS workspace_v14.supply_lot_transformations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  site_id TEXT,
  transformation_type TEXT NOT NULL
    CHECK (transformation_type IN ('drying','hulling','grading','splitting','merging','blending','repacking','processing','other')),
  occurred_at TIMESTAMPTZ NOT NULL,
  actor_user_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  description TEXT NOT NULL DEFAULT '',
  process_reference TEXT,
  evidence_document_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'recorded'
    CHECK (verification_status IN ('recorded','reviewed','verified','disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (site_id,organization_id)
    REFERENCES workspace_v14.sites(id,organization_id) ON DELETE RESTRICT,
  UNIQUE (id,organization_id)
);
CREATE TABLE IF NOT EXISTS workspace_v14.supply_lot_transformation_lines (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  transformation_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  flow_direction TEXT NOT NULL CHECK (flow_direction IN ('input','output')),
  product_form TEXT NOT NULL,
  quantity NUMERIC(20,4) NOT NULL CHECK (quantity > 0),
  unit_of_measure TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (transformation_id,organization_id)
    REFERENCES workspace_v14.supply_lot_transformations(id,organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (lot_id,organization_id)
    REFERENCES workspace_v14.supply_lots(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_lot_transformation_lines
  ON workspace_v14.supply_lot_transformation_lines(organization_id,transformation_id,flow_direction);

CREATE TABLE IF NOT EXISTS workspace_v14.quality_observations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL,
  sample_code TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('visual','moisture','grade','cupping','laboratory','food_safety','other')),
  method_or_standard TEXT,
  method_version TEXT,
  result_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (result_status IN ('pending','pass','conditional','fail','not_applicable')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) = 'object'),
  assessor TEXT,
  evidence_document_id TEXT,
  reviewed_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (lot_id,organization_id)
    REFERENCES workspace_v14.supply_lots(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_quality_lot
  ON workspace_v14.quality_observations(organization_id,lot_id,observed_at DESC);

-- Market references, buyer offers and realised sales are separate records.
CREATE TABLE IF NOT EXISTS workspace_v14.market_quotes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  quote_type TEXT NOT NULL
    CHECK (quote_type IN ('global_benchmark','national_reference','local_quote','buyer_offer','farm_gate_quote','realised_sale')),
  commodity TEXT NOT NULL,
  product_form TEXT NOT NULL,
  grade TEXT,
  price_amount NUMERIC(20,4) NOT NULL CHECK (price_amount >= 0),
  currency CHAR(3) NOT NULL,
  price_unit TEXT NOT NULL,
  market_location TEXT,
  quoted_at TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  source_name TEXT NOT NULL,
  source_reference TEXT,
  counterparty_partner_id TEXT,
  evidence_document_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','source_checked','verified','disputed')),
  created_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (counterparty_partner_id,organization_id)
    REFERENCES workspace_v14.partner_organizations(id,organization_id) ON DELETE RESTRICT,
  CHECK (valid_until IS NULL OR valid_until >= quoted_at),
  CHECK (quote_type <> 'realised_sale' OR (evidence_document_id IS NOT NULL AND verification_status = 'verified'))
);
CREATE INDEX IF NOT EXISTS workspace_v14_market_quotes_compare
  ON workspace_v14.market_quotes(organization_id,commodity,product_form,quote_type,quoted_at DESC);

-- MEAL indicator definitions and measurements keep baseline, target and actual
-- separate; the platform never fabricates zero values for missing observations.
CREATE TABLE IF NOT EXISTS workspace_v14.impact_indicators (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  programme_id TEXT NOT NULL,
  indicator_code TEXT NOT NULL,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  disaggregation JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(disaggregation) = 'array'),
  baseline_value NUMERIC(20,4),
  baseline_date DATE,
  target_value NUMERIC(20,4),
  target_date DATE,
  indicator_version TEXT NOT NULL DEFAULT '1',
  approved_status TEXT NOT NULL DEFAULT 'draft' CHECK (approved_status IN ('draft','approved','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (programme_id,organization_id)
    REFERENCES workspace_v14.programmes(id,organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id,programme_id,indicator_code,indicator_version),
  UNIQUE (id,organization_id)
);
CREATE TABLE IF NOT EXISTS workspace_v14.indicator_observations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  indicator_id TEXT NOT NULL,
  observed_value NUMERIC(20,4) NOT NULL,
  observed_at DATE NOT NULL,
  disaggregation JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(disaggregation) = 'object'),
  evidence_document_id TEXT,
  data_quality_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (data_quality_status IN ('unverified','reviewed','verified','rejected')),
  collected_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  verified_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (indicator_id,organization_id)
    REFERENCES workspace_v14.impact_indicators(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_indicator_observations_period
  ON workspace_v14.indicator_observations(organization_id,indicator_id,observed_at);

-- Safeguarding information is intentionally separate from member and general
-- programme data. Access must be explicitly granted and never inferred from role
-- visibility of ordinary dashboard records.
CREATE TABLE IF NOT EXISTS workspace_v14.safeguarding_cases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  case_reference TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('safeguarding','harassment','exploitation','retaliation','child_protection','other')),
  severity TEXT NOT NULL DEFAULT 'unclassified' CHECK (severity IN ('unclassified','low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','triage','referred','investigating','actioned','closed','withdrawn')),
  access_scope JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(access_scope) = 'array'),
  reporter_reference TEXT,
  incident_date DATE,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary_ciphertext BYTEA,
  response_plan_ciphertext BYTEA,
  restricted_evidence_document_id TEXT,
  assigned_to TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id,case_reference)
);
CREATE INDEX IF NOT EXISTS workspace_v14_safeguarding_cases_restricted
  ON workspace_v14.safeguarding_cases(organization_id,status,severity,reported_at DESC);

-- Stable tenant mapping from existing root workspace owners. Names stay NULL:
-- do not infer or fabricate an organization's registered/legal name.
INSERT INTO workspace_v14.organizations (
  id, source_owner_user_id, display_name, legal_name, organization_type,
  verification_status, time_zone
)
SELECT
  'legacy-owner:' || roots.owner_id,
  roots.owner_id,
  NULL,
  NULL,
  'unclassified',
  'needs_identity_review',
  'Asia/Jakarta'
FROM (
  SELECT DISTINCT COALESCE(NULLIF(u.workspace_owner,''),u.id) AS owner_id
  FROM public.users u
) roots
JOIN public.users root_user ON root_user.id = roots.owner_id
ON CONFLICT (source_owner_user_id) DO NOTHING;

INSERT INTO workspace_v14.organization_memberships (
  id, organization_id, user_id, role_key, membership_status,
  scope_json, source_legacy_user_id
)
SELECT
  'legacy-membership:' || u.id,
  'legacy-owner:' || COALESCE(NULLIF(u.workspace_owner,''),u.id),
  u.id,
  u.role,
  CASE WHEN u.enabled THEN 'active' ELSE 'suspended' END,
  '{}'::jsonb,
  u.id
FROM public.users u
JOIN workspace_v14.organizations org
  ON org.source_owner_user_id = COALESCE(NULLIF(u.workspace_owner,''),u.id)
ON CONFLICT (organization_id,user_id) DO NOTHING;

INSERT INTO workspace_v14.legacy_record_map (
  id, organization_id, source_schema, source_table, source_id, source_kind,
  source_checksum, target_domain, migration_status
)
SELECT
  'legacy-record:' || r.id,
  org.id,
  'public',
  'records',
  r.id,
  r.kind,
  md5(r.data),
  CASE r.kind
    WHEN 'anggota' THEN 'member_profiles'
    WHEN 'program' THEN 'programmes'
    WHEN 'kegiatan' THEN 'activities'
    WHEN 'tindaklanjut' THEN 'tasks'
    WHEN 'kehadiran' THEN 'activity_attendance'
    WHEN 'register' THEN 'documents'
    WHEN 'kemitraan' THEN 'partner_organizations'
    WHEN 'kas' THEN 'finance'
    WHEN 'aset' THEN 'inventory_items'
    ELSE 'administration_records'
  END,
  'pending_transform'
FROM public.records r
JOIN workspace_v14.organizations org
  ON org.source_owner_user_id = r.owner
ON CONFLICT (organization_id,source_schema,source_table,source_id) DO NOTHING;

INSERT INTO workspace_v14.legacy_record_map (
  id, organization_id, source_schema, source_table, source_id,
  source_checksum, target_domain, migration_status
)
SELECT
  'legacy-file:' || f.id,
  org.id,
  'public',
  'files',
  f.id,
  md5(f.id || '|' || f.name || '|' || f.mime || '|' || f.size::text),
  'documents',
  'pending_transform'
FROM public.files f
JOIN workspace_v14.organizations org
  ON org.source_owner_user_id = f.owner
ON CONFLICT (organization_id,source_schema,source_table,source_id) DO NOTHING;
