-- Cash and bank register mapped to the native Finance chart of accounts.
-- Balances are derived only from posted journal lines; no opening balance is stored here.

CREATE TABLE IF NOT EXISTS v9.finance_cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  ledger_account_id uuid NOT NULL,
  account_kind text NOT NULL
    CHECK (account_kind IN ('cash','bank','e_wallet')),
  display_name text NOT NULL,
  institution_name text,
  account_holder_label text,
  account_number_last4 char(4),
  currency_code char(3) NOT NULL DEFAULT 'IDR',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','inactive')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, ledger_account_id),
  FOREIGN KEY (ledger_account_id, organization_id)
    REFERENCES v9.finance_accounts(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(display_name)) BETWEEN 2 AND 160),
  CHECK (institution_name IS NULL OR length(btrim(institution_name)) <= 160),
  CHECK (account_holder_label IS NULL OR length(btrim(account_holder_label)) <= 160),
  CHECK (account_number_last4 IS NULL OR account_number_last4 ~ '^[0-9]{4}$'),
  CHECK (currency_code ~ '^[A-Z]{3}$'),
  CHECK ((account_kind = 'cash' AND institution_name IS NULL AND account_number_last4 IS NULL)
      OR (account_kind IN ('bank','e_wallet')))
);

CREATE INDEX IF NOT EXISTS finance_cash_accounts_org_status_idx
  ON v9.finance_cash_accounts (organization_id, status, account_kind, display_name);

CREATE OR REPLACE FUNCTION v9.protect_finance_cash_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  account_type text;
  normal_balance text;
  account_status text;
  postable boolean;
BEGIN
  SELECT account.account_type, account.normal_balance, account.status, account.is_postable
  INTO account_type, normal_balance, account_status, postable
  FROM v9.finance_accounts AS account
  WHERE account.id = NEW.ledger_account_id
    AND account.organization_id = NEW.organization_id
  FOR UPDATE;

  IF account_type IS DISTINCT FROM 'aset'
    OR normal_balance IS DISTINCT FROM 'debit'
    OR account_status IS DISTINCT FROM 'active'
    OR postable IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'Cash/bank register must map to an active, postable, debit-normal asset account.';
  END IF;

  IF NEW.status = 'active' AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'New cash/bank mappings must begin in draft status.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_cash_accounts_guard ON v9.finance_cash_accounts;
CREATE TRIGGER finance_cash_accounts_guard
BEFORE INSERT OR UPDATE ON v9.finance_cash_accounts
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_cash_account();

CREATE OR REPLACE FUNCTION v9.protect_finance_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finance accounts are not deleted; archive an unused account instead.';
  END IF;

  IF (
    NEW.account_code IS DISTINCT FROM OLD.account_code
    OR NEW.account_type IS DISTINCT FROM OLD.account_type
    OR NEW.normal_balance IS DISTINCT FROM OLD.normal_balance
    OR NEW.is_postable IS DISTINCT FROM OLD.is_postable
  ) AND EXISTS (
    SELECT 1 FROM v9.finance_journal_lines line
    WHERE line.account_id = OLD.id
      AND line.organization_id = OLD.organization_id
  ) THEN
    RAISE EXCEPTION 'Account structure is locked after it has been used by a journal.';
  END IF;

  IF NEW.status = 'archived' AND OLD.status <> 'archived'
     AND (
       EXISTS (
         SELECT 1 FROM v9.finance_journal_lines line
         WHERE line.account_id = OLD.id
           AND line.organization_id = OLD.organization_id
       )
       OR EXISTS (
         SELECT 1 FROM v9.finance_cash_accounts cash_account
         WHERE cash_account.ledger_account_id = OLD.id
           AND cash_account.organization_id = OLD.organization_id
           AND cash_account.status = 'active'
       )
     ) THEN
    RAISE EXCEPTION 'An account referenced by a journal or active cash/bank register cannot be archived.';
  END IF;

  RETURN NEW;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON TABLE v9.finance_cash_accounts TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0019_finance_cash_bank_register.sql', 'sha256:initial-v9-finance-cash-bank-register')
ON CONFLICT (name) DO NOTHING;
