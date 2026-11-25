-- Add a controlled revision loop to workplan review.
-- Rejected submissions keep their reviewer note; authors revise the rejected
-- draft and explicitly resubmit it. Review decisions remain in audit_events.

ALTER TABLE v9.field_workplans
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE v9.field_workplans
  DROP CONSTRAINT IF EXISTS field_workplans_status_check;

ALTER TABLE v9.field_workplans
  ADD CONSTRAINT field_workplans_status_check
  CHECK (status IN ('draft','submitted','rejected','approved','active','completed','cancelled'));

ALTER TABLE v9.field_workplans
  DROP CONSTRAINT IF EXISTS field_workplans_check1;

ALTER TABLE v9.field_workplans
  ADD CONSTRAINT field_workplans_check1
  CHECK (
    (
      status IN ('approved','active','completed')
      AND approved_at IS NOT NULL
      AND approved_by IS NOT NULL
    )
    OR (
      status IN ('draft','submitted','rejected')
      AND approved_at IS NULL
      AND approved_by IS NULL
    )
    OR (
      status = 'cancelled'
      AND (
        (approved_at IS NULL AND approved_by IS NULL)
        OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
      )
    )
  );

ALTER TABLE v9.field_workplans
  ADD CONSTRAINT field_workplans_review_state_check
  CHECK (
    (
      status = 'rejected'
      AND reviewed_at IS NOT NULL
      AND reviewed_by IS NOT NULL
      AND review_note IS NOT NULL
      AND length(btrim(review_note)) BETWEEN 3 AND 1000
    )
    OR (
      status <> 'rejected'
      AND reviewed_at IS NULL
      AND reviewed_by IS NULL
      AND review_note IS NULL
    )
  );

CREATE OR REPLACE FUNCTION v9.protect_field_workplan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Field workplans cannot be deleted; retain the record and use its status.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.field_key IS DISTINCT FROM OLD.field_key
    OR NEW.reference_no IS DISTINCT FROM OLD.reference_no
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Field workplan identity and reference fields are immutable.';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('submitted','cancelled'))
    OR (OLD.status = 'submitted' AND NEW.status IN ('approved','rejected','cancelled'))
    OR (OLD.status = 'rejected' AND NEW.status IN ('submitted','cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('active','cancelled'))
    OR (OLD.status = 'active' AND NEW.status IN ('completed','cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid field workplan status transition: % to %.', OLD.status, NEW.status;
  END IF;

  IF NOT (OLD.status IN ('draft','rejected') AND NEW.status IN ('draft','rejected')) AND (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.objective IS DISTINCT FROM OLD.objective
    OR NEW.period_start IS DISTINCT FROM OLD.period_start
    OR NEW.period_end IS DISTINCT FROM OLD.period_end
  ) THEN
    RAISE EXCEPTION 'Workplan details can only be edited while the workplan is a draft or rejected for revision.';
  END IF;

  IF NEW.status IN ('submitted','rejected','approved','active','completed') AND NEW.submitted_at IS NULL THEN
    RAISE EXCEPTION 'A submitted workplan must retain its submission timestamp.';
  END IF;

  IF OLD.submitted_at IS NOT NULL
    AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
    AND NOT (
      OLD.status = 'rejected'
      AND NEW.status = 'submitted'
      AND NEW.submitted_at > OLD.submitted_at
    )
  THEN
    RAISE EXCEPTION 'A submission timestamp can only advance when a rejected workplan is resubmitted.';
  END IF;

  IF NEW.status = 'rejected' AND (
    NEW.reviewed_at IS NULL
    OR NEW.reviewed_by IS NULL
    OR NEW.reviewed_by IS NOT DISTINCT FROM NEW.created_by
    OR NEW.review_note IS NULL
    OR length(btrim(NEW.review_note)) NOT BETWEEN 3 AND 1000
  ) THEN
    RAISE EXCEPTION 'A workplan rejection requires a reviewer different from its creator and a reason of 3 to 1000 characters.';
  END IF;

  IF NEW.status <> 'rejected' AND (
    NEW.reviewed_at IS NOT NULL
    OR NEW.reviewed_by IS NOT NULL
    OR NEW.review_note IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Review rejection metadata must be cleared when a workplan is not rejected.';
  END IF;

  IF OLD.status = 'rejected' AND NEW.status = 'rejected' AND (
    NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
    OR NEW.review_note IS DISTINCT FROM OLD.review_note
  ) THEN
    RAISE EXCEPTION 'A rejection decision is immutable; submit a revised workplan for a new review.';
  END IF;

  IF NEW.status IN ('approved','active','completed') AND (
    NEW.approved_at IS NULL
    OR NEW.approved_by IS NULL
    OR NEW.approved_by IS NOT DISTINCT FROM NEW.created_by
  ) THEN
    RAISE EXCEPTION 'A workplan must be approved by a different user than its creator.';
  END IF;

  IF OLD.approved_at IS NOT NULL AND (
    NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
  ) THEN
    RAISE EXCEPTION 'Workplan approval metadata is immutable.';
  END IF;

  IF NEW.status IN ('completed','cancelled') AND EXISTS (
    SELECT 1
    FROM v9.field_programs AS program
    WHERE program.organization_id = OLD.organization_id
      AND program.field_key = OLD.field_key
      AND program.workplan_id = OLD.id
      AND program.status NOT IN ('completed','cancelled')
  ) THEN
    RAISE EXCEPTION 'A workplan cannot be closed while linked programs remain open.';
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0039_field_workplan_revision_cycle.sql', 'sha256:v9-field-workplan-revision-cycle-20261125')
ON CONFLICT (name) DO NOTHING;
