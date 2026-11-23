-- Business & Partnerships domain: partner register, market/cooperation
-- opportunities, agreements, and traceable milestones. No demo partners or deals.

CREATE SEQUENCE IF NOT EXISTS v9.business_partner_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.business_opportunity_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.business_agreement_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.business_milestone_reference_seq;

CREATE TABLE IF NOT EXISTS v9.business_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'MIT-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_partner_reference_seq')::text,6,'0')
  ),
  partner_name text NOT NULL,
  partner_type text NOT NULL
    CHECK (partner_type IN ('pemerintah','ngo','swasta','koperasi','akademik','komunitas','perorangan','lainnya')),
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect','active','inactive','ended')),
  contact_name text,
  contact_role text,
  phone text,
  email text,
  website text,
  address text,
  relationship_summary text,
  source_label text,
  owner_label text,
  since_date date,
  next_review_date date,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(partner_name)) BETWEEN 2 AND 240),
  CHECK (contact_name IS NULL OR length(btrim(contact_name)) <= 160),
  CHECK (contact_role IS NULL OR length(btrim(contact_role)) <= 160),
  CHECK (phone IS NULL OR length(btrim(phone)) <= 60),
  CHECK (email IS NULL OR length(btrim(email)) <= 254),
  CHECK (website IS NULL OR length(btrim(website)) <= 500),
  CHECK (address IS NULL OR length(btrim(address)) <= 1000),
  CHECK (relationship_summary IS NULL OR length(relationship_summary) <= 5000),
  CHECK (source_label IS NULL OR length(btrim(source_label)) <= 160),
  CHECK (owner_label IS NULL OR length(btrim(owner_label)) <= 160),
  CHECK (next_review_date IS NULL OR since_date IS NULL OR next_review_date >= since_date)
);

CREATE INDEX IF NOT EXISTS business_partners_org_status_idx
  ON v9.business_partners (organization_id, status, partner_name);

CREATE INDEX IF NOT EXISTS business_partners_org_type_idx
  ON v9.business_partners (organization_id, partner_type, created_at DESC);

CREATE TABLE IF NOT EXISTS v9.business_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  partner_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'PLG-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_opportunity_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  opportunity_type text NOT NULL
    CHECK (opportunity_type IN ('akses_pasar','pengadaan','hibah','pelatihan','riset','program','lainnya')),
  stage text NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead','qualified','proposal','negotiation','won','lost','on_hold')),
  estimated_value numeric(18,2),
  currency_code char(3) NOT NULL DEFAULT 'IDR',
  expected_decision_date date,
  next_action text,
  next_action_date date,
  owner_label text,
  description text,
  outcome_note text,
  won_at timestamptz,
  lost_at timestamptz,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  UNIQUE (id, partner_id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (partner_id, organization_id, field_key)
    REFERENCES v9.business_partners(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (estimated_value IS NULL OR estimated_value >= 0),
  CHECK (currency_code ~ '^[A-Z]{3}$'),
  CHECK (next_action IS NULL OR length(next_action) <= 1000),
  CHECK (owner_label IS NULL OR length(btrim(owner_label)) <= 160),
  CHECK (description IS NULL OR length(description) <= 5000),
  CHECK (outcome_note IS NULL OR length(outcome_note) <= 3000),
  CHECK ((stage='won' AND won_at IS NOT NULL) OR (stage<>'won' AND won_at IS NULL)),
  CHECK ((stage='lost' AND lost_at IS NOT NULL) OR (stage<>'lost' AND lost_at IS NULL))
);

CREATE INDEX IF NOT EXISTS business_opportunities_org_stage_idx
  ON v9.business_opportunities (organization_id, stage, created_at DESC);

CREATE INDEX IF NOT EXISTS business_opportunities_partner_idx
  ON v9.business_opportunities (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS business_opportunities_next_action_idx
  ON v9.business_opportunities (organization_id, next_action_date)
  WHERE stage NOT IN ('won','lost','on_hold');

CREATE TABLE IF NOT EXISTS v9.business_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  partner_id uuid NOT NULL,
  opportunity_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'KSM-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_agreement_reference_seq')::text,6,'0')
  ),
  external_reference text,
  agreement_type text NOT NULL
    CHECK (agreement_type IN ('mou','pks','kontrak','loi','nota_kesepahaman','lainnya')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','signed','active','expired','terminated')),
  start_date date,
  end_date date,
  signatory_label text,
  responsible_label text,
  notes text,
  approved_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  UNIQUE (id, partner_id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (partner_id, organization_id, field_key)
    REFERENCES v9.business_partners(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (opportunity_id, partner_id, organization_id, field_key)
    REFERENCES v9.business_opportunities(id, partner_id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (external_reference IS NULL OR length(btrim(external_reference)) <= 120),
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CHECK (signatory_label IS NULL OR length(btrim(signatory_label)) <= 160),
  CHECK (responsible_label IS NULL OR length(btrim(responsible_label)) <= 160),
  CHECK (notes IS NULL OR length(notes) <= 5000),
  CHECK (
    (status IN ('signed','active','expired') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status IN ('draft','review','terminated'))
  )
);

CREATE INDEX IF NOT EXISTS business_agreements_org_status_idx
  ON v9.business_agreements (organization_id, status, start_date DESC);

CREATE INDEX IF NOT EXISTS business_agreements_partner_idx
  ON v9.business_agreements (partner_id, start_date DESC);

CREATE TABLE IF NOT EXISTS v9.business_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  partner_id uuid NOT NULL,
  opportunity_id uuid,
  agreement_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'MLS-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_milestone_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','completed','blocked','cancelled')),
  completion_note text,
  completed_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (partner_id, organization_id, field_key)
    REFERENCES v9.business_partners(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (opportunity_id, partner_id, organization_id, field_key)
    REFERENCES v9.business_opportunities(id, partner_id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (agreement_id, partner_id, organization_id, field_key)
    REFERENCES v9.business_agreements(id, partner_id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK ((opportunity_id IS NOT NULL) <> (agreement_id IS NOT NULL)),
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (completion_note IS NULL OR length(completion_note) <= 3000),
  CHECK ((status='completed' AND completed_at IS NOT NULL AND completed_by IS NOT NULL)
    OR (status<>'completed' AND completed_at IS NULL AND completed_by IS NULL))
);

CREATE INDEX IF NOT EXISTS business_milestones_org_status_due_idx
  ON v9.business_milestones (organization_id, status, due_date);

CREATE INDEX IF NOT EXISTS business_milestones_partner_idx
  ON v9.business_milestones (partner_id, due_date);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0014_business_partnerships_crm.sql', 'sha256:initial-v9-business-partnerships-crm')
ON CONFLICT (name) DO NOTHING;
