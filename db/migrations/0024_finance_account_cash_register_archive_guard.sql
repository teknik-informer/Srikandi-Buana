-- Preserve all finance ledger account references held by cash/bank registers.
-- Even inactive mappings remain historical organization records and may be reactivated later.
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

       )
     ) THEN
    RAISE EXCEPTION 'An account referenced by a journal or active cash/bank register cannot be archived.';
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0024_finance_account_cash_register_archive_guard.sql', 'sha256:v9-finance-account-cash-register-archive-guard-20261125')
ON CONFLICT (name) DO NOTHING;
