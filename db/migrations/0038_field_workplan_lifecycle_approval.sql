-- Govern workplan submission, independent approval and closure.
-- Related programs must be closed before a workplan can be completed or cancelled.

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
    OR (OLD.status = 'submitted' AND NEW.status IN ('approved','cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('active','cancelled'))
    OR (OLD.status = 'active' AND NEW.status IN ('completed','cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid field workplan status transition: % to %.', OLD.status, NEW.status;
  END IF;

  IF (OLD.status <> 'draft' OR NEW.status <> 'draft') AND (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.objective IS DISTINCT FROM OLD.objective
    OR NEW.period_start IS DISTINCT FROM OLD.period_start
    OR NEW.period_end IS DISTINCT FROM OLD.period_end
  ) THEN
    RAISE EXCEPTION 'Workplan details can only be edited while the workplan is a draft.';
  END IF;

  IF NEW.status IN ('submitted','approved','active','completed') AND NEW.submitted_at IS NULL THEN
    RAISE EXCEPTION 'A submitted workplan must retain its submission timestamp.';
  END IF;

  IF OLD.submitted_at IS NOT NULL AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'A workplan submission timestamp is immutable.';
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

DROP TRIGGER IF EXISTS field_workplans_guard ON v9.field_workplans;
CREATE TRIGGER field_workplans_guard
BEFORE UPDATE OR DELETE ON v9.field_workplans
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_workplan();

CREATE OR REPLACE FUNCTION v9.protect_field_program_workplan_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status text;
BEGIN
  IF NEW.workplan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workplan.status
  INTO parent_status
  FROM v9.field_workplans AS workplan
  WHERE workplan.id = NEW.workplan_id
    AND workplan.organization_id = NEW.organization_id
    AND workplan.field_key = NEW.field_key
  FOR UPDATE;

  -- The composite foreign key handles missing or cross-scope workplans.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF parent_status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'A program cannot be linked to a completed or cancelled workplan.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS field_programs_workplan_status_guard ON v9.field_programs;
CREATE TRIGGER field_programs_workplan_status_guard
BEFORE INSERT OR UPDATE OF workplan_id, organization_id, field_key
ON v9.field_programs
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_program_workplan_link();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0038_field_workplan_lifecycle_approval.sql', 'sha256:v9-field-workplan-lifecycle-approval-20261125')
ON CONFLICT (name) DO NOTHING;
