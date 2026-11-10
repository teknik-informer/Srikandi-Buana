-- v14 three-way match: supplier bill lines must reconcile with an approved PO and received goods.
ALTER TABLE commerce_purchase_bills
  ADD COLUMN IF NOT EXISTS purchase_order_id TEXT,
  ADD COLUMN IF NOT EXISTS match_status TEXT NOT NULL DEFAULT 'legacy_unmatched'
    CHECK(match_status IN ('legacy_unmatched','matched')),
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;
ALTER TABLE commerce_purchase_bills
  ADD CONSTRAINT commerce_purchase_bills_po_owner_fk
  FOREIGN KEY(purchase_order_id,owner) REFERENCES commerce_purchase_orders(id,owner) ON DELETE RESTRICT;

ALTER TABLE commerce_purchase_order_lines
  ADD COLUMN IF NOT EXISTS invoiced_quantity NUMERIC(14,3) NOT NULL DEFAULT 0
    CHECK(invoiced_quantity>=0 AND invoiced_quantity<=quantity);
ALTER TABLE commerce_goods_receipt_lines
  ADD COLUMN IF NOT EXISTS invoiced_quantity NUMERIC(14,3) NOT NULL DEFAULT 0
    CHECK(invoiced_quantity>=0 AND invoiced_quantity<=quantity);

CREATE INDEX IF NOT EXISTS commerce_purchase_bills_po
  ON commerce_purchase_bills(owner,purchase_order_id,issue_date DESC);
CREATE TABLE IF NOT EXISTS commerce_purchase_bill_lines (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  purchase_order_line_id TEXT NOT NULL,
  goods_receipt_line_id TEXT NOT NULL,
  item_name TEXT NOT NULL CHECK(length(item_name) BETWEEN 1 AND 160),
  quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0 AND quantity<=1000000000),
  unit_cost BIGINT NOT NULL CHECK(unit_cost>=0 AND unit_cost<=1000000000000),
  line_total BIGINT NOT NULL CHECK(line_total BETWEEN 0 AND 1000000000000),
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id,owner),
  UNIQUE(owner,bill_id,goods_receipt_line_id),
  FOREIGN KEY(bill_id,owner) REFERENCES commerce_purchase_bills(id,owner) ON DELETE RESTRICT,
  FOREIGN KEY(purchase_order_line_id,owner) REFERENCES commerce_purchase_order_lines(id,owner) ON DELETE RESTRICT,
  FOREIGN KEY(goods_receipt_line_id,owner) REFERENCES commerce_goods_receipt_lines(id,owner) ON DELETE RESTRICT,
  CHECK(line_total=ROUND(quantity*unit_cost)::BIGINT)
);
CREATE INDEX IF NOT EXISTS commerce_purchase_bill_lines_bill
  ON commerce_purchase_bill_lines(owner,bill_id);
CREATE INDEX IF NOT EXISTS commerce_purchase_bill_lines_po_line
  ON commerce_purchase_bill_lines(owner,purchase_order_line_id);

-- A bill line is only valid when it agrees with the supplier, PO line, receipt line,
-- received quantity and ordered unit price. Locks serialize against concurrent invoices.
CREATE OR REPLACE FUNCTION srikandi_validate_three_way_bill_line() RETURNS trigger AS $$
DECLARE
  bill commerce_purchase_bills%ROWTYPE;
  po_line commerce_purchase_order_lines%ROWTYPE;
  receipt_line commerce_goods_receipt_lines%ROWTYPE;
  receipt commerce_goods_receipts%ROWTYPE;
  po commerce_purchase_orders%ROWTYPE;
  expected_total BIGINT;
BEGIN
  SELECT * INTO bill FROM commerce_purchase_bills
    WHERE id=NEW.bill_id AND owner=NEW.owner FOR UPDATE;
  IF NOT FOUND OR bill.match_status<>'matched' OR bill.purchase_order_id IS NULL THEN
    RAISE EXCEPTION 'Supplier bill has no approved three-way match.';
  END IF;
  SELECT * INTO po FROM commerce_purchase_orders
    WHERE id=bill.purchase_order_id AND owner=NEW.owner;
  IF NOT FOUND OR po.supplier_id<>bill.supplier_id OR po.status NOT IN ('partially_received','received') THEN
    RAISE EXCEPTION 'Supplier bill and purchase order do not match.';
  END IF;
  SELECT * INTO po_line FROM commerce_purchase_order_lines
    WHERE id=NEW.purchase_order_line_id AND owner=NEW.owner FOR UPDATE;
  IF NOT FOUND OR po_line.purchase_order_id<>po.id THEN
    RAISE EXCEPTION 'Invoice line is not part of the selected purchase order.';
  END IF;
  SELECT * INTO receipt_line FROM commerce_goods_receipt_lines
    WHERE id=NEW.goods_receipt_line_id AND owner=NEW.owner FOR UPDATE;
  IF NOT FOUND OR receipt_line.purchase_order_line_id<>po_line.id THEN
    RAISE EXCEPTION 'Goods receipt line does not match purchase order line.';
  END IF;
  SELECT * INTO receipt FROM commerce_goods_receipts
    WHERE id=receipt_line.receipt_id AND owner=NEW.owner;
  IF NOT FOUND OR receipt.purchase_order_id<>po.id OR receipt.received_date>bill.issue_date THEN
    RAISE EXCEPTION 'Goods receipt does not belong to this purchase order or postdates the supplier invoice.';
  END IF;
  IF NEW.unit_cost<>po_line.unit_cost THEN
    RAISE EXCEPTION 'Supplier invoice unit cost differs from approved purchase order.';
  END IF;
  expected_total := ROUND(NEW.quantity*NEW.unit_cost)::BIGINT;
  IF NEW.line_total<>expected_total THEN
    RAISE EXCEPTION 'Supplier invoice line total is inconsistent.';
  END IF;
  IF receipt_line.invoiced_quantity+NEW.quantity>receipt_line.quantity OR
     po_line.invoiced_quantity+NEW.quantity>po_line.quantity THEN
    RAISE EXCEPTION 'Supplier invoice quantity exceeds received or ordered quantity.';
  END IF;
  UPDATE commerce_goods_receipt_lines
    SET invoiced_quantity=invoiced_quantity+NEW.quantity
    WHERE id=receipt_line.id AND owner=NEW.owner;
  UPDATE commerce_purchase_order_lines
    SET invoiced_quantity=invoiced_quantity+NEW.quantity
    WHERE id=po_line.id AND owner=NEW.owner;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_three_way_bill_line_validate ON commerce_purchase_bill_lines;
CREATE TRIGGER srikandi_three_way_bill_line_validate
  BEFORE INSERT ON commerce_purchase_bill_lines
  FOR EACH ROW EXECUTE FUNCTION srikandi_validate_three_way_bill_line();

-- Posted match evidence is immutable. Quantity counters may only move through a bill-line insert.
CREATE OR REPLACE FUNCTION srikandi_guard_three_way_match_records() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Three-way match evidence is append-only.';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_three_way_bill_line_guard ON commerce_purchase_bill_lines;
CREATE TRIGGER srikandi_three_way_bill_line_guard
  BEFORE UPDATE OR DELETE ON commerce_purchase_bill_lines
  FOR EACH ROW EXECUTE FUNCTION srikandi_guard_three_way_match_records();

-- Derived invoice counters are the only permitted mutations to received order/receipt lines.
CREATE OR REPLACE FUNCTION srikandi_guard_procurement_changes() RETURNS trigger AS $$
DECLARE po_status TEXT;
BEGIN
 IF TG_TABLE_NAME='commerce_purchase_order_lines' THEN
  SELECT status INTO po_status FROM commerce_purchase_orders
   WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.purchase_order_id ELSE NEW.purchase_order_id END
     AND owner=CASE WHEN TG_OP='DELETE' THEN OLD.owner ELSE NEW.owner END;
  IF po_status<>'pending_approval' THEN
   IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'received_quantity'-'invoiced_quantity')=(to_jsonb(OLD)-'received_quantity'-'invoiced_quantity') THEN RETURN NEW; END IF;
   RAISE EXCEPTION 'Approved purchase order lines are immutable.';
  END IF;
 ELSIF TG_TABLE_NAME='commerce_goods_receipt_lines' THEN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'invoiced_quantity')=(to_jsonb(OLD)-'invoiced_quantity') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Goods receipt line evidence is append-only.';
 ELSIF TG_TABLE_NAME='commerce_goods_receipts' THEN
  RAISE EXCEPTION 'Goods receipt headers are append-only.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION srikandi_verify_three_way_bill_total() RETURNS trigger AS $$
DECLARE bill commerce_purchase_bills%ROWTYPE; line_count BIGINT; matched_total BIGINT;
BEGIN
 SELECT * INTO bill FROM commerce_purchase_bills WHERE id=NEW.bill_id AND owner=NEW.owner;
 IF NOT FOUND THEN RAISE EXCEPTION 'Supplier bill header not found.'; END IF;
 SELECT COUNT(*),COALESCE(SUM(line_total),0) INTO line_count,matched_total
  FROM commerce_purchase_bill_lines WHERE bill_id=bill.id AND owner=bill.owner;
 IF line_count<1 OR matched_total<>bill.total_amount THEN
  RAISE EXCEPTION 'Supplier invoice lines must fully equal the supplier bill total.';
 END IF;
 RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_three_way_bill_total_check ON commerce_purchase_bill_lines;
CREATE CONSTRAINT TRIGGER srikandi_three_way_bill_total_check
 AFTER INSERT ON commerce_purchase_bill_lines DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION srikandi_verify_three_way_bill_total();
CREATE OR REPLACE FUNCTION srikandi_verify_matched_bill_has_lines() RETURNS trigger AS $$
DECLARE line_count BIGINT; matched_total BIGINT;
BEGIN
 IF NEW.match_status='matched' THEN
  SELECT COUNT(*),COALESCE(SUM(line_total),0) INTO line_count,matched_total
   FROM commerce_purchase_bill_lines WHERE bill_id=NEW.id AND owner=NEW.owner;
  IF line_count<1 OR matched_total<>NEW.total_amount THEN
   RAISE EXCEPTION 'Matched supplier bill requires invoice lines that equal the header total.';
  END IF;
 END IF;
 RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_matched_bill_has_lines ON commerce_purchase_bills;
CREATE CONSTRAINT TRIGGER srikandi_matched_bill_has_lines
 AFTER INSERT ON commerce_purchase_bills DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION srikandi_verify_matched_bill_has_lines();

-- Keep supplier bill source/match facts immutable while payment projection fields may advance.
CREATE OR REPLACE FUNCTION srikandi_guard_supplier_bill_header() RETURNS trigger AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Posted supplier bills cannot be deleted.'; END IF;
 IF (to_jsonb(NEW)-'paid_total'-'status'-'updated')<>(to_jsonb(OLD)-'paid_total'-'status'-'updated') THEN
  RAISE EXCEPTION 'Posted supplier bill source and match data are immutable.';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_supplier_bill_header_guard ON commerce_purchase_bills;
CREATE TRIGGER srikandi_supplier_bill_header_guard
 BEFORE UPDATE OR DELETE ON commerce_purchase_bills
 FOR EACH ROW EXECUTE FUNCTION srikandi_guard_supplier_bill_header();
