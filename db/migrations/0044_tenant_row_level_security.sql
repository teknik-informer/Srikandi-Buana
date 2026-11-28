-- Tenant isolation for the V9 application schema.
-- Runtime identity is derived from a verified opaque session hash or a narrow
-- server-created login/public context, never from browser-supplied user/org IDs.
-- Apply in QA/Preview first; do not run against Production without separate approval.

CREATE OR REPLACE FUNCTION v9._request_actor()
RETURNS TABLE (
  user_id uuid,
  organization_id uuid,
  person_id uuid,
  membership_id uuid,
  role_key text,
  scope_kind text,
  scope_unit_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    account.id,
    organization.id,
    account.person_id,
    membership.id,
    assignment.role_key,
    assignment.scope_kind,
    assignment.scope_unit_id
  FROM v9.sessions AS session
  INNER JOIN v9.user_accounts AS account
    ON account.id = session.user_id
  INNER JOIN v9.role_assignments AS assignment
    ON assignment.user_id = account.id
  INNER JOIN v9.organizations AS organization
    ON organization.id = assignment.organization_id
  LEFT JOIN LATERAL (
    SELECT member.id
    FROM v9.memberships AS member
    WHERE member.person_id = account.person_id
      AND member.organization_id = assignment.organization_id
      AND member.status = 'active'
      AND (member.valid_from IS NULL OR member.valid_from <= current_date)
      AND (member.valid_until IS NULL OR member.valid_until >= current_date)
    ORDER BY member.created_at DESC
    LIMIT 1
  ) AS membership ON true
  WHERE session.token_hash = NULLIF(current_setting('v9.session_token_hash', true), '')
    AND session.revoked_at IS NULL
    AND session.expires_at > now()
    AND account.status = 'active'
    AND (account.email_verified_at IS NOT NULL OR account.legacy_auth_eligible = true)
    AND organization.status = 'active'
    AND assignment.is_active = true
    AND assignment.valid_from <= now()
    AND (assignment.valid_until IS NULL OR assignment.valid_until > now())
  ORDER BY
    CASE assignment.role_key
      WHEN 'platform_admin' THEN 1
      WHEN 'organization_admin' THEN 2
      WHEN 'chair' THEN 3
      WHEN 'secretary' THEN 4
      WHEN 'treasurer' THEN 5
      WHEN 'field_coordinator' THEN 6
      WHEN 'field_staff' THEN 7
      WHEN 'cashier' THEN 8
      WHEN 'member' THEN 9
      ELSE 10
    END,
    assignment.created_at
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION v9._login_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE value text;
BEGIN
  value := NULLIF(current_setting('v9.login_user_id', true), '');
  IF value IS NULL THEN RETURN NULL; END IF;
  RETURN value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END
$function$;

CREATE OR REPLACE FUNCTION v9._tenant_row_visible(
  p_organization_id uuid,
  p_field_key text DEFAULT NULL,
  p_membership_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_person_id uuid DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  IF actor.user_id IS NULL OR actor.organization_id IS DISTINCT FROM p_organization_id THEN
    RETURN false;
  END IF;

  IF actor.scope_kind = 'organization' THEN
    RETURN true;
  ELSIF actor.scope_kind = 'unit' THEN
    IF p_unit_id IS NOT NULL AND p_unit_id = actor.scope_unit_id THEN
      RETURN true;
    END IF;
    IF p_field_key IS NOT NULL AND EXISTS (
      SELECT 1
      FROM v9.field_applications AS app
      WHERE app.organization_id = actor.organization_id
        AND app.unit_id = actor.scope_unit_id
        AND app.field_key = p_field_key
        AND app.is_enabled = true
    ) THEN
      RETURN true;
    END IF;
    RETURN false;
  ELSIF actor.scope_kind = 'self' THEN
    RETURN
      (p_user_id IS NOT NULL AND p_user_id = actor.user_id)
      OR (p_membership_id IS NOT NULL AND p_membership_id = actor.membership_id)
      OR (p_person_id IS NOT NULL AND p_person_id = actor.person_id);
  END IF;

  RETURN false;
END
$function$;

CREATE OR REPLACE FUNCTION v9._can_manage_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  RETURN actor.user_id IS NOT NULL
    AND actor.organization_id = p_organization_id
    AND actor.role_key IN ('platform_admin', 'organization_admin', 'chair', 'secretary');
END
$function$;

CREATE OR REPLACE FUNCTION v9._person_row_visible(p_person_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  IF actor.user_id IS NULL THEN RETURN false; END IF;
  IF actor.person_id = p_person_id THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM v9.memberships AS member
    WHERE member.person_id = p_person_id
      AND member.organization_id = actor.organization_id
      AND v9._tenant_row_visible(
        member.organization_id, NULL, member.id, NULL, member.person_id, member.unit_id
      )
  );
END
$function$;

CREATE OR REPLACE FUNCTION v9._account_row_visible(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE actor record;
  linked_person uuid;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  IF actor.user_id IS NULL THEN RETURN false; END IF;
  IF actor.user_id = p_user_id THEN RETURN true; END IF;

  SELECT account.person_id INTO linked_person
  FROM v9.user_accounts AS account
  WHERE account.id = p_user_id;

  RETURN linked_person IS NOT NULL AND v9._person_row_visible(linked_person);
END
$function$;

CREATE OR REPLACE FUNCTION v9._login_organization_visible(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.role_assignments AS assignment
    INNER JOIN v9.organizations AS organization
      ON organization.id = assignment.organization_id
    WHERE assignment.user_id = v9._login_user_id()
      AND assignment.organization_id = p_organization_id
      AND assignment.is_active = true
      AND assignment.valid_from <= now()
      AND (assignment.valid_until IS NULL OR assignment.valid_until > now())
      AND organization.status = 'active'
  )
$function$;

CREATE OR REPLACE FUNCTION v9._login_field_application_visible(
  p_organization_id uuid,
  p_unit_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.role_assignments AS assignment
    INNER JOIN v9.organizations AS organization
      ON organization.id = assignment.organization_id
    WHERE assignment.user_id = v9._login_user_id()
      AND assignment.organization_id = p_organization_id
      AND assignment.scope_unit_id = p_unit_id
      AND assignment.is_active = true
      AND assignment.valid_from <= now()
      AND (assignment.valid_until IS NULL OR assignment.valid_until > now())
      AND organization.status = 'active'
  )
$function$;

CREATE OR REPLACE FUNCTION v9._document_row_visible(p_document_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE row_value record;
BEGIN
  SELECT document.organization_id, document.created_by
    INTO row_value
  FROM v9.secretariat_documents AS document
  WHERE document.id = p_document_id;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN v9._tenant_row_visible(row_value.organization_id, NULL, NULL, row_value.created_by, NULL, NULL);
END
$function$;

CREATE OR REPLACE FUNCTION v9._meeting_row_visible(p_meeting_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
DECLARE row_value record;
BEGIN
  SELECT meeting.organization_id, meeting.unit_id, meeting.created_by
    INTO row_value
  FROM v9.secretariat_meetings AS meeting
  WHERE meeting.id = p_meeting_id;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN v9._tenant_row_visible(
    row_value.organization_id, NULL, NULL, row_value.created_by, NULL, row_value.unit_id
  );
END
$function$;

CREATE OR REPLACE FUNCTION v9._minutes_row_visible(p_minutes_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.secretariat_minutes AS minutes
    WHERE minutes.id = p_minutes_id
      AND v9._meeting_row_visible(minutes.meeting_id)
  )
$function$;

CREATE OR REPLACE FUNCTION v9._training_enrollment_row_visible(p_enrollment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.training_enrollments AS enrollment
    WHERE enrollment.id = p_enrollment_id
      AND v9._tenant_row_visible(
        enrollment.organization_id,
        enrollment.field_key,
        enrollment.membership_id,
        enrollment.recorded_by,
        NULL,
        NULL
      )
  )
$function$;

CREATE OR REPLACE FUNCTION v9._plot_row_visible(p_plot_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.agriculture_plots AS plot
    WHERE plot.id = p_plot_id
      AND v9._tenant_row_visible(
        plot.organization_id, plot.field_key, plot.owner_membership_id,
        plot.created_by, NULL, NULL
      )
  )
$function$;

CREATE OR REPLACE FUNCTION v9._cycle_row_visible(p_cycle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.agriculture_cycles AS cycle
    WHERE cycle.id = p_cycle_id
      AND v9._tenant_row_visible(
        cycle.organization_id, cycle.field_key, NULL, cycle.created_by, NULL, NULL
      )
  )
$function$;

CREATE OR REPLACE FUNCTION v9._share_asset_allowed(p_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.file_share_links AS link
    INNER JOIN v9.file_assets AS asset
      ON asset.id = link.file_asset_id
      AND asset.organization_id = link.organization_id
    WHERE link.file_asset_id = p_asset_id
      AND link.token_hash = NULLIF(current_setting('v9.share_token_hash', true), '')
      AND link.revoked_at IS NULL
      AND link.expires_at > now()
      AND (link.max_downloads IS NULL OR link.download_count < link.max_downloads)
      AND asset.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM v9.secretariat_document_files AS file
        INNER JOIN v9.secretariat_documents AS document ON document.id = file.document_id
        WHERE file.asset_id = asset.id
          AND (
            document.status <> 'final'
            OR document.visibility <> 'publik'
            OR file.revision_no <> (
              SELECT max(latest.revision_no)
              FROM v9.secretariat_document_files AS latest
              WHERE latest.document_id = file.document_id
            )
          )
      )
  )
$function$;

CREATE OR REPLACE FUNCTION v9._share_document_allowed(p_document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.secretariat_document_files AS file
    INNER JOIN v9.secretariat_documents AS document
      ON document.id = file.document_id
    INNER JOIN v9.file_assets AS asset
      ON asset.id = file.asset_id
    INNER JOIN v9.file_share_links AS link
      ON link.file_asset_id = asset.id
      AND link.organization_id = asset.organization_id
    WHERE file.document_id = p_document_id
      AND link.token_hash = NULLIF(current_setting('v9.share_token_hash', true), '')
      AND link.revoked_at IS NULL
      AND link.expires_at > now()
      AND (link.max_downloads IS NULL OR link.download_count < link.max_downloads)
      AND asset.status = 'active'
      AND document.status = 'final'
      AND document.visibility = 'publik'
      AND file.revision_no = (
        SELECT max(latest.revision_no)
        FROM v9.secretariat_document_files AS latest
        WHERE latest.document_id = file.document_id
      )
  )
$function$;

CREATE OR REPLACE FUNCTION v9._public_banner_asset(p_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.file_assets AS asset
    INNER JOIN v9.organizations AS organization
      ON organization.id = asset.organization_id
    INNER JOIN v9.system_settings AS setting
      ON setting.organization_id = organization.id
    WHERE asset.id = p_asset_id
      AND organization.slug = 'srikandi-buana'
      AND organization.status = 'active'
      AND asset.status = 'active'
      AND asset.scope_kind = 'organization'
      AND asset.category = 'public-site-banner'
      AND asset.mime_type LIKE 'image/%'
      AND setting.setting_key = 'public_site'
      AND setting.visibility = 'public'
      AND setting.setting_value #>> '{hero,imageAssetId}' = asset.id::text
  )
$function$;

-- Public-interest and login contexts are deliberately separate from an
-- authenticated organization session.
CREATE OR REPLACE FUNCTION v9._public_interest_context()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT current_setting('v9.auth_flow', true) = 'public-interest'
$function$;

CREATE OR REPLACE FUNCTION v9._can_review_memberships(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9._request_actor() AS actor
    WHERE actor.organization_id = p_organization_id
      AND actor.role_key IN ('platform_admin', 'organization_admin', 'chair', 'secretary')
  )
$function$;

-- Inventory and enforce RLS on every audited V9 table. Tables without an
-- explicit policy below remain default-deny for v9_app.
DO $rls$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'agriculture_cycles','agriculture_harvests','agriculture_plots','agriculture_visits',
    'audit_events','bootstrap_state','business_agreements','business_customers',
    'business_inventory_movements','business_milestones','business_opportunities',
    'business_order_items','business_order_payments','business_orders','business_partners',
    'business_product_stock','business_products','business_warehouses','field_activities',
    'field_applications','field_program_indicators','field_programs','field_tasks',
    'field_team_assignments','field_workplans','file_assets','file_share_links',
    'finance_accounts','finance_budget_lines','finance_budgets','finance_cash_accounts',
    'finance_contribution_allocations','finance_journal_lines','finance_journals',
    'finance_periods','login_rate_limits','member_community_replies',
    'member_community_reports','member_community_topics','membership_interests',
    'memberships','organization_units','organizations','outbox_events','people',
    'person_interests','role_assignments','schema_migrations','secretariat_document_files',
    'secretariat_document_generations','secretariat_documents','secretariat_letters',
    'secretariat_meeting_attendance','secretariat_meeting_decisions','secretariat_meetings',
    'secretariat_minutes','sessions','system_settings','training_assessments',
    'training_certificates','training_enrollments','training_sessions','user_accounts'
  ] LOOP
    EXECUTE format('ALTER TABLE v9.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE v9.%I FORCE ROW LEVEL SECURITY', v_table);
  END LOOP;
END
$rls$;

-- Direct organization/field/member scoped operational tables.
DO $policies$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('agriculture_harvests', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid) OR v9._plot_row_visible(plot_id) OR v9._cycle_row_visible(cycle_id)'),
      ('agriculture_visits', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid) OR v9._plot_row_visible(plot_id) OR v9._cycle_row_visible(cycle_id)'),
      ('business_agreements', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_customers', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_inventory_movements', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, recorded_by, NULL::uuid, NULL::uuid)'),
      ('business_milestones', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_opportunities', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_order_items', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid)'),
      ('business_order_payments', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, received_by, NULL::uuid, NULL::uuid)'),
      ('business_orders', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_partners', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_product_stock', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, updated_by, NULL::uuid, NULL::uuid)'),
      ('business_products', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('business_warehouses', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('field_activities', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('field_program_indicators', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('field_programs', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('field_tasks', '(v9._tenant_row_visible(organization_id, field_key, NULL::uuid, assigned_to_user_id, NULL::uuid, NULL::uuid) OR v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid))'),
      ('field_team_assignments', 'v9._tenant_row_visible(organization_id, field_key, membership_id, created_by, NULL::uuid, NULL::uuid)'),
      ('field_workplans', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_accounts', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_budget_lines', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid)'),
      ('finance_budgets', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_cash_accounts', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_contribution_allocations', 'v9._tenant_row_visible(organization_id, NULL::text, membership_id, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_journal_lines', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid)'),
      ('finance_journals', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_periods', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('member_community_replies', 'v9._tenant_row_visible(organization_id, NULL::text, membership_id, author_user_id, NULL::uuid, NULL::uuid)'),
      ('member_community_reports', 'v9._tenant_row_visible(organization_id, NULL::text, reporter_membership_id, reporter_user_id, NULL::uuid, NULL::uuid)'),
      ('member_community_topics', 'v9._tenant_row_visible(organization_id, NULL::text, membership_id, author_user_id, NULL::uuid, NULL::uuid)'),
      ('person_interests', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, NULL::uuid, person_id, NULL::uuid)'),
      ('training_sessions', 'v9._tenant_row_visible(organization_id, field_key, NULL::uuid, created_by, NULL::uuid, NULL::uuid)')
    ) AS policy_map(table_name, predicate)
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON v9.%I FOR ALL TO v9_app USING (%s) WITH CHECK (%s)',
      'tenant_scope_' || item.table_name, item.table_name, item.predicate, item.predicate
    );
  END LOOP;
END
$policies$;

-- Agriculture cycles and plots have related-row scope rather than owner columns
-- on every child table.
CREATE POLICY tenant_scope_agriculture_plots ON v9.agriculture_plots
  FOR ALL TO v9_app
  USING (v9._tenant_row_visible(organization_id, field_key, owner_membership_id, created_by, NULL, NULL))
  WITH CHECK (v9._tenant_row_visible(organization_id, field_key, owner_membership_id, created_by, NULL, NULL));

CREATE POLICY tenant_scope_agriculture_cycles ON v9.agriculture_cycles
  FOR ALL TO v9_app
  USING (v9._tenant_row_visible(organization_id, field_key, NULL, created_by, NULL, NULL) OR v9._plot_row_visible(plot_id))
  WITH CHECK (v9._tenant_row_visible(organization_id, field_key, NULL, created_by, NULL, NULL) OR v9._plot_row_visible(plot_id));

-- Organization, unit, membership, identity and authentication tables.
CREATE POLICY organizations_read_scope ON v9.organizations
  FOR SELECT TO v9_app
  USING (
    id = (SELECT actor.organization_id FROM v9._request_actor() AS actor LIMIT 1)
    OR v9._login_organization_visible(id)
    OR (slug = 'srikandi-buana' AND status = 'active')
  );

CREATE POLICY organization_units_read_scope ON v9.organization_units
  FOR SELECT TO v9_app
  USING (v9._tenant_row_visible(organization_id, NULL, NULL, NULL, NULL, id));
CREATE POLICY organization_units_write_scope ON v9.organization_units
  FOR ALL TO v9_app
  USING (v9._can_manage_organization(organization_id))
  WITH CHECK (v9._can_manage_organization(organization_id));

CREATE POLICY field_applications_read_scope ON v9.field_applications
  FOR SELECT TO v9_app
  USING (
    v9._tenant_row_visible(organization_id, field_key, NULL, NULL, NULL, unit_id)
    OR v9._login_field_application_visible(organization_id, unit_id)
  );

CREATE POLICY memberships_read_scope ON v9.memberships
  FOR SELECT TO v9_app
  USING (v9._tenant_row_visible(organization_id, NULL, id, NULL, person_id, unit_id));
CREATE POLICY memberships_write_scope ON v9.memberships
  FOR ALL TO v9_app
  USING (v9._can_manage_organization(organization_id))
  WITH CHECK (v9._can_manage_organization(organization_id));

CREATE POLICY people_scope ON v9.people
  FOR ALL TO v9_app
  USING (v9._person_row_visible(id))
  WITH CHECK (v9._person_row_visible(id));

CREATE POLICY role_assignments_read_scope ON v9.role_assignments
  FOR SELECT TO v9_app
  USING (
    v9._tenant_row_visible(organization_id, NULL, NULL, user_id, NULL, scope_unit_id)
    OR user_id = v9._login_user_id()
  );

CREATE POLICY user_accounts_read_scope ON v9.user_accounts
  FOR SELECT TO v9_app
  USING (
    v9._account_row_visible(id)
    OR lower(email) = NULLIF(current_setting('v9.login_email', true), '')
  );
CREATE POLICY user_accounts_update_scope ON v9.user_accounts
  FOR UPDATE TO v9_app
  USING (id = (SELECT actor.user_id FROM v9._request_actor() AS actor LIMIT 1) OR id = v9._login_user_id())
  WITH CHECK (id = (SELECT actor.user_id FROM v9._request_actor() AS actor LIMIT 1) OR id = v9._login_user_id());

CREATE POLICY sessions_scope ON v9.sessions
  FOR ALL TO v9_app
  USING (
    user_id = (SELECT actor.user_id FROM v9._request_actor() AS actor LIMIT 1)
    OR user_id = v9._login_user_id()
    OR token_hash = NULLIF(current_setting('v9.session_token_hash', true), '')
  )
  WITH CHECK (
    user_id = (SELECT actor.user_id FROM v9._request_actor() AS actor LIMIT 1)
    OR user_id = v9._login_user_id()
  );

CREATE POLICY login_rate_limits_scope ON v9.login_rate_limits
  FOR ALL TO v9_app
  USING (
    current_setting('v9.auth_flow', true) = 'login'
    AND subject_hash = NULLIF(current_setting('v9.login_subject_hash', true), '')
    AND ip_hash = NULLIF(current_setting('v9.login_ip_hash', true), '')
  )
  WITH CHECK (
    current_setting('v9.auth_flow', true) = 'login'
    AND subject_hash = NULLIF(current_setting('v9.login_subject_hash', true), '')
    AND ip_hash = NULLIF(current_setting('v9.login_ip_hash', true), '')
  );

-- Public membership intake is INSERT-only and can only target the active
-- Srikandi Buana organization with the website submission status/source.
CREATE POLICY membership_interests_read_scope ON v9.membership_interests
  FOR SELECT TO v9_app
  USING (v9._can_review_memberships(organization_id));
CREATE POLICY membership_interests_update_scope ON v9.membership_interests
  FOR UPDATE TO v9_app
  USING (v9._can_review_memberships(organization_id))
  WITH CHECK (v9._can_review_memberships(organization_id));
CREATE POLICY membership_interests_public_insert ON v9.membership_interests
  FOR INSERT TO v9_app
  WITH CHECK (
    v9._public_interest_context()
    AND organization_id = (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana' AND status = 'active' LIMIT 1)
    AND status = 'submitted'
    AND source = 'website'
    AND consented_at IS NOT NULL
  );
CREATE POLICY membership_interests_public_rate_limit_read ON v9.membership_interests
  FOR SELECT TO v9_app
  USING (
    v9._public_interest_context()
    AND organization_id = (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana' AND status = 'active' LIMIT 1)
    AND lower(btrim(applicant_name)) = NULLIF(current_setting('v9.public_interest_name', true), '')
    AND CASE
      WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '0%'
        THEN '62' || substring(regexp_replace(phone, '[^0-9]', '', 'g') FROM 2)
      WHEN regexp_replace(phone, '[^0-9]', '', 'g') LIKE '8%'
        THEN '62' || regexp_replace(phone, '[^0-9]', '', 'g')
      ELSE regexp_replace(phone, '[^0-9]', '', 'g')
    END = NULLIF(current_setting('v9.public_interest_phone', true), '')
    AND created_at >= now() - interval '15 minutes'
  );

-- Organization settings are readable by their authorized audience; only
-- organization leadership/secretariat can write settings. Public reads are
-- limited to explicitly public website/profile settings.
CREATE POLICY system_settings_tenant_read ON v9.system_settings
  FOR SELECT TO v9_app
  USING (v9._tenant_row_visible(organization_id, NULL, NULL, updated_by, NULL, NULL));
CREATE POLICY system_settings_public_read ON v9.system_settings
  FOR SELECT TO v9_app
  USING (
    setting_key IN ('public_site', 'public_profile_content')
    AND visibility = 'public'
    AND organization_id = (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana' AND status = 'active' LIMIT 1)
  );
CREATE POLICY system_settings_write_scope ON v9.system_settings
  FOR ALL TO v9_app
  USING (v9._can_manage_organization(organization_id))
  WITH CHECK (v9._can_manage_organization(organization_id));

-- File service: authenticated organization/self/field scope, public banner
-- projection, and one unguessable share token. No public file listing exists.
CREATE POLICY file_assets_tenant_scope ON v9.file_assets
  FOR ALL TO v9_app
  USING (
    v9._tenant_row_visible(
      organization_id,
      CASE WHEN scope_kind = 'field' THEN scope_ref ELSE NULL END,
      NULL,
      uploaded_by,
      NULL,
      NULL
    )
  )
  WITH CHECK (
    v9._tenant_row_visible(
      organization_id,
      CASE WHEN scope_kind = 'field' THEN scope_ref ELSE NULL END,
      NULL,
      uploaded_by,
      NULL,
      NULL
    )
  );
CREATE POLICY file_assets_public_banner_read ON v9.file_assets
  FOR SELECT TO v9_app
  USING (v9._public_banner_asset(id));
CREATE POLICY file_assets_public_share_read ON v9.file_assets
  FOR SELECT TO v9_app
  USING (v9._share_asset_allowed(id));

CREATE POLICY file_share_links_tenant_scope ON v9.file_share_links
  FOR ALL TO v9_app
  USING (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, NULL))
  WITH CHECK (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, NULL));
CREATE POLICY file_share_links_public_token_update ON v9.file_share_links
  FOR UPDATE TO v9_app
  USING (
    token_hash = NULLIF(current_setting('v9.share_token_hash', true), '')
    AND revoked_at IS NULL
    AND expires_at > now()
    AND (max_downloads IS NULL OR download_count < max_downloads)
  )
  WITH CHECK (
    token_hash = NULLIF(current_setting('v9.share_token_hash', true), '')
    AND revoked_at IS NULL
    AND expires_at > now()
    AND (max_downloads IS NULL OR download_count <= max_downloads)
  );

CREATE POLICY secretariat_documents_tenant_scope ON v9.secretariat_documents
  FOR ALL TO v9_app
  USING (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, NULL))
  WITH CHECK (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, NULL));
CREATE POLICY secretariat_documents_public_share_read ON v9.secretariat_documents
  FOR SELECT TO v9_app
  USING (status = 'final' AND visibility = 'publik' AND v9._share_document_allowed(id));

CREATE POLICY secretariat_document_files_tenant_scope ON v9.secretariat_document_files
  FOR ALL TO v9_app
  USING (v9._document_row_visible(document_id))
  WITH CHECK (v9._document_row_visible(document_id));
CREATE POLICY secretariat_document_files_public_share_read ON v9.secretariat_document_files
  FOR SELECT TO v9_app
  USING (asset_id IS NOT NULL AND v9._share_asset_allowed(asset_id));

CREATE POLICY secretariat_document_generations_tenant_scope ON v9.secretariat_document_generations
  FOR ALL TO v9_app
  USING (v9._document_row_visible(document_id))
  WITH CHECK (v9._document_row_visible(document_id));

CREATE POLICY secretariat_letters_tenant_scope ON v9.secretariat_letters
  FOR ALL TO v9_app
  USING (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, NULL))
  WITH CHECK (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, NULL));

CREATE POLICY secretariat_meetings_tenant_scope ON v9.secretariat_meetings
  FOR ALL TO v9_app
  USING (v9._meeting_row_visible(id))
  WITH CHECK (v9._tenant_row_visible(organization_id, NULL, NULL, created_by, NULL, unit_id));

CREATE POLICY secretariat_minutes_tenant_scope ON v9.secretariat_minutes
  FOR ALL TO v9_app
  USING (v9._meeting_row_visible(meeting_id))
  WITH CHECK (v9._meeting_row_visible(meeting_id));

CREATE POLICY secretariat_meeting_attendance_tenant_scope ON v9.secretariat_meeting_attendance
  FOR ALL TO v9_app
  USING (
    v9._meeting_row_visible(meeting_id)
    OR v9._tenant_row_visible(
      (SELECT organization_id FROM v9.memberships WHERE id = membership_id),
      NULL, membership_id, NULL, person_id, NULL
    )
  )
  WITH CHECK (
    v9._meeting_row_visible(meeting_id)
    OR v9._tenant_row_visible(
      (SELECT organization_id FROM v9.memberships WHERE id = membership_id),
      NULL, membership_id, NULL, person_id, NULL
    )
  );

CREATE POLICY secretariat_meeting_decisions_tenant_scope ON v9.secretariat_meeting_decisions
  FOR ALL TO v9_app
  USING (v9._minutes_row_visible(minutes_id))
  WITH CHECK (v9._minutes_row_visible(minutes_id));

CREATE POLICY training_enrollments_tenant_scope ON v9.training_enrollments
  FOR ALL TO v9_app
  USING (v9._tenant_row_visible(
    organization_id, field_key, membership_id, recorded_by, NULL, NULL
  ))
  WITH CHECK (v9._tenant_row_visible(
    organization_id, field_key, membership_id, recorded_by, NULL, NULL
  ));

CREATE POLICY training_assessments_tenant_scope ON v9.training_assessments
  FOR ALL TO v9_app
  USING (
    v9._tenant_row_visible(organization_id, field_key, NULL, assessed_by, NULL, NULL)
    OR v9._training_enrollment_row_visible(enrollment_id)
  )
  WITH CHECK (
    v9._tenant_row_visible(organization_id, field_key, NULL, assessed_by, NULL, NULL)
    OR v9._training_enrollment_row_visible(enrollment_id)
  );

CREATE POLICY training_certificates_tenant_scope ON v9.training_certificates
  FOR ALL TO v9_app
  USING (
    v9._tenant_row_visible(organization_id, field_key, NULL, issued_by, NULL, NULL)
    OR v9._training_enrollment_row_visible(enrollment_id)
  )
  WITH CHECK (
    v9._tenant_row_visible(organization_id, field_key, NULL, issued_by, NULL, NULL)
    OR v9._training_enrollment_row_visible(enrollment_id)
  );

-- Outbox events are write-only to the application. Public submission can only
-- enqueue the matching membership-interest notification for its own org.
CREATE POLICY outbox_events_insert_scope ON v9.outbox_events
  FOR INSERT TO v9_app
  WITH CHECK (
    v9._tenant_row_visible(organization_id, NULL, NULL, NULL, NULL, NULL)
    OR (
      v9._public_interest_context()
      AND organization_id = (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana' AND status = 'active' LIMIT 1)
      AND event_type = 'membership.interest.submitted'
      AND dedupe_key LIKE 'membership-interest:%'
    )
  );

-- Bootstrap and schema ledger tables are deliberately default-deny for the
-- application role. Migration/bootstrap principals use their separate owner path.

-- Migration metadata. Runtime must not be the table owner and must not bypass RLS.
DO $grants$
DECLARE
  v_function regprocedure;
BEGIN
  FOREACH v_function IN ARRAY ARRAY[
    'v9._tenant_row_visible(uuid,text,uuid,uuid,uuid,uuid)'::regprocedure,
    'v9._can_manage_organization(uuid)'::regprocedure,
    'v9._person_row_visible(uuid)'::regprocedure,
    'v9._account_row_visible(uuid)'::regprocedure,
    'v9._login_organization_visible(uuid)'::regprocedure,
    'v9._login_field_application_visible(uuid,uuid)'::regprocedure,
    'v9._document_row_visible(uuid)'::regprocedure,
    'v9._meeting_row_visible(uuid)'::regprocedure,
    'v9._minutes_row_visible(uuid)'::regprocedure,
    'v9._training_enrollment_row_visible(uuid)'::regprocedure,
    'v9._plot_row_visible(uuid)'::regprocedure,
    'v9._cycle_row_visible(uuid)'::regprocedure,
    'v9._share_asset_allowed(uuid)'::regprocedure,
    'v9._share_document_allowed(uuid)'::regprocedure,
    'v9._public_banner_asset(uuid)'::regprocedure,
    'v9._public_interest_context()'::regprocedure,
    'v9._can_review_memberships(uuid)'::regprocedure
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO v9_app', v_function);
  END LOOP;
END
$grants$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0044_tenant_row_level_security.sql', 'sha256:tenant-row-level-security-v1')
ON CONFLICT (name) DO NOTHING;
