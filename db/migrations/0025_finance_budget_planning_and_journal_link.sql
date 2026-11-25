-- Native organization budget planning with explicit journal linkage.
-- Budget actuals are derived only from posted journals linked to an approved budget.

CREATE TABLE IF NOT EXISTS v9.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  budget_code text NOT NULL,
  title text NOT NULL,
  fiscal_year smallint NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  funding_source text,
  responsible_label text,
  notes text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected','closed')),
  created_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  submitted_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  approved_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  rejected_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  rejected_at timestamptz,
  closed_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, budget_code),
  CHECK (budget_code ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$'),
  CHECK (length(btrim(title)) BETWEEN 3 AND 180),
  CHECK (fiscal_year BETWEEN 2000 AND 2100),
  CHECK (period_start <= period_end),
  CHECK (funding_source IS NULL OR length(btrim(funding_source)) <= 160),
  CHECK (responsible_label IS NULL OR length(btrim(responsible_label)) <= 160),
  CHECK (notes IS NULL OR length(notes) <= 2000),
  CHECK (
    (status IN ('submitted','approved','rejected','closed') AND submitted_by IS NOT NULL AND submitted_at IS NOT NULL)
    OR status = 'draft'
  ),
  CHECK (
    (status IN ('approved','closed') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR status NOT IN ('approved','closed')
  ),
  CHECK (
    (status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND review_note IS NOT NULL AND length(btrim(review_note)) >= 3)
    OR status <> 'rejected'
  ),
  CHECK (
    (status = 'closed' AND closed_by IS NOT NULL AND closed_at IS NOT NULL)
    OR status <> 'closed'
  )
);

CREATE INDEX IF NOT EXISTS finance_budgets_org_status_period_idx
  ON v9.finance_budgets (organization_id, status, period_start DESC, period_end);

CREATE TABLE IF NOT EXISTS v9.finance_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  budget_id uuid NOT NULL,
  line_number smallint NOT NULL,
  account_id uuid NOT NULL,
  description text NOT NULL,
  planned_amount numeric(18,2) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (budget_id, line_number),
  UNIQUE (budget_id, account_id),
  FOREIGN KEY (budget_id, organization_id)
    REFERENCES v9.finance_budgets(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id)
    REFERENCES v9.finance_accounts(id, organization_id) ON DELETE RESTRICT,
  CHECK (line_number BETWEEN 1 AND 100),
  CHECK (length(btrim(description)) BETWEEN 2 AND 180),
  CHECK (planned_amount > 0),
  CHECK (note IS NULL OR length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS finance_budget_lines_org_budget_idx
  ON v9.finance_budget_lines (organization_id, budget_id, line_number);

ALTER TABLE v9.finance_journals
  ADD COLUMN IF NOT EXISTS budget_id uuid;

ALTER TABLE v9.finance_journals
  ADD CONSTRAINT finance_journals_budget_id_organization_id_fkey
  FOREIGN KEY (budget_id, organization_id)
  REFERENCES v9.finance_budgets(id, organization_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS finance_journals_org_budget_date_status_idx
  ON v9.finance_journals (organization_id, budget_id, journal_date, status)
  WHERE budget_id IS NOT NULL;

CREATE OR REPLACE FUNCTION v9.protect_finance_budget_header()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finance budgets are retained for audit; close a budget instead of deleting it.';
  END IF;

  IF OLD.status <> 'draft' AND (
    NEW.budget_code IS DISTINCT FROM OLD.budget_code
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.fiscal_year IS DISTINCT FROM OLD.fiscal_year
    OR NEW.period_start IS DISTINCT FROM OLD.period_start
    OR NEW.period_end IS DISTINCT FROM OLD.period_end
    OR NEW.funding_source IS DISTINCT FROM OLD.funding_source
    OR NEW.responsible_label IS DISTINCT FROM OLD.responsible_label
    OR NEW.notes IS DISTINCT FROM OLD.notes
  ) THEN
    RAISE EXCEPTION 'Only draft budgets may change planning details.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'submitted')
      OR (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected'))
      OR (OLD.status = 'rejected' AND NEW.status = 'draft')
      OR (OLD.status = 'approved' AND NEW.status = 'closed')
    ) THEN
      RAISE EXCEPTION 'Invalid budget status transition.';
    END IF;
  END IF;

  IF NEW.status = 'approved' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL OR NEW.approved_by = NEW.created_by THEN
      RAISE EXCEPTION 'Budget approval requires a separate authorized reviewer.';
    END IF;
  END IF;

  IF NEW.status = 'rejected' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.rejected_by IS NULL OR NEW.rejected_at IS NULL OR NEW.rejected_by = NEW.created_by
      OR NEW.review_note IS NULL OR length(btrim(NEW.review_note)) < 3 THEN
      RAISE EXCEPTION 'Budget rejection requires a separate reviewer and a reason.';
    END IF;
  END IF;

  IF NEW.status = 'closed' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.closed_by IS NULL OR NEW.closed_at IS NULL THEN
      RAISE EXCEPTION 'Budget closure requires an authorized actor and timestamp.';
    END IF;
  END IF;

  IF NEW.status = 'submitted' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.submitted_by IS NULL OR NEW.submitted_at IS NULL THEN
      RAISE EXCEPTION 'Budget submission requires an actor and timestamp.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM v9.finance_budget_lines AS line
      WHERE line.budget_id = NEW.id AND line.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'A budget must contain at least one planned expense line before submission.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION v9.protect_finance_budget_line()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  budget_status text;
  old_budget_status text;
  account_type text;
  normal_balance text;
  account_status text;
  postable boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT budget.status INTO budget_status
    FROM v9.finance_budgets AS budget
    WHERE budget.id = OLD.budget_id
      AND budget.organization_id = OLD.organization_id
    FOR UPDATE;

    IF budget_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Budget lines may only be removed while the parent budget is a draft.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.budget_id IS DISTINCT FROM OLD.budget_id THEN
      RAISE EXCEPTION 'Budget line ownership cannot be changed.';
    END IF;

    SELECT budget.status INTO old_budget_status
    FROM v9.finance_budgets AS budget
    WHERE budget.id = OLD.budget_id
      AND budget.organization_id = OLD.organization_id
    FOR UPDATE;

    IF old_budget_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Budget lines may only be edited while the parent budget is a draft.';
    END IF;
  END IF;

  SELECT budget.status INTO budget_status
  FROM v9.finance_budgets AS budget
  WHERE budget.id = NEW.budget_id
    AND budget.organization_id = NEW.organization_id
  FOR UPDATE;

  IF budget_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Budget lines may only be added while the parent budget is a draft.';
  END IF;

  SELECT account.account_type, account.normal_balance, account.status, account.is_postable
  INTO account_type, normal_balance, account_status, postable
  FROM v9.finance_accounts AS account
  WHERE account.id = NEW.account_id
    AND account.organization_id = NEW.organization_id;

  IF account_type IS DISTINCT FROM 'beban'
    OR normal_balance IS DISTINCT FROM 'debit'
    OR account_status IS DISTINCT FROM 'active'
    OR postable IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'Budget lines must map to active, postable, debit-normal expense accounts.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_budgets_guard ON v9.finance_budgets;
CREATE TRIGGER finance_budgets_guard
BEFORE UPDATE OR DELETE ON v9.finance_budgets
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_budget_header();

DROP TRIGGER IF EXISTS finance_budget_lines_guard ON v9.finance_budget_lines;
CREATE TRIGGER finance_budget_lines_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.finance_budget_lines
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_budget_line();

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
    OR NEW.budget_id IS DISTINCT FROM OLD.budget_id
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
    AND NEW.source_type <> 'reversal'
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

  IF NEW.budget_id IS NOT NULL
    AND NEW.status IN ('submitted','approved','posted')
    AND NEW.status IS DISTINCT FROM OLD.status
    AND NEW.source_type <> 'reversal'
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM v9.finance_budgets AS budget
      WHERE budget.id = NEW.budget_id
        AND budget.organization_id = NEW.organization_id
        AND budget.status = 'approved'
        AND NEW.journal_date BETWEEN budget.period_start AND budget.period_end
    ) THEN
      RAISE EXCEPTION 'A linked budget must be approved and cover the journal date before the journal can advance.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM v9.finance_journal_lines AS line
      INNER JOIN v9.finance_accounts AS account
        ON account.id = line.account_id
        AND account.organization_id = line.organization_id
      WHERE line.organization_id = NEW.organization_id
        AND line.journal_id = NEW.id
        AND account.account_type = 'beban'
        AND NOT EXISTS (
          SELECT 1
          FROM v9.finance_budget_lines AS budget_line
          WHERE budget_line.organization_id = NEW.organization_id
            AND budget_line.budget_id = NEW.budget_id
            AND budget_line.account_id = line.account_id
        )
    ) THEN
      RAISE EXCEPTION 'Every expense account in a budget-linked journal must exist in the approved budget lines.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_journals_guard ON v9.finance_journals;
CREATE TRIGGER finance_journals_guard
BEFORE UPDATE OR DELETE ON v9.finance_journals
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_journal_header();

GRANT SELECT, INSERT, UPDATE ON TABLE v9.finance_budgets TO v9_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v9.finance_budget_lines TO v9_app;
GRANT SELECT, INSERT, UPDATE ON TABLE v9.finance_journals TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0025_finance_budget_planning_and_journal_link.sql', 'sha256:v9-finance-budget-planning-journal-link-20261125')
ON CONFLICT (name) DO NOTHING;
