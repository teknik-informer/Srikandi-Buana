-- Secretariat incoming/outgoing letter register.
-- "number" is the external letter number supplied or confirmed by Secretariat.
-- It is deliberately nullable: the app does not invent an official numbering policy.

CREATE SEQUENCE IF NOT EXISTS v9.secretariat_letter_reference_seq;

CREATE TABLE IF NOT EXISTS v9.secretariat_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'REG-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.secretariat_letter_reference_seq')::text, 6, '0')
  ),
  direction text NOT NULL CHECK (direction IN ('masuk', 'keluar')),
  number text,
  subject text NOT NULL,
  counterpart text NOT NULL,
  letter_date date NOT NULL,
  status text NOT NULL DEFAULT 'baru'
    CHECK (status IN ('baru', 'diproses', 'selesai')),
  assignee_label text NOT NULL,
  assigned_to_user_id uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(subject)) BETWEEN 3 AND 300),
  CHECK (length(btrim(counterpart)) BETWEEN 2 AND 200),
  CHECK (length(btrim(assignee_label)) BETWEEN 2 AND 120),
  CHECK (number IS NULL OR length(btrim(number)) BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS secretariat_letters_org_direction_number_uq
  ON v9.secretariat_letters (organization_id, direction, number)
  WHERE number IS NOT NULL;

CREATE INDEX IF NOT EXISTS secretariat_letters_org_direction_date_idx
  ON v9.secretariat_letters (organization_id, direction, letter_date DESC);

CREATE INDEX IF NOT EXISTS secretariat_letters_org_status_idx
  ON v9.secretariat_letters (organization_id, status, created_at DESC);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0005_secretariat_letters.sql', 'sha256:initial-v9-secretariat-letters')
ON CONFLICT (name) DO NOTHING;
