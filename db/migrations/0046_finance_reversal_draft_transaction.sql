-- Create a reversal journal in ordered, transactional PL/pgSQL statements.
-- A data-modifying CTE cannot reliably insert a journal header and then update
-- that same row in the same SQL command. The old action left a zero-total draft
-- with copied lines, which then failed the journal submission guard.
--
-- This SECURITY INVOKER function deliberately preserves RLS and transaction-
-- local actor context. The caller must still pass the normal application
-- permission check; the function verifies the actor/tenant binding itself.

CREATE OR REPLACE FUNCTION v9.create_finance_reversal_draft(
  p_original_journal_id uuid,
  p_reversal_date date,
  p_reason text,
  p_actor_user_id uuid,
  p_reversal_journal_id uuid DEFAULT gen_random_uuid()
)
RETURNS TABLE (
  id uuid,
  reference_no text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, v9
AS $finance_reversal_create$
DECLARE
  actor record;
  original record;
  created_journal_id uuid;
  created_reference_no text;
  original_line_count integer;
  inserted_line_count integer;
  debit_total numeric(18,2);
  credit_total numeric(18,2);
BEGIN
  SELECT * INTO actor
  FROM v9._request_actor()
  LIMIT 1;

  IF actor.user_id IS NULL
    OR actor.user_id IS DISTINCT FROM p_actor_user_id
    OR actor.organization_id IS NULL
  THEN
    RETURN;
  END IF;

  IF p_original_journal_id IS NULL
    OR p_reversal_date IS NULL
    OR p_reason IS NULL
    OR length(btrim(p_reason)) NOT BETWEEN 3 AND 400
    OR p_reversal_journal_id IS NULL
  THEN
    RAISE EXCEPTION 'A reversal requires an eligible journal, date, and reason.';
  END IF;

  SELECT
    journal.id,
    journal.organization_id,
    journal.reference_no,
    journal.description,
    journal.budget_id
  INTO original
  FROM v9.finance_journals AS journal
  WHERE journal.id = p_original_journal_id
    AND journal.organization_id = actor.organization_id
    AND journal.status = 'posted'
    AND journal.source_type <> 'reversal'
    AND NOT EXISTS (
      SELECT 1
      FROM v9.finance_journals AS existing_reversal
      WHERE existing_reversal.reversal_of_id = journal.id
        AND existing_reversal.organization_id = journal.organization_id
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT count(*)::integer
  INTO original_line_count
  FROM v9.finance_journal_lines AS line
  WHERE line.journal_id = original.id
    AND line.organization_id = original.organization_id;

  IF original_line_count < 2 THEN
    RETURN;
  END IF;

  -- The insert guard requires an empty zero-total draft. Keep this as a
  -- separate statement before the lines are copied and totals are calculated.
  INSERT INTO v9.finance_journals AS created_journal (
    id,
    organization_id,
    journal_date,
    description,
    source_type,
    source_reference,
    budget_id,
    idempotency_key,
    status,
    reversal_of_id,
    created_by
  ) VALUES (
    p_reversal_journal_id,
    original.organization_id,
    p_reversal_date,
    'Pembalik ' || original.reference_no || ': ' || btrim(p_reason),
    'reversal',
    original.reference_no,
    original.budget_id,
    gen_random_uuid()::text,
    'draft',
    original.id,
    actor.user_id
  )
  RETURNING created_journal.id, created_journal.reference_no
  INTO created_journal_id, created_reference_no;

  INSERT INTO v9.finance_journal_lines (
    organization_id,
    journal_id,
    account_id,
    line_number,
    memo,
    debit,
    credit
  )
  SELECT
    original.organization_id,
    created_journal_id,
    line.account_id,
    line.line_number,
    concat_ws(' · ', 'Pembalik', NULLIF(line.memo, '')),
    line.credit,
    line.debit
  FROM v9.finance_journal_lines AS line
  WHERE line.journal_id = original.id
    AND line.organization_id = original.organization_id
  ORDER BY line.line_number;

  GET DIAGNOSTICS inserted_line_count = ROW_COUNT;

  IF inserted_line_count <> original_line_count THEN
    RAISE EXCEPTION 'The reversal must copy every original journal line.';
  END IF;

  SELECT
    COALESCE(sum(line.debit), 0)::numeric(18,2),
    COALESCE(sum(line.credit), 0)::numeric(18,2),
    count(*)::integer
  INTO debit_total, credit_total, inserted_line_count
  FROM v9.finance_journal_lines AS line
  WHERE line.journal_id = created_journal_id
    AND line.organization_id = original.organization_id;

  IF inserted_line_count <> original_line_count
    OR debit_total IS DISTINCT FROM (
      SELECT COALESCE(sum(line.credit), 0)::numeric(18,2)
      FROM v9.finance_journal_lines AS line
      WHERE line.journal_id = original.id
        AND line.organization_id = original.organization_id
    )
    OR credit_total IS DISTINCT FROM (
      SELECT COALESCE(sum(line.debit), 0)::numeric(18,2)
      FROM v9.finance_journal_lines AS line
      WHERE line.journal_id = original.id
        AND line.organization_id = original.organization_id
    )
  THEN
    RAISE EXCEPTION 'The reversal lines do not exactly invert the original journal.';
  END IF;

  -- A new PL/pgSQL statement sees the inserted header and line rows, unlike
  -- the old same-command INSERT/UPDATE CTE chain.
  UPDATE v9.finance_journals AS journal
  SET total_debit = debit_total,
      total_credit = credit_total,
      updated_at = now()
  WHERE journal.id = created_journal_id
    AND journal.organization_id = original.organization_id
    AND journal.status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The reversal draft header could not be finalized.';
  END IF;

  INSERT INTO v9.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_state
  ) VALUES (
    original.organization_id,
    actor.user_id,
    'finance_journal.reversal_draft_created',
    'finance_journal',
    created_journal_id::text,
    jsonb_build_object(
      'reference_no', created_reference_no,
      'journal_date', p_reversal_date,
      'description', 'Pembalik ' || original.reference_no || ': ' || btrim(p_reason),
      'status', 'draft',
      'total_debit', debit_total,
      'total_credit', credit_total,
      'reversal_of_id', original.id
    )
  );

  id := created_journal_id;
  reference_no := created_reference_no;
  RETURN NEXT;
END;
$finance_reversal_create$;

REVOKE ALL ON FUNCTION v9.create_finance_reversal_draft(uuid, date, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v9.create_finance_reversal_draft(uuid, date, text, uuid, uuid) TO v9_app;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES (
  '0046_finance_reversal_draft_transaction.sql',
  'sha256:v9-finance-reversal-draft-transaction-20261128'
)
ON CONFLICT (name) DO NOTHING;
