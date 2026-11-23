-- Scope public membership-interest submissions and review queues to an organization.
-- Existing records are assigned to the single seeded Srikandi Buana organization.

ALTER TABLE v9.membership_interests
  ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE v9.membership_interests
SET organization_id = (
  SELECT id FROM v9.organizations
  WHERE slug = 'srikandi-buana'
  LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE v9.membership_interests
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE v9.membership_interests
  ADD CONSTRAINT membership_interests_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES v9.organizations(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS membership_interests_org_status_created_idx
  ON v9.membership_interests (organization_id, status, created_at DESC);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0004_membership_interest_org_scope.sql', 'sha256:initial-v9-membership-interest-org-scope')
ON CONFLICT (name) DO NOTHING;
