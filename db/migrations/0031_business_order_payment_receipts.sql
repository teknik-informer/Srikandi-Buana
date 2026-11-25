-- Controlled payment receipts for fulfilled business/POS orders.
-- Receipts represent money physically received; they do not post to the general ledger.
-- A Treasurer must link an already-posted sale journal that matches the receipt exactly.

CREATE SEQUENCE IF NOT EXISTS v9.business_payment_reference_seq;

CREATE TABLE IF NOT EXISTS v9.business_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  field_key text NOT NULL DEFAULT 'usaha' CHECK (field_key = 'usaha'),
  reference_no text NOT NULL UNIQUE DEFAULT (
    'BYR-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('v9.business_payment_reference_seq')::text, 6, '0')
  ),
  order_id uuid NOT NULL,
  cash_account_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric(18,2) NOT NULL,
  payment_reference text,
  note text,
  received_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  finance_journal_id uuid UNIQUE,
  linked_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  FOREIGN KEY (order_id, organization_id, field_key)
    REFERENCES v9.business_orders(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (cash_account_id, organization_id)
    REFERENCES v9.finance_cash_accounts(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (finance_journal_id, organization_id)
    REFERENCES v9.finance_journals(id, organization_id) ON DELETE RESTRICT,
  CHECK (amount > 0),
  CHECK (payment_reference IS NULL OR length(btrim(payment_reference)) <= 160),
  CHECK (note IS NULL OR length(note) <= 1000),
  CHECK (
    (finance_journal_id IS NULL AND linked_by IS NULL AND linked_at IS NULL)
    OR (finance_journal_id IS NOT NULL AND linked_by IS NOT NULL AND linked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS business_order_payments_org_order_date_idx
  ON v9.business_order_payments (organization_id, order_id, payment_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS business_order_payments_org_linked_date_idx
  ON v9.business_order_payments (organization_id, finance_journal_id, payment_date DESC);

CREATE OR REPLACE FUNCTION v9.protect_business_order_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $business_payment_guard$
DECLARE
  order_status text;
  order_total numeric(18,2);
  paid_total numeric(18,2);
  cash_status text;
  cash_currency text;
  cash_ledger_account uuid;
  journal_status text;
  journal_source text;
  journal_reference text;
  journal_total_debit numeric(18,2);
  journal_total_credit numeric(18,2);
  linked_cash_debit numeric(18,2);
  linked_cash_credit numeric(18,2);
  all_cash_debit numeric(18,2);
  all_cash_credit numeric(18,2);
  noncash_credit numeric(18,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Business payment receipts are retained for audit and cannot be deleted.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.finance_journal_id IS NOT NULL OR NEW.linked_by IS NOT NULL OR NEW.linked_at IS NOT NULL THEN
      RAISE EXCEPTION 'A new payment receipt cannot be considered posted before a Treasurer links a journal.';
    END IF;

    SELECT order_row.status, order_row.total_amount
    INTO order_status, order_total
    FROM v9.business_orders AS order_row
    WHERE order_row.id = NEW.order_id
      AND order_row.organization_id = NEW.organization_id
      AND order_row.field_key = NEW.field_key
    FOR UPDATE;

    IF order_status IS DISTINCT FROM 'fulfilled' THEN
      RAISE EXCEPTION 'Payment can only be recorded for a fulfilled order.';
    END IF;

    SELECT cash_account.status, cash_account.currency_code, cash_account.ledger_account_id
    INTO cash_status, cash_currency, cash_ledger_account
    FROM v9.finance_cash_accounts AS cash_account
    WHERE cash_account.id = NEW.cash_account_id
      AND cash_account.organization_id = NEW.organization_id;

    IF cash_status IS DISTINCT FROM 'active'
      OR cash_currency IS DISTINCT FROM 'IDR'
      OR cash_ledger_account IS NULL
    THEN
      RAISE EXCEPTION 'Payment must use an active IDR cash, bank or e-wallet register.';
    END IF;

    SELECT COALESCE(sum(payment.amount), 0)::numeric(18,2)
    INTO paid_total
    FROM v9.business_order_payments AS payment
    WHERE payment.organization_id = NEW.organization_id
      AND payment.order_id = NEW.order_id;

    IF paid_total + NEW.amount > order_total THEN
      RAISE EXCEPTION 'Total received payment cannot exceed the order total.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.field_key IS DISTINCT FROM OLD.field_key
    OR NEW.reference_no IS DISTINCT FROM OLD.reference_no
    OR NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.cash_account_id IS DISTINCT FROM OLD.cash_account_id
    OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
    OR NEW.note IS DISTINCT FROM OLD.note
    OR NEW.received_by IS DISTINCT FROM OLD.received_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Payment receipt details are immutable after recording.';
  END IF;

  IF OLD.finance_journal_id IS NOT NULL
    OR NEW.finance_journal_id IS NULL
    OR NEW.linked_by IS NULL
    OR NEW.linked_at IS NULL
  THEN
    RAISE EXCEPTION 'A payment receipt may be linked once to a posted journal and cannot be unlinked.';
  END IF;

  SELECT cash_account.ledger_account_id
  INTO cash_ledger_account
  FROM v9.finance_cash_accounts AS cash_account
  WHERE cash_account.id = NEW.cash_account_id
    AND cash_account.organization_id = NEW.organization_id
    AND cash_account.status IN ('active','inactive')
    AND cash_account.currency_code = 'IDR';

  IF cash_ledger_account IS NULL THEN
    RAISE EXCEPTION 'The payment receipt cash/bank register mapping cannot be found.';
  END IF;

  SELECT
    journal.status,
    journal.source_type,
    journal.source_reference,
    journal.total_debit,
    journal.total_credit,
    COALESCE(sum(line.debit) FILTER (WHERE line.account_id = cash_ledger_account), 0)::numeric(18,2),
    COALESCE(sum(line.credit) FILTER (WHERE line.account_id = cash_ledger_account), 0)::numeric(18,2),
    COALESCE(sum(line.debit) FILTER (WHERE EXISTS (
      SELECT 1 FROM v9.finance_cash_accounts AS any_cash
      WHERE any_cash.organization_id = line.organization_id
        AND any_cash.ledger_account_id = line.account_id
    )), 0)::numeric(18,2),
    COALESCE(sum(line.credit) FILTER (WHERE EXISTS (
      SELECT 1 FROM v9.finance_cash_accounts AS any_cash
      WHERE any_cash.organization_id = line.organization_id
        AND any_cash.ledger_account_id = line.account_id
    )), 0)::numeric(18,2),
    COALESCE(sum(line.credit) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM v9.finance_cash_accounts AS any_cash
      WHERE any_cash.organization_id = line.organization_id
        AND any_cash.ledger_account_id = line.account_id
    )), 0)::numeric(18,2)
  INTO
    journal_status, journal_source, journal_reference,
    journal_total_debit, journal_total_credit,
    linked_cash_debit, linked_cash_credit,
    all_cash_debit, all_cash_credit, noncash_credit
  FROM v9.finance_journals AS journal
  INNER JOIN v9.finance_journal_lines AS line
    ON line.journal_id = journal.id
    AND line.organization_id = journal.organization_id
  WHERE journal.id = NEW.finance_journal_id
    AND journal.organization_id = NEW.organization_id
  GROUP BY journal.id;

  IF journal_status IS DISTINCT FROM 'posted'
    OR journal_source IS DISTINCT FROM 'sale'
    OR journal_reference IS DISTINCT FROM NEW.reference_no
    OR journal_total_debit IS DISTINCT FROM NEW.amount
    OR journal_total_credit IS DISTINCT FROM NEW.amount
    OR linked_cash_debit IS DISTINCT FROM NEW.amount
    OR linked_cash_credit <> 0
    OR all_cash_debit IS DISTINCT FROM NEW.amount
    OR all_cash_credit <> 0
    OR noncash_credit IS DISTINCT FROM NEW.amount
  THEN
    RAISE EXCEPTION 'Link only a posted sale journal whose exact debit matches this receipt and the selected cash/bank register.';
  END IF;

  RETURN NEW;
END;
$business_payment_guard$;

DROP TRIGGER IF EXISTS business_order_payments_guard
  ON v9.business_order_payments;

CREATE TRIGGER business_order_payments_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.business_order_payments
FOR EACH ROW EXECUTE FUNCTION v9.protect_business_order_payment();

GRANT SELECT, INSERT, UPDATE ON TABLE v9.business_order_payments TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0031_business_order_payment_receipts.sql', 'sha256:v9-business-order-payment-receipts-20261125')
ON CONFLICT (name) DO NOTHING;
