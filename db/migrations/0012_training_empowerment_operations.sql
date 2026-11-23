-- Training and empowerment operations: sessions, participants, attendance,
-- assessment results and controlled certificate records. No sample data is seeded.

CREATE SEQUENCE IF NOT EXISTS v9.training_session_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.training_certificate_reference_seq;

CREATE TABLE IF NOT EXISTS v9.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pelatihan' CHECK (field_key = 'pelatihan'),
  program_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'LAT-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.training_session_reference_seq')::text, 6, '0')
  ),
  title text NOT NULL,
  topic text,
  session_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  trainer_label text,
  max_participants integer,
  description text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','registration_open','in_progress','completed','cancelled')),
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
  CHECK (topic IS NULL OR length(btrim(topic)) <= 240),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
  CHECK (location IS NULL OR length(btrim(location)) <= 300),
  CHECK (trainer_label IS NULL OR length(btrim(trainer_label)) <= 160),
  CHECK (max_participants IS NULL OR max_participants BETWEEN 1 AND 50000),
  CHECK (description IS NULL OR length(description) <= 5000),
  CHECK ((status='completed' AND completed_at IS NOT NULL) OR (status<>'completed' AND completed_at IS NULL)),
  CHECK ((status='cancelled' AND cancelled_at IS NOT NULL) OR (status<>'cancelled' AND cancelled_at IS NULL))
);

CREATE INDEX IF NOT EXISTS training_sessions_org_date_idx
  ON v9.training_sessions (organization_id, session_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS training_sessions_org_status_date_idx
  ON v9.training_sessions (organization_id, status, session_date);

CREATE TABLE IF NOT EXISTS v9.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pelatihan' CHECK (field_key = 'pelatihan'),
  session_id uuid NOT NULL,
  membership_id uuid,
  participant_name text NOT NULL,
  affiliation_label text,
  registration_status text NOT NULL DEFAULT 'registered'
    CHECK (registration_status IN ('registered','confirmed','waitlisted','cancelled')),
  attendance_status text NOT NULL DEFAULT 'not_marked'
    CHECK (attendance_status IN ('not_marked','hadir','izin','sakit','alpa')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  attendance_recorded_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  attendance_recorded_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (session_id, organization_id, field_key)
    REFERENCES v9.training_sessions(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (membership_id, organization_id)
    REFERENCES v9.memberships(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(participant_name)) BETWEEN 2 AND 160),
  CHECK (affiliation_label IS NULL OR length(btrim(affiliation_label)) <= 160),
  CHECK (note IS NULL OR length(note) <= 1000),
  CHECK (
    (attendance_status='not_marked' AND attendance_recorded_at IS NULL)
    OR (attendance_status<>'not_marked' AND attendance_recorded_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS training_enrollments_member_session_uq
  ON v9.training_enrollments (session_id, membership_id)
  WHERE membership_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS training_enrollments_guest_session_uq
  ON v9.training_enrollments (session_id, lower(btrim(participant_name)))
  WHERE membership_id IS NULL;

CREATE INDEX IF NOT EXISTS training_enrollments_session_status_idx
  ON v9.training_enrollments (session_id, registration_status, attendance_status);

CREATE INDEX IF NOT EXISTS training_enrollments_org_member_idx
  ON v9.training_enrollments (organization_id, membership_id, registered_at DESC);

CREATE TABLE IF NOT EXISTS v9.training_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pelatihan' CHECK (field_key = 'pelatihan'),
  enrollment_id uuid NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('pre','post')),
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  assessment_note text,
  assessed_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, assessment_type),
  FOREIGN KEY (enrollment_id, organization_id, field_key)
    REFERENCES v9.training_enrollments(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (assessment_note IS NULL OR length(assessment_note) <= 2000)
);

CREATE INDEX IF NOT EXISTS training_assessments_org_type_idx
  ON v9.training_assessments (organization_id, assessment_type, assessed_at DESC);

CREATE TABLE IF NOT EXISTS v9.training_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pelatihan' CHECK (field_key = 'pelatihan'),
  enrollment_id uuid NOT NULL,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'SRT-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.training_certificate_reference_seq')::text, 6, '0')
  ),
  issue_date date NOT NULL,
  issuer_label text NOT NULL,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','revoked')),
  issued_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  revoked_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revocation_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id),
  FOREIGN KEY (enrollment_id, organization_id, field_key)
    REFERENCES v9.training_enrollments(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(issuer_label)) BETWEEN 2 AND 160),
  CHECK (revocation_note IS NULL OR length(revocation_note) <= 1000),
  CHECK ((status='revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL) OR (status='issued' AND revoked_by IS NULL AND revoked_at IS NULL))
);

CREATE INDEX IF NOT EXISTS training_certificates_org_issue_date_idx
  ON v9.training_certificates (organization_id, issue_date DESC, status);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0012_training_empowerment_operations.sql', 'sha256:initial-v9-training-empowerment-operations')
ON CONFLICT (name) DO NOTHING;
