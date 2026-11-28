-- Allow the same fixed field module key and route to be installed by multiple tenants.
-- Operational foreign keys reference (field_key, organization_id), not field_key alone.
-- Route uniqueness is tenant-scoped because application routes are shared across tenants.
BEGIN;

DO $field_application_key$
DECLARE
  primary_key_definition text;
  route_unique_definition text;
  field_key_attnum smallint;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO primary_key_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_pkey'
    AND contype = 'p';

  IF primary_key_definition = 'PRIMARY KEY (field_key)' THEN
    SELECT attnum INTO field_key_attnum
    FROM pg_attribute
    WHERE attrelid = 'v9.field_applications'::regclass
      AND attname = 'field_key'
      AND NOT attisdropped;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE contype = 'f'
        AND confrelid = 'v9.field_applications'::regclass
        AND array_length(confkey, 1) = 1
        AND confkey[1] = field_key_attnum
    ) THEN
      RAISE EXCEPTION
        'Cannot tenant-scope field_applications primary key while a single-column foreign key still references field_key.';
    END IF;

    ALTER TABLE v9.field_applications
      DROP CONSTRAINT field_applications_pkey;

    ALTER TABLE v9.field_applications
      ADD CONSTRAINT field_applications_pkey
      PRIMARY KEY (organization_id, field_key);

  ELSIF primary_key_definition IS DISTINCT FROM 'PRIMARY KEY (organization_id, field_key)' THEN
    RAISE EXCEPTION
      'Unexpected field_applications primary key definition: %',
      primary_key_definition;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'v9.field_applications'::regclass
      AND conname = 'field_applications_key_org_uq'
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (field_key, organization_id)'
  ) THEN
    RAISE EXCEPTION
      'Composite UNIQUE(field_key, organization_id) required by operational foreign keys is missing or has changed.';
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO route_unique_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_route_key'
    AND contype = 'u';

  IF route_unique_definition = 'UNIQUE (route)' THEN
    ALTER TABLE v9.field_applications
      DROP CONSTRAINT field_applications_route_key;
  ELSIF route_unique_definition IS NOT NULL THEN
    RAISE EXCEPTION
      'Unexpected field_applications route uniqueness definition: %',
      route_unique_definition;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'v9.field_applications'::regclass
      AND conname = 'field_applications_organization_id_route_key'
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (organization_id, route)'
  ) THEN
    ALTER TABLE v9.field_applications
      ADD CONSTRAINT field_applications_organization_id_route_key
      UNIQUE (organization_id, route);
  END IF;
END
$field_application_key$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES (
  '0045_tenant_scope_field_application_identity.sql',
  'sha256:v9-tenant-scoped-field-application-identity-route-20261128'
)
ON CONFLICT (name) DO UPDATE
SET checksum = EXCLUDED.checksum,
    applied_at = now();

COMMIT;
