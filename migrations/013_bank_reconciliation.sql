-- v14 native ERP: bank statement reconciliation workspace.
-- Statement rows are imported/entered separately and matched to existing ledger lines.
-- Reconciliation never creates cash receipts or journal entries.

CREATE UNIQUE INDEX IF NOT EXISTS ledger_lines_id_owner_unique
  ON ledger_lines(id, owner);

CREATE TABLE IF NOT EXISTS finance_bank_reconciliations (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  account_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance BIGINT NOT NULL CHECK(opening_balance BETWEEN -1000000000000 AND 1000000000000),
  closing_balance BIGINT NOT NULL CHECK(closing_balance BETWEEN -1000000000000 AND 1000000000000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reconciled')),
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  reconciled_at TIMESTAMPTZ,
  CHECK(period_end >= period_start),
  CHECK((status='draft' AND reconciled_at IS NULL) OR (status='reconciled' AND reconciled_at IS NOT NULL)),
  UNIQUE(id,owner),
  FOREIGN KEY(account_id,owner) REFERENCES ledger_accounts(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS finance_bank_reconciliations_owner_period
  ON finance_bank_reconciliations(owner,period_end DESC,created DESC);

CREATE TABLE IF NOT EXISTS finance_bank_statement_lines (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reconciliation_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL CHECK(length(description) BETWEEN 1 AND 300),
  reference TEXT CHECK(reference IS NULL OR length(reference)<=100),
  signed_amount BIGINT NOT NULL CHECK(signed_amount<>0 AND signed_amount BETWEEN -1000000000000 AND 1000000000000),
  matched_ledger_line_id TEXT,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id,owner),
  FOREIGN KEY(reconciliation_id,owner) REFERENCES finance_bank_reconciliations(id,owner) ON DELETE RESTRICT,
  FOREIGN KEY(matched_ledger_line_id,owner) REFERENCES ledger_lines(id,owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS finance_bank_statement_lines_reconciliation
  ON finance_bank_statement_lines(owner,reconciliation_id,transaction_date,created);
CREATE UNIQUE INDEX IF NOT EXISTS finance_bank_statement_lines_unique_match
  ON finance_bank_statement_lines(owner,matched_ledger_line_id)
  WHERE matched_ledger_line_id IS NOT NULL;

CREATE OR REPLACE FUNCTION srikandi_guard_bank_reconciliation() RETURNS trigger AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Bank reconciliation records cannot be deleted.';
  END IF;
  IF TG_TABLE_NAME='finance_bank_reconciliations' AND OLD.status='reconciled' THEN
    RAISE EXCEPTION 'A reconciled bank period is locked.';
  END IF;
  IF TG_TABLE_NAME='finance_bank_statement_lines' THEN
    IF EXISTS (SELECT 1 FROM finance_bank_reconciliations r
      WHERE r.id=OLD.reconciliation_id AND r.owner=OLD.owner AND r.status='reconciled') THEN
      RAISE EXCEPTION 'Statement lines in a reconciled period are locked.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_bank_reconciliation_guard ON finance_bank_reconciliations;
CREATE TRIGGER srikandi_bank_reconciliation_guard
  BEFORE UPDATE OR DELETE ON finance_bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION srikandi_guard_bank_reconciliation();

DROP TRIGGER IF EXISTS srikandi_bank_statement_line_guard ON finance_bank_statement_lines;
CREATE TRIGGER srikandi_bank_statement_line_guard
  BEFORE UPDATE OR DELETE ON finance_bank_statement_lines
  FOR EACH ROW EXECUTE FUNCTION srikandi_guard_bank_reconciliation();
