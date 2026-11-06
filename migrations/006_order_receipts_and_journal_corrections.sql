-- v11.5 additive: preserve posted journals; track compensating reversals rather than deleting lines.
CREATE TABLE IF NOT EXISTS ledger_reversals (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 original_entry_id TEXT NOT NULL UNIQUE REFERENCES ledger_entries(id) ON DELETE RESTRICT,
 reversal_entry_id TEXT NOT NULL UNIQUE REFERENCES ledger_entries(id) ON DELETE RESTRICT,
 actor_id TEXT NOT NULL REFERENCES users(id),
 created TEXT NOT NULL,
 CHECK (original_entry_id<>reversal_entry_id)
);
CREATE INDEX IF NOT EXISTS ledger_reversals_owner ON ledger_reversals(owner,created DESC);
-- Keep a server-side audit trail for every stock adjustment, reservation and restoration.
CREATE TABLE IF NOT EXISTS commerce_stock_history (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner TEXT NOT NULL REFERENCES users(id),
 product_id TEXT NOT NULL REFERENCES commerce_products(id),
 change_amount INTEGER NOT NULL CHECK(change_amount<>0),
 stock_before INTEGER NOT NULL CHECK(stock_before>=0),
 stock_after INTEGER NOT NULL CHECK(stock_after>=0),
 created TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_stock_history_owner ON commerce_stock_history(owner,product_id,created DESC);
CREATE OR REPLACE FUNCTION srikandi_capture_stock_change() RETURNS trigger AS $$
BEGIN
 IF NEW.stock IS DISTINCT FROM OLD.stock THEN
  INSERT INTO commerce_stock_history(owner,product_id,change_amount,stock_before,stock_after)
  VALUES(NEW.owner,NEW.id,NEW.stock-OLD.stock,OLD.stock,NEW.stock);
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_stock_audit ON commerce_products;
CREATE TRIGGER srikandi_stock_audit AFTER UPDATE OF stock ON commerce_products
 FOR EACH ROW EXECUTE FUNCTION srikandi_capture_stock_change();
