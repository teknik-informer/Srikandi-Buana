-- Block journal lifecycle transitions when a linked cash/bank register is not active.
-- The rule applies at the database boundary in addition to application action checks.
CREATE OR REPLACE FUNCTION v9.protect_finance_journal_header()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  line_count integer;
  debit_sum numeric(18,2);
  credit_sum numeric(18,2);
  invalid_account_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finance journals are retained permanently; use a reversal journal for corrections.';
  END IF;

  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Posted journals are immutable; create a reversal journal for corrections.';
  END IF;

  IF OLD.status <> 'draft' AND (
    NEW.journal_date IS DISTINCT FROM OLD.journal_date
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.source_type IS DISTINCT FROM OLD.source_type
    OR NEW.source_reference IS DISTINCT FROM OLD.source_reference
    OR NEW.total_debit IS DISTINCT FROM OLD.total_debit
    OR NEW.total_credit IS DISTINCT FROM OLD.total_credit
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
  ) THEN
    RAISE EXCEPTION 'Only draft journals may change their accounting content.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'submitted')
      OR (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected'))
      OR (OLD.status = 'rejected' AND NEW.status = 'draft')
      OR (OLD.status = 'approved' AND NEW.status = 'posted')
    ) THEN
      RAISE EXCEPTION 'Invalid finance journal status transition.';
    END IF;
  END IF;

  IF NEW.status IN ('submitted','posted') AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT
      count(*)::int,
      COALESCE(sum(line.debit),0)::numeric(18,2),
      COALESCE(sum(line.credit),0)::numeric(18,2),
      count(*) FILTER (WHERE account.status <> 'active' OR account.is_postable = false)::int
    INTO line_count,debit_sum,credit_sum,invalid_account_count
    FROM v9.finance_journal_lines AS line
    INNER JOIN v9.finance_accounts AS account
      ON account.id = line.account_id
      AND account.organization_id = line.organization_id
    WHERE line.journal_id = NEW.id
      AND line.organization_id = NEW.organization_id;

    IF line_count < 2 OR debit_sum <= 0 OR debit_sum <> credit_sum OR invalid_account_count > 0 THEN
      RAISE EXCEPTION 'A journal must have at least two lines, active postable accounts, and equal positive debit and credit totals.';
    END IF;

    IF NEW.total_debit <> debit_sum OR NEW.total_credit <> credit_sum THEN
      RAISE EXCEPTION 'Stored journal totals do not match its journal lines.';
    END IF;
  END IF;

  IF NEW.status = 'approved' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL OR NEW.approved_by = NEW.created_by THEN
      RAISE EXCEPTION 'Approval requires a separate authorized reviewer.';
    END IF;
  END IF;

  IF NEW.status = 'posted' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'approved' OR NEW.posted_by IS NULL OR NEW.posted_at IS NULL THEN
      RAISE EXCEPTION 'Only an approved journal can be posted.';
    END IF;
  END IF;

  IF NEW.status IN ('submitted','approved','posted')
    AND NEW.status IS DISTINCT FROM OLD.status
    AND EXISTS (
      SELECT 1
      FROM v9.finance_journal_lines AS line
      INNER JOIN v9.finance_cash_accounts AS cash_account
        ON cash_account.organization_id = line.organization_id
        AND cash_account.ledger_account_id = line.account_id
      WHERE line.organization_id = NEW.organization_id
        AND line.journal_id = NEW.id
        AND cash_account.status <> 'active'
    ) THEN
    RAISE EXCEPTION 'Journal cannot advance while a linked cash/bank register is not active.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_journals_guard ON v9.finance_journals;
CREATE TRIGGER finance_journals_guard
BEFORE UPDATE OR DELETE ON v9.finance_journals
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_journal_header();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0023_finance_cash_bank_journal_guard.sql', 'sha256:v9-finance-cash-bank-journal-guard-20261125')
ON CONFLICT (name) DO NOTHING;
