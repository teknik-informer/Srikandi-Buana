\set ON_ERROR_STOP on

DO $version$
BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'This integration suite requires PostgreSQL 16.';
  END IF;
END
$version$;

DO $inventory$
DECLARE
  table_count integer;
  rls_count integer;
  force_count integer;
  owned_by_runtime integer;
  runtime_superuser boolean;
  runtime_bypass boolean;
  runtime_create_role boolean;
  runtime_create_db boolean;
  owner_member boolean;
  view_count integer;
  sequence_count integer;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE c.relrowsecurity),
         count(*) FILTER (WHERE c.relforcerowsecurity)
    INTO table_count, rls_count, force_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'v9' AND c.relkind = 'r';

  IF table_count <> 63 OR rls_count <> 63 OR force_count <> 63 THEN
    RAISE EXCEPTION 'Expected RLS and FORCE RLS on all 63 tables; got tables %, rls %, force %.',
      table_count, rls_count, force_count;
  END IF;

  SELECT count(*) INTO owned_by_runtime
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'v9' AND c.relkind IN ('r','p')
    AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname='v9_app');

  SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
    INTO runtime_superuser, runtime_bypass, runtime_create_role, runtime_create_db
  FROM pg_roles WHERE rolname = 'v9_app';

  SELECT pg_has_role('v9_app', 'postgres', 'MEMBER') INTO owner_member;

  SELECT count(*) INTO view_count
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='v9' AND c.relkind IN ('v','m');

  SELECT count(*) INTO sequence_count
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='v9' AND c.relkind='S';

  IF owned_by_runtime <> 0 OR runtime_superuser OR runtime_bypass
     OR runtime_create_role OR runtime_create_db OR owner_member THEN
    RAISE EXCEPTION 'Runtime role has owner/privilege escalation capability.';
  END IF;

  IF view_count <> 0 OR sequence_count <> 21 THEN
    RAISE EXCEPTION 'Unexpected V9 object inventory: views %, sequences %.', view_count, sequence_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_sequences AS sequence_info
    WHERE sequence_info.schemaname = 'v9'
      AND NOT has_sequence_privilege(
        'v9_app',
        format('%I.%I', sequence_info.schemaname, sequence_info.sequencename),
        'USAGE'
      )
  ) THEN
    RAISE EXCEPTION 'v9_app is missing USAGE on a reference sequence.';
  END IF;
END
$inventory$;

-- Disposable CI-only integration principal. No Treasurer, member or external
-- operational account is created, and no fixture is written to Neon/Production.
INSERT INTO v9.organizations (
  id, slug, legal_name, short_name, status
) VALUES
  ((SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'srikandi-buana', 'Srikandi Buana CI Tenant', 'Srikandi CI', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'qa-other-tenant', 'Other Tenant CI', 'Other CI', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO v9.people (id, full_name, status)
VALUES ('30000000-0000-4000-8000-000000000003', 'CI-only Organization Administrator', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.user_accounts (
  id, person_id, email, password_hash, status, email_verified_at, legacy_auth_eligible
) VALUES (
  '40000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000003',
  'tenant-rls-ci@invalid.example',
  'ci-only-unused-credential',
  'active',
  now(),
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.role_assignments (
  id, organization_id, user_id, role_key, scope_kind, is_active, valid_from
) VALUES (
  '50000000-0000-4000-8000-000000000005',
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  '40000000-0000-4000-8000-000000000004',
  'organization_admin',
  'organization',
  true,
  now() - interval '1 hour'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.sessions (
  id, user_id, token_hash, expires_at
) VALUES (
  '60000000-0000-4000-8000-000000000006',
  '40000000-0000-4000-8000-000000000004',
  repeat('a', 64),
  now() + interval '8 hours'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.system_settings (
  organization_id, setting_key, setting_value, visibility, updated_by
) VALUES
  ((SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'qa_private', '{"tenant":"A"}'::jsonb, 'private', '40000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000002', 'qa_private', '{"tenant":"B"}'::jsonb, 'private', NULL)
ON CONFLICT (organization_id, setting_key) DO NOTHING;

INSERT INTO v9.organization_units (
  id, organization_id, unit_key, name, unit_type, mandate
) VALUES
  ('70000000-0000-4000-8000-000000000007', (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'ci-pertanian', 'Bidang Pertanian CI', 'field', 'CI fixture only'),
  ('80000000-0000-4000-8000-000000000008', (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'ci-usaha', 'Bidang Usaha CI', 'field', 'CI fixture only')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.field_applications (
  field_key, organization_id, unit_id, name, short_name, route, mandate, display_order
) VALUES
  ('ci-pertanian', (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), '70000000-0000-4000-8000-000000000007', 'Pertanian CI', 'Pertanian', '/ci/pertanian', 'CI fixture only', 1),
  ('ci-usaha', (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), '80000000-0000-4000-8000-000000000008', 'Usaha CI', 'Usaha', '/ci/usaha', 'CI fixture only', 2)
ON CONFLICT (field_key) DO NOTHING;

INSERT INTO v9.field_programs (
  id, organization_id, field_key, reference_no, title, objective,
  period_start, period_end, status, created_by
) VALUES
  ('90000000-0000-4000-8000-000000000009', (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'ci-pertanian', 'CI-PROG-001', 'Program Pertanian QA', 'Scope test', current_date, current_date + 30, 'planned', '40000000-0000-4000-8000-000000000004'),
  ('a0000000-0000-4000-8000-00000000000a', (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'ci-usaha', 'CI-PROG-002', 'Program Usaha QA', 'Scope test', current_date, current_date + 30, 'planned', '40000000-0000-4000-8000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.audit_events (
  organization_id, actor_user_id, action, entity_type, entity_id
) VALUES (
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  '40000000-0000-4000-8000-000000000004',
  'qa.seed',
  'qa_fixture',
  'tenant-a'
);

-- Pre-authentication lookup and password-verified login context. The SQL
-- test verifies database policy boundaries; password verification remains in
-- the server action before login_user_id is ever supplied.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.auth_flow', 'login', true);
SELECT set_config('v9.login_email', 'tenant-rls-ci@invalid.example', true);
SELECT set_config('v9.login_subject_hash', repeat('e',64), true);
SELECT set_config('v9.login_ip_hash', repeat('f',64), true);
DO $login_scope$
DECLARE
  visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count
  FROM v9.user_accounts
  WHERE lower(email) = 'tenant-rls-ci@invalid.example';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Pre-authentication lookup should see exactly the matching account.';
  END IF;

  SELECT count(*) INTO visible_count FROM v9.role_assignments;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Role assignments must remain hidden until password verification supplies login_user_id.';
  END IF;

  INSERT INTO v9.login_rate_limits (subject_hash, ip_hash, attempt_count)
  VALUES (repeat('e',64), repeat('f',64), 0);

  SELECT count(*) INTO visible_count
  FROM v9.login_rate_limits
  WHERE subject_hash=repeat('e',64) AND ip_hash=repeat('f',64);
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Login rate-limit context should see only its email/IP pair.';
  END IF;

  PERFORM set_config('v9.login_user_id', '40000000-0000-4000-8000-000000000004', true);

  SELECT count(*) INTO visible_count
  FROM v9.role_assignments
  WHERE user_id='40000000-0000-4000-8000-000000000004';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Password-verified login context should see its own active role assignment.';
  END IF;

  INSERT INTO v9.sessions (user_id, token_hash, expires_at)
  VALUES (
    '40000000-0000-4000-8000-000000000004',
    repeat('9',64),
    now() + interval '8 hours'
  );

  UPDATE v9.user_accounts
  SET last_login_at=now()
  WHERE id='40000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS visible_count = ROW_COUNT;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Password-verified login should update only its own account last_login_at.';
  END IF;

  DELETE FROM v9.login_rate_limits
  WHERE subject_hash=repeat('e',64) AND ip_hash=repeat('f',64);
END
$login_scope$;
COMMIT;

-- Organization scope: positive on tenant A, negative on tenant B for SELECT,
-- INSERT, UPDATE, DELETE, and audit side effects.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('a', 64), true);

DO $organization_scope$
DECLARE
  visible_count integer;
  changed_count integer;
BEGIN
  IF current_user <> 'v9_app' THEN
    RAISE EXCEPTION 'The test query is not executing as v9_app.';
  END IF;

  SELECT count(*) INTO visible_count
  FROM v9.system_settings WHERE setting_key='qa_private';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Organization A should see exactly one private setting; saw %.', visible_count;
  END IF;

  SELECT count(*) INTO visible_count
  FROM v9.organizations WHERE slug='qa-other-tenant';
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Organization A must not read organization B.';
  END IF;

  UPDATE v9.system_settings
  SET setting_value='{"changed":true}'::jsonb
  WHERE organization_id='20000000-0000-4000-8000-000000000002'
    AND setting_key='qa_private';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'Cross-tenant UPDATE unexpectedly affected % rows.', changed_count;
  END IF;

  DELETE FROM v9.system_settings
  WHERE organization_id='20000000-0000-4000-8000-000000000002'
    AND setting_key='qa_private';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'Cross-tenant DELETE unexpectedly affected % rows.', changed_count;
  END IF;

  BEGIN
    INSERT INTO v9.system_settings (
      organization_id, setting_key, setting_value, visibility, updated_by
    ) VALUES (
      '20000000-0000-4000-8000-000000000002', 'qa_intrusion', '{"attempt":true}', 'private',
      '40000000-0000-4000-8000-000000000004'
    );
    RAISE EXCEPTION 'Cross-tenant INSERT was not rejected by RLS.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  INSERT INTO v9.system_settings (
    organization_id, setting_key, setting_value, visibility, updated_by
  ) VALUES (
    (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'qa_allowed_insert', '{"ok":true}', 'private',
    '40000000-0000-4000-8000-000000000004'
  );

  UPDATE v9.system_settings
  SET setting_value='{"updated":true}'::jsonb
  WHERE organization_id=(SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana')
    AND setting_key='qa_private';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 1 THEN
    RAISE EXCEPTION 'Same-tenant UPDATE should affect one row; affected %.', changed_count;
  END IF;

  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id
  ) VALUES (
    (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
    '40000000-0000-4000-8000-000000000004',
    'qa.test',
    'qa_fixture',
    'same-tenant'
  );

  BEGIN
    INSERT INTO v9.audit_events (
      organization_id, actor_user_id, action, entity_type, entity_id
    ) VALUES (
      '20000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000004',
      'qa.test',
      'qa_fixture',
      'cross-tenant'
    );
    RAISE EXCEPTION 'Cross-tenant audit insert was not rejected by RLS.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$organization_scope$;
COMMIT;

-- Member role regression: the legacy role import sets scope_kind='organization'
-- even for members. Database RLS must still enforce self scope.
INSERT INTO v9.people (id, full_name, status)
VALUES ('35000000-0000-4000-8000-000000000035', 'CI-only Other Member', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.memberships (
  id, organization_id, person_id, member_number, status, valid_from
) VALUES
  ('36000000-0000-4000-8000-000000000036',
   (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
   '30000000-0000-4000-8000-000000000003',
   'CI-MEMBER-001', 'active', current_date),
  ('37000000-0000-4000-8000-000000000037',
   (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
   '35000000-0000-4000-8000-000000000035',
   'CI-MEMBER-002', 'active', current_date)
ON CONFLICT (id) DO NOTHING;

UPDATE v9.role_assignments
SET role_key='member', scope_kind='organization', scope_unit_id=NULL
WHERE id='50000000-0000-4000-8000-000000000005';

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('a', 64), true);
DO $member_scope$
DECLARE
  membership_count integer;
  person_count integer;
  changed_count integer;
BEGIN
  SELECT count(*) INTO membership_count FROM v9.memberships;
  IF membership_count <> 1 THEN
    RAISE EXCEPTION 'A member with legacy organization scope must see only own membership; saw %.', membership_count;
  END IF;

  SELECT count(*) INTO person_count FROM v9.people;
  IF person_count <> 1 THEN
    RAISE EXCEPTION 'A member must not read another member personal record; saw % people.', person_count;
  END IF;

  UPDATE v9.memberships
  SET position_title='Unauthorized edit'
  WHERE id='37000000-0000-4000-8000-000000000037';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'A member modified another member record.';
  END IF;
END
$member_scope$;
COMMIT;

-- External viewer roles have portal:read at the application layer but
-- must remain default-deny for operational tenant tables until a dataset grant
-- registry exists. This reuses the disposable CI account; no external account
-- or operational persona is provisioned.
UPDATE v9.role_assignments
SET role_key='ngo_viewer', scope_kind='organization', scope_unit_id=NULL
WHERE id='50000000-0000-4000-8000-000000000005';

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('a', 64), true);
DO $external_scope$
DECLARE
  private_settings integer;
  programs integer;
  memberships integer;
BEGIN
  SELECT count(*) INTO private_settings
  FROM v9.system_settings WHERE setting_key='qa_private';
  IF private_settings <> 0 THEN
    RAISE EXCEPTION 'NGO viewer must not read private organization settings.';
  END IF;

  SELECT count(*) INTO programs FROM v9.field_programs;
  IF programs <> 0 THEN
    RAISE EXCEPTION 'NGO viewer must not read operational field programs.';
  END IF;

  SELECT count(*) INTO memberships FROM v9.memberships;
  IF memberships <> 0 THEN
    RAISE EXCEPTION 'NGO viewer must not read operational member records.';
  END IF;
END
$external_scope$;
COMMIT;

-- Unit scope: the same disposable CI principal is narrowed to one field.
UPDATE v9.role_assignments
SET role_key='field_coordinator',
    scope_kind='unit',
    scope_unit_id='70000000-0000-4000-8000-000000000007'
WHERE id='50000000-0000-4000-8000-000000000005';

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('a', 64), true);
DO $unit_scope$
DECLARE
  visible_count integer;
  changed_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM v9.field_programs;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Field coordinator should see only one assigned-field program; saw %.', visible_count;
  END IF;

  UPDATE v9.field_programs
  SET title='Unauthorized field edit'
  WHERE id='a0000000-0000-4000-8000-00000000000a';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 0 THEN
    RAISE EXCEPTION 'Field coordinator changed a program outside the assigned unit.';
  END IF;

  BEGIN
    INSERT INTO v9.field_programs (
      organization_id, field_key, reference_no, title,
      period_start, period_end, status, created_by
    ) VALUES (
      (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'ci-usaha', 'CI-PROG-003',
      'Unauthorized cross-field program', current_date, current_date+1,
      'planned', '40000000-0000-4000-8000-000000000004'
    );
    RAISE EXCEPTION 'Cross-field INSERT was not rejected by RLS.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$unit_scope$;
COMMIT;

-- Public member-interest intake: narrow organization, consent, status/source,
-- normalized name/phone duplicate-check context, and outbox INSERT only.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.auth_flow', 'public-interest', true);
SELECT set_config('v9.public_interest_name', 'ci applicant', true);
SELECT set_config('v9.public_interest_phone', '628123456789', true);
DO $public_interest$
DECLARE
  visible_count integer;
BEGIN
  INSERT INTO v9.membership_interests (
    organization_id, applicant_name, phone, address, interest_area,
    experience_level, status, consent_version, consented_at, source
  ) VALUES (
    (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
    'CI Applicant',
    '08123456789',
    'Alamat QA khusus pengujian',
    'pertanian',
    'baru',
    'submitted',
    'ci-privacy-consent-v1',
    now(),
    'website'
  );

  INSERT INTO v9.outbox_events (
    organization_id, event_type, dedupe_key, payload
  ) VALUES (
    (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
    'membership.interest.submitted',
    'membership-interest:ci-qa',
    '{"source":"ci"}'::jsonb
  );

  SELECT count(*) INTO visible_count
  FROM v9.membership_interests
  WHERE lower(btrim(applicant_name))='ci applicant';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Public duplicate-throttle context should see its matching submission.';
  END IF;

  SELECT count(*) INTO visible_count
  FROM v9.membership_interests
  WHERE lower(btrim(applicant_name))='unrelated applicant';
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Public duplicate-throttle context can see unrelated submissions.';
  END IF;

  BEGIN
    INSERT INTO v9.membership_interests (
      organization_id, applicant_name, phone, address, status,
      consent_version, consented_at, source
    ) VALUES (
      '20000000-0000-4000-8000-000000000002',
      'Cross Tenant Applicant',
      '081234500000',
      'Alamat tenant lain',
      'submitted',
      'ci-privacy-consent-v1',
      now(),
      'website'
    );
    RAISE EXCEPTION 'Public intake must not insert into another organization.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$public_interest$;
ROLLBACK;

-- Public file-share token: one matching token may see the eligible final/public
-- document and file, and may increment its own download counter only.
INSERT INTO v9.secretariat_documents (
  id, organization_id, reference_no, title, category, document_date,
  owner_label, visibility, status, created_by, finalized_by, finalized_at
) VALUES (
  'b0000000-0000-4000-8000-00000000000b',
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  'CI-DOC-PUBLIC-01',
  'Dokumen publik CI',
  'Publikasi',
  current_date,
  'Sekretariat CI',
  'publik',
  'final',
  '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000004',
  now()
);

INSERT INTO v9.file_assets (
  id, organization_id, uploaded_by, category, scope_kind, file_name,
  mime_type, size_bytes, sha256, cloudinary_asset_id, cloudinary_public_id,
  cloudinary_resource_type, cloudinary_delivery_type, cloudinary_version, status
) VALUES (
  'c0000000-0000-4000-8000-00000000000c',
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  '40000000-0000-4000-8000-000000000004',
  'secretariat-document',
  'organization',
  'dokumen-ci.pdf',
  'application/pdf',
  128,
  repeat('c',64),
  'ci-asset-share',
  'ci/tenant-rls/share',
  'raw',
  'authenticated',
  1,
  'active'
);

INSERT INTO v9.secretariat_document_files (
  id, document_id, revision_no, file_name, mime_type, size_bytes,
  sha256, file_data, uploaded_by, asset_id
) VALUES (
  'd0000000-0000-4000-8000-00000000000d',
  'b0000000-0000-4000-8000-00000000000b',
  1,
  'dokumen-ci.pdf',
  'application/pdf',
  128,
  repeat('d',64),
  NULL,
  '40000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-00000000000c'
);

INSERT INTO v9.file_share_links (
  id, file_asset_id, organization_id, created_by, token_hash,
  expires_at, max_downloads, download_count
) VALUES (
  'e0000000-0000-4000-8000-00000000000e',
  'c0000000-0000-4000-8000-00000000000c',
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  '40000000-0000-4000-8000-000000000004',
  repeat('b',64),
  now() + interval '1 day',
  2,
  0
);

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.share_token_hash', repeat('b',64), true);
DO $public_share$
DECLARE
  visible_count integer;
  changed_count integer;
BEGIN
  SELECT count(*) INTO visible_count
  FROM v9.secretariat_documents
  WHERE id='b0000000-0000-4000-8000-00000000000b';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Valid share token should read only its final public document.';
  END IF;

  SELECT count(*) INTO visible_count
  FROM v9.secretariat_document_files
  WHERE asset_id='c0000000-0000-4000-8000-00000000000c';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Valid share token should read its linked file revision.';
  END IF;

  UPDATE v9.file_share_links AS link
  SET download_count = link.download_count + 1
  FROM v9.file_assets AS asset
  WHERE link.file_asset_id = asset.id
    AND link.token_hash = repeat('b',64)
    AND asset.id='c0000000-0000-4000-8000-00000000000c';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 1 THEN
    RAISE EXCEPTION 'Valid token should consume exactly one download.';
  END IF;

  SELECT count(*) INTO visible_count
  FROM v9.file_assets
  WHERE id='c0000000-0000-4000-8000-00000000000c';
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Valid share token should expose the linked asset only.';
  END IF;
END
$public_share$;
COMMIT;

-- Public data projections expose only published/public fields and aggregate
-- counts; direct table reads by an anonymous v9_app session remain default-deny.
INSERT INTO v9.field_activities (
  id, organization_id, field_key, reference_no, title, activity_date,
  status, open_to_public, created_by
) VALUES
  ('a1000000-0000-4000-8000-0000000000a1',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'ci-pertanian', 'CI-ACT-PUBLIC', 'Kegiatan publik QA',
   current_date + 3, 'scheduled', true, '40000000-0000-4000-8000-000000000004'),
  ('a2000000-0000-4000-8000-0000000000a2',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'ci-pertanian', 'CI-ACT-PRIVATE', 'Kegiatan internal QA',
   current_date + 4, 'scheduled', false, '40000000-0000-4000-8000-000000000004');

INSERT INTO v9.business_products (
  id, organization_id, field_key, sku, slug, product_name,
  category_label, product_kind, unit_label, selling_price, status,
  publication_status, track_stock, created_by, published_by, published_at
) VALUES
  ('a3000000-0000-4000-8000-0000000000a3',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'usaha', 'CI-PRODUCT-PUBLIC', 'produk-publik-qa', 'Produk publik QA',
   'Hortikultura', 'physical', 'kg', 15000, 'active',
   'published', true, '40000000-0000-4000-8000-000000000004',
   '40000000-0000-4000-8000-000000000004', now()),
  ('a4000000-0000-4000-8000-0000000000a4',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'usaha', 'CI-PRODUCT-PRIVATE', 'produk-private-qa', 'Produk internal QA',
   'Hortikultura', 'physical', 'kg', 999999, 'draft',
   'private', true, '40000000-0000-4000-8000-000000000004',
   NULL, NULL);

INSERT INTO v9.training_sessions (
  id, organization_id, field_key, reference_no, title,
  session_date, status, created_by
) VALUES
  ('a5000000-0000-4000-8000-0000000000a5',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'pelatihan', 'CI-TRAINING-OPEN', 'Pelatihan publik QA',
   current_date + 5, 'registration_open', '40000000-0000-4000-8000-000000000004'),
  ('a6000000-0000-4000-8000-0000000000a6',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'pelatihan', 'CI-TRAINING-COMPLETE', 'Pelatihan selesai QA',
   current_date - 5, 'completed', '40000000-0000-4000-8000-000000000004');

INSERT INTO v9.training_sessions (
  id, organization_id, field_key, reference_no, title,
  session_date, status, completed_at, created_by
) VALUES (
  'a7000000-0000-4000-8000-0000000000a7',
  (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
  'pelatihan', 'CI-TRAINING-COMPLETE-2', 'Pelatihan selesai kedua QA',
  current_date - 7, 'completed', now(), '40000000-0000-4000-8000-000000000004'
);

INSERT INTO v9.training_enrollments (
  id, organization_id, field_key, session_id, participant_name,
  registration_status, attendance_status, recorded_by,
  attendance_recorded_by, attendance_recorded_at
) VALUES
  ('a8000000-0000-4000-8000-0000000000a8',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'pelatihan', 'a5000000-0000-4000-8000-0000000000a5',
   'CI PRIVATE PARTICIPANT OPEN', 'confirmed', 'not_marked',
   '40000000-0000-4000-8000-000000000004', NULL, NULL),
  ('a9000000-0000-4000-8000-0000000000a9',
   (SELECT id FROM v9.organizations WHERE slug='srikandi-buana'),
   'pelatihan', 'a6000000-0000-4000-8000-0000000000a6',
   'CI PRIVATE PARTICIPANT COMPLETED', 'confirmed', 'hadir',
   '40000000-0000-4000-8000-000000000004',
   '40000000-0000-4000-8000-000000000004', now());

BEGIN;
SET LOCAL ROLE v9_app;
DO $public_projections$
DECLARE
  field_count integer;
  activity_count integer;
  product_count integer;
  training_count integer;
  registered integer;
  present integer;
  document_count integer;
  file_count integer;
  direct_rows integer;
  result_columns text;
BEGIN
  SELECT count(*) INTO field_count
  FROM v9.get_public_fields()
  WHERE field_key='ci-pertanian';
  IF field_count <> 1 THEN
    RAISE EXCEPTION 'Public field projection should return one active CI field.';
  END IF;

  SELECT count(*) INTO activity_count
  FROM v9.get_public_activities('ci-pertanian', false, 100)
  WHERE id='a1000000-0000-4000-8000-0000000000a1';
  IF activity_count <> 1 THEN
    RAISE EXCEPTION 'Public activity projection should return the explicitly open activity.';
  END IF;

  SELECT count(*) INTO activity_count
  FROM v9.get_public_activities('ci-pertanian', false, 100)
  WHERE id='a2000000-0000-4000-8000-0000000000a2';
  IF activity_count <> 0 THEN
    RAISE EXCEPTION 'Public activity projection leaked an internal activity.';
  END IF;

  SELECT count(*) INTO product_count
  FROM v9.get_public_products(NULL, NULL, NULL, 200)
  WHERE id='a3000000-0000-4000-8000-0000000000a3';
  IF product_count <> 1 THEN
    RAISE EXCEPTION 'Public product projection should return a published product.';
  END IF;

  SELECT count(*) INTO product_count
  FROM v9.get_public_products(NULL, NULL, NULL, 200)
  WHERE id='a4000000-0000-4000-8000-0000000000a4';
  IF product_count <> 0 THEN
    RAISE EXCEPTION 'Public product projection leaked a draft/private product.';
  END IF;

  SELECT registered_count INTO registered
  FROM v9.get_public_training_sessions(false, 50)
  WHERE id='a5000000-0000-4000-8000-0000000000a5';
  IF registered <> 1 THEN
    RAISE EXCEPTION 'Public training projection should expose only an aggregate registration count.';
  END IF;

  SELECT present_count INTO present
  FROM v9.get_public_training_sessions(true, 20)
  WHERE id='a6000000-0000-4000-8000-0000000000a6';
  IF present <> 1 THEN
    RAISE EXCEPTION 'Public completed training projection should expose only an aggregate attendance count.';
  END IF;

  SELECT pg_get_function_result('v9.get_public_training_sessions(boolean,integer)'::regprocedure)
    INTO result_columns;
  IF result_columns LIKE '%participant_name%' OR result_columns LIKE '%membership_id%' THEN
    RAISE EXCEPTION 'Public training projection schema must not contain personal participant fields.';
  END IF;

  SELECT count(*) INTO document_count
  FROM v9.get_public_documents(NULL, 200)
  WHERE document_id='b0000000-0000-4000-8000-00000000000b';
  IF document_count <> 1 THEN
    RAISE EXCEPTION 'Public document projection should list the final public document.';
  END IF;

  SELECT count(*) INTO file_count
  FROM v9.get_public_document_file('b0000000-0000-4000-8000-00000000000b');
  IF file_count <> 1 THEN
    RAISE EXCEPTION 'Public document file projection should return its latest public revision.';
  END IF;

  SELECT count(*) INTO direct_rows FROM v9.business_products;
  IF direct_rows <> 0 THEN
    RAISE EXCEPTION 'Anonymous runtime must not directly SELECT the product base table.';
  END IF;

  SELECT count(*) INTO direct_rows FROM v9.training_enrollments;
  IF direct_rows <> 0 THEN
    RAISE EXCEPTION 'Anonymous runtime must not directly SELECT training enrolments.';
  END IF;

  SELECT count(*) INTO direct_rows FROM v9.secretariat_documents;
  IF direct_rows <> 0 THEN
    RAISE EXCEPTION 'Anonymous runtime must not directly SELECT secretariat documents.';
  END IF;
END
$public_projections$;
COMMIT;

-- Public banner projection: only the exact active banner referenced by an
-- explicitly public public-site setting is visible without a tenant session.
INSERT INTO v9.file_assets (
  id, organization_id, uploaded_by, category, scope_kind, file_name,
  mime_type, size_bytes, sha256, cloudinary_asset_id, cloudinary_public_id,
  cloudinary_resource_type, cloudinary_delivery_type, cloudinary_version, status
) VALUES (
  'f0000000-0000-4000-8000-00000000000f',
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  '40000000-0000-4000-8000-000000000004',
  'public-site-banner',
  'organization',
  'banner-ci.png',
  'image/png',
  128,
  repeat('f',64),
  'ci-asset-banner',
  'ci/tenant-rls/banner',
  'image',
  'authenticated',
  1,
  'active'
);

INSERT INTO v9.system_settings (
  organization_id, setting_key, setting_value, visibility, updated_by
) VALUES (
  (SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'),
  'public_site',
  jsonb_build_object('hero', jsonb_build_object('imageAssetId','f0000000-0000-4000-8000-00000000000f')),
  'public',
  '40000000-0000-4000-8000-000000000004'
)
ON CONFLICT (organization_id, setting_key)
DO UPDATE SET setting_value=EXCLUDED.setting_value, visibility='public';
INSERT INTO v9.system_settings (
  organization_id, setting_key, setting_value, visibility, updated_by
) VALUES
  ((SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'login_page_content', '{"schemaVersion":1}'::jsonb, 'public', '40000000-0000-4000-8000-000000000004'),
  ((SELECT id FROM v9.organizations WHERE slug = 'srikandi-buana'), 'public_policies', '{"enabled":true}'::jsonb, 'public', '40000000-0000-4000-8000-000000000004')
ON CONFLICT (organization_id, setting_key)
DO UPDATE SET setting_value=EXCLUDED.setting_value, visibility='public';

BEGIN;
SET LOCAL ROLE v9_app;
DO $public_banner$
DECLARE
  banner_count integer;
  private_asset_count integer;
BEGIN
  SELECT count(*) INTO banner_count
  FROM v9.file_assets
  WHERE id='f0000000-0000-4000-8000-00000000000f';
  IF banner_count <> 1 THEN
    RAISE EXCEPTION 'Configured public banner should be visible.';
  END IF;

  SELECT count(*) INTO private_asset_count
  FROM v9.file_assets
  WHERE id='c0000000-0000-4000-8000-00000000000c';
  IF private_asset_count <> 0 THEN
    RAISE EXCEPTION 'An ordinary private asset must not be visible without its share token.';
  END IF;

  SELECT count(*) INTO private_asset_count
  FROM v9.system_settings
  WHERE setting_key='qa_private';
  IF private_asset_count <> 0 THEN
    RAISE EXCEPTION 'Private organization settings must not be visible without a tenant session.';
  END IF;

  SELECT count(*) INTO private_asset_count
  FROM v9.system_settings
  WHERE setting_key IN ('login_page_content','public_policies')
    AND visibility='public';
  IF private_asset_count <> 2 THEN
    RAISE EXCEPTION 'Explicitly public login and policy settings should remain readable.';
  END IF;
END
$public_banner$;
COMMIT;

-- Logout can revoke exactly the current cookie-bound session. The same
-- public session context cannot rewrite expiry or owner columns.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('a',64), true);
DO $session_revoke$
DECLARE
  changed_count integer;
BEGIN
  UPDATE v9.sessions
  SET revoked_at = now()
  WHERE token_hash = repeat('a',64);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 1 THEN
    RAISE EXCEPTION 'Current session revocation should update exactly one row; changed %.', changed_count;
  END IF;

  BEGIN
    UPDATE v9.sessions
    SET expires_at = now() + interval '30 days'
    WHERE token_hash = repeat('a',64);
    RAISE EXCEPTION 'Runtime must not be able to rewrite session expiry.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$session_revoke$;
COMMIT;

-- A share token can increment only its own counter, not change its expiry.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.share_token_hash', repeat('b',64), true);
DO $share_column_guard$
BEGIN
  BEGIN
    UPDATE v9.file_share_links
    SET expires_at = now() + interval '30 days'
    WHERE token_hash = repeat('b',64);
    RAISE EXCEPTION 'Public share token must not rewrite link expiry.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$share_column_guard$;
COMMIT;

-- A transaction-local context must disappear when a transaction ends.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('a',64), true);
COMMIT;
DO $context_reset$
BEGIN
  IF NULLIF(current_setting('v9.session_token_hash', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Transaction-local session context leaked into the next transaction.';
  END IF;
END
$context_reset$;

SELECT 'PASS PostgreSQL 16 tenant RLS integration: 63/63 FORCE RLS, organization isolation, unit scope, audit, public intake, share token, banner, transaction-local reset.' AS result;
