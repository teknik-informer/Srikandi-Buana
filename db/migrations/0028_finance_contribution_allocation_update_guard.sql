-- Make the contribution-allocation update exclusion explicit for INSERT and UPDATE.
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

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0028_finance_contribution_allocation_update_guard.sql', 'sha256:v9-finance-contribution-allocation-update-guard-20261125')
ON CONFLICT (name) DO NOTHING;
