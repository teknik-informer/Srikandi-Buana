-- v14 additive ERP subledger: sales invoices and append-only cash receipts.
-- Invoice issuance creates a receivable and revenue journal. Cash receipts settle
-- only the receivable that is explicitly referenced by the source cash record.

CREATE TABLE IF NOT EXISTS commerce_sales_invoice_sequences (
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  period TEXT NOT NULL CHECK (period ~ '^[0-9]{6}$'),
  last_number INTEGER NOT NULL CHECK (last_number > 0),
  PRIMARY KEY (owner, period)
);

CREATE TABLE IF NOT EXISTS commerce_sales_invoices (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 160),
  issue_date DATE NOT NULL,
  due_date DATE,
  total_amount BIGINT NOT NULL CHECK (total_amount > 0 AND total_amount <= 1000000000000),
  paid_total BIGINT NOT NULL DEFAULT 0 CHECK (paid_total >= 0 AND paid_total <= total_amount),
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','partially_paid','paid')),
  ledger_entry_id TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner, order_id),
  UNIQUE (owner, invoice_number),
  UNIQUE (id, owner),
  FOREIGN KEY (order_id, owner)
    REFERENCES commerce_orders(id, owner) ON DELETE RESTRICT,
  FOREIGN KEY (ledger_entry_id, owner)
    REFERENCES ledger_entries(id, owner) ON DELETE RESTRICT,
  CHECK (status <> 'paid' OR paid_total = total_amount),
  CHECK (status <> 'issued' OR paid_total = 0),
  CHECK (due_date IS NULL OR due_date >= issue_date)
);

CREATE INDEX IF NOT EXISTS commerce_sales_invoices_owner_date
  ON commerce_sales_invoices(owner, issue_date DESC, invoice_number DESC);
CREATE INDEX IF NOT EXISTS commerce_sales_invoices_owner_status
  ON commerce_sales_invoices(owner, status, issue_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS records_id_owner_unique
  ON records(id, owner);

CREATE TABLE IF NOT EXISTS commerce_sales_invoice_receipts (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invoice_id TEXT NOT NULL,
  cash_record_id TEXT NOT NULL,
  ledger_entry_id TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0 AND amount <= 1000000000000),
  received_date DATE NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner, cash_record_id),
  FOREIGN KEY (invoice_id, owner)
    REFERENCES commerce_sales_invoices(id, owner) ON DELETE RESTRICT,
  FOREIGN KEY (cash_record_id, owner)
    REFERENCES records(id, owner) ON DELETE RESTRICT,
  FOREIGN KEY (ledger_entry_id, owner)
    REFERENCES ledger_entries(id, owner) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS commerce_sales_invoice_receipts_invoice
  ON commerce_sales_invoice_receipts(owner, invoice_id, received_date, created);

CREATE OR REPLACE FUNCTION srikandi_guard_sales_invoice_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Sales invoices are immutable; use a separately approved correction workflow.';
  END IF;

  IF ROW(
    NEW.id, NEW.owner, NEW.order_id, NEW.invoice_number, NEW.customer_user_id,
    NEW.customer_name, NEW.issue_date, NEW.due_date, NEW.total_amount,
    NEW.ledger_entry_id, NEW.actor_id, NEW.created
  ) IS DISTINCT FROM ROW(
    OLD.id, OLD.owner, OLD.order_id, OLD.invoice_number, OLD.customer_user_id,
    OLD.customer_name, OLD.issue_date, OLD.due_date, OLD.total_amount,
    OLD.ledger_entry_id, OLD.actor_id, OLD.created
  ) THEN
    RAISE EXCEPTION 'Issued sales invoice details are immutable.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_sales_invoice_immutable ON commerce_sales_invoices;
CREATE TRIGGER srikandi_sales_invoice_immutable
  BEFORE UPDATE OR DELETE ON commerce_sales_invoices
  FOR EACH ROW EXECUTE FUNCTION srikandi_guard_sales_invoice_update();

CREATE OR REPLACE FUNCTION srikandi_guard_sales_invoice_receipt() RETURNS trigger AS $$
DECLARE
  updated_invoice_id TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Sales invoice receipts are append-only.';
  END IF;

  -- The parent row update serializes concurrent receipt attempts and prevents
  -- overpayment without relying on a client-side balance check.
  UPDATE commerce_sales_invoices
  SET paid_total = paid_total + NEW.amount,
      status = CASE
        WHEN paid_total + NEW.amount = total_amount THEN 'paid'
        ELSE 'partially_paid'
      END,
      updated = NEW.created
  WHERE id = NEW.invoice_id
    AND owner = NEW.owner
    AND status IN ('issued','partially_paid')
    AND paid_total + NEW.amount <= total_amount
  RETURNING id INTO updated_invoice_id;

  IF updated_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Receipt exceeds the outstanding invoice balance or invoice is unavailable.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_sales_invoice_receipt_guard
  ON commerce_sales_invoice_receipts;
CREATE TRIGGER srikandi_sales_invoice_receipt_guard
  BEFORE INSERT OR UPDATE OR DELETE ON commerce_sales_invoice_receipts
  FOR EACH ROW EXECUTE FUNCTION srikandi_guard_sales_invoice_receipt();
