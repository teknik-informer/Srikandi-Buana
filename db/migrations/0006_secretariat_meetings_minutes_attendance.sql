-- Secretariat meetings, immutable minute revisions, decisions and attendance.
-- No demo meetings, minutes or attendance rows are seeded.

CREATE SEQUENCE IF NOT EXISTS v9.secretariat_meeting_reference_seq;

CREATE TABLE IF NOT EXISTS v9.secretariat_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'RPT-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.secretariat_meeting_reference_seq')::text, 6, '0')
  ),
  title text NOT NULL,
  meeting_type text NOT NULL
    CHECK (meeting_type IN ('pengurus', 'bidang', 'anggota')),
  meeting_date date NOT NULL,
  time_label text,
  location text,
  description text,
  unit_id uuid,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  open_to_public boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (unit_id, organization_id)
    REFERENCES v9.organization_units(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(title)) BETWEEN 3 AND 300),
  CHECK (time_label IS NULL OR length(btrim(time_label)) <= 80),
  CHECK (location IS NULL OR length(btrim(location)) <= 300),
  CHECK (description IS NULL OR length(btrim(description)) <= 4000),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  ),
  CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS secretariat_meetings_org_date_idx
  ON v9.secretariat_meetings (organization_id, meeting_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS secretariat_meetings_org_status_date_idx
  ON v9.secretariat_meetings (organization_id, status, meeting_date);

CREATE TABLE IF NOT EXISTS v9.secretariat_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES v9.secretariat_meetings(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL DEFAULT 1 CHECK (revision_no > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  opening_notes text,
  discussion_notes text,
  closing_notes text,
  prepared_by_label text,
  prepared_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  finalized_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, revision_no),
  CHECK (opening_notes IS NULL OR length(opening_notes) <= 10000),
  CHECK (discussion_notes IS NULL OR length(discussion_notes) <= 30000),
  CHECK (closing_notes IS NULL OR length(closing_notes) <= 10000),
  CHECK (prepared_by_label IS NULL OR length(btrim(prepared_by_label)) <= 160),
  CHECK (
    (status = 'final' AND finalized_by IS NOT NULL AND finalized_at IS NOT NULL)
    OR (status = 'draft' AND finalized_by IS NULL AND finalized_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_minutes_one_draft_per_meeting_uq
  ON v9.secretariat_minutes (meeting_id)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS secretariat_minutes_meeting_revision_idx
  ON v9.secretariat_minutes (meeting_id, revision_no DESC);

CREATE TABLE IF NOT EXISTS v9.secretariat_meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id uuid NOT NULL REFERENCES v9.secretariat_minutes(id) ON DELETE RESTRICT,
  order_no integer NOT NULL CHECK (order_no > 0),
  decision_text text NOT NULL,
  responsible_label text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (minutes_id, order_no),
  CHECK (length(btrim(decision_text)) BETWEEN 3 AND 3000),
  CHECK (responsible_label IS NULL OR length(btrim(responsible_label)) <= 160)
);

CREATE INDEX IF NOT EXISTS secretariat_meeting_decisions_minutes_idx
  ON v9.secretariat_meeting_decisions (minutes_id, order_no);

CREATE TABLE IF NOT EXISTS v9.secretariat_meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES v9.secretariat_meetings(id) ON DELETE RESTRICT,
  person_id uuid REFERENCES v9.people(id) ON DELETE RESTRICT,
  membership_id uuid REFERENCES v9.memberships(id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  role_label text,
  attendance_status text NOT NULL DEFAULT 'hadir'
    CHECK (attendance_status IN ('hadir', 'izin', 'sakit', 'alpa')),
  attendance_note text,
  signature_recorded boolean NOT NULL DEFAULT false,
  recorded_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(display_name)) BETWEEN 2 AND 160),
  CHECK (role_label IS NULL OR length(btrim(role_label)) <= 160),
  CHECK (attendance_note IS NULL OR length(attendance_note) <= 1000),
  CHECK (membership_id IS NULL OR person_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_meeting_attendance_person_uq
  ON v9.secretariat_meeting_attendance (meeting_id, person_id)
  WHERE person_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_meeting_attendance_guest_name_uq
  ON v9.secretariat_meeting_attendance (meeting_id, lower(btrim(display_name)))
  WHERE person_id IS NULL;

CREATE INDEX IF NOT EXISTS secretariat_meeting_attendance_meeting_status_idx
  ON v9.secretariat_meeting_attendance (meeting_id, attendance_status);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0006_secretariat_meetings_minutes_attendance.sql', 'sha256:initial-v9-secretariat-meetings-minutes-attendance')
ON CONFLICT (name) DO NOTHING;
