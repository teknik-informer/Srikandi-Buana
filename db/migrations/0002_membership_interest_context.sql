-- Add structured context captured by the V9 public membership-interest form.
-- Safe additive migration; existing submissions remain valid.

ALTER TABLE v9.membership_interests
  ADD COLUMN IF NOT EXISTS experience_level text;

ALTER TABLE v9.membership_interests
  ADD CONSTRAINT membership_interests_experience_level_check
  CHECK (
    experience_level IS NULL
    OR experience_level IN ('baru', '1-3', '4-10', '10+')
  );

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0002_membership_interest_context.sql', 'sha256:initial-v9-membership-interest-context')
ON CONFLICT (name) DO NOTHING;
