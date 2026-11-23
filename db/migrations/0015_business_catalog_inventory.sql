-- Business catalog and inventory: products, warehouses, stock balances,
-- and append-only inventory movements. No product, warehouse, or stock is seeded.

CREATE SEQUENCE IF NOT EXISTS v9.business_product_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.business_warehouse_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.business_stock_movement_reference_seq;

CREATE TABLE IF NOT EXISTS v9.business_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'PRD-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_product_reference_seq')::text,6,'0')
  ),
  sku text NOT NULL,
  slug text NOT NULL,
  product_name text NOT NULL,
  category_label text,
  product_kind text NOT NULL DEFAULT 'physical'
    CHECK (product_kind IN ('physical','service')),
  unit_label text NOT NULL,
  selling_price numeric(18,2) NOT NULL DEFAULT 0,
  cost_estimate numeric(18,2),
  description text,
  producer_label text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','inactive','archived')),
  publication_status text NOT NULL DEFAULT 'private'
    CHECK (publication_status IN ('private','published','hidden')),
  track_stock boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  published_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  UNIQUE (organization_id, sku),
  UNIQUE (organization_id, slug),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(sku)) BETWEEN 2 AND 80),
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) <= 180),
  CHECK (length(btrim(product_name)) BETWEEN 2 AND 240),
  CHECK (category_label IS NULL OR length(btrim(category_label)) <= 120),
  CHECK (length(btrim(unit_label)) BETWEEN 1 AND 80),
  CHECK (selling_price >= 0),
  CHECK (cost_estimate IS NULL OR cost_estimate >= 0),
  CHECK (description IS NULL OR length(description) <= 5000),
  CHECK (producer_label IS NULL OR length(btrim(producer_label)) <= 160),
  CHECK (product_kind = 'physical' OR track_stock = false),
  CHECK (
    (publication_status = 'published' AND published_by IS NOT NULL AND published_at IS NOT NULL AND status = 'active')
    OR (publication_status <> 'published' AND published_at IS NULL AND published_by IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS business_products_org_status_idx
  ON v9.business_products (organization_id, status, product_name);

CREATE INDEX IF NOT EXISTS business_products_public_idx
  ON v9.business_products (organization_id, publication_status, product_name)
  WHERE publication_status = 'published' AND status = 'active';

CREATE TABLE IF NOT EXISTS v9.business_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'GDG-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_warehouse_reference_seq')::text,6,'0')
  ),
  warehouse_code text NOT NULL,
  warehouse_name text NOT NULL,
  location_note text,
  responsible_label text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  UNIQUE (organization_id, warehouse_code),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(warehouse_code)) BETWEEN 2 AND 60),
  CHECK (length(btrim(warehouse_name)) BETWEEN 2 AND 180),
  CHECK (location_note IS NULL OR length(location_note) <= 1000),
  CHECK (responsible_label IS NULL OR length(btrim(responsible_label)) <= 160)
);

CREATE INDEX IF NOT EXISTS business_warehouses_org_status_idx
  ON v9.business_warehouses (organization_id, status, warehouse_name);

CREATE TABLE IF NOT EXISTS v9.business_product_stock (
  product_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  on_hand numeric(14,3) NOT NULL DEFAULT 0,
  reserved numeric(14,3) NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id),
  FOREIGN KEY (product_id, organization_id, field_key)
    REFERENCES v9.business_products(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id, organization_id, field_key)
    REFERENCES v9.business_warehouses(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (on_hand >= 0),
  CHECK (reserved >= 0),
  CHECK (reserved <= on_hand)
);

CREATE INDEX IF NOT EXISTS business_product_stock_org_idx
  ON v9.business_product_stock (organization_id, field_key, warehouse_id);

CREATE TABLE IF NOT EXISTS v9.business_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'STK-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_stock_movement_reference_seq')::text,6,'0')
  ),
  product_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  movement_type text NOT NULL
    CHECK (movement_type IN ('receipt','adjustment_in','adjustment_out','return_in')),
  quantity numeric(14,3) NOT NULL,
  on_hand_before numeric(14,3) NOT NULL,
  on_hand_delta numeric(14,3) NOT NULL,
  on_hand_after numeric(14,3) NOT NULL,
  source_reference text,
  note text,
  recorded_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (product_id, organization_id, field_key)
    REFERENCES v9.business_products(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id, organization_id, field_key)
    REFERENCES v9.business_warehouses(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (quantity > 0),
  CHECK (on_hand_before >= 0),
  CHECK (on_hand_after >= 0),
  CHECK (on_hand_delta <> 0),
  CHECK (on_hand_before + on_hand_delta = on_hand_after),
  CHECK (
    (movement_type IN ('receipt','adjustment_in','return_in') AND on_hand_delta = quantity)
    OR (movement_type = 'adjustment_out' AND on_hand_delta = -quantity)
  ),
  CHECK (source_reference IS NULL OR length(btrim(source_reference)) <= 120),
  CHECK (note IS NULL OR length(note) <= 3000)
);

CREATE INDEX IF NOT EXISTS business_inventory_movements_org_date_idx
  ON v9.business_inventory_movements (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS business_inventory_movements_product_idx
  ON v9.business_inventory_movements (product_id, warehouse_id, created_at DESC);

CREATE OR REPLACE FUNCTION v9.prevent_business_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Inventory movements are immutable. Record a correcting movement instead.';
END;
$$;

DROP TRIGGER IF EXISTS business_inventory_movements_immutable
  ON v9.business_inventory_movements;

CREATE TRIGGER business_inventory_movements_immutable
BEFORE UPDATE OR DELETE ON v9.business_inventory_movements
FOR EACH ROW EXECUTE FUNCTION v9.prevent_business_inventory_movement_mutation();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0015_business_catalog_inventory.sql', 'sha256:initial-v9-business-catalog-inventory')
ON CONFLICT (name) DO NOTHING;
