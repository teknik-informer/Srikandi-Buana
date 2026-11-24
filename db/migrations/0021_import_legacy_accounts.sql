-- Idempotently import minimum account identity and role data from the previous app.
-- Member profile/consent records are deliberately not copied by this migration.
-- The source public schema remains intact and is never modified or dropped.
DO $migration$
DECLARE
  email_verified_expression text;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT lower(btrim(email))
    FROM public.users
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Legacy account import stopped: duplicate normalized email addresses exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users AS legacy
    JOIN v9.user_accounts AS current_account
      ON lower(current_account.email) = lower(btrim(legacy.email))
    WHERE current_account.legacy_source_user_id IS DISTINCT FROM legacy.id
  ) THEN
    RAISE EXCEPTION 'Legacy account import stopped: a source email already belongs to a different V9 account.';
  END IF;

  EXECUTE $import_people$
    INSERT INTO v9.people (
      full_name, phone, email, status, legacy_source_user_id
    )
    SELECT
      COALESCE(NULLIF(btrim(legacy.full_name), ''), lower(btrim(legacy.email))),
      NULLIF(btrim(legacy.login_phone), ''),
      lower(btrim(legacy.email)),
      CASE WHEN legacy.enabled THEN 'active' ELSE 'inactive' END,
      legacy.id
    FROM public.users AS legacy
    WHERE legacy.id IS NOT NULL
      AND legacy.email IS NOT NULL
      AND lower(btrim(legacy.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    ON CONFLICT (legacy_source_user_id)
      WHERE legacy_source_user_id IS NOT NULL DO NOTHING
  $import_people$;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email_verified_at'
  ) THEN
    email_verified_expression := $verify$
      CASE
        WHEN NULLIF(btrim(legacy.email_verified_at), '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([ T].*)?$'
          THEN NULLIF(btrim(legacy.email_verified_at), '')::timestamptz
        ELSE NULL
      END
    $verify$;
  ELSE
    email_verified_expression := 'NULL::timestamptz';
  END IF;

  EXECUTE format($import_accounts$
    INSERT INTO v9.user_accounts (
      person_id, email, password_hash, status, email_verified_at,
      must_change_password, legacy_auth_eligible, legacy_source_user_id
    )
    SELECT
      person.id,
      lower(btrim(legacy.email)),
      legacy.password_hash,
      CASE
        WHEN legacy.enabled
          AND lower(btrim(legacy.role)) IN ('admin','ketua','sekretaris','bendahara','anggota','kasir')
          AND legacy.password_hash ~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$'
          THEN 'active'
        WHEN legacy.enabled THEN 'suspended'
        ELSE 'disabled'
      END,
      %s,
      false,
      (
        legacy.enabled
        AND lower(btrim(legacy.role)) IN ('admin','ketua','sekretaris','bendahara','anggota','kasir')
        AND legacy.password_hash ~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$'
      ),
      legacy.id
    FROM public.users AS legacy
    INNER JOIN v9.people AS person
      ON person.legacy_source_user_id = legacy.id
    WHERE legacy.id IS NOT NULL
      AND legacy.email IS NOT NULL
      AND lower(btrim(legacy.email)) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    ON CONFLICT (legacy_source_user_id)
      WHERE legacy_source_user_id IS NOT NULL DO NOTHING
  $import_accounts$, email_verified_expression);

  EXECUTE $import_roles$
    INSERT INTO v9.role_assignments (
      organization_id,
      user_id,
      role_key,
      scope_kind,
      is_active
    )
    SELECT
      organization.id,
      account.id,
      CASE lower(btrim(legacy.role))
        WHEN 'admin' THEN 'organization_admin'
        WHEN 'ketua' THEN 'chair'
        WHEN 'sekretaris' THEN 'secretary'
        WHEN 'bendahara' THEN 'treasurer'
        WHEN 'anggota' THEN 'member'
        WHEN 'kasir' THEN 'cashier'
      END,
      'organization',
      true
    FROM public.users AS legacy
    INNER JOIN v9.user_accounts AS account
      ON account.legacy_source_user_id = legacy.id
    CROSS JOIN v9.organizations AS organization
    WHERE organization.slug = 'srikandi-buana'
      AND account.status = 'active'
      AND account.legacy_auth_eligible = true
      AND lower(btrim(legacy.role)) IN ('admin','ketua','sekretaris','bendahara','anggota','kasir')
    ON CONFLICT DO NOTHING
  $import_roles$;
END
$migration$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0021_import_legacy_accounts.sql', 'sha256:v9-import-legacy-accounts-1')
ON CONFLICT (name) DO NOTHING;
