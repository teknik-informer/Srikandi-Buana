-- Empowerment & Training module. No sample sessions or participants are seeded.

CREATE SEQUENCE IF NOT EXISTS v9.training_session_reference_seq;

CREATE TABLE IF NOT EXISTS v9.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pelatihan' CHECK (field_key = 'pelatihan'),
  program_id uuid,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'LAT-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.training_session_reference_seq')::text,6,'0')
  ),
  title text NOT NULL,
  training_type text NOT NULL
    CHECK (training_type IN (
      'kepemimpinan','keterampilan','budidaya','pengolahan',
      'kewirausahaan','literasi_keuangan','kelembagaan','lainnya'
    )),
  objective text,
  target_group text,
  delivery_mode text NOT NULL DEFAULT 'luring'
    CHECK (delivery_mode IN ('luring','daring','hybrid')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  start_time time,
  end_time time,
  location text,
  facilitator_label text NOT NULL,
  capacity integer,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','registration_open','in_progress','completed','cancelled')),
  description text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, organization_id, field_key)
    REFERENCES v9.field_programs(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (objective IS NULL OR length(objective) <= 4000),
  CHECK (target_group IS NULL OR length(target_group) <= 300),
  CHECK (length(btrim(facilitator_label)) BETWEEN 2 AND 160),
  CHECK (location IS NULL OR length(btrim(location)) <= 300),
  CHECK (description IS NULL OR length(description) <= 5000),
  CHECK (ends_on >= starts_on),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
  CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 100000),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL)),
  CHECK ((status = 'cancelled' AND cancelled_at IS NOT NULL) OR (status <> 'cancelled' AND cancelled_at IS NULL))
);

CREATE INDEX IF NOT EXISTS training_sessions_org_status_date_idx
  ON v9.training_sessions (organization_id, status, starts_on DESC);
CREATE INDEX IF NOT EXISTS training_sessions_program_idx
  ON v9.training_sessions (program_id, starts_on DESC);

CREATE TABLE IF NOT EXISTS v9.training_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pelatihan' CHECK (field_key = 'pelatihan'),
  session_id uuid NOT NULL,
  membership_id uuid,
  attendee_name text NOT NULL,
  attendee_key text GENERATED ALWAYS AS (
    CASE
      WHEN membership_id IS NOT NULL THEN 'member:' || membership_id::text
      ELSE 'guest:' || lower(btrim(attendee_name))
    END
  ) STORED,
  attendee_role text,
  attendance_status text NOT NULL DEFAULT 'terdaftar'
    CHECK (attendance_status IN ('terdaftar','hadir','izin','sakit','alpa','batal')),
  signature_recorded boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  pre_assessment_score numeric(5,2),
  post_assessment_score numeric(5,2),
  evaluation_rating smallint,
  evaluation_note text,
  certificate_number text,
  certificate_issued_on date,
  notes text,
  registered_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (session_id, organization_id, field_key)
    REFERENCES v9.training_sessions(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (membership_id, organization_id)
    REFERENCES v9.memberships(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (session_id, attendee_key),
  CHECK (length(btrim(attendee_name)) BETWEEN 2 AND 160),
  CHECK (attendee_role IS NULL OR length(btrim(attendee_role)) <= 160),
  CHECK (pre_assessment_score IS NULL OR pre_assessment_score BETWEEN 0 AND 100),
  CHECK (post_assessment_score IS NULL OR post_assessment_score BETWEEN 0 AND 100),
  CHECK (evaluation_rating IS NULL OR evaluation_rating BETWEEN 1 AND 5),
  CHECK (evaluation_note IS NULL OR length(evaluation_note) <= 2000),
  CHECK (certificate_number IS NULL OR length(btrim(certificate_number)) BETWEEN 1 AND 100),
  CHECK (notes IS NULL OR length(notes) <= 2000),
  CHECK ((certificate_number IS NULL AND certificate_issued_on IS NULL) OR
         (certificate_number IS NOT NULL AND certificate_issued_on IS NOT NULL)),
  CHECK ((attendance_status = 'hadir' AND checked_in_at IS NOT NULL) OR
         (attendance_status <> 'hadir' AND checked_in_at IS NULL))
);

CREATE INDEX IF NOT EXISTS training_attendance_session_status_idx
  ON v9.training_attendance (session_id, attendance_status, attendee_name);
CREATE INDEX IF NOT EXISTS training_attendance_member_idx
  ON v9.training_attendance (membership_id, created_at DESC);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0012_empowerment_training_sessions.sql', 'sha256:initial-v9-empowerment-training-sessions')
ON CONFLICT (name) DO NOTHING;
