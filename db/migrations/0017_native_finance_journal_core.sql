-- Native finance core: chart of accounts, double-entry journals, review and posting.
-- No opening balances or example transactions are inserted by this migration.

CREATE SEQUENCE IF NOT EXISTS v9.finance_journal_reference_seq;

CREATE TABLE IF NOT EXISTS v9.finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  account_code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL
    CHECK (account_type IN ('aset','kewajiban','ekuitas','pendapatan','beban')),
  normal_balance text NOT NULL
    CHECK (normal_balance IN ('debit','credit')),
  group_label text NOT NULL,
  parent_id uuid,
  is_postable boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','archived')),
  note text,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, account_code),
  FOREIGN KEY (parent_id, organization_id)
    REFERENCES v9.finance_accounts(id, organization_id) ON DELETE RESTRICT,
  CHECK (account_code ~ '^[0-9]+-[0-9]{3,6}$' AND length(account_code) <= 32),
  CHECK (length(btrim(account_name)) BETWEEN 2 AND 180),
  CHECK (length(btrim(group_label)) BETWEEN 2 AND 120),
  CHECK (note IS NULL OR length(note) <= 2000)
);

CREATE INDEX IF NOT EXISTS finance_accounts_org_type_status_idx
  ON v9.finance_accounts (organization_id, account_type, status, account_code);

CREATE TABLE IF NOT EXISTS v9.finance_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  reference_no text NOT NULL UNIQUE DEFAULT (
    'JU/' || to_char(current_date,'YYYY') || '/' ||
    lpad(nextval('v9.finance_journal_reference_seq')::text,6,'0')
  ),
  journal_date date NOT NULL,
  description text NOT NULL,
  source_type text NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual','cash','bank','contribution','grant','purchase','sale','adjustment','reversal')),
  source_reference text,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','posted','rejected')),
  total_debit numeric(18,2) NOT NULL DEFAULT 0,
  total_credit numeric(18,2) NOT NULL DEFAULT 0,
  review_note text,
  reversal_of_id uuid,
  created_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  submitted_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  approved_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  rejected_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  rejected_at timestamptz,
  posted_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (reversal_of_id),
  FOREIGN KEY (reversal_of_id, organization_id)
    REFERENCES v9.finance_journals(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(description)) BETWEEN 3 AND 500),
  CHECK (source_reference IS NULL OR length(btrim(source_reference)) <= 160),
  CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 160),
  CHECK (total_debit >= 0 AND total_credit >= 0),
  CHECK (
    (status IN ('submitted','approved','posted','rejected')
      AND submitted_by IS NOT NULL AND submitted_at IS NOT NULL)
    OR status = 'draft'
  ),
  CHECK (
    (status IN ('approved','posted') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR status NOT IN ('approved','posted')
  ),
  CHECK (
    (status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL
      AND review_note IS NOT NULL AND length(btrim(review_note)) >= 3)
    OR status <> 'rejected'
  ),
  CHECK (
    (status = 'posted' AND posted_by IS NOT NULL AND posted_at IS NOT NULL)
    OR status <> 'posted'
  )
);

CREATE INDEX IF NOT EXISTS finance_journals_org_date_status_idx
  ON v9.finance_journals (organization_id, journal_date DESC, status, created_at DESC);

CREATE INDEX IF NOT EXISTS finance_journals_org_source_idx
  ON v9.finance_journals (organization_id, source_type, source_reference);

CREATE TABLE IF NOT EXISTS v9.finance_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  journal_id uuid NOT NULL,
  account_id uuid NOT NULL,
  line_number smallint NOT NULL,
  memo text,
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journal_id, line_number),
  FOREIGN KEY (journal_id, organization_id)
    REFERENCES v9.finance_journals(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id, organization_id)
    REFERENCES v9.finance_accounts(id, organization_id) ON DELETE RESTRICT,
  CHECK (line_number BETWEEN 1 AND 100),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)),
  CHECK (memo IS NULL OR length(memo) <= 500)
);

CREATE INDEX IF NOT EXISTS finance_journal_lines_journal_idx
  ON v9.finance_journal_lines (organization_id, journal_id, line_number);

CREATE INDEX IF NOT EXISTS finance_journal_lines_account_idx
  ON v9.finance_journal_lines (organization_id, account_id, journal_id);

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
       INNER JOIN v9.finance_journals journal
         ON journal.id = line.journal_id
         AND journal.organization_id = line.organization_id
       WHERE line.account_id = OLD.id
         AND line.organization_id = OLD.organization_id
         AND journal.status = 'posted'
     ) THEN
    RAISE EXCEPTION 'An account with posted journal history cannot be archived.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_accounts_guard ON v9.finance_accounts;
CREATE TRIGGER finance_accounts_guard
BEFORE UPDATE OR DELETE ON v9.finance_accounts
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_account();

CREATE OR REPLACE FUNCTION v9.protect_finance_journal_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_journal_id uuid;
  target_organization_id uuid;
  journal_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_journal_id := OLD.journal_id;
    target_organization_id := OLD.organization_id;
  ELSE
    target_journal_id := NEW.journal_id;
    target_organization_id := NEW.organization_id;
  END IF;

  SELECT status INTO journal_status
  FROM v9.finance_journals
  WHERE id = target_journal_id
    AND organization_id = target_organization_id
  FOR UPDATE;

  IF journal_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Journal lines can only be changed while the journal is a draft.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_journal_lines_guard ON v9.finance_journal_lines;
CREATE TRIGGER finance_journal_lines_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.finance_journal_lines
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_journal_lines();

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_journals_guard ON v9.finance_journals;
CREATE TRIGGER finance_journals_guard
BEFORE UPDATE OR DELETE ON v9.finance_journals
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_journal_header();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0017_native_finance_journal_core.sql', 'sha256:initial-v9-native-finance-journal-core')
ON CONFLICT (name) DO NOTHING;
