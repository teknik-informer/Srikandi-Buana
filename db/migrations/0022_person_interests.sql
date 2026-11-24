-- V9.2 member profile interests.
-- Additive schema change; rehearse on the isolated V9 QA branch before any release.
CREATE TABLE IF NOT EXISTS v9.person_interests (
  organization_id uuid NOT NULL
    REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL
    REFERENCES v9.people(id) ON DELETE RESTRICT,
  interest_key text NOT NULL,
  interest_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, person_id, interest_key),
  CHECK (interest_key ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  CHECK (length(btrim(interest_label)) BETWEEN 2 AND 80)
);

CREATE INDEX IF NOT EXISTS person_interests_person_idx
  ON v9.person_interests (person_id, organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v9.person_interests TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0022_person_interests.sql', 'sha256:v9-person-interests-1')
ON CONFLICT (name) DO NOTHING;
