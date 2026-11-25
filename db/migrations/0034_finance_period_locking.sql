-- Optional finance periods with database-enforced date locks.
-- No fiscal calendar is assumed. Restrictions begin only after the organization
-- explicitly creates its first period.

CREATE TABLE IF NOT EXISTS v9.finance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  period_code text NOT NULL,
  title text NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  closed_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  close_note text,
  reopened_by uuid REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  reopened_at timestamptz,
  reopen_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, period_code),
  CHECK (length(btrim(period_code)) BETWEEN 2 AND 40),
  CHECK (length(btrim(title)) BETWEEN 3 AND 160),
  CHECK (date_start <= date_end),
  CHECK (close_note IS NULL OR length(close_note) <= 1000),
  CHECK (reopen_note IS NULL OR length(reopen_note) <= 1000),
  CHECK (
    (status = 'open' AND closed_by IS NULL AND closed_at IS NULL AND close_note IS NULL)
    OR
    (status = 'closed' AND closed_by IS NOT NULL AND closed_at IS NOT NULL
      AND close_note IS NOT NULL AND length(btrim(close_note)) >= 3)
  ),
  CHECK ((reopened_by IS NULL AND reopened_at IS NULL AND reopen_note IS NULL)
    OR (reopened_by IS NOT NULL AND reopened_at IS NOT NULL
      AND reopen_note IS NOT NULL AND length(btrim(reopen_note)) >= 3))
);

CREATE INDEX IF NOT EXISTS finance_periods_org_dates_idx
  ON v9.finance_periods (organization_id, date_start, date_end);

CREATE INDEX IF NOT EXISTS finance_periods_org_status_dates_idx
  ON v9.finance_periods (organization_id, status, date_start, date_end);

CREATE OR REPLACE FUNCTION v9.protect_finance_period()
RETURNS trigger
LANGUAGE plpgsql
AS $finance_period_guard$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finance periods are retained for audit and cannot be deleted.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.organization_id::text || ':finance-periods', 0)
    );

    IF EXISTS (
      SELECT 1
      FROM v9.finance_periods AS period
      WHERE period.organization_id = NEW.organization_id
        AND daterange(period.date_start, period.date_end, '[]')
          && daterange(NEW.date_start, NEW.date_end, '[]')
    ) THEN
      RAISE EXCEPTION 'Finance period dates cannot overlap an existing period.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM v9.finance_periods AS period
      WHERE period.organization_id = NEW.organization_id
    ) AND EXISTS (
      SELECT 1
      FROM v9.finance_journals AS journal
      WHERE journal.organization_id = NEW.organization_id
        AND journal.status <> 'posted'
        AND journal.journal_date NOT BETWEEN NEW.date_start AND NEW.date_end
    ) THEN
      RAISE EXCEPTION 'Resolve or include all existing unposted journals before creating the first finance period.';
    END IF;

    IF NEW.status <> 'open'
      OR NEW.closed_by IS NOT NULL
      OR NEW.closed_at IS NOT NULL
      OR NEW.close_note IS NOT NULL
      OR NEW.reopened_by IS NOT NULL
      OR NEW.reopened_at IS NOT NULL
      OR NEW.reopen_note IS NOT NULL
      OR NEW.updated_by <> NEW.created_by
    THEN
      RAISE EXCEPTION 'A new finance period must start open with no closing or reopening metadata.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.period_code IS DISTINCT FROM OLD.period_code
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.date_start IS DISTINCT FROM OLD.date_start
    OR NEW.date_end IS DISTINCT FROM OLD.date_end
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Finance period identity and date boundaries are immutable.';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Finance period updates must be an explicit close or reopen transition.';
  END IF;

  IF OLD.status = 'open' AND NEW.status = 'closed' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.organization_id::text || ':finance-periods', 0)
    );

    IF NEW.closed_by IS NULL
      OR NEW.closed_by = OLD.created_by
      OR NEW.closed_at IS NULL
      OR NEW.updated_by IS DISTINCT FROM NEW.closed_by
      OR NEW.close_note IS NULL
      OR length(btrim(NEW.close_note)) < 3
      OR NEW.reopened_by IS NOT NULL
      OR NEW.reopened_at IS NOT NULL
      OR NEW.reopen_note IS NOT NULL
    THEN
      RAISE EXCEPTION 'Closing a period requires another authorized user and a recorded reason.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM v9.finance_journals AS journal
      WHERE journal.organization_id = NEW.organization_id
        AND journal.journal_date BETWEEN NEW.date_start AND NEW.date_end
        AND journal.status <> 'posted'
    ) THEN
      RAISE EXCEPTION 'All journals in the period must be posted before the period can be closed.';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'closed' AND NEW.status = 'open' THEN
    IF NEW.reopened_by IS NULL
      OR NEW.reopened_by = OLD.closed_by
      OR NEW.reopened_at IS NULL
      OR NEW.updated_by IS DISTINCT FROM NEW.reopened_by
      OR NEW.reopen_note IS NULL
      OR length(btrim(NEW.reopen_note)) < 3
      OR NEW.closed_by IS NOT NULL
      OR NEW.closed_at IS NOT NULL
      OR NEW.close_note IS NOT NULL
    THEN
      RAISE EXCEPTION 'Reopening a period requires a different authorized user and a recorded reason.';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid finance period status transition.';
END;
$finance_period_guard$;

DROP TRIGGER IF EXISTS finance_periods_guard ON v9.finance_periods;
CREATE TRIGGER finance_periods_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.finance_periods
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_period();

CREATE OR REPLACE FUNCTION v9.enforce_finance_journal_period()
RETURNS trigger
LANGUAGE plpgsql
AS $finance_journal_period_guard$
DECLARE
  target_organization uuid;
  target_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_organization := OLD.organization_id;
    target_date := OLD.journal_date;
  ELSE
    target_organization := NEW.organization_id;
    target_date := NEW.journal_date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v9.finance_periods AS period
    WHERE period.organization_id = target_organization
  ) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM v9.finance_periods AS period
    WHERE period.organization_id = target_organization
      AND period.status = 'open'
      AND target_date BETWEEN period.date_start AND period.date_end
  ) THEN
    RAISE EXCEPTION 'Journal date must fall inside an open finance period.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$finance_journal_period_guard$;

DROP TRIGGER IF EXISTS finance_journals_period_guard ON v9.finance_journals;
CREATE TRIGGER finance_journals_period_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.finance_journals
FOR EACH ROW EXECUTE FUNCTION v9.enforce_finance_journal_period();

CREATE OR REPLACE FUNCTION v9.enforce_finance_journal_line_period()
RETURNS trigger
LANGUAGE plpgsql
AS $finance_journal_line_period_guard$
DECLARE
  target_journal uuid;
  target_organization uuid;
  target_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_journal := OLD.journal_id;
    target_organization := OLD.organization_id;
  ELSE
    target_journal := NEW.journal_id;
    target_organization := NEW.organization_id;
  END IF;

  SELECT journal.organization_id, journal.journal_date
  INTO target_organization, target_date
  FROM v9.finance_journals AS journal
  WHERE journal.id = target_journal
    AND journal.organization_id = target_organization;

  IF target_date IS NULL THEN
    RAISE EXCEPTION 'Journal parent must exist before changing journal lines.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.finance_periods AS period
    WHERE period.organization_id = target_organization
  ) AND NOT EXISTS (
    SELECT 1
    FROM v9.finance_periods AS period
    WHERE period.organization_id = target_organization
      AND period.status = 'open'
      AND target_date BETWEEN period.date_start AND period.date_end
  ) THEN
    RAISE EXCEPTION 'Journal lines can only change inside an open finance period.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$finance_journal_line_period_guard$;

DROP TRIGGER IF EXISTS finance_journal_lines_period_guard ON v9.finance_journal_lines;
CREATE TRIGGER finance_journal_lines_period_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.finance_journal_lines
FOR EACH ROW EXECUTE FUNCTION v9.enforce_finance_journal_line_period();

GRANT SELECT, INSERT, UPDATE ON TABLE v9.finance_periods TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0034_finance_period_locking.sql', 'sha256:v9-finance-period-locking-20261125')
ON CONFLICT (name) DO NOTHING;
