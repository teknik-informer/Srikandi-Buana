-- Preserve the legacy credential provenance without marking email as verified.
-- This is an explicit compatibility allowance for accounts imported from public.users.
ALTER TABLE v9.user_accounts
  ADD COLUMN IF NOT EXISTS legacy_auth_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE v9.user_accounts
  ADD COLUMN IF NOT EXISTS legacy_source_user_id text;
ALTER TABLE v9.people
  ADD COLUMN IF NOT EXISTS legacy_source_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_legacy_source_uq
  ON v9.user_accounts (legacy_source_user_id)
  WHERE legacy_source_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS people_legacy_source_uq
  ON v9.people (legacy_source_user_id)
  WHERE legacy_source_user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON TABLE v9.people TO v9_app;
GRANT SELECT, INSERT, UPDATE ON TABLE v9.user_accounts TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0020_legacy_auth_compatibility.sql', 'sha256:v9-legacy-auth-compatibility-1')
ON CONFLICT (name) DO NOTHING;
