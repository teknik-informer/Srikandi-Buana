-- Also protect child status changes: closed programs cannot have tasks or activities reopened.

CREATE OR REPLACE FUNCTION v9.protect_field_program_child_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status text;
BEGIN
  IF NEW.program_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT program.status
  INTO parent_status
  FROM v9.field_programs AS program
  WHERE program.id = NEW.program_id
    AND program.organization_id = NEW.organization_id
    AND program.field_key = NEW.field_key
  FOR UPDATE;

  -- Composite foreign keys remain responsible for missing or cross-scope parents.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF parent_status IN ('completed','cancelled') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'A task or activity cannot be linked to a completed or cancelled program.';
    END IF;

    IF NEW.program_id IS DISTINCT FROM OLD.program_id
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.field_key IS DISTINCT FROM OLD.field_key
      OR (TG_TABLE_NAME = 'field_tasks' AND NEW.status IN ('belum','proses'))
      OR (TG_TABLE_NAME = 'field_activities' AND NEW.status IN ('scheduled','in_progress'))
    THEN
      RAISE EXCEPTION 'A closed program cannot receive new links or reopen tasks and activities.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS field_activities_program_status_guard ON v9.field_activities;
CREATE TRIGGER field_activities_program_status_guard
BEFORE INSERT OR UPDATE OF program_id, organization_id, field_key, status
ON v9.field_activities
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_program_child_link();

DROP TRIGGER IF EXISTS field_tasks_program_status_guard ON v9.field_tasks;
CREATE TRIGGER field_tasks_program_status_guard
BEFORE INSERT OR UPDATE OF program_id, organization_id, field_key, status
ON v9.field_tasks
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_program_child_link();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0037_field_program_closed_child_guard.sql', 'sha256:v9-field-program-closed-child-guard-20261125')
ON CONFLICT (name) DO NOTHING;
