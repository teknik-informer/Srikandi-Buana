-- Business product catalogue and producer register.
-- No products/producers are seeded. Published records are explicit organizational decisions.

CREATE SEQUENCE IF NOT EXISTS v9.business_product_sku_seq;

CREATE TABLE IF NOT EXISTS v9.business_producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  membership_id uuid,
  producer_name text NOT NULL,
  producer_type text NOT NULL DEFAULT 'anggota'
    CHECK (producer_type IN ('anggota','kelompok','unit_usaha','mitra','lainnya')),
  village text,
  hamlet text,
  public_description text,
  phone text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (membership_id, organization_id)
    REFERENCES v9.memberships(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(producer_name)) BETWEEN 2 AND 200),
  CHECK (village IS NULL OR length(btrim(village)) <= 120),
  CHECK (hamlet IS NULL OR length(btrim(hamlet)) <= 120),
  CHECK (public_description IS NULL OR length(public_description) <= 3000),
  CHECK (phone IS NULL OR length(btrim(phone)) <= 60)
);

CREATE INDEX IF NOT EXISTS business_producers_org_status_idx
  ON v9.business_producers (organization_id, status, producer_name);

CREATE TABLE IF NOT EXISTS v9.business_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  producer_id uuid,
  sku text NOT NULL,
  slug text NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  package_label text NOT NULL,
  selling_price numeric(18,2) NOT NULL DEFAULT 0,
  cost_price numeric(18,2) NOT NULL DEFAULT 0,
  currency_code char(3) NOT NULL DEFAULT 'IDR',
  product_story text,
  image_path text,
  public_price boolean NOT NULL DEFAULT true,
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','review','published','archived')),
  published_at timestamptz,
  published_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  UNIQUE (organization_id, sku),
  UNIQUE (organization_id, slug),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (producer_id, organization_id, field_key)
    REFERENCES v9.business_producers(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(sku)) BETWEEN 2 AND 64),
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) <= 160),
  CHECK (length(btrim(product_name)) BETWEEN 3 AND 240),
  CHECK (length(btrim(category)) BETWEEN 2 AND 120),
  CHECK (length(btrim(package_label)) BETWEEN 1 AND 120),
  CHECK (selling_price >= 0 AND cost_price >= 0),
  CHECK (currency_code ~ '^[A-Z]{3}$'),
  CHECK (product_story IS NULL OR length(product_story) <= 5000),
  CHECK (image_path IS NULL OR (image_path LIKE '/images/%' AND length(image_path) <= 500)),
  CHECK (
    (publication_status = 'published' AND published_at IS NOT NULL AND published_by IS NOT NULL)
    OR publication_status <> 'published'
  )
);

CREATE INDEX IF NOT EXISTS business_products_org_status_category_idx
  ON v9.business_products (organization_id, publication_status, category, product_name);

CREATE INDEX IF NOT EXISTS business_products_producer_idx
  ON v9.business_products (producer_id, product_name);

CREATE INDEX IF NOT EXISTS business_products_public_slug_idx
  ON v9.business_products (organization_id, slug)
  WHERE publication_status = 'published';

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0015_business_catalog_products.sql', 'sha256:initial-v9-business-catalog-products')
ON CONFLICT (name) DO NOTHING;
