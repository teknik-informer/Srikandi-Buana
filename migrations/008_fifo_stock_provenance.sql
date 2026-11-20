-- v14 additive FIFO stock provenance and order allocation.
-- Existing aggregate stock is preserved as an opening-balance lot; historical source cannot be reconstructed retroactively.
CREATE TABLE IF NOT EXISTS commerce_inventory_lots (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 product_id TEXT NOT NULL,
 source_type TEXT NOT NULL CHECK(source_type IN ('opening_balance','harvest','receipt','adjustment')),
 source_ref TEXT,
 receipt_record_id TEXT,
 initial_quantity INTEGER NOT NULL CHECK(initial_quantity > 0 AND initial_quantity <= 1000000),
 remaining_quantity INTEGER NOT NULL CHECK(remaining_quantity >= 0 AND remaining_quantity <= initial_quantity),
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(product_id,owner) REFERENCES commerce_products(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(receipt_record_id) REFERENCES records(id) ON DELETE RESTRICT,
 UNIQUE(owner,receipt_record_id)
);
CREATE INDEX IF NOT EXISTS commerce_inventory_lots_fifo
 ON commerce_inventory_lots(owner,product_id,received_at,id) WHERE remaining_quantity>0;

CREATE TABLE IF NOT EXISTS commerce_order_lot_allocations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 order_id TEXT NOT NULL,
 lot_id UUID NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0),
 created TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(order_id,owner) REFERENCES commerce_orders(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(lot_id) REFERENCES commerce_inventory_lots(id) ON DELETE RESTRICT,
 UNIQUE(order_id,lot_id)
);
CREATE INDEX IF NOT EXISTS commerce_order_lot_allocations_order
 ON commerce_order_lot_allocations(owner,order_id);
CREATE INDEX IF NOT EXISTS commerce_order_lot_allocations_lot
 ON commerce_order_lot_allocations(lot_id,created);

-- Snapshot the current stock once. This is deliberately labelled opening balance.
INSERT INTO commerce_inventory_lots(owner,product_id,source_type,initial_quantity,remaining_quantity,received_at,created)
SELECT p.owner,p.id,'opening_balance',p.stock,p.stock,p.created::timestamptz,p.created::timestamptz
FROM commerce_products p
WHERE p.stock>0
  AND NOT EXISTS (SELECT 1 FROM commerce_inventory_lots l WHERE l.owner=p.owner AND l.product_id=p.id);

-- Harvest receipts create source-linked inventory lots inside the same transaction as receipt posting.
CREATE OR REPLACE FUNCTION srikandi_create_harvest_inventory_lot() RETURNS trigger AS $$
DECLARE
 v_data JSONB;
 v_product_id TEXT;
 v_quantity INTEGER;
 v_now TIMESTAMPTZ;
BEGIN
 SELECT data::jsonb INTO v_data FROM records WHERE id=NEW.receipt_record_id AND owner=NEW.owner AND kind='lotkopi';
 v_quantity := NEW.quantity::INTEGER;
 SELECT id INTO v_product_id FROM commerce_products
  WHERE owner=NEW.owner AND sku=upper(trim(v_data->>'productSku'))
    AND unit=NEW.unit_code
  FOR UPDATE;
 IF NOT FOUND OR v_quantity<=0 THEN
  RAISE EXCEPTION 'Produk atau satuan untuk lot hasil panen tidak ditemukan.';
 END IF;
 v_now := COALESCE(NEW.created_at::timestamptz,now());
 INSERT INTO commerce_inventory_lots(owner,product_id,source_type,source_ref,receipt_record_id,initial_quantity,remaining_quantity,received_at,created)
 VALUES(NEW.owner,v_product_id,'harvest',NEW.harvest_id,NEW.receipt_record_id,v_quantity,v_quantity,v_now,v_now);
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_harvest_receipt_inventory_lot ON harvest_receipt_links;
CREATE TRIGGER srikandi_harvest_receipt_inventory_lot
 AFTER INSERT ON harvest_receipt_links
 FOR EACH ROW EXECUTE FUNCTION srikandi_create_harvest_inventory_lot();

CREATE OR REPLACE FUNCTION srikandi_create_order_with_fifo(
 p_order_id TEXT,p_owner TEXT,p_buyer_id TEXT,p_actor_id TEXT,p_product_id TEXT,
 p_quantity INTEGER,p_client_request_id TEXT,p_now TEXT
) RETURNS TABLE(order_id TEXT,total BIGINT,reused BOOLEAN) AS $$
DECLARE
 v_product RECORD;
 v_existing RECORD;
 v_lot RECORD;
 v_remaining INTEGER;
 v_take INTEGER;
 v_allocated INTEGER := 0;
 v_total BIGINT;
BEGIN
 SELECT id,status,total INTO v_existing FROM commerce_orders
  WHERE owner=p_owner AND buyer_id=p_buyer_id AND client_request_id=p_client_request_id;
 IF FOUND THEN
  RETURN QUERY SELECT v_existing.id,v_existing.total,TRUE;
  RETURN;
 END IF;

 SELECT id,name,price,stock,published INTO v_product
  FROM commerce_products WHERE id=p_product_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND OR NOT v_product.published OR v_product.stock<p_quantity
    OR v_product.price::numeric*p_quantity>1000000000000 THEN
  RAISE EXCEPTION 'Produk tidak tersedia atau stok tidak mencukupi.';
 END IF;
 IF (SELECT COALESCE(SUM(remaining_quantity),0) FROM commerce_inventory_lots
      WHERE owner=p_owner AND product_id=p_product_id) <> v_product.stock THEN
  RAISE EXCEPTION 'Saldo persediaan dan rincian lot tidak cocok. Lakukan rekonsiliasi stok sebelum menerima pesanan.';
 END IF;

 v_total := v_product.price*p_quantity;
 INSERT INTO commerce_orders(id,owner,buyer_id,product_id,product_name,quantity,unit_price,total,status,client_request_id,created,updated)
 VALUES(p_order_id,p_owner,p_buyer_id,p_product_id,v_product.name,p_quantity,v_product.price,v_total,'submitted',p_client_request_id,p_now,p_now);

 v_remaining := p_quantity;
 FOR v_lot IN
  SELECT id,remaining_quantity FROM commerce_inventory_lots
  WHERE owner=p_owner AND product_id=p_product_id AND remaining_quantity>0
  ORDER BY received_at,id FOR UPDATE
 LOOP
  EXIT WHEN v_remaining=0;
  v_take := LEAST(v_remaining,v_lot.remaining_quantity);
  UPDATE commerce_inventory_lots SET remaining_quantity=remaining_quantity-v_take
   WHERE id=v_lot.id AND owner=p_owner AND remaining_quantity>=v_take;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lot persediaan berubah saat alokasi. Ulangi pesanan.'; END IF;
  INSERT INTO commerce_order_lot_allocations(owner,order_id,lot_id,quantity)
  VALUES(p_owner,p_order_id,v_lot.id,v_take);
  v_remaining := v_remaining-v_take;
  v_allocated := v_allocated+v_take;
 END LOOP;
 IF v_remaining<>0 OR v_allocated<>p_quantity THEN
  RAISE EXCEPTION 'Lot persediaan tidak mencukupi untuk alokasi FIFO.';
 END IF;
 UPDATE commerce_products SET stock=stock-p_quantity,updated=p_now
  WHERE id=p_product_id AND owner=p_owner AND stock>=p_quantity;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stok produk berubah saat pesanan diproses.'; END IF;
 INSERT INTO commerce_order_events(owner,order_id,actor_id,from_status,to_status)
 VALUES(p_owner,p_order_id,p_actor_id,NULL,'submitted');
 RETURN QUERY SELECT p_order_id,v_total,FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION srikandi_cancel_order_restore_fifo(
 p_order_id TEXT,p_owner TEXT,p_actor_id TEXT,p_now TEXT
) RETURNS TABLE(order_id TEXT,buyer_id TEXT) AS $$
DECLARE
 v_order RECORD;
 v_allocation RECORD;
BEGIN
 SELECT id,buyer_id,product_id,quantity,status INTO v_order
  FROM commerce_orders WHERE id=p_order_id AND owner=p_owner
  FOR UPDATE;
 IF NOT FOUND OR v_order.status NOT IN ('submitted','confirmed') THEN
  RETURN;
 END IF;
 PERFORM 1 FROM commerce_products WHERE id=v_order.product_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Produk pesanan tidak ditemukan saat pembatalan.'; END IF;
 FOR v_allocation IN
  SELECT a.lot_id,a.quantity FROM commerce_order_lot_allocations a
  WHERE a.owner=p_owner AND a.order_id=p_order_id FOR UPDATE
 LOOP
  UPDATE commerce_inventory_lots SET remaining_quantity=remaining_quantity+v_allocation.quantity
   WHERE id=v_allocation.lot_id AND owner=p_owner
     AND remaining_quantity+v_allocation.quantity<=initial_quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lot sumber tidak dapat dipulihkan. Periksa alokasi pesanan.'; END IF;
 END LOOP;
 UPDATE commerce_products SET stock=stock+v_order.quantity,updated=p_now
  WHERE id=v_order.product_id AND owner=p_owner AND stock+v_order.quantity<=1000000;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stok produk melewati batas saat pengembalian.'; END IF;
 UPDATE commerce_orders SET status='cancelled',updated=p_now
  WHERE id=p_order_id AND owner=p_owner AND status IN ('submitted','confirmed');
 IF NOT FOUND THEN RAISE EXCEPTION 'Status pesanan berubah saat pembatalan.'; END IF;
 INSERT INTO commerce_order_events(owner,order_id,actor_id,from_status,to_status)
 VALUES(p_owner,p_order_id,p_actor_id,v_order.status,'cancelled');
 RETURN QUERY SELECT p_order_id,v_order.buyer_id;
END;
$$ LANGUAGE plpgsql;
