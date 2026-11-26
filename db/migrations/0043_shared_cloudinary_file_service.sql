-- Centralized, tenant-scoped file service backed by private Cloudinary assets.
CREATE TABLE IF NOT EXISTS v9.file_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  uploaded_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  scope_kind text NOT NULL DEFAULT 'self' CHECK (scope_kind IN ('organization', 'field', 'self')),
  scope_ref text,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 3145728),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  cloudinary_asset_id text NOT NULL UNIQUE,
  cloudinary_public_id text NOT NULL UNIQUE,
  cloudinary_resource_type text NOT NULL CHECK (cloudinary_resource_type IN ('image', 'video', 'raw')),
  cloudinary_delivery_type text NOT NULL DEFAULT 'authenticated' CHECK (cloudinary_delivery_type = 'authenticated'),
  cloudinary_version bigint NOT NULL,
  cloudinary_format text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (length(btrim(file_name)) BETWEEN 1 AND 180),
  CHECK ((scope_kind = 'field' AND scope_ref IS NOT NULL) OR (scope_kind <> 'field' AND scope_ref IS NULL))
);

CREATE INDEX IF NOT EXISTS file_assets_org_created_idx
  ON v9.file_assets (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS file_assets_owner_created_idx
  ON v9.file_assets (uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS file_assets_scope_idx
  ON v9.file_assets (organization_id, scope_kind, scope_ref, status);

CREATE TABLE IF NOT EXISTS v9.file_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_asset_id uuid NOT NULL REFERENCES v9.file_assets(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  token_hash char(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  max_downloads integer CHECK (max_downloads IS NULL OR max_downloads BETWEEN 1 AND 1000),
  download_count integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS file_share_links_active_idx
  ON v9.file_share_links (file_asset_id, expires_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE v9.secretariat_document_files
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES v9.file_assets(id) ON DELETE RESTRICT;
ALTER TABLE v9.secretariat_document_files
  ALTER COLUMN file_data DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'secretariat_document_files_storage_check'
      AND conrelid = 'v9.secretariat_document_files'::regclass
  ) THEN
    ALTER TABLE v9.secretariat_document_files
      ADD CONSTRAINT secretariat_document_files_storage_check
      CHECK (file_data IS NOT NULL OR asset_id IS NOT NULL);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS secretariat_document_files_asset_uq
  ON v9.secretariat_document_files(asset_id) WHERE asset_id IS NOT NULL;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0043_shared_cloudinary_file_service.sql', 'sha256:shared-cloudinary-file-service-v1')
ON CONFLICT (name) DO NOTHING;
