-- Harden the program register lifecycle.
-- Program records are corrected only while draft/planned, then advanced through
-- an explicit state machine. Cancellation replaces hard deletion.

CREATE OR REPLACE FUNCTION v9.protect_field_program()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Field programs cannot be deleted; use the cancelled status for retained audit history.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.field_key IS DISTINCT FROM OLD.field_key
    OR NEW.reference_no IS DISTINCT FROM OLD.reference_no
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Field program identity and reference fields are immutable.';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('planned','cancelled'))
    OR (OLD.status = 'planned' AND NEW.status IN ('active','paused','cancelled'))
    OR (OLD.status = 'active' AND NEW.status IN ('paused','completed','cancelled'))
    OR (OLD.status = 'paused' AND NEW.status IN ('active','cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid field program status transition: % to %.', OLD.status, NEW.status;
  END IF;

  IF (
    OLD.status NOT IN ('draft','planned')
    OR NEW.status NOT IN ('draft','planned')
  ) AND (
    NEW.workplan_id IS DISTINCT FROM OLD.workplan_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.objective IS DISTINCT FROM OLD.objective
    OR NEW.period_start IS DISTINCT FROM OLD.period_start
    OR NEW.period_end IS DISTINCT FROM OLD.period_end
    OR NEW.budget_request IS DISTINCT FROM OLD.budget_request
  ) THEN
    RAISE EXCEPTION 'Program details can only be edited while the program is draft or planned.';
  END IF;

  IF NEW.status = 'completed' AND (
    EXISTS (
      SELECT 1
      FROM v9.field_tasks AS task
      WHERE task.organization_id = OLD.organization_id
        AND task.field_key = OLD.field_key
        AND task.program_id = OLD.id
        AND task.status IN ('belum','proses')
    )
    OR EXISTS (
      SELECT 1
      FROM v9.field_activities AS activity
      WHERE activity.organization_id = OLD.organization_id
        AND activity.field_key = OLD.field_key
        AND activity.program_id = OLD.id
        AND activity.status IN ('scheduled','in_progress')
    )
  ) THEN
    RAISE EXCEPTION 'A program cannot be completed while tasks or activities remain open.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS field_programs_guard ON v9.field_programs;
CREATE TRIGGER field_programs_guard
BEFORE UPDATE OR DELETE ON v9.field_programs
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_program();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0035_field_program_lifecycle_guard.sql', 'sha256:v9-field-program-lifecycle-20261125')
ON CONFLICT (name) DO NOTHING;
