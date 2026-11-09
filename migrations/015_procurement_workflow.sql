-- v14 procurement workflow: requisition -> approval -> purchase order -> goods receipt.
CREATE TABLE IF NOT EXISTS commerce_purchase_requests (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_number TEXT NOT NULL, requested_date DATE NOT NULL, purpose TEXT NOT NULL CHECK(length(purpose) BETWEEN 1 AND 500),
 status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected','ordered')),
 requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reviewer_id TEXT REFERENCES users(id) ON DELETE RESTRICT, reviewed_at TIMESTAMPTZ, review_note TEXT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), UNIQUE(owner,request_number)
);
CREATE TABLE IF NOT EXISTS commerce_purchase_request_lines (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, request_id TEXT NOT NULL,
 item_name TEXT NOT NULL CHECK(length(item_name) BETWEEN 1 AND 160),
 description TEXT, unit TEXT NOT NULL CHECK(length(unit) BETWEEN 1 AND 24),
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0 AND quantity<=1000000000),
 estimated_unit_cost BIGINT NOT NULL CHECK(estimated_unit_cost>=0 AND estimated_unit_cost<=1000000000000),
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), FOREIGN KEY(request_id,owner) REFERENCES commerce_purchase_requests(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS commerce_purchase_requests_owner_status ON commerce_purchase_requests(owner,status,requested_date DESC);
CREATE TABLE IF NOT EXISTS commerce_purchase_orders (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 order_number TEXT NOT NULL, request_id TEXT NOT NULL, supplier_id TEXT NOT NULL,
 order_date DATE NOT NULL, expected_date DATE, status TEXT NOT NULL DEFAULT 'pending_approval'
 CHECK(status IN ('pending_approval','approved','partially_received','received','cancelled')),
 total_estimate BIGINT NOT NULL CHECK(total_estimate>=0 AND total_estimate<=1000000000000),
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 approved_by TEXT REFERENCES users(id) ON DELETE RESTRICT, approved_at TIMESTAMPTZ, approval_note TEXT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(), updated TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), UNIQUE(owner,order_number), UNIQUE(owner,request_id),
 FOREIGN KEY(request_id,owner) REFERENCES commerce_purchase_requests(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(supplier_id,owner) REFERENCES commerce_suppliers(id,owner) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS commerce_purchase_order_lines (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, purchase_order_id TEXT NOT NULL, request_line_id TEXT NOT NULL,
 item_name TEXT NOT NULL, description TEXT, unit TEXT NOT NULL,
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0), unit_cost BIGINT NOT NULL CHECK(unit_cost>=0),
 received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(received_quantity>=0 AND received_quantity<=quantity),
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), FOREIGN KEY(purchase_order_id,owner) REFERENCES commerce_purchase_orders(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(request_line_id,owner) REFERENCES commerce_purchase_request_lines(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS commerce_purchase_orders_owner_status ON commerce_purchase_orders(owner,status,order_date DESC);
CREATE TABLE IF NOT EXISTS commerce_goods_receipts (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 receipt_number TEXT NOT NULL, purchase_order_id TEXT NOT NULL, received_date DATE NOT NULL,
 delivery_reference TEXT, notes TEXT, received_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), UNIQUE(owner,receipt_number),
 FOREIGN KEY(purchase_order_id,owner) REFERENCES commerce_purchase_orders(id,owner) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS commerce_goods_receipt_lines (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, receipt_id TEXT NOT NULL, purchase_order_line_id TEXT NOT NULL,
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0), condition_note TEXT,
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,owner), FOREIGN KEY(receipt_id,owner) REFERENCES commerce_goods_receipts(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(purchase_order_line_id,owner) REFERENCES commerce_purchase_order_lines(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS commerce_goods_receipts_order ON commerce_goods_receipts(owner,purchase_order_id,received_date);
CREATE OR REPLACE FUNCTION srikandi_apply_goods_receipt() RETURNS trigger AS $$
DECLARE line commerce_purchase_order_lines%ROWTYPE;
BEGIN
 SELECT * INTO line FROM commerce_purchase_order_lines
 WHERE id=NEW.purchase_order_line_id AND owner=NEW.owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order line not found.'; END IF;
 IF line.received_quantity + NEW.quantity > line.quantity THEN RAISE EXCEPTION 'Goods receipt exceeds ordered quantity.'; END IF;
 UPDATE commerce_purchase_order_lines SET received_quantity=received_quantity+NEW.quantity
 WHERE id=NEW.purchase_order_line_id AND owner=NEW.owner;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_goods_receipt_apply ON commerce_goods_receipt_lines;
CREATE TRIGGER srikandi_goods_receipt_apply BEFORE INSERT ON commerce_goods_receipt_lines
 FOR EACH ROW EXECUTE FUNCTION srikandi_apply_goods_receipt();
