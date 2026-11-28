\set ON_ERROR_STOP on

-- Simulate the already-deployed V9 RLS v1 state on a disposable CI database.
-- The current migration must replace its broad account/community row helpers
-- and update the existing ledger row without requiring a fresh database.
CREATE OR REPLACE FUNCTION v9._account_row_visible(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT true
$function$;

CREATE OR REPLACE FUNCTION v9._community_membership_visible(p_membership_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT true
$function$;

CREATE OR REPLACE FUNCTION v9._community_person_visible(p_person_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT true
$function$;

GRANT EXECUTE ON FUNCTION v9._account_row_visible(uuid) TO v9_app;
GRANT EXECUTE ON FUNCTION v9._community_membership_visible(uuid) TO v9_app;
GRANT EXECUTE ON FUNCTION v9._community_person_visible(uuid) TO v9_app;

ALTER TABLE v9.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE v9.user_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE v9.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE v9.memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE v9.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE v9.people FORCE ROW LEVEL SECURITY;

CREATE POLICY user_accounts_read_scope ON v9.user_accounts
  FOR SELECT TO v9_app
  USING (
    v9._account_row_visible(id)
    OR lower(email) = NULLIF(current_setting('v9.login_email', true), '')
  );

CREATE POLICY memberships_community_author_read ON v9.memberships
  FOR SELECT TO v9_app
  USING (v9._community_membership_visible(id));

CREATE POLICY people_community_author_read ON v9.people
  FOR SELECT TO v9_app
  USING (v9._community_person_visible(id));

INSERT INTO v9.schema_migrations (name, checksum)
VALUES (
  '0044_tenant_row_level_security.sql',
  'sha256:tenant-row-level-security-v1'
)
ON CONFLICT (name) DO UPDATE
SET checksum = EXCLUDED.checksum,
    applied_at = now();
