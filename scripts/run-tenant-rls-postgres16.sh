#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the disposable PostgreSQL 16 CI service}"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'v9_app') THEN
    CREATE ROLE v9_app NOLOGIN;
  END IF;
END
$$;
SQL

migration_dir="db/migrations"
mapfile -t migrations < <(find "$migration_dir" -maxdepth 1 -type f -name '*.sql' ! -name '0044_tenant_row_level_security.sql' ! -name '0045_tenant_scope_field_application_identity.sql' | sort)

for migration in "${migrations[@]}"; do
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$migration"
  if [[ "$(basename "$migration")" == "0001_v9_identity_and_membership.sql" ]]; then
    psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO v9.organizations (
  id, slug, legal_name, short_name, status
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'srikandi-buana',
  'Srikandi Buana CI Tenant',
  'Srikandi CI',
  'active'
)
ON CONFLICT (slug) DO NOTHING;
SQL
  fi
done

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA v9 TO v9_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA v9 TO v9_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA v9 TO v9_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA v9 TO v9_app;
SQL

# Recreate the legacy v1 helper/policy state already found on the QA branch.
# The current migration must safely replace it, remove obsolete SECURITY DEFINER
# helpers, and reconcile the existing schema_migrations checksum.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/postgres16/tenant-rls-legacy-v1-fixture.sql

# Apply twice to prove the upgrade is safe and the v2 state remains idempotent.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/migrations/0044_tenant_row_level_security.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/migrations/0044_tenant_row_level_security.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/migrations/0045_tenant_scope_field_application_identity.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/migrations/0045_tenant_scope_field_application_identity.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/postgres16/tenant-rls-integration.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/postgres16/business-order-lifecycle-integration.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/postgres16/finance-lifecycle-integration.sql
bash tests/postgres16/tenant-rls-payment-concurrency.sh
