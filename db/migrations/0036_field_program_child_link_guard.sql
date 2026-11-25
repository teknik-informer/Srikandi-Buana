-- Serialize program completion against new operational work.
-- A completed or cancelled program cannot receive newly linked tasks or activities.

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

  -- A missing or cross-scope parent is rejected by the composite foreign key.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF parent_status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'A task or activity cannot be linked to a completed or cancelled program.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS field_activities_program_status_guard ON v9.field_activities;
CREATE TRIGGER field_activities_program_status_guard
BEFORE INSERT OR UPDATE OF program_id, organization_id, field_key
ON v9.field_activities
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_program_child_link();

DROP TRIGGER IF EXISTS field_tasks_program_status_guard ON v9.field_tasks;
CREATE TRIGGER field_tasks_program_status_guard
BEFORE INSERT OR UPDATE OF program_id, organization_id, field_key
ON v9.field_tasks
FOR EACH ROW
EXECUTE FUNCTION v9.protect_field_program_child_link();

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0036_field_program_child_link_guard.sql', 'sha256:v9-field-program-child-link-guard-20261125')
ON CONFLICT (name) DO NOTHING;
