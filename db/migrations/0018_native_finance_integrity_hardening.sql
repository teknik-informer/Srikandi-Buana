-- Additional native finance integrity safeguards.
-- Prevent raw inserts of non-draft journals and prohibit moving lines between journals.

CREATE OR REPLACE FUNCTION v9.prevent_non_draft_finance_journal_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'draft'
    OR NEW.total_debit <> 0
    OR NEW.total_credit <> 0
    OR NEW.submitted_by IS NOT NULL
    OR NEW.submitted_at IS NOT NULL
    OR NEW.approved_by IS NOT NULL
    OR NEW.approved_at IS NOT NULL
    OR NEW.rejected_by IS NOT NULL
    OR NEW.rejected_at IS NOT NULL
    OR NEW.posted_by IS NOT NULL
    OR NEW.posted_at IS NOT NULL
  THEN
    RAISE EXCEPTION 'New finance journals must begin as empty drafts.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_journals_insert_guard ON v9.finance_journals;
CREATE TRIGGER finance_journals_insert_guard
BEFORE INSERT ON v9.finance_journals
FOR EACH ROW EXECUTE FUNCTION v9.prevent_non_draft_finance_journal_insert();

CREATE OR REPLACE FUNCTION v9.protect_finance_journal_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  journal_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.journal_id IS DISTINCT FROM OLD.journal_id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
  ) THEN
    RAISE EXCEPTION 'A journal line cannot be moved to another journal or organization.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT status INTO journal_status
    FROM v9.finance_journals
    WHERE id = OLD.journal_id
      AND organization_id = OLD.organization_id
    FOR UPDATE;
  ELSE
    SELECT status INTO journal_status
    FROM v9.finance_journals
    WHERE id = NEW.journal_id
      AND organization_id = NEW.organization_id
    FOR UPDATE;
  END IF;

  IF journal_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Journal lines can only be changed while the journal is a draft.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

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
     AND EXISTS (
       SELECT 1 FROM v9.finance_journal_lines line
       WHERE line.account_id = OLD.id
         AND line.organization_id = OLD.organization_id
     ) THEN
    RAISE EXCEPTION 'An account referenced by a journal cannot be archived.';
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0018_native_finance_integrity_hardening.sql', 'sha256:initial-v9-native-finance-integrity-hardening')
ON CONFLICT (name) DO NOTHING;
