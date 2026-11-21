-- v15 additive: record verified order payments and balanced cash-basis sales journals.
CREATE TABLE IF NOT EXISTS commerce_order_payments (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 order_id TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 amount BIGINT NOT NULL CHECK(amount>0 AND amount<=1000000000000),
 method TEXT NOT NULL CHECK(method IN ('tunai','transfer','qris')),
 cash_account_id TEXT NOT NULL,
 revenue_account_id TEXT NOT NULL,
 payment_reference TEXT NOT NULL DEFAULT '',
 client_request_id TEXT NOT NULL,
 received_date TEXT NOT NULL CHECK(length(received_date)=10),
 ledger_entry_id TEXT NOT NULL,
 created TEXT NOT NULL,
 FOREIGN KEY(order_id,owner) REFERENCES commerce_orders(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(cash_account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(revenue_account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_entry_id,owner) REFERENCES ledger_entries(id,owner) ON DELETE RESTRICT,
 UNIQUE(owner,client_request_id),
 UNIQUE(ledger_entry_id,owner),
 UNIQUE(id,owner)
);
CREATE INDEX IF NOT EXISTS commerce_order_payments_order
 ON commerce_order_payments(owner,order_id,received_date,created);

CREATE OR REPLACE FUNCTION srikandi_post_order_payment(
 p_payment_id TEXT,p_owner TEXT,p_actor TEXT,p_order_id TEXT,p_amount BIGINT,
 p_method TEXT,p_cash_account_id TEXT,p_revenue_account_id TEXT,
 p_client_request_id TEXT,p_received_date TEXT,p_reference TEXT,p_now TEXT
) RETURNS TABLE(payment_id TEXT,order_id TEXT,paid_total BIGINT,order_total BIGINT,payment_status TEXT,reused BOOLEAN) AS $$
DECLARE
 v_order RECORD;
 v_existing RECORD;
 v_cash RECORD;
 v_revenue RECORD;
 v_actor RECORD;
 v_paid BIGINT := 0;
 v_entry_id TEXT;
 v_ledger_reference TEXT;
BEGIN
 SELECT id,status,total,buyer_id INTO v_order
 FROM commerce_orders WHERE id=p_order_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan pada organisasi ini.'; END IF;

 SELECT id,order_id,amount INTO v_existing FROM commerce_order_payments
 WHERE owner=p_owner AND client_request_id=p_client_request_id;
 IF FOUND THEN
  IF v_existing.order_id<>p_order_id OR v_existing.amount<>p_amount THEN
   RAISE EXCEPTION 'Kunci idempotensi pembayaran telah digunakan untuk transaksi lain.';
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM commerce_order_payments
   WHERE owner=p_owner AND order_id=v_existing.order_id;
  RETURN QUERY SELECT v_existing.id,v_existing.order_id,v_paid,v_order.total,
   CASE WHEN v_paid>=v_order.total THEN 'paid' ELSE 'partial' END,TRUE;
  RETURN;
 END IF;

 IF v_order.status NOT IN ('confirmed','completed') THEN
  RAISE EXCEPTION 'Pesanan harus dikonfirmasi sebelum pembayaran dicatat.';
 END IF;
 IF p_amount<=0 OR p_amount>v_order.total OR p_amount>1000000000000 THEN
  RAISE EXCEPTION 'Nominal pembayaran tidak valid.';
 END IF;
 IF p_method NOT IN ('tunai','transfer','qris') THEN
  RAISE EXCEPTION 'Metode pembayaran tidak dikenal.';
 END IF;
 IF p_received_date !~ '^\d{4}-\d{2}-\d{2}$' OR
    to_char(p_received_date::date,'YYYY-MM-DD')<>p_received_date THEN
  RAISE EXCEPTION 'Tanggal pembayaran tidak valid.';
 END IF;

 SELECT id INTO v_actor FROM users WHERE id=p_actor AND workspace_owner=p_owner AND role='bendahara' AND enabled=TRUE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Aktor pembayaran bukan Bendahara aktif organisasi ini.'; END IF;
 SELECT id,category,active INTO v_cash FROM ledger_accounts
  WHERE id=p_cash_account_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND OR NOT v_cash.active OR v_cash.category<>'asset' THEN
  RAISE EXCEPTION 'Akun kas/bank harus akun aset aktif milik organisasi.';
 END IF;
 SELECT id,category,active INTO v_revenue FROM ledger_accounts
  WHERE id=p_revenue_account_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND OR NOT v_revenue.active OR v_revenue.category<>'revenue' THEN
  RAISE EXCEPTION 'Akun pendapatan harus akun pendapatan aktif milik organisasi.';
 END IF;

 SELECT COALESCE(SUM(amount),0) INTO v_paid FROM commerce_order_payments
  WHERE owner=p_owner AND order_id=p_order_id;
 IF v_paid+p_amount>v_order.total THEN
  RAISE EXCEPTION 'Akumulasi pembayaran tidak boleh melebihi total pesanan.';
 END IF;

 v_entry_id := 'PAY-'||p_payment_id;
 v_ledger_reference := v_entry_id;
 INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created)
 VALUES(v_entry_id,p_owner,p_actor,p_received_date,
  ('Penerimaan pembayaran pesanan '||p_order_id),v_ledger_reference,p_now);
 INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit)
 VALUES(gen_random_uuid()::text,p_owner,v_entry_id,p_cash_account_id,p_amount,0);
 INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit)
 VALUES(gen_random_uuid()::text,p_owner,v_entry_id,p_revenue_account_id,0,p_amount);

 INSERT INTO commerce_order_payments(
  id,owner,order_id,actor_id,amount,method,cash_account_id,revenue_account_id,
  payment_reference,client_request_id,received_date,ledger_entry_id,created
 ) VALUES (
  p_payment_id,p_owner,p_order_id,p_actor,p_amount,p_method,p_cash_account_id,p_revenue_account_id,
  left(COALESCE(p_reference,''),120),p_client_request_id,p_received_date,v_entry_id,p_now
 );

 INSERT INTO audit(id,owner,action,title,created)
 VALUES(gen_random_uuid()::text,p_owner,'Pembayaran pesanan dibukukan',
  'Pesanan '||p_order_id||' · Rp'||p_amount::text,p_now);

 v_paid := v_paid+p_amount;
 RETURN QUERY SELECT p_payment_id,p_order_id,v_paid,v_order.total,
  CASE WHEN v_paid=v_order.total THEN 'paid' ELSE 'partial' END,FALSE;
END;
$$ LANGUAGE plpgsql;

-- A paid order cannot be cancelled until a separately controlled refund workflow exists.
CREATE OR REPLACE FUNCTION srikandi_prevent_paid_order_cancellation() RETURNS trigger AS $$
BEGIN
 IF NEW.status='cancelled' AND OLD.status<>'cancelled'
    AND EXISTS (SELECT 1 FROM commerce_order_payments p WHERE p.owner=OLD.owner AND p.order_id=OLD.id) THEN
  RAISE EXCEPTION 'Pesanan sudah memiliki pembayaran. Proses pengembalian dana harus diselesaikan melalui prosedur tersendiri sebelum pembatalan.';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_prevent_paid_order_cancellation ON commerce_orders;
CREATE TRIGGER srikandi_prevent_paid_order_cancellation
 BEFORE UPDATE OF status ON commerce_orders
 FOR EACH ROW EXECUTE FUNCTION srikandi_prevent_paid_order_cancellation();
