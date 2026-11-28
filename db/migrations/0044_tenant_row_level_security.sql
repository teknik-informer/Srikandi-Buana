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

  -- External viewers have no database access to operational tenant tables
  -- until an explicit dataset/field/purpose/expiry/revocation grant exists.
  IF actor.role_key IN ('government_viewer', 'ngo_viewer', 'partner_viewer') THEN
    RETURN false;
  END IF;

  -- The legacy import intentionally preserves role assignments with
  -- scope_kind='organization'. That is not authority for a member: members
  -- remain self-scoped even when their legacy scope column says organization.
  IF actor.role_key = 'member' THEN
    RETURN
      (p_user_id IS NOT NULL AND p_user_id = actor.user_id)
      OR (p_membership_id IS NOT NULL AND p_membership_id = actor.membership_id)
      OR (p_person_id IS NOT NULL AND p_person_id = actor.person_id);
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
  SELECT document.organization_id, document.created_by, document.source_field_key
    INTO row_value
  FROM v9.secretariat_documents AS document
  WHERE document.id = p_document_id;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN v9._tenant_row_visible(row_value.organization_id, row_value.source_field_key, NULL, row_value.created_by, NULL, NULL);
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

CREATE OR REPLACE FUNCTION v9._active_community_member(p_organization_id uuid)
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
      AND actor.membership_id IS NOT NULL
  )
$function$;

CREATE OR REPLACE FUNCTION v9._community_membership_visible(p_membership_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9._request_actor() AS actor
    INNER JOIN v9.memberships AS membership
      ON membership.organization_id = actor.organization_id
    WHERE membership.id = p_membership_id
      AND (
        EXISTS (
          SELECT 1 FROM v9.member_community_topics AS topic
          WHERE topic.membership_id = membership.id
            AND topic.organization_id = membership.organization_id
            AND topic.status = 'published'
        )
        OR EXISTS (
          SELECT 1
          FROM v9.member_community_replies AS reply
          INNER JOIN v9.member_community_topics AS topic
            ON topic.id = reply.topic_id
            AND topic.organization_id = reply.organization_id
          WHERE reply.membership_id = membership.id
            AND reply.organization_id = membership.organization_id
            AND reply.status = 'published'
            AND topic.status = 'published'
        )
      )
  )
$function$;

CREATE OR REPLACE FUNCTION v9._community_person_visible(p_person_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM v9.memberships AS membership
    WHERE membership.person_id = p_person_id
      AND membership.organization_id = (SELECT actor.organization_id FROM v9._request_actor() AS actor LIMIT 1)
      AND v9._community_membership_visible(membership.id)
  )
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

-- Explicit public projections. These SECURITY DEFINER functions are the
-- only tokenless read path for operational data shown on the public website.
-- They return a fixed column allow-list and never expose member, cost, inventory,
-- enrollment, audit, or document-internal metadata.
CREATE OR REPLACE FUNCTION v9.get_public_fields()
RETURNS TABLE (
  field_key text,
  name text,
  short_name text,
  mandate text,
  unit_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    application.field_key,
    application.name,
    application.short_name,
    application.mandate,
    unit.name AS unit_name
  FROM v9.field_applications AS application
  INNER JOIN v9.organizations AS organization
    ON organization.id = application.organization_id
  LEFT JOIN v9.organization_units AS unit
    ON unit.id = application.unit_id
    AND unit.organization_id = application.organization_id
    AND unit.is_active = true
  WHERE organization.slug = 'srikandi-buana'
    AND organization.status = 'active'
    AND application.is_enabled = true
  ORDER BY application.display_order, application.name
$function$;

CREATE OR REPLACE FUNCTION v9.get_public_products(
  p_slug text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_exclude_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  slug text,
  reference_no text,
  product_name text,
  category_label text,
  product_kind text,
  unit_label text,
  selling_price numeric,
  producer_label text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    product.id,
    product.slug,
    product.reference_no,
    product.product_name,
    product.category_label,
    product.product_kind,
    product.unit_label,
    product.selling_price,
    product.producer_label,
    product.description
  FROM v9.business_products AS product
  INNER JOIN v9.organizations AS organization
    ON organization.id = product.organization_id
  WHERE organization.slug = 'srikandi-buana'
    AND organization.status = 'active'
    AND product.field_key = 'usaha'
    AND product.status = 'active'
    AND product.publication_status = 'published'
    AND (p_slug IS NULL OR product.slug = p_slug)
    AND (p_category IS NULL OR product.category_label = p_category)
    AND (p_exclude_id IS NULL OR product.id <> p_exclude_id)
  ORDER BY product.category_label NULLS LAST, product.product_name
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 200))
$function$;

CREATE OR REPLACE FUNCTION v9.get_public_activities(
  p_field_key text DEFAULT NULL,
  p_completed boolean DEFAULT false,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  reference_no text,
  title text,
  field_name text,
  activity_date date,
  start_time text,
  end_time text,
  location text,
  description text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    activity.id,
    activity.reference_no,
    activity.title,
    application.short_name,
    activity.activity_date,
    to_char(activity.start_time, 'HH24:MI'),
    to_char(activity.end_time, 'HH24:MI'),
    activity.location,
    activity.description,
    activity.status
  FROM v9.field_activities AS activity
  INNER JOIN v9.organizations AS organization
    ON organization.id = activity.organization_id
  INNER JOIN v9.field_applications AS application
    ON application.organization_id = activity.organization_id
    AND application.field_key = activity.field_key
    AND application.is_enabled = true
  WHERE organization.slug = 'srikandi-buana'
    AND organization.status = 'active'
    AND activity.open_to_public = true
    AND (p_field_key IS NULL OR activity.field_key = p_field_key)
    AND (
      (p_completed = true
        AND activity.status = 'completed'
        AND activity.activity_date <= (now() AT TIME ZONE 'Asia/Jakarta')::date)
      OR
      (p_completed = false
        AND activity.status IN ('scheduled','in_progress')
        AND activity.activity_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date)
    )
  ORDER BY
    CASE WHEN p_completed THEN activity.activity_date END DESC,
    CASE WHEN NOT p_completed THEN activity.activity_date END ASC,
    activity.start_time NULLS FIRST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 100))
$function$;

CREATE OR REPLACE FUNCTION v9.get_public_training_sessions(
  p_completed boolean DEFAULT false,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  reference_no text,
  title text,
  topic text,
  session_date date,
  start_time text,
  end_time text,
  location text,
  trainer_label text,
  max_participants integer,
  registered_count integer,
  present_count integer,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    session.id,
    session.reference_no,
    session.title,
    session.topic,
    session.session_date,
    to_char(session.start_time, 'HH24:MI'),
    to_char(session.end_time, 'HH24:MI'),
    session.location,
    session.trainer_label,
    session.max_participants,
    (
      SELECT count(*)::integer
      FROM v9.training_enrollments AS enrollment
      WHERE enrollment.session_id = session.id
        AND enrollment.organization_id = session.organization_id
        AND enrollment.registration_status IN ('registered','confirmed')
    ),
    (
      SELECT count(*)::integer
      FROM v9.training_enrollments AS enrollment
      WHERE enrollment.session_id = session.id
        AND enrollment.organization_id = session.organization_id
        AND enrollment.attendance_status = 'hadir'
    ),
    session.description
  FROM v9.training_sessions AS session
  INNER JOIN v9.organizations AS organization
    ON organization.id = session.organization_id
  WHERE organization.slug = 'srikandi-buana'
    AND organization.status = 'active'
    AND session.field_key = 'pelatihan'
    AND (
      (p_completed = true AND session.status = 'completed')
      OR (p_completed = false
        AND session.status = 'registration_open'
        AND session.session_date >= current_date)
    )
  ORDER BY
    CASE WHEN p_completed THEN session.session_date END DESC,
    CASE WHEN NOT p_completed THEN session.session_date END ASC,
    session.start_time NULLS FIRST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 50))
$function$;

CREATE OR REPLACE FUNCTION v9.get_public_documents(
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  document_id uuid,
  reference_no text,
  number text,
  title text,
  category text,
  document_date date,
  owner_label text,
  file_name text,
  size_bytes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    document.id,
    document.reference_no,
    document.number,
    document.title,
    document.category,
    document.document_date,
    document.owner_label,
    latest_file.file_name,
    latest_file.size_bytes
  FROM v9.secretariat_documents AS document
  INNER JOIN v9.organizations AS organization
    ON organization.id = document.organization_id
  INNER JOIN LATERAL (
    SELECT file.file_name, file.size_bytes
    FROM v9.secretariat_document_files AS file
    LEFT JOIN v9.file_assets AS asset
      ON asset.id = file.asset_id
      AND asset.organization_id = document.organization_id
    WHERE file.document_id = document.id
      AND (file.asset_id IS NULL OR asset.status = 'active')
    ORDER BY file.revision_no DESC
    LIMIT 1
  ) AS latest_file ON true
  WHERE organization.slug = 'srikandi-buana'
    AND organization.status = 'active'
    AND document.status = 'final'
    AND document.visibility = 'publik'
    AND (p_category IS NULL OR lower(document.category) = p_category)
  ORDER BY document.document_date DESC, document.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 200))
$function$;

CREATE OR REPLACE FUNCTION v9.get_public_document_file(p_document_id uuid)
RETURNS TABLE (
  organization_id uuid,
  file_name text,
  mime_type text,
  size_bytes bigint,
  base64 text,
  asset_id uuid,
  cloudinary_asset_id text,
  cloudinary_public_id text,
  cloudinary_resource_type text,
  cloudinary_delivery_type text,
  cloudinary_version bigint,
  cloudinary_format text,
  asset_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, v9
AS $function$
  SELECT
    document.organization_id,
    file.file_name,
    file.mime_type,
    file.size_bytes::bigint,
    CASE WHEN file.file_data IS NOT NULL THEN encode(file.file_data, 'base64') ELSE NULL END,
    file.asset_id,
    asset.cloudinary_asset_id,
    asset.cloudinary_public_id,
    asset.cloudinary_resource_type,
    asset.cloudinary_delivery_type,
    asset.cloudinary_version,
    asset.cloudinary_format,
    asset.status
  FROM v9.secretariat_documents AS document
  INNER JOIN v9.organizations AS organization
    ON organization.id = document.organization_id
  INNER JOIN LATERAL (
    SELECT *
    FROM v9.secretariat_document_files AS latest
    WHERE latest.document_id = document.id
    ORDER BY latest.revision_no DESC
    LIMIT 1
  ) AS file ON true
  LEFT JOIN v9.file_assets AS asset
    ON asset.id = file.asset_id
    AND asset.organization_id = document.organization_id
  WHERE document.id = p_document_id
    AND organization.slug = 'srikandi-buana'
    AND organization.status = 'active'
    AND document.status = 'final'
    AND document.visibility = 'publik'
    AND (file.asset_id IS NULL OR asset.status = 'active')
  LIMIT 1
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
      ('finance_cash_accounts', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),
      ('finance_budget_lines', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid)'),
      ('finance_budgets', 'v9._tenant_row_visible(organization_id, NULL::text, NULL::uuid, created_by, NULL::uuid, NULL::uuid)'),

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

-- Audit events are append-only for the application. The actor and tenant must
-- match the verified request context; only organization leadership can read.
CREATE POLICY audit_events_insert_scope ON v9.audit_events
  FOR INSERT TO v9_app
  WITH CHECK (
    organization_id = (SELECT actor.organization_id FROM v9._request_actor() AS actor LIMIT 1)
    AND actor_user_id = (SELECT actor.user_id FROM v9._request_actor() AS actor LIMIT 1)
    AND (SELECT actor.role_key FROM v9._request_actor() AS actor LIMIT 1)
      NOT IN ('government_viewer', 'ngo_viewer', 'partner_viewer')
  );
CREATE POLICY audit_events_read_scope ON v9.audit_events
  FOR SELECT TO v9_app
  USING (v9._can_manage_organization(organization_id));

-- Published community content is readable to active members of the same
-- organization; writes remain constrained by the author/self policy above.
CREATE POLICY member_community_topics_published_read ON v9.member_community_topics
  FOR SELECT TO v9_app
  USING (status = 'published' AND v9._active_community_member(organization_id));
CREATE POLICY member_community_replies_published_read ON v9.member_community_replies
  FOR SELECT TO v9_app
  USING (
    status = 'published'
    AND v9._active_community_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM v9.member_community_topics AS topic
      WHERE topic.id = topic_id
        AND topic.organization_id = member_community_replies.organization_id
        AND topic.status = 'published'
    )
  );

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
CREATE POLICY memberships_community_author_read ON v9.memberships
  FOR SELECT TO v9_app
  USING (v9._community_membership_visible(id));

CREATE POLICY people_scope ON v9.people
  FOR ALL TO v9_app
  USING (v9._person_row_visible(id))
  WITH CHECK (v9._person_row_visible(id));
CREATE POLICY people_community_author_read ON v9.people
  FOR SELECT TO v9_app
  USING (v9._community_person_visible(id));

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
    OR token_hash = NULLIF(current_setting('v9.session_token_hash', true), '')
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
    setting_key IN ('public_site', 'public_profile_content', 'login_page_content', 'public_policies')
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
CREATE POLICY file_share_links_public_token_read ON v9.file_share_links
  FOR SELECT TO v9_app
  USING (
    token_hash = NULLIF(current_setting('v9.share_token_hash', true), '')
    AND revoked_at IS NULL
    AND expires_at > now()
    AND (max_downloads IS NULL OR download_count < max_downloads)
  );

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
  USING (v9._tenant_row_visible(organization_id, source_field_key, NULL, created_by, NULL, NULL))
  WITH CHECK (v9._tenant_row_visible(organization_id, source_field_key, NULL, created_by, NULL, NULL));
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
    'v9._request_actor()'::regprocedure,
    'v9._login_user_id()'::regprocedure,
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
    'v9.get_public_fields()'::regprocedure,
    'v9.get_public_products(text,text,uuid,integer)'::regprocedure,
    'v9.get_public_activities(text,boolean,integer)'::regprocedure,
    'v9.get_public_training_sessions(boolean,integer)'::regprocedure,
    'v9.get_public_documents(text,integer)'::regprocedure,
    'v9.get_public_document_file(uuid)'::regprocedure,
    'v9._active_community_member(uuid)'::regprocedure,
    'v9._community_membership_visible(uuid)'::regprocedure,
    'v9._community_person_visible(uuid)'::regprocedure,
    'v9._can_review_memberships(uuid)'::regprocedure
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO v9_app', v_function);
  END LOOP;
END
$grants$;

-- Session revocation is the only runtime mutation to an existing session.
-- A cookie-bound revoke remains possible after its own row is marked revoked,
-- but the request cannot rewrite session ownership or expiry.
REVOKE UPDATE ON TABLE v9.sessions FROM v9_app;
REVOKE UPDATE (revoked_at) ON TABLE v9.sessions FROM v9_app;
GRANT UPDATE (revoked_at) ON TABLE v9.sessions TO v9_app;

-- A share token can increment its own download counter only. Authorized
-- tenant users can revoke links, but neither path can rewrite token/asset/expiry.
REVOKE UPDATE ON TABLE v9.file_share_links FROM v9_app;
REVOKE UPDATE (download_count, revoked_at) ON TABLE v9.file_share_links FROM v9_app;
GRANT UPDATE (download_count, revoked_at) ON TABLE v9.file_share_links TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0044_tenant_row_level_security.sql', 'sha256:tenant-row-level-security-v1')
ON CONFLICT (name) DO NOTHING;
