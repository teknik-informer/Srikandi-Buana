-- Preserve the exact source visibility scope used to create a report package.
-- Existing packages remain NULL and must be recreated before approval.
-- Apply to QA only after review; do not apply to Production without approval.

ALTER TABLE report_packages
  ADD COLUMN IF NOT EXISTS source_scope JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'report_packages_source_scope_shape'
      AND conrelid = 'report_packages'::regclass
  ) THEN
    ALTER TABLE report_packages
      ADD CONSTRAINT report_packages_source_scope_shape
      CHECK (
        source_scope IS NULL OR (
          jsonb_typeof(source_scope) = 'object'
          AND source_scope->>'mode' IN ('all', 'program_ids')
          AND (
            source_scope->>'mode' <> 'program_ids'
            OR jsonb_typeof(source_scope->'programIds') = 'array'
          )
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION srikandi_protect_report_package_snapshot() RETURNS trigger AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  RAISE EXCEPTION 'Report packages are retained as an immutable audit record.'
   USING ERRCODE = '55000';
 END IF;
 IF NEW.id IS DISTINCT FROM OLD.id
  OR NEW.owner IS DISTINCT FROM OLD.owner
  OR NEW.group_id IS DISTINCT FROM OLD.group_id
  OR NEW.title IS DISTINCT FROM OLD.title
  OR NEW.period_start IS DISTINCT FROM OLD.period_start
  OR NEW.period_end IS DISTINCT FROM OLD.period_end
  OR NEW.package_version IS DISTINCT FROM OLD.package_version
  OR NEW.source_manifest IS DISTINCT FROM OLD.source_manifest
  OR NEW.source_scope IS DISTINCT FROM OLD.source_scope
  OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
  OR NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
  OR NEW.created_by IS DISTINCT FROM OLD.created_by
  OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
  RAISE EXCEPTION 'Report package sources, scope, manifest, snapshot and hash are immutable; create a new version.'
   USING ERRCODE = '55000';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
