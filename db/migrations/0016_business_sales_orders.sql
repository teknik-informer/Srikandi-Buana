-- Operational sales orders: customer register, order headers, and immutable order snapshots.
-- Reservation and fulfillment are transactional and remain separate from accounting.

CREATE SEQUENCE IF NOT EXISTS v9.business_customer_reference_seq;
CREATE SEQUENCE IF NOT EXISTS v9.business_order_reference_seq;

CREATE TABLE IF NOT EXISTS v9.business_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK(field_key='usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'PLG-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_customer_reference_seq')::text,6,'0')
  ),
  customer_type text NOT NULL DEFAULT 'individual'
    CHECK(customer_type IN ('individual','business','cooperative','government','ngo','other')),
  customer_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,organization_id,field_key),
  FOREIGN KEY(field_key,organization_id)
    REFERENCES v9.field_applications(field_key,organization_id) ON DELETE RESTRICT,
  CHECK(length(btrim(customer_name)) BETWEEN 2 AND 240),
  CHECK(contact_name IS NULL OR length(btrim(contact_name))<=160),
  CHECK(phone IS NULL OR length(btrim(phone))<=60),
  CHECK(email IS NULL OR length(btrim(email))<=254),
  CHECK(address IS NULL OR length(address)<=1000),
  CHECK(notes IS NULL OR length(notes)<=3000)
);

CREATE INDEX IF NOT EXISTS business_customers_org_status_idx
  ON v9.business_customers(organization_id,status,customer_name);

CREATE TABLE IF NOT EXISTS v9.business_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK(field_key='usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'ORD-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('v9.business_order_reference_seq')::text,6,'0')
  ),
  customer_id uuid NOT NULL,
  customer_name_snapshot text NOT NULL,
  customer_contact_snapshot text,
  customer_phone_snapshot text,
  customer_email_snapshot text,
  warehouse_id uuid,
  order_channel text NOT NULL DEFAULT 'internal'
    CHECK(order_channel IN ('internal','whatsapp','mitra','website','pos')),
  order_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','confirmed','processing','ready','fulfilled','cancelled')),
  currency_code char(3) NOT NULL DEFAULT 'IDR',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  delivery_note text,
  customer_note text,
  internal_note text,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  confirmed_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  fulfilled_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  fulfilled_at timestamptz,
  cancelled_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,organization_id,field_key),
  FOREIGN KEY(field_key,organization_id)
    REFERENCES v9.field_applications(field_key,organization_id) ON DELETE RESTRICT,
  FOREIGN KEY(customer_id,organization_id,field_key)
    REFERENCES v9.business_customers(id,organization_id,field_key) ON DELETE RESTRICT,
  FOREIGN KEY(warehouse_id,organization_id,field_key)
    REFERENCES v9.business_warehouses(id,organization_id,field_key) ON DELETE RESTRICT,
  CHECK(length(btrim(customer_name_snapshot)) BETWEEN 2 AND 240),
  CHECK(customer_contact_snapshot IS NULL OR length(btrim(customer_contact_snapshot))<=160),
  CHECK(customer_phone_snapshot IS NULL OR length(btrim(customer_phone_snapshot))<=60),
  CHECK(customer_email_snapshot IS NULL OR length(btrim(customer_email_snapshot))<=254),
  CHECK(currency_code ~ '^[A-Z]{3}$'),
  CHECK(subtotal>=0 AND delivery_fee>=0 AND total_amount>=0),
  CHECK(total_amount=subtotal+delivery_fee),
  CHECK(delivery_note IS NULL OR length(delivery_note)<=1000),
  CHECK(customer_note IS NULL OR length(customer_note)<=3000),
  CHECK(internal_note IS NULL OR length(internal_note)<=3000),
  CHECK((status IN ('confirmed','processing','ready','fulfilled') AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
    OR (status IN ('draft','cancelled'))),
  CHECK((status='fulfilled' AND fulfilled_at IS NOT NULL AND fulfilled_by IS NOT NULL)
    OR (status<>'fulfilled' AND fulfilled_at IS NULL AND fulfilled_by IS NULL)),
  CHECK((status='cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
    OR (status<>'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL))
);

CREATE INDEX IF NOT EXISTS business_orders_org_status_date_idx
  ON v9.business_orders(organization_id,status,order_date DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS business_orders_customer_date_idx
  ON v9.business_orders(customer_id,order_date DESC);
CREATE INDEX IF NOT EXISTS business_orders_warehouse_status_idx
  ON v9.business_orders(warehouse_id,status,order_date DESC);

CREATE TABLE IF NOT EXISTS v9.business_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'usaha' CHECK(field_key='usaha'),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  sku_snapshot text NOT NULL,
  product_name_snapshot text NOT NULL,
  unit_snapshot text NOT NULL,
  quantity numeric(14,3) NOT NULL,
  unit_price numeric(18,2) NOT NULL,
  line_total numeric(18,2) NOT NULL,
  stock_reserved numeric(14,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,product_id),
  FOREIGN KEY(order_id,organization_id,field_key)
    REFERENCES v9.business_orders(id,organization_id,field_key) ON DELETE RESTRICT,
  FOREIGN KEY(product_id,organization_id,field_key)
    REFERENCES v9.business_products(id,organization_id,field_key) ON DELETE RESTRICT,
  CHECK(length(btrim(sku_snapshot)) BETWEEN 2 AND 80),
  CHECK(length(btrim(product_name_snapshot)) BETWEEN 2 AND 240),
  CHECK(length(btrim(unit_snapshot)) BETWEEN 1 AND 80),
  CHECK(quantity>0 AND unit_price>=0 AND line_total>=0),
  CHECK(stock_reserved>=0 AND stock_reserved<=quantity),
  CHECK(line_total=round(quantity*unit_price,2))
);

CREATE INDEX IF NOT EXISTS business_order_items_order_idx
  ON v9.business_order_items(order_id,created_at);
CREATE INDEX IF NOT EXISTS business_order_items_product_idx
  ON v9.business_order_items(product_id,created_at DESC);

-- Sale is the only new on-hand movement introduced by this order workflow.
ALTER TABLE v9.business_inventory_movements
  DROP CONSTRAINT business_inventory_movements_movement_type_check;
ALTER TABLE v9.business_inventory_movements
  ADD CONSTRAINT business_inventory_movements_movement_type_check
  CHECK(movement_type IN ('receipt','adjustment_in','adjustment_out','return_in','sale'));

ALTER TABLE v9.business_inventory_movements
  DROP CONSTRAINT business_inventory_movements_check1;
ALTER TABLE v9.business_inventory_movements
  ADD CONSTRAINT business_inventory_movements_check1
  CHECK(
    (movement_type IN ('receipt','adjustment_in','return_in') AND on_hand_delta=quantity)
    OR (movement_type IN ('adjustment_out','sale') AND on_hand_delta=-quantity)
  );

INSERT INTO v9.schema_migrations(name,checksum)
VALUES('0016_business_sales_orders.sql','sha256:initial-v9-business-sales-orders')
ON CONFLICT(name) DO NOTHING;
