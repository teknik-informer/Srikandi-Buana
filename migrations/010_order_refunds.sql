-- v16 additive: append-only refund evidence and balanced cash-basis refund journals.
CREATE TABLE IF NOT EXISTS commerce_order_refunds (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 order_id TEXT NOT NULL,
 payment_id TEXT NOT NULL,
 cash_account_id TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 amount BIGINT NOT NULL CHECK(amount>0 AND amount<=1000000000000),
 method TEXT NOT NULL CHECK(method IN ('tunai','transfer','qris')),
 refund_reference TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 500),
 client_request_id TEXT NOT NULL,
 received_date TEXT NOT NULL CHECK(length(received_date)=10),
 ledger_entry_id TEXT NOT NULL,
 created TEXT NOT NULL,
 FOREIGN KEY(order_id,owner) REFERENCES commerce_orders(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(payment_id,owner) REFERENCES commerce_order_payments(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(cash_account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT,
 FOREIGN KEY(ledger_entry_id,owner) REFERENCES ledger_entries(id,owner) ON DELETE RESTRICT,
 UNIQUE(owner,client_request_id),
 UNIQUE(ledger_entry_id,owner),
 UNIQUE(id,owner)
);
CREATE INDEX IF NOT EXISTS commerce_order_refunds_order
 ON commerce_order_refunds(owner,order_id,received_date,created);
CREATE INDEX IF NOT EXISTS commerce_order_refunds_payment
 ON commerce_order_refunds(owner,payment_id,received_date,created);

CREATE OR REPLACE FUNCTION srikandi_post_order_refund(
 p_refund_id TEXT,p_owner TEXT,p_actor TEXT,p_order_id TEXT,p_payment_id TEXT,p_cash_account_id TEXT,
 p_amount BIGINT,p_method TEXT,p_client_request_id TEXT,p_received_date TEXT,
 p_reference TEXT,p_reason TEXT,p_now TEXT
) RETURNS TABLE(refund_id TEXT,order_id TEXT,payment_id TEXT,refunded_total BIGINT,payment_amount BIGINT,reused BOOLEAN) AS $$
DECLARE
 v_order RECORD;
 v_payment RECORD;
 v_existing RECORD;
 v_actor RECORD;
 v_cash RECORD;
 v_revenue RECORD;
 v_refunded BIGINT := 0;
 v_entry_id TEXT;
BEGIN
 SELECT id,status,total INTO v_order
 FROM commerce_orders WHERE id=p_order_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan pada organisasi ini.'; END IF;

 SELECT id,order_id,amount,revenue_account_id INTO v_payment
 FROM commerce_order_payments
 WHERE id=p_payment_id AND order_id=p_order_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pembayaran sumber tidak ditemukan pada pesanan ini.'; END IF;

 SELECT id,order_id,payment_id,amount,method,cash_account_id,received_date,refund_reference,reason INTO v_existing FROM commerce_order_refunds
 WHERE owner=p_owner AND client_request_id=p_client_request_id;
 IF FOUND THEN
  IF v_existing.order_id<>p_order_id OR v_existing.payment_id<>p_payment_id OR v_existing.amount<>p_amount OR v_existing.method<>p_method OR v_existing.cash_account_id<>p_cash_account_id OR v_existing.received_date<>p_received_date OR v_existing.refund_reference<>left(COALESCE(p_reference,''),120) OR v_existing.reason<>trim(p_reason) THEN
   RAISE EXCEPTION 'Kunci idempotensi refund telah digunakan untuk transaksi lain.';
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM commerce_order_refunds
   WHERE owner=p_owner AND payment_id=p_payment_id;
  RETURN QUERY SELECT v_existing.id,p_order_id,p_payment_id,v_refunded,v_payment.amount,TRUE;
  RETURN;
 END IF;

 IF v_order.status NOT IN ('confirmed','completed') THEN
  RAISE EXCEPTION 'Refund hanya dapat diproses untuk pesanan yang telah dikonfirmasi.';
 END IF;
 IF p_amount<=0 OR p_amount>v_payment.amount OR p_amount>1000000000000 THEN
  RAISE EXCEPTION 'Nominal refund tidak valid.';
 END IF;
 IF p_method NOT IN ('tunai','transfer','qris') THEN
  RAISE EXCEPTION 'Metode pengembalian dana tidak dikenal.';
 END IF;
 IF p_received_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR
    to_char(p_received_date::date,'YYYY-MM-DD')<>p_received_date THEN
  RAISE EXCEPTION 'Tanggal refund tidak valid.';
 END IF;
 IF length(trim(COALESCE(p_reason,'')))<10 OR length(trim(p_reason))>500 THEN
  RAISE EXCEPTION 'Alasan refund harus 10 sampai 500 karakter.';
 END IF;

 SELECT id INTO v_actor FROM users
 WHERE id=p_actor AND workspace_owner=p_owner AND role='bendahara' AND enabled=TRUE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Aktor refund bukan Bendahara aktif organisasi ini.'; END IF;

 SELECT id,category,active INTO v_cash FROM ledger_accounts
 WHERE id=p_cash_account_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND OR NOT v_cash.active OR v_cash.category<>'asset' THEN
  RAISE EXCEPTION 'Akun kas/bank pengembalian tidak aktif atau tidak valid.';
 END IF;
 SELECT id,category,active INTO v_revenue FROM ledger_accounts
 WHERE id=v_payment.revenue_account_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND OR v_revenue.category<>'revenue' THEN
  RAISE EXCEPTION 'Akun pendapatan sumber tidak valid.';
 END IF;

 SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM commerce_order_refunds
 WHERE owner=p_owner AND payment_id=p_payment_id;
 IF v_refunded+p_amount>v_payment.amount THEN
  RAISE EXCEPTION 'Akumulasi refund tidak boleh melebihi pembayaran sumber.';
 END IF;

 v_entry_id := 'RFD-'||p_refund_id;
 INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created)
 VALUES(v_entry_id,p_owner,p_actor,p_received_date,
  ('Pengembalian pembayaran pesanan '||p_order_id),v_entry_id,p_now);
 -- Debit the original sales revenue account and credit the actual payout cash/bank account.
 INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit)
 VALUES(gen_random_uuid()::text,p_owner,v_entry_id,v_payment.revenue_account_id,p_amount,0);
 INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit)
 VALUES(gen_random_uuid()::text,p_owner,v_entry_id,p_cash_account_id,0,p_amount);

 INSERT INTO commerce_order_refunds(
  id,owner,order_id,payment_id,cash_account_id,actor_id,amount,method,refund_reference,reason,
  client_request_id,received_date,ledger_entry_id,created
 ) VALUES (
  p_refund_id,p_owner,p_order_id,p_payment_id,p_cash_account_id,p_actor,p_amount,p_method,
  left(COALESCE(p_reference,''),120),trim(p_reason),p_client_request_id,
  p_received_date,v_entry_id,p_now
 );

 INSERT INTO audit(id,owner,action,title,created)
 VALUES(gen_random_uuid()::text,p_owner,'Pengembalian pembayaran pesanan dibukukan',
  'Pesanan '||p_order_id||' · Rp'||p_amount::text,p_now);

 v_refunded := v_refunded+p_amount;
 RETURN QUERY SELECT p_refund_id,p_order_id,p_payment_id,v_refunded,v_payment.amount,FALSE;
END;
$$ LANGUAGE plpgsql;

-- Payment collection is capped by net receipts, allowing a new collection after a partial refund.
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
BEGIN
 SELECT id,status,total INTO v_order
 FROM commerce_orders WHERE id=p_order_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan pada organisasi ini.'; END IF;

 SELECT id,order_id,amount,method,cash_account_id,revenue_account_id,received_date,payment_reference INTO v_existing FROM commerce_order_payments
 WHERE owner=p_owner AND client_request_id=p_client_request_id;
 IF FOUND THEN
  IF v_existing.order_id<>p_order_id OR v_existing.amount<>p_amount OR v_existing.method<>p_method OR v_existing.cash_account_id<>p_cash_account_id OR v_existing.revenue_account_id<>p_revenue_account_id OR v_existing.received_date<>p_received_date OR v_existing.payment_reference<>left(COALESCE(p_reference,''),120) THEN
   RAISE EXCEPTION 'Kunci idempotensi pembayaran telah digunakan untuk transaksi lain.';
  END IF;
  SELECT COALESCE(SUM(p.amount),0)-COALESCE((SELECT SUM(r.amount) FROM commerce_order_refunds r WHERE r.owner=p_owner AND r.order_id=v_existing.order_id),0) INTO v_paid FROM commerce_order_payments p WHERE p.owner=p_owner AND p.order_id=v_existing.order_id;
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
 IF p_received_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR
    to_char(p_received_date::date,'YYYY-MM-DD')<>p_received_date THEN
  RAISE EXCEPTION 'Tanggal pembayaran tidak valid.';
 END IF;

 SELECT id INTO v_actor FROM users
  WHERE id=p_actor AND workspace_owner=p_owner AND role='bendahara' AND enabled=TRUE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Aktor pembayaran bukan Bendahara aktif organisasi ini.'; END IF;

 SELECT id,category,active INTO v_cash FROM ledger_accounts
  WHERE id=p_cash_account_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Akun kas/bank tidak ditemukan.'; END IF;
 IF NOT v_cash.active OR v_cash.category<>'asset' THEN
  RAISE EXCEPTION 'Akun kas/bank harus akun aset aktif milik organisasi.';
 END IF;

 SELECT id,category,active INTO v_revenue FROM ledger_accounts
  WHERE id=p_revenue_account_id AND owner=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Akun pendapatan tidak ditemukan.'; END IF;
 IF NOT v_revenue.active OR v_revenue.category<>'revenue' THEN
  RAISE EXCEPTION 'Akun pendapatan harus akun pendapatan aktif milik organisasi.';
 END IF;

 SELECT COALESCE(SUM(p.amount),0)-COALESCE((SELECT SUM(r.amount) FROM commerce_order_refunds r WHERE r.owner=p_owner AND r.order_id=p_order_id),0) INTO v_paid FROM commerce_order_payments p WHERE p.owner=p_owner AND p.order_id=p_order_id;
 IF v_paid+p_amount>v_order.total THEN
  RAISE EXCEPTION 'Akumulasi pembayaran tidak boleh melebihi total pesanan.';
 END IF;

 v_entry_id := 'PAY-'||p_payment_id;
 INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created)
 VALUES(v_entry_id,p_owner,p_actor,p_received_date,
  ('Penerimaan pembayaran pesanan '||p_order_id),v_entry_id,p_now);
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


-- Cancellation may restore reserved FIFO stock only after every recorded payment is fully refunded.
CREATE OR REPLACE FUNCTION srikandi_enforce_order_payment_state() RETURNS trigger AS $$
DECLARE
 v_paid BIGINT := 0;
 v_refunded BIGINT := 0;
BEGIN
 SELECT COALESCE(SUM(p.amount),0) INTO v_paid
 FROM commerce_order_payments p WHERE p.owner=OLD.owner AND p.order_id=OLD.id;
 SELECT COALESCE(SUM(r.amount),0) INTO v_refunded
 FROM commerce_order_refunds r WHERE r.owner=OLD.owner AND r.order_id=OLD.id;

 IF NEW.status='cancelled' AND OLD.status<>'cancelled' AND v_refunded<v_paid THEN
  RAISE EXCEPTION 'Pesanan hanya dapat dibatalkan setelah seluruh pembayaran dikembalikan.';
 END IF;
 IF NEW.status='completed' AND OLD.status<>'completed' AND v_paid-v_refunded<OLD.total THEN
  RAISE EXCEPTION 'Pesanan belum dapat diselesaikan sebelum seluruh pembayaran tercatat.';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_enforce_order_payment_state ON commerce_orders;
CREATE TRIGGER srikandi_enforce_order_payment_state
 BEFORE UPDATE OF status ON commerce_orders
 FOR EACH ROW EXECUTE FUNCTION srikandi_enforce_order_payment_state();

CREATE OR REPLACE FUNCTION srikandi_protect_order_refund() RETURNS trigger AS $$
BEGIN
 RAISE EXCEPTION 'Catatan refund bersifat tetap. Koreksi harus melalui transaksi koreksi tersendiri.';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS srikandi_protect_order_refund ON commerce_order_refunds;
CREATE TRIGGER srikandi_protect_order_refund
 BEFORE UPDATE OR DELETE ON commerce_order_refunds
 FOR EACH ROW EXECUTE FUNCTION srikandi_protect_order_refund();
