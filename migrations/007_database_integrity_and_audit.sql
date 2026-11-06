-- v12.1 database-enforced ledger integrity and append-only operational audit.
-- Additive only. Apply through scripts/migrate.mjs after a sanitized QA database is available.

CREATE TABLE IF NOT EXISTS commerce_order_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner TEXT NOT NULL REFERENCES users(id),
 order_id TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES users(id),
 from_status TEXT CHECK(from_status IS NULL OR from_status IN ('submitted','confirmed','cancelled','completed')),
 to_status TEXT NOT NULL CHECK(to_status IN ('submitted','confirmed','cancelled','completed')),
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(order_id,owner) REFERENCES commerce_orders(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS commerce_order_events_owner_order
 ON commerce_order_events(owner,order_id,created DESC);

CREATE TABLE IF NOT EXISTS commerce_product_audit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner TEXT NOT NULL REFERENCES users(id),
 product_id TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL CHECK(action IN ('created','updated')),
 before_state TEXT,
 after_state TEXT NOT NULL,
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(product_id,owner) REFERENCES commerce_products(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS commerce_product_audit_owner_product
 ON commerce_product_audit(owner,product_id,created DESC);

CREATE OR REPLACE FUNCTION srikandi_reject_audit_mutation() RETURNS trigger AS $$
BEGIN
 RAISE EXCEPTION 'Audit and posted financial records are append-only; create a correcting event or reversal instead.'
  USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_ledger_entries_immutable ON ledger_entries;
CREATE TRIGGER srikandi_ledger_entries_immutable
 BEFORE UPDATE OR DELETE ON ledger_entries
 FOR EACH ROW EXECUTE FUNCTION srikandi_reject_audit_mutation();

DROP TRIGGER IF EXISTS srikandi_ledger_lines_immutable ON ledger_lines;
CREATE TRIGGER srikandi_ledger_lines_immutable
 BEFORE UPDATE OR DELETE ON ledger_lines
 FOR EACH ROW EXECUTE FUNCTION srikandi_reject_audit_mutation();

DROP TRIGGER IF EXISTS srikandi_ledger_reversals_immutable ON ledger_reversals;
CREATE TRIGGER srikandi_ledger_reversals_immutable
 BEFORE UPDATE OR DELETE ON ledger_reversals
 FOR EACH ROW EXECUTE FUNCTION srikandi_reject_audit_mutation();

DROP TRIGGER IF EXISTS srikandi_stock_history_immutable ON commerce_stock_history;
CREATE TRIGGER srikandi_stock_history_immutable
 BEFORE UPDATE OR DELETE ON commerce_stock_history
 FOR EACH ROW EXECUTE FUNCTION srikandi_reject_audit_mutation();

DROP TRIGGER IF EXISTS srikandi_order_events_immutable ON commerce_order_events;
CREATE TRIGGER srikandi_order_events_immutable
 BEFORE UPDATE OR DELETE ON commerce_order_events
 FOR EACH ROW EXECUTE FUNCTION srikandi_reject_audit_mutation();

DROP TRIGGER IF EXISTS srikandi_product_audit_immutable ON commerce_product_audit;
CREATE TRIGGER srikandi_product_audit_immutable
 BEFORE UPDATE OR DELETE ON commerce_product_audit
 FOR EACH ROW EXECUTE FUNCTION srikandi_reject_audit_mutation();

CREATE OR REPLACE FUNCTION srikandi_assert_ledger_balanced() RETURNS trigger AS $$
DECLARE
 target_entry_id TEXT;
 line_count BIGINT;
 debit_total NUMERIC;
 credit_total NUMERIC;
BEGIN
 IF TG_TABLE_NAME = 'ledger_entries' THEN
  target_entry_id := NEW.id;
 ELSE
  target_entry_id := NEW.entry_id;
 END IF;

 SELECT COUNT(*), COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
 INTO line_count, debit_total, credit_total
 FROM ledger_lines
 WHERE entry_id = target_entry_id;

 IF line_count < 2 OR debit_total <= 0 OR debit_total <> credit_total THEN
  RAISE EXCEPTION 'Journal % must contain at least two lines and balanced debit/credit totals.', target_entry_id
   USING ERRCODE = '23514';
 END IF;
 RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_ledger_entry_balance ON ledger_entries;
CREATE CONSTRAINT TRIGGER srikandi_ledger_entry_balance
 AFTER INSERT ON ledger_entries
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION srikandi_assert_ledger_balanced();

DROP TRIGGER IF EXISTS srikandi_ledger_lines_balance ON ledger_lines;
CREATE CONSTRAINT TRIGGER srikandi_ledger_lines_balance
 AFTER INSERT ON ledger_lines
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION srikandi_assert_ledger_balanced();
