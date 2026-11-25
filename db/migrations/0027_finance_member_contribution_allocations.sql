-- Member-level allocation of already-posted voluntary contribution journals.
-- This does not create dues, invoices, tariffs or payment obligations.

CREATE TABLE IF NOT EXISTS v9.finance_contribution_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  journal_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  allocation_amount numeric(18,2) NOT NULL,
  note text,
  created_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES v9.user_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, journal_id, membership_id),
  FOREIGN KEY (journal_id, organization_id)
    REFERENCES v9.finance_journals(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (membership_id, organization_id)
    REFERENCES v9.memberships(id, organization_id) ON DELETE RESTRICT,
  CHECK (allocation_amount > 0),
  CHECK (note IS NULL OR length(note) <= 1000)
);

CREATE INDEX IF NOT EXISTS finance_contribution_allocations_org_member_idx
  ON v9.finance_contribution_allocations (organization_id, membership_id, created_at DESC);

CREATE INDEX IF NOT EXISTS finance_contribution_allocations_org_journal_idx
  ON v9.finance_contribution_allocations (organization_id, journal_id);

CREATE OR REPLACE FUNCTION v9.protect_finance_contribution_allocation()
RETURNS trigger
LANGUAGE plpgsql
AS $contribution_guard$
DECLARE
  journal_status text;
  journal_source text;
  journal_date date;
  contribution_total numeric(18,2);
  allocated_total numeric(18,2);
  membership_status text;
  member_valid_from date;
  member_valid_until date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Contribution allocations are retained for audit; correct an allocation with an audited update.';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.journal_id IS DISTINCT FROM OLD.journal_id
  ) THEN
    RAISE EXCEPTION 'Contribution allocation journal ownership cannot be changed.';
  END IF;

  SELECT journal.status, journal.source_type, journal.journal_date
  INTO journal_status, journal_source, journal_date
  FROM v9.finance_journals AS journal
  WHERE journal.id = NEW.journal_id
    AND journal.organization_id = NEW.organization_id
  FOR UPDATE;

  IF journal_status IS DISTINCT FROM 'posted'
    OR journal_source IS DISTINCT FROM 'contribution'
    OR journal_date IS NULL
  THEN
    RAISE EXCEPTION 'Only an already-posted contribution journal can be allocated to a member.';
  END IF;

  SELECT membership.status, membership.valid_from, membership.valid_until
  INTO membership_status, member_valid_from, member_valid_until
  FROM v9.memberships AS membership
  WHERE membership.id = NEW.membership_id
    AND membership.organization_id = NEW.organization_id;

  IF membership_status IS NULL
    OR membership_status IN ('pending','archived')
    OR (member_valid_from IS NOT NULL AND member_valid_from > journal_date)
    OR (member_valid_until IS NOT NULL AND member_valid_until < journal_date)
  THEN
    RAISE EXCEPTION 'The selected membership was not valid on the contribution journal date.';
  END IF;

  SELECT COALESCE(sum(line.credit - line.debit), 0)::numeric(18,2)
  INTO contribution_total
  FROM v9.finance_journal_lines AS line
  INNER JOIN v9.finance_accounts AS account
    ON account.id = line.account_id
    AND account.organization_id = line.organization_id
  WHERE line.organization_id = NEW.organization_id
    AND line.journal_id = NEW.journal_id
    AND account.account_type = 'pendapatan';

  IF contribution_total <= 0 THEN
    RAISE EXCEPTION 'The posted contribution journal has no positive revenue credit to allocate.';
  END IF;

  SELECT COALESCE(sum(allocation.allocation_amount), 0)::numeric(18,2)
  INTO allocated_total
  FROM v9.finance_contribution_allocations AS allocation
  WHERE allocation.organization_id = NEW.organization_id
    AND allocation.journal_id = NEW.journal_id
    AND allocation.id IS DISTINCT FROM CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL::uuid END;

  IF allocated_total + NEW.allocation_amount > contribution_total THEN
    RAISE EXCEPTION 'Member allocations cannot exceed the posted contribution revenue in the journal.';
  END IF;

  RETURN NEW;
END;
$contribution_guard$;

DROP TRIGGER IF EXISTS finance_contribution_allocations_guard
  ON v9.finance_contribution_allocations;

CREATE TRIGGER finance_contribution_allocations_guard
BEFORE INSERT OR UPDATE OR DELETE ON v9.finance_contribution_allocations
FOR EACH ROW EXECUTE FUNCTION v9.protect_finance_contribution_allocation();

GRANT SELECT, INSERT, UPDATE ON TABLE v9.finance_contribution_allocations TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0027_finance_member_contribution_allocations.sql', 'sha256:v9-finance-member-contribution-allocations-20261125')
ON CONFLICT (name) DO NOTHING;
