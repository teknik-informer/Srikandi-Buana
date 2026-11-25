-- Enforce safe closure after budget and journal linkage is available.
-- This is a separate additive migration; 0025 remains a schema-only migration.
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

  IF NEW.status = 'closed' AND NEW.status IS DISTINCT FROM OLD.status
    AND EXISTS (
      SELECT 1
      FROM v9.finance_journals AS journal
      WHERE journal.organization_id = NEW.organization_id
        AND journal.budget_id = NEW.id
        AND journal.status <> 'posted'
    ) THEN
    RAISE EXCEPTION 'A budget with unposted linked journals cannot be closed.';
  END IF;

  RETURN NEW;
END;
$finance_budget_header$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0026_finance_budget_pending_journal_close_guard.sql', 'sha256:v9-finance-budget-pending-journal-close-guard-20261125')
ON CONFLICT (name) DO NOTHING;
