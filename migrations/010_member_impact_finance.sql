-- SRIKANDI BUANA v14 - Member 360 impact and member finance.
-- Additive schema only. No legacy rows are rewritten and no financial policy is
-- assumed or activated by this migration. Apply only after a Preview rehearsal.

CREATE TABLE IF NOT EXISTS workspace_v14.member_financial_policies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  policy_code TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'membership_dues','savings','loan','compensation','allowance','asset_use'
  )),
  policy_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (policy_status IN ('draft','submitted','approved','rejected','retired')),
  terms JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(terms) = 'object'),
  approval_document_id TEXT,
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, policy_code, policy_version),
  UNIQUE (id, organization_id),
  FOREIGN KEY (approval_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from),
  CHECK (policy_status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_policies_active
  ON workspace_v14.member_financial_policies(organization_id, policy_type, policy_status, effective_from);

-- Member-owned tools and facilities are not the same as the group's inventory.
CREATE TABLE IF NOT EXISTS workspace_v14.member_asset_declarations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  asset_category TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  quantity NUMERIC(20,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_of_measure TEXT NOT NULL DEFAULT 'unit',
  ownership_type TEXT NOT NULL DEFAULT 'owned'
    CHECK (ownership_type IN ('owned','shared','borrowed','rented')),
  condition_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (condition_status IN ('unverified','good','needs_repair','damaged','not_applicable')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  location_note TEXT,
  evidence_document_id TEXT,
  declared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_asset_declarations_member
  ON workspace_v14.member_asset_declarations(organization_id, member_profile_id, verification_status);

-- This table tracks custody of organization-owned inventory items by a member.
CREATE TABLE IF NOT EXISTS workspace_v14.member_asset_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  inventory_item_id TEXT NOT NULL,
  member_profile_id TEXT NOT NULL,
  quantity NUMERIC(20,4) NOT NULL CHECK (quantity > 0),
  assignment_status TEXT NOT NULL DEFAULT 'requested'
    CHECK (assignment_status IN ('requested','approved','issued','returned','lost','damaged','cancelled')),
  purpose TEXT NOT NULL DEFAULT '',
  issued_at TIMESTAMPTZ,
  expected_return_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  issued_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  received_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approval_document_id TEXT,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_json) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (inventory_item_id, organization_id)
    REFERENCES workspace_v14.inventory_items(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (approval_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id),
  CHECK (expected_return_at IS NULL OR issued_at IS NULL OR expected_return_at >= issued_at),
  CHECK (returned_at IS NULL OR issued_at IS NULL OR returned_at >= issued_at)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_asset_assignments_open
  ON workspace_v14.member_asset_assignments(organization_id, member_profile_id, assignment_status);

-- The generic payment record is the single receipt/disbursement reference for
-- dues, savings, loans, compensation, allowances and reimbursements. Full bank
-- account numbers are deliberately not stored here.
CREATE TABLE IF NOT EXISTS workspace_v14.member_payments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'membership_dues','savings_deposit','savings_withdrawal',
    'loan_disbursement','loan_repayment','salary','honorarium',
    'allowance','incentive','reimbursement','benefit','other'
  )),
  payment_direction TEXT NOT NULL CHECK (payment_direction IN ('inflow','outflow')),
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  payment_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (payment_status IN ('draft','submitted','approved','posted','paid','rejected','reversed')),
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','bank_transfer','digital','natura','other')),
  destination_account_ref TEXT,
  source_domain TEXT,
  source_record_id TEXT,
  ledger_entry_id TEXT REFERENCES public.ledger_entries(id) ON DELETE RESTRICT,
  evidence_document_id TEXT,
  requested_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  paid_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, payment_reference),
  UNIQUE (id, organization_id),
  CHECK (payment_status NOT IN ('approved','posted','paid') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK (payment_status <> 'paid' OR (paid_by IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_payments_timeline
  ON workspace_v14.member_payments(organization_id, member_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workspace_v14_member_payments_reconciliation
  ON workspace_v14.member_payments(organization_id, payment_status, payment_type, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.member_contributions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  contribution_code TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  amount_due NUMERIC(20,2) NOT NULL CHECK (amount_due >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  contribution_status TEXT NOT NULL DEFAULT 'open'
    CHECK (contribution_status IN ('open','partially_paid','paid','waived','cancelled')),
  payment_id TEXT,
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  evidence_document_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (policy_id, organization_id)
    REFERENCES workspace_v14.member_financial_policies(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id, organization_id)
    REFERENCES workspace_v14.member_payments(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, member_profile_id, contribution_code, period_start),
  UNIQUE (id, organization_id),
  CHECK (period_end >= period_start),
  CHECK (contribution_status <> 'waived' OR approved_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_contributions_due
  ON workspace_v14.member_contributions(organization_id, due_date, contribution_status);

CREATE TABLE IF NOT EXISTS workspace_v14.member_savings_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  account_code TEXT NOT NULL,
  savings_type TEXT NOT NULL CHECK (savings_type IN ('mandatory','voluntary','goal_based','other')),
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active','frozen','closed')),
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (policy_id, organization_id)
    REFERENCES workspace_v14.member_financial_policies(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, account_code),
  UNIQUE (id, organization_id),
  CHECK (closed_at IS NULL OR closed_at >= opened_at)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_savings_member
  ON workspace_v14.member_savings_accounts(organization_id, member_profile_id, account_status);

CREATE TABLE IF NOT EXISTS workspace_v14.member_savings_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  savings_account_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','adjustment','reversal')),
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  transaction_reference TEXT NOT NULL,
  transaction_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (transaction_status IN ('draft','submitted','approved','posted','rejected','reversed')),
  member_payment_id TEXT,
  ledger_entry_id TEXT REFERENCES public.ledger_entries(id) ON DELETE RESTRICT,
  evidence_document_id TEXT,
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (savings_account_id, organization_id)
    REFERENCES workspace_v14.member_savings_accounts(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_payment_id, organization_id)
    REFERENCES workspace_v14.member_payments(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, transaction_reference),
  UNIQUE (id, organization_id),
  CHECK (transaction_status NOT IN ('approved','posted') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workspace_v14_savings_transactions_account
  ON workspace_v14.member_savings_transactions(organization_id, savings_account_id, transaction_date, created_at);

CREATE TABLE IF NOT EXISTS workspace_v14.member_loans (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  loan_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  requested_principal NUMERIC(20,2) NOT NULL CHECK (requested_principal > 0),
  approved_principal NUMERIC(20,2),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  term_count INTEGER NOT NULL CHECK (term_count > 0),
  repayment_frequency TEXT NOT NULL CHECK (repayment_frequency IN ('weekly','monthly','seasonal','custom')),
  fee_terms_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(fee_terms_snapshot) = 'object'),
  loan_status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (loan_status IN ('draft','submitted','under_review','approved','rejected','agreement_pending','disbursed','repaying','closed','default_review','cancelled')),
  agreement_document_id TEXT,
  disbursement_payment_id TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (policy_id, organization_id)
    REFERENCES workspace_v14.member_financial_policies(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (agreement_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (disbursement_payment_id, organization_id)
    REFERENCES workspace_v14.member_payments(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, loan_number),
  UNIQUE (id, organization_id),
  CHECK (approved_principal IS NULL OR (approved_principal > 0 AND approved_principal <= requested_principal)),
  CHECK (loan_status NOT IN ('approved','agreement_pending','disbursed','repaying','closed') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_loans_member
  ON workspace_v14.member_loans(organization_id, member_profile_id, loan_status);

CREATE TABLE IF NOT EXISTS workspace_v14.member_loan_installments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  loan_id TEXT NOT NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date DATE NOT NULL,
  principal_due NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (principal_due >= 0),
  fee_due NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (fee_due >= 0),
  installment_status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (installment_status IN ('scheduled','partially_paid','paid','overdue','waived','cancelled')),
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (loan_id, organization_id)
    REFERENCES workspace_v14.member_loans(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (loan_id, installment_number),
  UNIQUE (id, organization_id),
  CHECK (installment_status <> 'waived' OR approved_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_loan_installments_due
  ON workspace_v14.member_loan_installments(organization_id, due_date, installment_status);

CREATE TABLE IF NOT EXISTS workspace_v14.member_loan_payments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  loan_id TEXT NOT NULL,
  installment_id TEXT,
  member_payment_id TEXT NOT NULL,
  principal_paid NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (principal_paid >= 0),
  fee_paid NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (fee_paid >= 0),
  payment_status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (payment_status IN ('submitted','approved','posted','rejected','reversed')),
  ledger_entry_id TEXT REFERENCES public.ledger_entries(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (loan_id, organization_id)
    REFERENCES workspace_v14.member_loans(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (installment_id, organization_id)
    REFERENCES workspace_v14.member_loan_installments(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_payment_id, organization_id)
    REFERENCES workspace_v14.member_payments(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (member_payment_id, organization_id),
  UNIQUE (id, organization_id),
  CHECK (principal_paid + fee_paid > 0)
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_loan_payments_loan
  ON workspace_v14.member_loan_payments(organization_id, loan_id, created_at);

CREATE TABLE IF NOT EXISTS workspace_v14.member_service_engagements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  programme_id TEXT,
  activity_id TEXT,
  fund_id TEXT,
  engagement_code TEXT NOT NULL,
  service_title TEXT NOT NULL,
  scope_description TEXT NOT NULL DEFAULT '',
  payment_basis TEXT NOT NULL CHECK (payment_basis IN ('monthly','daily','hourly','per_session','per_deliverable','volunteer','other')),
  rate_amount NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (rate_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  engagement_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (engagement_status IN ('draft','submitted','approved','active','completed','cancelled')),
  starts_at DATE,
  ends_at DATE,
  approval_document_id TEXT,
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (programme_id, organization_id)
    REFERENCES workspace_v14.programmes(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (activity_id, organization_id)
    REFERENCES workspace_v14.activities(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (fund_id, organization_id)
    REFERENCES workspace_v14.funds(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (approval_document_id, organization_id)
    REFERENCES workspace_v14.documents(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, engagement_code),
  UNIQUE (id, organization_id),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CHECK (engagement_status NOT IN ('approved','active','completed') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS workspace_v14_member_service_engagements_member
  ON workspace_v14.member_service_engagements(organization_id, member_profile_id, engagement_status);

CREATE TABLE IF NOT EXISTS workspace_v14.member_compensation_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  member_profile_id TEXT NOT NULL,
  engagement_id TEXT NOT NULL,
  payment_id TEXT,
  compensation_type TEXT NOT NULL CHECK (compensation_type IN (
    'salary','honorarium','allowance','incentive','reimbursement','benefit'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(20,2) NOT NULL CHECK (gross_amount >= 0),
  deductions_amount NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (deductions_amount >= 0),
  net_amount NUMERIC(20,2) NOT NULL CHECK (net_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  item_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (item_status IN ('draft','submitted','approved','posted','paid','rejected','reversed')),
  approved_by TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (engagement_id, organization_id)
    REFERENCES workspace_v14.member_service_engagements(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id, organization_id)
    REFERENCES workspace_v14.member_payments(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (payment_id, organization_id),
  UNIQUE (id, organization_id),
  CHECK (period_end >= period_start),
  CHECK (net_amount = gross_amount - deductions_amount),
  CHECK (item_status NOT IN ('approved','posted','paid') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK (item_status <> 'paid' OR paid_at IS NOT NULL)
);

-- Financial policy versions and posted payment records are immutable. Corrections
-- must be new versions or separate reversal entries, preserving the audit trail.
CREATE OR REPLACE FUNCTION workspace_v14.guard_member_financial_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.policy_status = 'approved' THEN
      RAISE EXCEPTION 'Approved member financial policies cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.policy_status = 'approved' THEN
    RAISE EXCEPTION 'Approved member financial policies are immutable; create a new version';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_financial_policies_immutable ON workspace_v14.member_financial_policies;
CREATE TRIGGER member_financial_policies_immutable
  BEFORE UPDATE OR DELETE ON workspace_v14.member_financial_policies
  FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_member_financial_mutation();

CREATE OR REPLACE FUNCTION workspace_v14.guard_posted_member_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.payment_status IN ('posted','paid','reversed') THEN
      RAISE EXCEPTION 'Posted member payments cannot be deleted; use a reversal';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.payment_status IN ('posted','paid','reversed') THEN
    RAISE EXCEPTION 'Posted member payments are immutable; use a reversal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_payments_immutable ON workspace_v14.member_payments;
CREATE TRIGGER member_payments_immutable
  BEFORE UPDATE OR DELETE ON workspace_v14.member_payments
  FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_posted_member_payment();
