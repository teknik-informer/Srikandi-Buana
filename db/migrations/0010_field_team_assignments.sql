-- Formal field team assignments are distinct from membership in a field unit.
-- Proposals do not activate system roles; organization leadership approves appointments.

CREATE TABLE IF NOT EXISTS v9.field_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL,
  membership_id uuid NOT NULL,
  role_label text NOT NULL,
  scope_label text,
  appointment_reference text,
  appointed_on date,
  valid_from date NOT NULL,
  valid_until date,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','active','ended','cancelled')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  approved_at timestamptz,
  ended_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (membership_id, organization_id)
    REFERENCES v9.memberships(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(role_label)) BETWEEN 2 AND 160),
  CHECK (scope_label IS NULL OR length(btrim(scope_label)) <= 300),
  CHECK (appointment_reference IS NULL OR length(btrim(appointment_reference)) <= 100),
  CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CHECK (
    (status = 'active' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status <> 'active' AND approved_by IS NULL AND approved_at IS NULL)
  ),
  CHECK (
    (status = 'ended' AND ended_by IS NOT NULL AND ended_at IS NOT NULL)
    OR (status <> 'ended' AND ended_by IS NULL AND ended_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS field_team_assignments_open_membership_uq
  ON v9.field_team_assignments (organization_id, field_key, membership_id)
  WHERE status IN ('proposed','active');

CREATE INDEX IF NOT EXISTS field_team_assignments_scope_status_idx
  ON v9.field_team_assignments (organization_id, field_key, status, valid_from DESC);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0010_field_team_assignments.sql', 'sha256:initial-v9-field-team-assignments')
ON CONFLICT (name) DO NOTHING;
