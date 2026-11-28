-- CI-only finance lifecycle integration.
-- Runs after tenant-rls-integration.sql on a disposable PostgreSQL 16 database.
-- Synthetic users, identities, sessions, journal rows, and allocations never
-- leave the GitHub Actions database. No Preview/Neon/Production fixtures.
--
-- Covers:
--   * journal submit -> separate-person approve -> post
--   * one-time reversal and swapped debit/credit lines
--   * period overlap, close-blocking, close -> reopen -> re-close
--   * budget draft -> submit -> separate-person approve -> close guard
--   * budget-linked journal must be posted before budget/period close
--   * contribution journal allocation caps, audited correction, immutable delete
--   * receipt -> posted sale journal linkage, mismatch rejection and one-time link

\set ON_ERROR_STOP on

-- Separate CI-only writer and reviewer. Both are deliberately synthetic,
-- organization-scoped administrators so tests do not impersonate real KWT roles.
INSERT INTO v9.people (id, full_name, status)
VALUES
  ('f1000000-0000-4000-8000-000000000100', 'CI Finance Lifecycle Writer', 'active'),
  ('f2000000-0000-4000-8000-000000000200', 'CI Finance Lifecycle Reviewer', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.user_accounts (
  id, person_id, email, password_hash, status, email_verified_at, legacy_auth_eligible
) VALUES
  ('f1100000-0000-4000-8000-000000000110',
   'f1000000-0000-4000-8000-000000000100',
   'finance-lifecycle-writer@invalid.example',
   'ci-only-unused-credential',
   'active', now(), false),
  ('f2200000-0000-4000-8000-000000000220',
   'f2000000-0000-4000-8000-000000000200',
   'finance-lifecycle-reviewer@invalid.example',
   'ci-only-unused-credential',
   'active', now(), false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.role_assignments (
  id, organization_id, user_id, role_key, scope_kind, is_active, valid_from
) VALUES
  ('f3100000-0000-4000-8000-000000000310',
   v9.get_public_organization_id(),
   'f1100000-0000-4000-8000-000000000110',
   'organization_admin', 'organization', true, now() - interval '1 hour'),
  ('f3200000-0000-4000-8000-000000000320',
   v9.get_public_organization_id(),
   'f2200000-0000-4000-8000-000000000220',
   'organization_admin', 'organization', true, now() - interval '1 hour')
ON CONFLICT (id) DO NOTHING;

INSERT INTO v9.sessions (id, user_id, token_hash, expires_at)
VALUES
  ('f4100000-0000-4000-8000-000000000410',
   'f1100000-0000-4000-8000-000000000110',
   repeat('c', 64), now() + interval '2 hours'),
  ('f4200000-0000-4000-8000-000000000420',
   'f2200000-0000-4000-8000-000000000220',
   repeat('d', 64), now() + interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- A distinct credit-normal income account is used by the balanced lifecycle
-- fixtures. It is created as the CI fixture owner before runtime-role checks.
INSERT INTO v9.finance_accounts (
  id, organization_id, account_code, account_name, account_type, normal_balance,
  group_label, is_postable, status, created_by
) VALUES (
  'f2300000-0000-4000-8000-000000000230',
  v9.get_public_organization_id(),
  '99-001',
  'QA Pendapatan Siklus Keuangan',
  'pendapatan',
  'credit',
  'Pendapatan QA',
  true,
  'active',
  'f1100000-0000-4000-8000-000000000110'
)
ON CONFLICT (id) DO NOTHING;

-- Resolve the actors through the same session-bound helper as application
-- requests. This also ensures that both identities remain within the A tenant.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
DO $writer_identity$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  IF actor.user_id IS DISTINCT FROM 'f1100000-0000-4000-8000-000000000110'::uuid
    OR actor.organization_id IS DISTINCT FROM v9.get_public_organization_id()
    OR actor.role_key IS DISTINCT FROM 'organization_admin'
    OR actor.scope_kind IS DISTINCT FROM 'organization'
  THEN
    RAISE EXCEPTION 'CI finance writer session did not resolve to the expected organization administrator.';
  END IF;
END
$writer_identity$;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
DO $reviewer_identity$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM v9._request_actor() LIMIT 1;
  IF actor.user_id IS DISTINCT FROM 'f2200000-0000-4000-8000-000000000220'::uuid
    OR actor.organization_id IS DISTINCT FROM v9.get_public_organization_id()
    OR actor.role_key IS DISTINCT FROM 'organization_admin'
    OR actor.scope_kind IS DISTINCT FROM 'organization'
  THEN
    RAISE EXCEPTION 'CI finance reviewer session did not resolve to the expected organization administrator.';
  END IF;
END
$reviewer_identity$;
COMMIT;

-- First complete the pre-existing one-line QA journal so the optional first
-- finance period can be created without silently excluding any unposted entry.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);

INSERT INTO v9.finance_journal_lines (
  id, organization_id, journal_id, account_id, line_number, memo, debit, credit
) VALUES (
  'f6100000-0000-4000-8000-000000000610',
  v9.get_public_organization_id(),
  'b9000000-0000-4000-8000-00000000000b',
  'f2300000-0000-4000-8000-000000000230',
  2,
  'QA balancing revenue line',
  0,
  100
);

UPDATE v9.finance_journals
SET total_debit = 100, total_credit = 100, updated_at = now()
WHERE id = 'b9000000-0000-4000-8000-00000000000b'
  AND organization_id = v9.get_public_organization_id()
  AND status = 'draft';

WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'submitted',
      submitted_by = 'f1100000-0000-4000-8000-000000000110',
      submitted_at = now(),
      updated_at = now()
  WHERE id = 'b9000000-0000-4000-8000-00000000000b'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'draft'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_journal.submitted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated
  RETURNING id
)
SELECT count(*) AS baseline_submission_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'approved',
      approved_by = 'f2200000-0000-4000-8000-000000000220',
      approved_at = now(),
      updated_at = now()
  WHERE id = 'b9000000-0000-4000-8000-00000000000b'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'submitted'
    AND created_by <> 'f2200000-0000-4000-8000-000000000220'
  RETURNING id, organization_id, reference_no, status, created_by, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.approved', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'created_by', created_by, 'approved_by', approved_by)
  FROM updated
  RETURNING id
)
SELECT count(*) AS baseline_approval_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'posted',
      posted_by = 'f2200000-0000-4000-8000-000000000220',
      posted_at = now(),
      updated_at = now()
  WHERE id = 'b9000000-0000-4000-8000-00000000000b'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'approved'
  RETURNING id, organization_id, reference_no, journal_date,
    description, status, total_debit, total_credit, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.posted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'journal_date', journal_date,
      'description', description, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit,
      'approved_by', approved_by)
  FROM updated
  RETURNING id
)
SELECT count(*) AS baseline_post_audit_rows FROM audit;
COMMIT;

-- The database function creates the zero-total draft, copies every line,
-- computes totals in a later PL/pgSQL statement, and records the audit event.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);

DO $reversal_create$
DECLARE created_count integer;
BEGIN
  SELECT count(*)::integer INTO created_count
  FROM v9.create_finance_reversal_draft(
    'b9000000-0000-4000-8000-00000000000b',
    current_date,
    'QA reversal lifecycle',
    'f1100000-0000-4000-8000-000000000110',
    'f5100000-0000-4000-8000-000000000510'
  );
  IF created_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one eligible reversal draft; got %.', created_count;
  END IF;
END
$reversal_create$;

DO $reversal_once$
DECLARE duplicate_count integer;
BEGIN
  SELECT count(*)::integer INTO duplicate_count
  FROM v9.create_finance_reversal_draft(
    'b9000000-0000-4000-8000-00000000000b',
    current_date,
    'QA duplicate reversal must be rejected',
    'f1100000-0000-4000-8000-000000000110',
    'f5110000-0000-4000-8000-000000000511'
  );
  IF duplicate_count <> 0 THEN
    RAISE EXCEPTION 'A second reversal of the same original journal was accepted.';
  END IF;
END
$reversal_once$;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'submitted',
      submitted_by = 'f1100000-0000-4000-8000-000000000110',
      submitted_at = now(),
      updated_at = now()
  WHERE id = 'f5100000-0000-4000-8000-000000000510'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'draft'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_journal.submitted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated
  RETURNING id
)
SELECT count(*) AS reversal_submission_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'approved',
      approved_by = 'f2200000-0000-4000-8000-000000000220',
      approved_at = now(),
      updated_at = now()
  WHERE id = 'f5100000-0000-4000-8000-000000000510'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'submitted'
    AND created_by <> 'f2200000-0000-4000-8000-000000000220'
  RETURNING id, organization_id, reference_no, status, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.approved', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'approved_by', approved_by)
  FROM updated
  RETURNING id
)
SELECT count(*) AS reversal_approval_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'posted',
      posted_by = 'f2200000-0000-4000-8000-000000000220',
      posted_at = now(),
      updated_at = now()
  WHERE id = 'f5100000-0000-4000-8000-000000000510'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'approved'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.posted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated
  RETURNING id
)
SELECT count(*) AS reversal_post_audit_rows FROM audit;
COMMIT;

DO $reversal_assertions$
DECLARE
  original_row record;
  reversal_row record;
  original_line_count integer;
  reversal_line_count integer;
  line_mismatch_count integer;
BEGIN
  SELECT total_debit, total_credit INTO original_row
  FROM v9.finance_journals
  WHERE id = 'b9000000-0000-4000-8000-00000000000b'
    AND organization_id = v9.get_public_organization_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The original posted journal was not visible to the test context.';
  END IF;

  SELECT total_debit, total_credit, status, reversal_of_id INTO reversal_row
  FROM v9.finance_journals
  WHERE id = 'f5100000-0000-4000-8000-000000000510'
    AND organization_id = v9.get_public_organization_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The reversal journal was not created at its deterministic test ID.';
  END IF;

  IF reversal_row.status IS DISTINCT FROM 'posted'
    OR reversal_row.reversal_of_id IS DISTINCT FROM 'b9000000-0000-4000-8000-00000000000b'::uuid
    OR reversal_row.total_debit IS DISTINCT FROM original_row.total_credit
    OR reversal_row.total_credit IS DISTINCT FROM original_row.total_debit
  THEN
    RAISE EXCEPTION 'Posted reversal header does not exactly reverse its original journal.';
  END IF;

  SELECT count(*)::integer INTO original_line_count
  FROM v9.finance_journal_lines
  WHERE journal_id = 'b9000000-0000-4000-8000-00000000000b'
    AND organization_id = v9.get_public_organization_id();

  SELECT count(*)::integer INTO reversal_line_count
  FROM v9.finance_journal_lines
  WHERE journal_id = 'f5100000-0000-4000-8000-000000000510'
    AND organization_id = v9.get_public_organization_id();

  SELECT count(*)::integer INTO line_mismatch_count
  FROM v9.finance_journal_lines AS original_line
  LEFT JOIN v9.finance_journal_lines AS reversal_line
    ON reversal_line.journal_id = 'f5100000-0000-4000-8000-000000000510'
    AND reversal_line.organization_id = original_line.organization_id
    AND reversal_line.line_number = original_line.line_number
    AND reversal_line.account_id = original_line.account_id
  WHERE original_line.journal_id = 'b9000000-0000-4000-8000-00000000000b'
    AND original_line.organization_id = v9.get_public_organization_id()
    AND (
      reversal_line.id IS NULL
      OR reversal_line.debit IS DISTINCT FROM original_line.credit
      OR reversal_line.credit IS DISTINCT FROM original_line.debit
    );

  IF original_line_count < 2
    OR reversal_line_count <> original_line_count
    OR line_mismatch_count <> 0
  THEN
    RAISE EXCEPTION 'Reversal lines do not exactly swap every original debit/credit pair: original %, reversal %, mismatches %.',
      original_line_count, reversal_line_count, line_mismatch_count;
  END IF;
END
$reversal_assertions$;

-- The first period covers all existing, already-posted entries. Subsequent
-- lifecycle journals are created inside this explicitly open period.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
INSERT INTO v9.finance_periods (
  id, organization_id, period_code, title, date_start, date_end,
  status, created_by, updated_by
) VALUES (
  'f7000000-0000-4000-8000-000000000700',
  v9.get_public_organization_id(),
  'QA-LIFE-2026',
  'Periode Uji Siklus Keuangan QA',
  current_date - 1,
  current_date + 30,
  'open',
  'f1100000-0000-4000-8000-000000000110',
  'f1100000-0000-4000-8000-000000000110'
);
INSERT INTO v9.audit_events (
  organization_id, actor_user_id, action, entity_type, entity_id, after_state
) VALUES (
  v9.get_public_organization_id(),
  'f1100000-0000-4000-8000-000000000110',
  'finance_period.created',
  'finance_period',
  'f7000000-0000-4000-8000-000000000700',
  jsonb_build_object('period_code','QA-LIFE-2026','status','open')
);

DO $period_overlap$
DECLARE overlap_rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO v9.finance_periods (
      organization_id, period_code, title, date_start, date_end,
      status, created_by, updated_by
    ) VALUES (
      v9.get_public_organization_id(),
      'QA-LIFE-OVERLAP',
      'Periode Tumpang Tindih QA',
      current_date,
      current_date + 7,
      'open',
      'f1100000-0000-4000-8000-000000000110',
      'f1100000-0000-4000-8000-000000000110'
    );
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Finance period dates cannot overlap an existing period.' THEN
      overlap_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT overlap_rejected THEN
    RAISE EXCEPTION 'Overlapping finance period dates were accepted.';
  END IF;
END
$period_overlap$;
COMMIT;

-- Budget authoring, submission, and separate-person approval.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
INSERT INTO v9.finance_budgets (
  id, organization_id, budget_code, title, fiscal_year,
  period_start, period_end, status, created_by
) VALUES (
  'f5300000-0000-4000-8000-000000000530',
  v9.get_public_organization_id(),
  'QA-LIFE-BUD-26',
  'Anggaran Uji Siklus Keuangan QA',
  2026,
  current_date,
  current_date + 30,
  'draft',
  'f1100000-0000-4000-8000-000000000110'
);

INSERT INTO v9.finance_budget_lines (
  id, organization_id, budget_id, line_number, account_id, description, planned_amount
) VALUES (
  'f5310000-0000-4000-8000-000000000531',
  v9.get_public_organization_id(),
  'f5300000-0000-4000-8000-000000000530',
  1,
  'b1000000-0000-4000-8000-00000000000c',
  'Belanja operasional uji',
  1000
);

WITH updated AS (
  UPDATE v9.finance_budgets
  SET status = 'submitted',
      submitted_by = 'f1100000-0000-4000-8000-000000000110',
      submitted_at = now(),
      updated_at = now()
  WHERE id = 'f5300000-0000-4000-8000-000000000530'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'draft'
    AND created_by = 'f1100000-0000-4000-8000-000000000110'
  RETURNING id, organization_id, budget_code, title, status
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_budget.submitted', 'finance_budget', id::text,
    jsonb_build_object('budget_code', budget_code, 'title', title, 'status', status)
  FROM updated
  RETURNING id
)
SELECT count(*) AS budget_submission_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_budgets
  SET status = 'approved',
      approved_by = 'f2200000-0000-4000-8000-000000000220',
      approved_at = now(),
      updated_at = now()
  WHERE id = 'f5300000-0000-4000-8000-000000000530'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'submitted'
    AND created_by <> 'f2200000-0000-4000-8000-000000000220'
  RETURNING id, organization_id, budget_code, title, status, created_by, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_budget.approved', 'finance_budget', id::text,
    jsonb_build_object('budget_code', budget_code, 'title', title,
      'status', status, 'created_by', created_by, 'approved_by', approved_by)
  FROM updated
  RETURNING id
)
SELECT count(*) AS budget_approval_audit_rows FROM audit;
COMMIT;

-- Create a budget-linked unposted journal. Both budget and finance period closure
-- must fail until this exact journal is posted.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);

INSERT INTO v9.finance_journals (
  id, organization_id, journal_date, description, source_type,
  budget_id, idempotency_key, created_by
) VALUES (
  'f5400000-0000-4000-8000-000000000540',
  v9.get_public_organization_id(),
  current_date,
  'Jurnal tertaut anggaran QA',
  'manual',
  'f5300000-0000-4000-8000-000000000530',
  'qa-lifecycle-budget-journal-001',
  'f1100000-0000-4000-8000-000000000110'
);

INSERT INTO v9.finance_journal_lines (
  id, organization_id, journal_id, account_id, line_number, memo, debit, credit
) VALUES
  ('f5410000-0000-4000-8000-000000000541',
   v9.get_public_organization_id(),
   'f5400000-0000-4000-8000-000000000540',
   'b1000000-0000-4000-8000-00000000000c',
   1, 'Belanja sesuai anggaran', 100, 0),
  ('f5420000-0000-4000-8000-000000000542',
   v9.get_public_organization_id(),
   'f5400000-0000-4000-8000-000000000540',
   'f2300000-0000-4000-8000-000000000230',
   2, 'Pendapatan penyeimbang QA', 0, 100);

UPDATE v9.finance_journals
SET total_debit = 100, total_credit = 100, updated_at = now()
WHERE id = 'f5400000-0000-4000-8000-000000000540'
  AND organization_id = v9.get_public_organization_id()
  AND status = 'draft';

DO $budget_close_block$
DECLARE guard_hit boolean := false;
BEGIN
  BEGIN
    UPDATE v9.finance_budgets
    SET status = 'closed',
        closed_by = 'f2200000-0000-4000-8000-000000000220',
        closed_at = now(),
        updated_at = now()
    WHERE id = 'f5300000-0000-4000-8000-000000000530'
      AND organization_id = v9.get_public_organization_id()
      AND status = 'approved';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'A budget with unposted linked journals cannot be closed.' THEN
      guard_hit := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT guard_hit THEN
    RAISE EXCEPTION 'A budget with an unposted linked journal was closed.';
  END IF;
END
$budget_close_block$;

DO $period_close_block$
DECLARE guard_hit boolean := false;
BEGIN
  BEGIN
    UPDATE v9.finance_periods
    SET status = 'closed',
        closed_by = 'f2200000-0000-4000-8000-000000000220',
        closed_at = now(),
        close_note = 'Percobaan tutup harus tertahan oleh jurnal belum posting',
        updated_by = 'f2200000-0000-4000-8000-000000000220'
    WHERE id = 'f7000000-0000-4000-8000-000000000700'
      AND organization_id = v9.get_public_organization_id()
      AND status = 'open';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'All journals in the period must be posted before the period can be closed.' THEN
      guard_hit := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT guard_hit THEN
    RAISE EXCEPTION 'A finance period with an unposted journal was closed.';
  END IF;
END
$period_close_block$;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'submitted',
      submitted_by = 'f1100000-0000-4000-8000-000000000110',
      submitted_at = now(),
      updated_at = now()
  WHERE id = 'f5400000-0000-4000-8000-000000000540'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'draft'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_journal.submitted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated
  RETURNING id
)
SELECT count(*) AS budget_journal_submission_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'approved',
      approved_by = 'f2200000-0000-4000-8000-000000000220',
      approved_at = now(),
      updated_at = now()
  WHERE id = 'f5400000-0000-4000-8000-000000000540'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'submitted'
    AND created_by <> 'f2200000-0000-4000-8000-000000000220'
  RETURNING id, organization_id, reference_no, status, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.approved', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status, 'approved_by', approved_by)
  FROM updated
  RETURNING id
)
SELECT count(*) AS budget_journal_approval_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'posted',
      posted_by = 'f2200000-0000-4000-8000-000000000220',
      posted_at = now(),
      updated_at = now()
  WHERE id = 'f5400000-0000-4000-8000-000000000540'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'approved'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.posted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated
  RETURNING id
)
SELECT count(*) AS budget_journal_post_audit_rows FROM audit;
COMMIT;

-- The budget can now close because all its linked journals are posted.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_budgets
  SET status = 'closed',
      closed_by = 'f2200000-0000-4000-8000-000000000220',
      closed_at = now(),
      updated_at = now()
  WHERE id = 'f5300000-0000-4000-8000-000000000530'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM v9.finance_journals AS journal
      WHERE journal.organization_id = v9.finance_budgets.organization_id
        AND journal.budget_id = v9.finance_budgets.id
        AND journal.status <> 'posted'
    )
  RETURNING id, organization_id, budget_code, title, status
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_budget.closed', 'finance_budget', id::text,
    jsonb_build_object('budget_code', budget_code, 'title', title, 'status', status)
  FROM updated
  RETURNING id
)
SELECT count(*) AS budget_close_audit_rows FROM audit;
COMMIT;

DO $budget_assertions$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v9.finance_budgets
    WHERE id = 'f5300000-0000-4000-8000-000000000530'
      AND status = 'closed'
      AND approved_by = 'f2200000-0000-4000-8000-000000000220'
      AND closed_by = 'f2200000-0000-4000-8000-000000000220'
  ) THEN
    RAISE EXCEPTION 'Budget did not reach the expected approved-and-closed state.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.audit_events
    WHERE entity_type = 'finance_budget'
      AND entity_id = 'f5300000-0000-4000-8000-000000000530'
      AND action = 'finance_budget.closed'
  ) THEN
    IF (
      SELECT count(*) FROM v9.audit_events
      WHERE entity_type = 'finance_budget'
        AND entity_id = 'f5300000-0000-4000-8000-000000000530'
        AND action = 'finance_budget.closed'
    ) <> 1 THEN
      RAISE EXCEPTION 'Budget close should create exactly one audit event.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Budget close audit event is missing.';
  END IF;
END
$budget_assertions$;

-- Post a contribution journal, then exercise its member allocation cap and
-- immutable-delete rule. Allocation updates are corrections, not deletion.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
INSERT INTO v9.finance_journals (
  id, organization_id, journal_date, description, source_type, idempotency_key, created_by
) VALUES (
  'f5200000-0000-4000-8000-000000000520',
  v9.get_public_organization_id(),
  current_date,
  'Kontribusi sukarela QA',
  'contribution',
  'qa-lifecycle-contribution-001',
  'f1100000-0000-4000-8000-000000000110'
);
INSERT INTO v9.finance_journal_lines (
  id, organization_id, journal_id, account_id, line_number, memo, debit, credit
) VALUES
  ('f6210000-0000-4000-8000-000000000621',
   v9.get_public_organization_id(),
   'f5200000-0000-4000-8000-000000000520',
   'b1000000-0000-4000-8000-00000000000b',
   1, 'Kas kontribusi QA', 5000, 0),
  ('f6220000-0000-4000-8000-000000000622',
   v9.get_public_organization_id(),
   'f5200000-0000-4000-8000-000000000520',
   'f2300000-0000-4000-8000-000000000230',
   2, 'Pendapatan kontribusi QA', 0, 5000);
UPDATE v9.finance_journals
SET total_debit = 5000, total_credit = 5000, updated_at = now()
WHERE id = 'f5200000-0000-4000-8000-000000000520'
  AND organization_id = v9.get_public_organization_id()
  AND status = 'draft';
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'submitted',
      submitted_by = 'f1100000-0000-4000-8000-000000000110',
      submitted_at = now(),
      updated_at = now()
  WHERE id = 'f5200000-0000-4000-8000-000000000520'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'draft'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_journal.submitted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated RETURNING id
)
SELECT count(*) AS contribution_submission_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'approved',
      approved_by = 'f2200000-0000-4000-8000-000000000220',
      approved_at = now(),
      updated_at = now()
  WHERE id = 'f5200000-0000-4000-8000-000000000520'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'submitted'
    AND created_by <> 'f2200000-0000-4000-8000-000000000220'
  RETURNING id, organization_id, reference_no, status, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.approved', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status, 'approved_by', approved_by)
  FROM updated RETURNING id
)
SELECT count(*) AS contribution_approval_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'posted',
      posted_by = 'f2200000-0000-4000-8000-000000000220',
      posted_at = now(),
      updated_at = now()
  WHERE id = 'f5200000-0000-4000-8000-000000000520'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'approved'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.posted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated RETURNING id
)
SELECT count(*) AS contribution_post_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);

INSERT INTO v9.finance_contribution_allocations (
  id, organization_id, journal_id, membership_id, allocation_amount,
  note, created_by, updated_by
) VALUES (
  'f7100000-0000-4000-8000-000000000710',
  v9.get_public_organization_id(),
  'f5200000-0000-4000-8000-000000000520',
  '36000000-0000-4000-8000-000000000036',
  3000,
  'Alokasi awal kontribusi QA',
  'f1100000-0000-4000-8000-000000000110',
  'f1100000-0000-4000-8000-000000000110'
);

DO $allocation_cap$
DECLARE cap_rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO v9.finance_contribution_allocations (
      organization_id, journal_id, membership_id, allocation_amount,
      note, created_by, updated_by
    ) VALUES (
      v9.get_public_organization_id(),
      'f5200000-0000-4000-8000-000000000520',
      '37000000-0000-4000-8000-000000000037',
      2500,
      'Alokasi yang melampaui total kontribusi',
      'f1100000-0000-4000-8000-000000000110',
      'f1100000-0000-4000-8000-000000000110'
    );
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Member allocations cannot exceed the posted contribution revenue in the journal.' THEN
      cap_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT cap_rejected THEN
    RAISE EXCEPTION 'Contribution allocations exceeding posted revenue were accepted.';
  END IF;
END
$allocation_cap$;

WITH before_row AS MATERIALIZED (
  SELECT id, organization_id, journal_id, membership_id, allocation_amount, note
  FROM v9.finance_contribution_allocations
  WHERE id = 'f7100000-0000-4000-8000-000000000710'
    AND organization_id = v9.get_public_organization_id()
  FOR UPDATE
),
updated AS (
  UPDATE v9.finance_contribution_allocations AS allocation
  SET membership_id = '37000000-0000-4000-8000-000000000037',
      allocation_amount = 3500,
      note = 'Koreksi alokasi kontribusi QA',
      updated_by = 'f1100000-0000-4000-8000-000000000110',
      updated_at = now()
  FROM before_row
  WHERE allocation.id = before_row.id
    AND allocation.organization_id = before_row.organization_id
  RETURNING allocation.id, allocation.organization_id, allocation.journal_id,
    allocation.membership_id, allocation.allocation_amount, allocation.note
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    before_state, after_state
  )
  SELECT updated.organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_contribution_allocation.corrected',
    'finance_contribution_allocation', updated.id::text,
    jsonb_build_object('membership_id', before_row.membership_id,
      'allocation_amount', before_row.allocation_amount, 'note', before_row.note),
    jsonb_build_object('membership_id', updated.membership_id,
      'allocation_amount', updated.allocation_amount, 'note', updated.note)
  FROM updated
  INNER JOIN before_row ON before_row.id = updated.id
  RETURNING id
)
SELECT count(*) AS contribution_correction_audit_rows FROM audit;

DO $allocation_delete_guard$
DECLARE delete_rejected boolean := false;
BEGIN
  BEGIN
    DELETE FROM v9.finance_contribution_allocations
    WHERE id = 'f7100000-0000-4000-8000-000000000710'
      AND organization_id = v9.get_public_organization_id();
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Contribution allocations are retained for audit; correct an allocation with an audited update.' THEN
      delete_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT delete_rejected THEN
    RAISE EXCEPTION 'Contribution allocation delete was not rejected.';
  END IF;
END
$allocation_delete_guard$;
COMMIT;

DO $allocation_assertions$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v9.finance_contribution_allocations
    WHERE id = 'f7100000-0000-4000-8000-000000000710'
      AND membership_id = '37000000-0000-4000-8000-000000000037'
      AND allocation_amount = 3500
  ) THEN
    RAISE EXCEPTION 'Audited contribution allocation correction did not persist.';
  END IF;
  IF (
    SELECT count(*) FROM v9.audit_events
    WHERE entity_type = 'finance_contribution_allocation'
      AND entity_id = 'f7100000-0000-4000-8000-000000000710'
      AND action = 'finance_contribution_allocation.corrected'
  ) <> 1 THEN
    RAISE EXCEPTION 'Contribution allocation correction audit event is missing or duplicated.';
  END IF;
END
$allocation_assertions$;

-- Build one posted but mismatched sale journal, then one exact sale journal for
-- the pre-existing CI receipt. The receipt trigger must accept only the latter.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);

INSERT INTO v9.finance_journals (
  id, organization_id, journal_date, description, source_type,
  source_reference, idempotency_key, created_by
)
SELECT
  'f5500000-0000-4000-8000-000000000550',
  payment.organization_id,
  current_date,
  'Jurnal penjualan tidak cocok untuk uji guard',
  'sale',
  'QA-MISMATCH-' || payment.reference_no,
  'qa-lifecycle-sale-mismatch-001',
  'f1100000-0000-4000-8000-000000000110'
FROM v9.business_order_payments AS payment
WHERE payment.id = 'cb000000-0000-4000-8000-00000000000b'
  AND payment.organization_id = v9.get_public_organization_id();

INSERT INTO v9.finance_journal_lines (
  id, organization_id, journal_id, account_id, line_number, memo, debit, credit
) VALUES
  ('f5510000-0000-4000-8000-000000000551',
   v9.get_public_organization_id(),
   'f5500000-0000-4000-8000-000000000550',
   'b1000000-0000-4000-8000-00000000000b',
   1, 'Kas penjualan tidak cocok', 5000, 0),
  ('f5520000-0000-4000-8000-000000000552',
   v9.get_public_organization_id(),
   'f5500000-0000-4000-8000-000000000550',
   'f2300000-0000-4000-8000-000000000230',
   2, 'Pendapatan penjualan tidak cocok', 0, 5000);

UPDATE v9.finance_journals
SET total_debit = 5000, total_credit = 5000, updated_at = now()
WHERE id = 'f5500000-0000-4000-8000-000000000550'
  AND organization_id = v9.get_public_organization_id()
  AND status = 'draft';

INSERT INTO v9.finance_journals (
  id, organization_id, journal_date, description, source_type,
  source_reference, idempotency_key, created_by
)
SELECT
  'f5600000-0000-4000-8000-000000000560',
  payment.organization_id,
  current_date,
  'Jurnal penjualan cocok dengan kuitansi QA',
  'sale',
  payment.reference_no,
  'qa-lifecycle-sale-match-001',
  'f1100000-0000-4000-8000-000000000110'
FROM v9.business_order_payments AS payment
WHERE payment.id = 'cb000000-0000-4000-8000-00000000000b'
  AND payment.organization_id = v9.get_public_organization_id();

INSERT INTO v9.finance_journal_lines (
  id, organization_id, journal_id, account_id, line_number, memo, debit, credit
) VALUES
  ('f5610000-0000-4000-8000-000000000561',
   v9.get_public_organization_id(),
   'f5600000-0000-4000-8000-000000000560',
   'b1000000-0000-4000-8000-00000000000b',
   1, 'Kas penjualan sesuai kuitansi', 5000, 0),
  ('f5620000-0000-4000-8000-000000000562',
   v9.get_public_organization_id(),
   'f5600000-0000-4000-8000-000000000560',
   'f2300000-0000-4000-8000-000000000230',
   2, 'Pendapatan penjualan sesuai kuitansi', 0, 5000);

UPDATE v9.finance_journals
SET total_debit = 5000, total_credit = 5000, updated_at = now()
WHERE id = 'f5600000-0000-4000-8000-000000000560'
  AND organization_id = v9.get_public_organization_id()
  AND status = 'draft';
COMMIT;

-- Submit the two sale journals as the creator.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'submitted',
      submitted_by = 'f1100000-0000-4000-8000-000000000110',
      submitted_at = now(), updated_at = now()
  WHERE id IN (
    'f5500000-0000-4000-8000-000000000550',
    'f5600000-0000-4000-8000-000000000560'
  )
    AND organization_id = v9.get_public_organization_id()
    AND status = 'draft'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_journal.submitted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated RETURNING id
)
SELECT count(*) AS sale_submission_audit_rows FROM audit;
COMMIT;

-- A separate user approves and posts both sale journals.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'approved',
      approved_by = 'f2200000-0000-4000-8000-000000000220',
      approved_at = now(), updated_at = now()
  WHERE id IN (
    'f5500000-0000-4000-8000-000000000550',
    'f5600000-0000-4000-8000-000000000560'
  )
    AND organization_id = v9.get_public_organization_id()
    AND status = 'submitted'
    AND created_by <> 'f2200000-0000-4000-8000-000000000220'
  RETURNING id, organization_id, reference_no, status, approved_by
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.approved', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status, 'approved_by', approved_by)
  FROM updated RETURNING id
)
SELECT count(*) AS sale_approval_audit_rows FROM audit;

WITH updated AS (
  UPDATE v9.finance_journals
  SET status = 'posted',
      posted_by = 'f2200000-0000-4000-8000-000000000220',
      posted_at = now(), updated_at = now()
  WHERE id IN (
    'f5500000-0000-4000-8000-000000000550',
    'f5600000-0000-4000-8000-000000000560'
  )
    AND organization_id = v9.get_public_organization_id()
    AND status = 'approved'
  RETURNING id, organization_id, reference_no, status, total_debit, total_credit
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_journal.posted', 'finance_journal', id::text,
    jsonb_build_object('reference_no', reference_no, 'status', status,
      'total_debit', total_debit, 'total_credit', total_credit)
  FROM updated RETURNING id
)
SELECT count(*) AS sale_post_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
DO $wrong_receipt_link$
DECLARE mismatch_rejected boolean := false;
BEGIN
  BEGIN
    UPDATE v9.business_order_payments
    SET finance_journal_id = 'f5500000-0000-4000-8000-000000000550',
        linked_by = 'f1100000-0000-4000-8000-000000000110',
        linked_at = now()
    WHERE id = 'cb000000-0000-4000-8000-00000000000b'
      AND organization_id = v9.get_public_organization_id()
      AND finance_journal_id IS NULL;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Link only a posted sale journal whose exact debit matches this receipt and the selected cash/bank register.' THEN
      mismatch_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT mismatch_rejected THEN
    RAISE EXCEPTION 'A posted but mismatched sale journal was linked to the receipt.';
  END IF;
END
$wrong_receipt_link$;

WITH before_row AS MATERIALIZED (
  SELECT id, organization_id, reference_no, amount, finance_journal_id, order_id
  FROM v9.business_order_payments
  WHERE id = 'cb000000-0000-4000-8000-00000000000b'
    AND organization_id = v9.get_public_organization_id()
    AND finance_journal_id IS NULL
  FOR UPDATE
),
updated AS (
  UPDATE v9.business_order_payments AS payment
  SET finance_journal_id = 'f5600000-0000-4000-8000-000000000560',
      linked_by = 'f1100000-0000-4000-8000-000000000110',
      linked_at = now()
  FROM before_row
  WHERE payment.id = before_row.id
    AND payment.organization_id = before_row.organization_id
    AND payment.finance_journal_id IS NULL
  RETURNING payment.id, payment.organization_id, payment.reference_no,
    payment.amount, payment.order_id, payment.finance_journal_id
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    before_state, after_state
  )
  SELECT updated.organization_id, 'f1100000-0000-4000-8000-000000000110',
    'business_order_payment.journal_linked',
    'business_order_payment', updated.id::text,
    jsonb_build_object('reference_no', updated.reference_no,
      'amount', updated.amount, 'finance_journal_id', NULL),
    jsonb_build_object('reference_no', updated.reference_no,
      'amount', updated.amount, 'order_id', updated.order_id,
      'finance_journal_id', updated.finance_journal_id)
  FROM updated
  RETURNING id
)
SELECT count(*) AS receipt_link_audit_rows FROM audit;

DO $receipt_one_time$
DECLARE second_link_rejected boolean := false; unlink_rejected boolean := false;
BEGIN
  BEGIN
    UPDATE v9.business_order_payments
    SET finance_journal_id = 'f5500000-0000-4000-8000-000000000550',
        linked_by = 'f2200000-0000-4000-8000-000000000220',
        linked_at = now()
    WHERE id = 'cb000000-0000-4000-8000-00000000000b'
      AND organization_id = v9.get_public_organization_id();
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'A payment receipt may be linked once to a posted journal and cannot be unlinked.' THEN
      second_link_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE v9.business_order_payments
    SET finance_journal_id = NULL, linked_by = NULL, linked_at = NULL
    WHERE id = 'cb000000-0000-4000-8000-00000000000b'
      AND organization_id = v9.get_public_organization_id();
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'A payment receipt may be linked once to a posted journal and cannot be unlinked.' THEN
      unlink_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT second_link_rejected OR NOT unlink_rejected THEN
    RAISE EXCEPTION 'The receipt journal link could be replaced or removed.';
  END IF;
END
$receipt_one_time$;
COMMIT;

DO $receipt_link_assertions$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM v9.business_order_payments AS payment
    INNER JOIN v9.finance_journals AS journal
      ON journal.id = payment.finance_journal_id
      AND journal.organization_id = payment.organization_id
    WHERE payment.id = 'cb000000-0000-4000-8000-00000000000b'
      AND payment.finance_journal_id = 'f5600000-0000-4000-8000-000000000560'
      AND payment.linked_by = 'f1100000-0000-4000-8000-000000000110'
      AND journal.status = 'posted'
      AND journal.source_type = 'sale'
      AND journal.source_reference = payment.reference_no
  ) THEN
    RAISE EXCEPTION 'The payment receipt was not linked to its exact posted sale journal.';
  END IF;

  IF (
    SELECT count(*) FROM v9.audit_events
    WHERE entity_type = 'business_order_payment'
      AND entity_id = 'cb000000-0000-4000-8000-00000000000b'
      AND action = 'business_order_payment.journal_linked'
  ) <> 1 THEN
    RAISE EXCEPTION 'Receipt journal link audit event is missing or duplicated.';
  END IF;
END
$receipt_link_assertions$;

-- Budget lines are immutable after the budget leaves draft.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
DO $budget_line_immutable$
DECLARE guard_hit boolean := false;
BEGIN
  BEGIN
    UPDATE v9.finance_budget_lines
    SET planned_amount = 999999
    WHERE id = 'f5310000-0000-4000-8000-000000000531'
      AND organization_id = v9.get_public_organization_id();
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Budget lines may only be edited while the parent budget is a draft.' THEN
      guard_hit := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT guard_hit THEN
    RAISE EXCEPTION 'A submitted/approved/closed budget line was editable.';
  END IF;
END
$budget_line_immutable$;
COMMIT;

-- All entries in this period should now be posted. Close, reopen, and close a
-- second time while preserving the recorded reopen metadata. The second close
-- mirrors closeFinancePeriod after the corresponding application fix.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_periods
  SET status = 'closed',
      closed_by = 'f2200000-0000-4000-8000-000000000220',
      closed_at = now(),
      close_note = 'Penutupan periode pertama QA',
      updated_by = 'f2200000-0000-4000-8000-000000000220',
      updated_at = now()
  WHERE id = 'f7000000-0000-4000-8000-000000000700'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'open'
  RETURNING id, organization_id, period_code, title, date_start, date_end,
    status, closed_by, closed_at, close_note
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    before_state, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_period.closed', 'finance_period', id::text,
    jsonb_build_object('status','open'),
    jsonb_build_object('period_code',period_code,'title',title,
      'date_start',date_start,'date_end',date_end,'status',status,
      'closed_at',closed_at,'close_note',close_note)
  FROM updated
  RETURNING id
)
SELECT count(*) AS first_period_close_audit_rows FROM audit;
COMMIT;

BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
WITH before_row AS MATERIALIZED (
  SELECT id, organization_id, period_code, title, status,
    closed_by, closed_at, close_note
  FROM v9.finance_periods
  WHERE id = 'f7000000-0000-4000-8000-000000000700'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'closed'
  FOR UPDATE
),
updated AS (
  UPDATE v9.finance_periods AS period
  SET status = 'open',
      closed_by = NULL,
      closed_at = NULL,
      close_note = NULL,
      reopened_by = 'f1100000-0000-4000-8000-000000000110',
      reopened_at = now(),
      reopen_note = 'Pembukaan kembali untuk uji siklus QA',
      updated_by = 'f1100000-0000-4000-8000-000000000110',
      updated_at = now()
  FROM before_row
  WHERE period.id = before_row.id
    AND period.organization_id = before_row.organization_id
  RETURNING period.id, period.organization_id, period.period_code,
    period.title, period.status, period.reopened_by, period.reopened_at, period.reopen_note
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    before_state, after_state
  )
  SELECT updated.organization_id, 'f1100000-0000-4000-8000-000000000110',
    'finance_period.reopened', 'finance_period', updated.id::text,
    jsonb_build_object('status',before_row.status,'closed_by',before_row.closed_by,
      'closed_at',before_row.closed_at,'close_note',before_row.close_note),
    jsonb_build_object('period_code',updated.period_code,'title',updated.title,
      'status',updated.status,'reopened_at',updated.reopened_at,
      'reopen_note',updated.reopen_note)
  FROM updated
  INNER JOIN before_row ON before_row.id = updated.id
  RETURNING id
)
SELECT count(*) AS period_reopen_audit_rows FROM audit;
COMMIT;

-- Re-close intentionally does not overwrite reopened_by/reopened_at/reopen_note.
-- The former action implementation set them to NULL and tripped the DB guard.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('d', 64), true);
WITH updated AS (
  UPDATE v9.finance_periods
  SET status = 'closed',
      closed_by = 'f2200000-0000-4000-8000-000000000220',
      closed_at = now(),
      close_note = 'Penutupan periode kedua QA',
      updated_by = 'f2200000-0000-4000-8000-000000000220',
      updated_at = now()
  WHERE id = 'f7000000-0000-4000-8000-000000000700'
    AND organization_id = v9.get_public_organization_id()
    AND status = 'open'
  RETURNING id, organization_id, period_code, title, date_start, date_end,
    status, closed_by, closed_at, close_note, reopened_by, reopened_at, reopen_note
),
audit AS (
  INSERT INTO v9.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id,
    before_state, after_state
  )
  SELECT organization_id, 'f2200000-0000-4000-8000-000000000220',
    'finance_period.closed', 'finance_period', id::text,
    jsonb_build_object('status','open','reopened_by',reopened_by,
      'reopened_at',reopened_at,'reopen_note',reopen_note),
    jsonb_build_object('period_code',period_code,'title',title,
      'date_start',date_start,'date_end',date_end,'status',status,
      'closed_at',closed_at,'close_note',close_note,
      'reopened_by',reopened_by,'reopened_at',reopened_at,'reopen_note',reopen_note)
  FROM updated
  RETURNING id
)
SELECT count(*) AS second_period_close_audit_rows FROM audit;
COMMIT;

DO $period_final_assertions$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v9.finance_periods
    WHERE id = 'f7000000-0000-4000-8000-000000000700'
      AND status = 'closed'
      AND closed_by = 'f2200000-0000-4000-8000-000000000220'
      AND reopened_by = 'f1100000-0000-4000-8000-000000000110'
      AND reopened_at IS NOT NULL
      AND reopen_note = 'Pembukaan kembali untuk uji siklus QA'
      AND close_note = 'Penutupan periode kedua QA'
  ) THEN
    RAISE EXCEPTION 'Re-closed period lost its immutable reopen audit metadata.';
  END IF;

  IF (
    SELECT count(*) FROM v9.audit_events
    WHERE entity_type = 'finance_period'
      AND entity_id = 'f7000000-0000-4000-8000-000000000700'
      AND action = 'finance_period.closed'
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two period-close audit events.';
  END IF;

  IF (
    SELECT count(*) FROM v9.audit_events
    WHERE entity_type = 'finance_period'
      AND entity_id = 'f7000000-0000-4000-8000-000000000700'
      AND action = 'finance_period.reopened'
  ) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one period-reopen audit event.';
  END IF;
END
$period_final_assertions$;

-- A closed date range must reject a newly inserted journal.
BEGIN;
SET LOCAL ROLE v9_app;
SELECT set_config('v9.session_token_hash', repeat('c', 64), true);
DO $closed_period_journal_guard$
DECLARE guard_hit boolean := false;
BEGIN
  BEGIN
    INSERT INTO v9.finance_journals (
      organization_id, journal_date, description, source_type,
      idempotency_key, created_by
    ) VALUES (
      v9.get_public_organization_id(),
      current_date,
      'Jurnal pada periode tertutup harus ditolak',
      'manual',
      'qa-lifecycle-closed-period-block',
      'f1100000-0000-4000-8000-000000000110'
    );
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Journal date must fall inside an open finance period.' THEN
      guard_hit := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT guard_hit THEN
    RAISE EXCEPTION 'A new journal was accepted inside a closed finance period.';
  END IF;
END
$closed_period_journal_guard$;
COMMIT;

-- Final state and side-effect assertions.
DO $finance_lifecycle_final$
DECLARE pending_count integer; posted_count integer; audit_count integer;
BEGIN
  SELECT count(*)::int INTO pending_count
  FROM v9.finance_journals
  WHERE organization_id = v9.get_public_organization_id()
    AND id IN (
      'b9000000-0000-4000-8000-00000000000b',
      'f5100000-0000-4000-8000-000000000510',
      'f5200000-0000-4000-8000-000000000520',
      'f5400000-0000-4000-8000-000000000540',
      'f5500000-0000-4000-8000-000000000550',
      'f5600000-0000-4000-8000-000000000560'
    )
    AND status <> 'posted';

  SELECT count(*)::int INTO posted_count
  FROM v9.finance_journals
  WHERE organization_id = v9.get_public_organization_id()
    AND id IN (
      'b9000000-0000-4000-8000-00000000000b',
      'f5100000-0000-4000-8000-000000000510',
      'f5200000-0000-4000-8000-000000000520',
      'f5400000-0000-4000-8000-000000000540',
      'f5500000-0000-4000-8000-000000000550',
      'f5600000-0000-4000-8000-000000000560'
    )
    AND status = 'posted';

  IF pending_count <> 0 OR posted_count <> 6 THEN
    RAISE EXCEPTION 'Expected six posted lifecycle journals and no pending lifecycle journals; pending %, posted %.',
      pending_count, posted_count;
  END IF;

  SELECT count(*)::int INTO audit_count
  FROM v9.audit_events
  WHERE organization_id = v9.get_public_organization_id()
    AND actor_user_id IN (
      'f1100000-0000-4000-8000-000000000110',
      'f2200000-0000-4000-8000-000000000220'
    )
    AND action LIKE 'finance_%';

  IF audit_count < 12 THEN
    RAISE EXCEPTION 'Finance lifecycle audit trail unexpectedly incomplete; found % relevant events.', audit_count;
  END IF;
END
$finance_lifecycle_final$;

SELECT 'PASS PostgreSQL 16 finance lifecycle: journal review/post/reversal, budget guards, contribution allocation cap/correction, exact one-time receipt journal link, period close/reopen/re-close metadata, audit events.' AS result;
