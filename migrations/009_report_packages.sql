-- Immutable, versioned report packages.
-- Additive foundation only. Do not apply to production until API/UI integration and UAT are complete.

CREATE TABLE IF NOT EXISTS report_packages (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 group_id TEXT NOT NULL CHECK(group_id IN ('operasional','keanggotaan','administrasi','keuangan','usaha','publikasi')),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 200),
 period_start DATE,
 period_end DATE,
 package_version INTEGER NOT NULL CHECK(package_version > 0),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','verified','approved','rejected','superseded')),
 source_manifest JSONB NOT NULL CHECK(jsonb_typeof(source_manifest)='array'),
 snapshot JSONB NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 snapshot_hash CHAR(64) NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 verified_by TEXT REFERENCES users(id),
 verified_at TIMESTAMPTZ,
 verification_note TEXT NOT NULL DEFAULT '',
 approved_by TEXT REFERENCES users(id),
 approved_at TIMESTAMPTZ,
 approval_note TEXT NOT NULL DEFAULT '',
 rejected_by TEXT REFERENCES users(id),
 rejected_at TIMESTAMPTZ,
 rejection_note TEXT NOT NULL DEFAULT '',
 superseded_at TIMESTAMPTZ,
 UNIQUE(owner,group_id,period_start,period_end,package_version),
 CHECK(period_start IS NULL OR period_end IS NULL OR period_start <= period_end),
 CHECK((status IN ('verified','approved') AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR status NOT IN ('verified','approved')),
 CHECK((status='approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR status<>'approved'),
 CHECK((status='rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL) OR status<>'rejected'),
 CHECK((status='superseded' AND superseded_at IS NOT NULL) OR status<>'superseded')
);
CREATE INDEX IF NOT EXISTS report_packages_owner_status_created
 ON report_packages(owner,status,created_at DESC);
CREATE INDEX IF NOT EXISTS report_packages_owner_group_period
 ON report_packages(owner,group_id,period_start,period_end,package_version DESC);

CREATE TABLE IF NOT EXISTS report_package_events (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL REFERENCES users(id),
 package_id TEXT NOT NULL REFERENCES report_packages(id) ON DELETE RESTRICT,
 actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL CHECK(action IN ('created','verified','approved','rejected','superseded')),
 from_status TEXT,
 to_status TEXT NOT NULL CHECK(to_status IN ('draft','verified','approved','rejected','superseded')),
 note TEXT NOT NULL DEFAULT '',
 snapshot_hash CHAR(64) NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_package_events_owner_package
 ON report_package_events(owner,package_id,created_at,id);

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
  OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
  OR NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
  OR NEW.created_by IS DISTINCT FROM OLD.created_by
  OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
  RAISE EXCEPTION 'Report package sources, manifest, snapshot and hash are immutable; create a new version.'
   USING ERRCODE = '55000';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_report_package_snapshot_immutable ON report_packages;
CREATE TRIGGER srikandi_report_package_snapshot_immutable
 BEFORE UPDATE OR DELETE ON report_packages
 FOR EACH ROW EXECUTE FUNCTION srikandi_protect_report_package_snapshot();

CREATE OR REPLACE FUNCTION srikandi_protect_report_package_events() RETURNS trigger AS $$
BEGIN
 RAISE EXCEPTION 'Report package history is append-only.'
  USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_report_package_events_immutable ON report_package_events;
CREATE TRIGGER srikandi_report_package_events_immutable
 BEFORE UPDATE OR DELETE ON report_package_events
 FOR EACH ROW EXECUTE FUNCTION srikandi_protect_report_package_events();
