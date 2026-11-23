-- Shared operational core for the four official V9 field applications.
-- No demo workplans, programs, activities, indicators or tasks are seeded.
-- Every record is bound to the organization's approved field application.

ALTER TABLE v9.field_applications
  ADD CONSTRAINT field_applications_key_org_uq UNIQUE (field_key, organization_id);

CREATE SEQUENCE IF NOT EXISTS v9.field_workplan_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.field_program_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.field_activity_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.field_task_reference_seq;

CREATE TABLE IF NOT EXISTS v9.field_workplans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'RKT-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.field_workplan_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  objective text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','active','completed','cancelled')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (objective IS NULL OR length(objective) <= 5000),
  CHECK (period_end >= period_start),
  CHECK (
    (status IN ('approved','active','completed') AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
    OR (status IN ('draft','submitted','cancelled'))
  )
);

CREATE INDEX IF NOT EXISTS field_workplans_org_field_period_idx
  ON v9.field_workplans (organization_id, field_key, period_start DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS field_workplans_org_status_idx
  ON v9.field_workplans (organization_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS v9.field_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  workplan_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'PRG-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.field_program_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  objective text,
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planned','active','completed','paused','cancelled')),
  budget_request numeric(18,2),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (workplan_id, organization_id, field_key)
    REFERENCES v9.field_workplans(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (objective IS NULL OR length(objective) <= 5000),
  CHECK (
    period_start IS NULL OR period_end IS NULL OR period_end >= period_start
  ),
  CHECK (budget_request IS NULL OR budget_request >= 0)
);

CREATE INDEX IF NOT EXISTS field_programs_org_field_status_idx
  ON v9.field_programs (organization_id, field_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS field_programs_workplan_idx
  ON v9.field_programs (workplan_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v9.field_program_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  program_id uuid NOT NULL,
  indicator_label text NOT NULL,
  target_value numeric(18,4),
  actual_value numeric(18,4),
  unit_label text,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, organization_id, field_key)
    REFERENCES v9.field_programs(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(indicator_label)) BETWEEN 2 AND 240),
  CHECK (target_value IS NULL OR target_value >= 0),
  CHECK (actual_value IS NULL OR actual_value >= 0),
  CHECK (unit_label IS NULL OR length(btrim(unit_label)) <= 60),
  CHECK (note IS NULL OR length(note) <= 1000)
);

CREATE INDEX IF NOT EXISTS field_program_indicators_program_idx
  ON v9.field_program_indicators (program_id, sort_order);

CREATE TABLE IF NOT EXISTS v9.field_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  program_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'KGT-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.field_activity_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  activity_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  description text,
  responsible_label text,
  responsible_user_id uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  open_to_public boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, organization_id, field_key)
    REFERENCES v9.field_programs(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (location IS NULL OR length(btrim(location)) <= 300),
  CHECK (description IS NULL OR length(description) <= 5000),
  CHECK (responsible_label IS NULL OR length(btrim(responsible_label)) <= 160),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
  CHECK ((status='completed' AND completed_at IS NOT NULL) OR (status<>'completed' AND completed_at IS NULL)),
  CHECK ((status='cancelled' AND cancelled_at IS NOT NULL) OR (status<>'cancelled' AND cancelled_at IS NULL))
);

CREATE INDEX IF NOT EXISTS field_activities_org_field_date_idx
  ON v9.field_activities (organization_id, field_key, activity_date DESC);
CREATE INDEX IF NOT EXISTS field_activities_org_field_status_idx
  ON v9.field_activities (organization_id, field_key, status, activity_date);

CREATE TABLE IF NOT EXISTS v9.field_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  program_id uuid,
  activity_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'TSK-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.field_task_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  description text,
  assignee_label text,
  assigned_to_user_id uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  due_date date,
  priority text NOT NULL DEFAULT 'sedang'
    CHECK (priority IN ('tinggi','sedang','rendah')),
  status text NOT NULL DEFAULT 'belum'
    CHECK (status IN ('belum','proses','selesai','dibatalkan')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, organization_id, field_key)
    REFERENCES v9.field_programs(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (activity_id, organization_id, field_key)
    REFERENCES v9.field_activities(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (description IS NULL OR length(description) <= 5000),
  CHECK (assignee_label IS NULL OR length(btrim(assignee_label)) <= 160),
  CHECK ((status='selesai' AND completed_at IS NOT NULL) OR (status<>'selesai' AND completed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS field_tasks_org_field_status_due_idx
  ON v9.field_tasks (organization_id, field_key, status, due_date);
CREATE INDEX IF NOT EXISTS field_tasks_assignee_status_idx
  ON v9.field_tasks (assigned_to_user_id, status, due_date);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0009_field_applications_operational_core.sql', 'sha256:initial-v9-field-applications-operational-core')
ON CONFLICT (name) DO NOTHING;
