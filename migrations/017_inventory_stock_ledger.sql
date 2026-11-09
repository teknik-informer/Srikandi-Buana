-- v14 native ERP: physical stock locations, quantity ledger and PO receipt integration.
-- Quantity-only inventory: this migration does not assign unit cost, valuation or GL postings.

CREATE TABLE IF NOT EXISTS workspace_v14.inventory_locations (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
 location_code TEXT NOT NULL CHECK(length(location_code) BETWEEN 2 AND 32),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
 location_type TEXT NOT NULL DEFAULT 'warehouse'
   CHECK(location_type IN ('warehouse','storage','field','other')),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 UNIQUE(organization_id,location_code)
);
CREATE INDEX IF NOT EXISTS workspace_v14_inventory_locations_active
 ON workspace_v14.inventory_locations(organization_id,active,name);

ALTER TABLE workspace_v14.stock_movements
 ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE workspace_v14.stock_movements
 ADD CONSTRAINT workspace_v14_stock_movements_location_fk
 FOREIGN KEY(location_id) REFERENCES workspace_v14.inventory_locations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS workspace_v14_stock_movements_location_timeline
 ON workspace_v14.stock_movements(organization_id,location_id,inventory_item_id,occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_v14_stock_movements_source_unique
 ON workspace_v14.stock_movements(organization_id,reference_type,reference_id,movement_type)
 WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workspace_v14_stock_opening_once
 ON workspace_v14.stock_movements(organization_id,inventory_item_id,location_id)
 WHERE movement_type='opening';

ALTER TABLE commerce_purchase_order_lines
 ADD COLUMN IF NOT EXISTS inventory_item_id TEXT;
ALTER TABLE commerce_purchase_order_lines
 ADD CONSTRAINT commerce_purchase_order_lines_inventory_item_fk
 FOREIGN KEY(inventory_item_id) REFERENCES workspace_v14.inventory_items(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS commerce_purchase_order_lines_inventory_item
 ON commerce_purchase_order_lines(owner,inventory_item_id)
 WHERE inventory_item_id IS NOT NULL;

ALTER TABLE commerce_goods_receipts
 ADD COLUMN IF NOT EXISTS inventory_location_id TEXT,
 ADD COLUMN IF NOT EXISTS client_request_id TEXT;
ALTER TABLE commerce_goods_receipts
 ADD CONSTRAINT commerce_goods_receipts_inventory_location_fk
 FOREIGN KEY(inventory_location_id) REFERENCES workspace_v14.inventory_locations(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_goods_receipts_request_once
 ON commerce_goods_receipts(owner,client_request_id)
 WHERE client_request_id IS NOT NULL;

-- Every new stock movement requires a real active location and matching unit.
-- Negative stock is blocked under an item row lock so concurrent issues cannot overdraw.
CREATE OR REPLACE FUNCTION workspace_v14.guard_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
 item workspace_v14.inventory_items%ROWTYPE;
 location_org TEXT;
 current_quantity NUMERIC(20,4);
BEGIN
 SELECT * INTO item FROM workspace_v14.inventory_items
  WHERE id=NEW.inventory_item_id AND organization_id=NEW.organization_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found in this organization.'; END IF;
 IF NEW.location_id IS NULL THEN RAISE EXCEPTION 'A stock movement requires an inventory location.'; END IF;
 SELECT organization_id INTO location_org FROM workspace_v14.inventory_locations
  WHERE id=NEW.location_id AND active=TRUE;
 IF location_org IS NULL OR location_org<>NEW.organization_id THEN
  RAISE EXCEPTION 'Inventory location is inactive or belongs to another organization.';
 END IF;
 IF lower(trim(NEW.unit_of_measure))<>lower(trim(item.unit_of_measure)) THEN
  RAISE EXCEPTION 'Stock movement unit differs from inventory item unit.';
 END IF;
 IF NEW.quantity=0 THEN RAISE EXCEPTION 'Stock movement quantity cannot be zero.'; END IF;
 IF NEW.movement_type IN ('purchase','production_output','transfer_in','return','opening') AND NEW.quantity<0 THEN
  RAISE EXCEPTION 'This stock movement type must increase quantity.';
 END IF;
 IF NEW.movement_type IN ('sale','production_input','transfer_out') AND NEW.quantity>0 THEN
  RAISE EXCEPTION 'This stock movement type must decrease quantity.';
 END IF;
 IF NEW.movement_type='opening' AND EXISTS (
  SELECT 1 FROM workspace_v14.stock_movements
   WHERE organization_id=NEW.organization_id AND inventory_item_id=NEW.inventory_item_id
     AND location_id=NEW.location_id
 ) THEN RAISE EXCEPTION 'An opening quantity can only be recorded once for this item and location.'; END IF;
 IF NEW.quantity<0 THEN
  SELECT COALESCE(SUM(quantity),0) INTO current_quantity
   FROM workspace_v14.stock_movements
   WHERE organization_id=NEW.organization_id AND inventory_item_id=NEW.inventory_item_id
     AND location_id=NEW.location_id;
  IF current_quantity+NEW.quantity<0 THEN
   RAISE EXCEPTION 'Insufficient stock at the selected location.';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_stock_movement_guard ON workspace_v14.stock_movements;
CREATE TRIGGER workspace_v14_stock_movement_guard
 BEFORE INSERT ON workspace_v14.stock_movements
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_stock_movement();

CREATE OR REPLACE FUNCTION workspace_v14.guard_stock_movement_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Stock movement history is append-only; use a correcting movement.';
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_stock_movements_immutable ON workspace_v14.stock_movements;
CREATE TRIGGER workspace_v14_stock_movements_immutable
 BEFORE UPDATE OR DELETE ON workspace_v14.stock_movements
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_stock_movement_immutable();

-- A goods receipt may update quantities and create quantity movements only for mapped stock items.
CREATE OR REPLACE FUNCTION srikandi_apply_goods_receipt() RETURNS trigger AS $$
DECLARE
 line commerce_purchase_order_lines%ROWTYPE;
 po_status TEXT;
 receipt commerce_goods_receipts%ROWTYPE;
 org_id TEXT;
BEGIN
 SELECT status INTO po_status FROM commerce_purchase_orders
  WHERE id=(SELECT purchase_order_id FROM commerce_purchase_order_lines
            WHERE id=NEW.purchase_order_line_id AND owner=NEW.owner)
    AND owner=NEW.owner FOR UPDATE;
 IF po_status NOT IN ('approved','partially_received') THEN
  RAISE EXCEPTION 'Purchase order is not approved for receiving.';
 END IF;
 SELECT * INTO line FROM commerce_purchase_order_lines
  WHERE id=NEW.purchase_order_line_id AND owner=NEW.owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order line not found.'; END IF;
 IF line.received_quantity+NEW.quantity>line.quantity THEN
  RAISE EXCEPTION 'Goods receipt exceeds ordered quantity.';
 END IF;
 SELECT * INTO receipt FROM commerce_goods_receipts
  WHERE id=NEW.receipt_id AND owner=NEW.owner;
 IF NOT FOUND THEN RAISE EXCEPTION 'Goods receipt header not found.'; END IF;
 UPDATE commerce_purchase_order_lines
  SET received_quantity=received_quantity+NEW.quantity
  WHERE id=NEW.purchase_order_line_id AND owner=NEW.owner;
 UPDATE commerce_purchase_orders
  SET status=CASE WHEN NOT EXISTS (
    SELECT 1 FROM commerce_purchase_order_lines l
    WHERE l.purchase_order_id=commerce_purchase_orders.id
      AND l.owner=commerce_purchase_orders.owner AND l.received_quantity<l.quantity
  ) THEN 'received' ELSE 'partially_received' END,
  updated=now()
  WHERE id=line.purchase_order_id AND owner=NEW.owner;
 IF line.inventory_item_id IS NOT NULL THEN
  IF receipt.inventory_location_id IS NULL THEN
   RAISE EXCEPTION 'Select a stock location before receiving stock-tracked purchase order lines.';
  END IF;
  SELECT id INTO org_id FROM workspace_v14.organizations WHERE source_owner_user_id=NEW.owner;
  IF org_id IS NULL THEN RAISE EXCEPTION 'Organization workspace has not been initialized.'; END IF;
  INSERT INTO workspace_v14.stock_movements(
   id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,
   reference_type,reference_id,occurred_at,actor_user_id,note,location_id
  ) VALUES(
   gen_random_uuid()::text,org_id,line.inventory_item_id,'purchase',NEW.quantity,line.unit,
   'goods_receipt_line',NEW.id,receipt.received_date::timestamptz,receipt.received_by,
   'Penerimaan dari '+receipt.receipt_number,receipt.inventory_location_id
  );
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate that a selected stock location always belongs to the same organization as the receipt owner.
CREATE OR REPLACE FUNCTION srikandi_guard_goods_receipt_location()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE org_id TEXT; location_org TEXT; needs_location BOOLEAN;
BEGIN
 SELECT id INTO org_id FROM workspace_v14.organizations WHERE source_owner_user_id=NEW.owner;
 SELECT EXISTS (
  SELECT 1 FROM commerce_purchase_order_lines l
  WHERE l.purchase_order_id=NEW.purchase_order_id AND l.owner=NEW.owner
    AND l.inventory_item_id IS NOT NULL
 ) INTO needs_location;
 IF needs_location AND NEW.inventory_location_id IS NULL THEN
  RAISE EXCEPTION 'A stock location is required for stock-tracked goods receipts.';
 END IF;
 IF NEW.inventory_location_id IS NOT NULL THEN
  SELECT organization_id INTO location_org FROM workspace_v14.inventory_locations WHERE id=NEW.inventory_location_id AND active=TRUE;
  IF org_id IS NULL OR location_org IS NULL OR location_org<>org_id THEN
   RAISE EXCEPTION 'Goods receipt location belongs to another organization or is inactive.';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS srikandi_goods_receipt_location_guard ON commerce_goods_receipts;
CREATE TRIGGER srikandi_goods_receipt_location_guard
 BEFORE INSERT ON commerce_goods_receipts
 FOR EACH ROW EXECUTE FUNCTION srikandi_guard_goods_receipt_location();

CREATE OR REPLACE FUNCTION srikandi_guard_goods_receipt_idempotency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.client_request_id IS NULL OR length(NEW.client_request_id)<20 THEN
  RAISE EXCEPTION 'Goods receipt idempotency key is required.';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS srikandi_goods_receipt_idempotency_guard ON commerce_goods_receipts;
CREATE TRIGGER srikandi_goods_receipt_idempotency_guard
 BEFORE INSERT ON commerce_goods_receipts
 FOR EACH ROW EXECUTE FUNCTION srikandi_guard_goods_receipt_idempotency();

-- Keep purchase order item mappings inside the PO owner's organization and unit system.
CREATE OR REPLACE FUNCTION srikandi_guard_purchase_order_inventory_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE org_id TEXT; item workspace_v14.inventory_items%ROWTYPE;
BEGIN
 IF NEW.inventory_item_id IS NULL THEN RETURN NEW; END IF;
 SELECT id INTO org_id FROM workspace_v14.organizations WHERE source_owner_user_id=NEW.owner;
 IF org_id IS NULL THEN RAISE EXCEPTION 'Organization workspace has not been initialized.'; END IF;
 SELECT * INTO item FROM workspace_v14.inventory_items
  WHERE id=NEW.inventory_item_id AND organization_id=org_id;
 IF NOT FOUND OR item.item_type='equipment' THEN
  RAISE EXCEPTION 'Selected stock item is not available to this organization.';
 END IF;
 IF lower(trim(item.unit_of_measure))<>lower(trim(NEW.unit)) THEN
  RAISE EXCEPTION 'Purchase order unit differs from the selected inventory item unit.';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS srikandi_purchase_order_inventory_item_guard ON commerce_purchase_order_lines;
CREATE TRIGGER srikandi_purchase_order_inventory_item_guard
 BEFORE INSERT OR UPDATE OF inventory_item_id,unit,owner ON commerce_purchase_order_lines
 FOR EACH ROW EXECUTE FUNCTION srikandi_guard_purchase_order_inventory_item();
