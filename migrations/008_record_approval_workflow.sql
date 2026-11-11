-- Universal record verification and Chair approval workflow.
-- Additive only: do not apply to production until isolated QA migration and UAT pass.

CREATE TABLE IF NOT EXISTS record_approval_cases (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE RESTRICT,
  record_kind TEXT NOT NULL,
  verifier_role TEXT NOT NULL CHECK (verifier_role IN ('sekretaris','bendahara')),
  status TEXT NOT NULL CHECK (status IN ('pending_verification','revision','pending_chair','approved','rejected')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TEXT NOT NULL,
  verified_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  verified_at TEXT,
  chair_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  chair_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  UNIQUE (owner, record_id),
  UNIQUE (id, owner)
);

CREATE INDEX IF NOT EXISTS record_approval_cases_owner_status
  ON record_approval_cases(owner, status, verifier_role, updated DESC);

CREATE INDEX IF NOT EXISTS record_approval_cases_owner_submitter
  ON record_approval_cases(owner, submitted_by, updated DESC);

CREATE TABLE IF NOT EXISTS record_approval_versions (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  case_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  source_updated TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL CHECK (length(snapshot_sha256) = 64),
  submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TEXT NOT NULL,
  UNIQUE (case_id, version),
  FOREIGN KEY (case_id, owner) REFERENCES record_approval_cases(id, owner) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS record_approval_versions_owner_case
  ON record_approval_versions(owner, case_id, version DESC);

CREATE TABLE IF NOT EXISTS record_approval_events (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  case_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin','ketua','sekretaris','bendahara','koordinator')),
  action TEXT NOT NULL CHECK (action IN ('submitted','resubmitted','verified','revision_requested','approved','rejected','snapshot_conflict')),
  from_status TEXT,
  to_status TEXT NOT NULL CHECK (to_status IN ('pending_verification','revision','pending_chair','approved','rejected')),
  note TEXT NOT NULL DEFAULT '',
  snapshot_sha256 TEXT CHECK (snapshot_sha256 IS NULL OR length(snapshot_sha256) = 64),
  created TEXT NOT NULL,
  FOREIGN KEY (case_id, owner) REFERENCES record_approval_cases(id, owner) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS record_approval_events_owner_case
  ON record_approval_events(owner, case_id, created DESC);

CREATE OR REPLACE FUNCTION srikandi_reject_approval_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Approval history and submitted snapshots are immutable; create a new submission version instead.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS srikandi_approval_versions_immutable ON record_approval_versions;
CREATE TRIGGER srikandi_approval_versions_immutable
  BEFORE UPDATE OR DELETE ON record_approval_versions
  FOR EACH ROW EXECUTE FUNCTION srikandi_reject_approval_mutation();

DROP TRIGGER IF EXISTS srikandi_approval_events_immutable ON record_approval_events;
CREATE TRIGGER srikandi_approval_events_immutable
  BEFORE UPDATE OR DELETE ON record_approval_events
  FOR EACH ROW EXECUTE FUNCTION srikandi_reject_approval_mutation();
