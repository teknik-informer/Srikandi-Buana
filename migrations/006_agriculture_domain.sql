-- Relational agriculture records. No operational data is seeded by this migration.
-- A member reference must point to an actual anggota record in the same workspace.
CREATE UNIQUE INDEX IF NOT EXISTS records_id_owner_kind_unique ON records(id, owner, kind);

CREATE TABLE IF NOT EXISTS agriculture_commodities (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  default_unit TEXT NOT NULL CHECK (default_unit IN ('kg','kuintal','ton','liter','buah','ikat','batang')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_owner),
  UNIQUE (workspace_owner, code)
);
CREATE INDEX IF NOT EXISTS agriculture_commodities_workspace_status ON agriculture_commodities(workspace_owner, status, name);

CREATE TABLE IF NOT EXISTS farm_parcels (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_kind TEXT NOT NULL DEFAULT 'anggota' CHECK (member_kind = 'anggota'),
  parcel_code TEXT NOT NULL CHECK (length(trim(parcel_code)) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 140),
  area_m2 NUMERIC(14,2) NOT NULL CHECK (area_m2 > 0 AND area_m2 <= 100000000),
  tenure_type TEXT NOT NULL CHECK (tenure_type IN ('owned','leased','shared','group','other')),
  location_label TEXT NOT NULL DEFAULT '' CHECK (length(location_label) <= 200),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verification_note TEXT NOT NULL DEFAULT '',
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_owner),
  UNIQUE (workspace_owner, parcel_code),
  FOREIGN KEY (member_id, workspace_owner, member_kind)
    REFERENCES records(id, owner, kind) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS farm_parcels_workspace_status ON farm_parcels(workspace_owner, status, verification_status);
CREATE INDEX IF NOT EXISTS farm_parcels_member ON farm_parcels(workspace_owner, member_id);

CREATE TABLE IF NOT EXISTS crop_cycles (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parcel_id TEXT NOT NULL,
  commodity_id TEXT NOT NULL,
  season_label TEXT NOT NULL CHECK (length(trim(season_label)) BETWEEN 2 AND 100),
  planted_area_m2 NUMERIC(14,2) NOT NULL CHECK (planted_area_m2 > 0 AND planted_area_m2 <= 100000000),
  planting_date DATE NOT NULL,
  expected_harvest_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','planted','maintenance','harvesting','completed','failed')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verification_note TEXT NOT NULL DEFAULT '',
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_owner),
  FOREIGN KEY (parcel_id, workspace_owner)
    REFERENCES farm_parcels(id, workspace_owner) ON DELETE RESTRICT,
  FOREIGN KEY (commodity_id, workspace_owner)
    REFERENCES agriculture_commodities(id, workspace_owner) ON DELETE RESTRICT,
  CHECK (expected_harvest_date IS NULL OR expected_harvest_date >= planting_date)
);
CREATE INDEX IF NOT EXISTS crop_cycles_workspace_status ON crop_cycles(workspace_owner, status, verification_status);
CREATE INDEX IF NOT EXISTS crop_cycles_parcel ON crop_cycles(workspace_owner, parcel_id, planting_date DESC);

CREATE TABLE IF NOT EXISTS harvest_records (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_cycle_id TEXT NOT NULL,
  harvest_date DATE NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0 AND quantity <= 100000000000),
  unit_code TEXT NOT NULL CHECK (unit_code IN ('kg','kuintal','ton','liter','buah','ikat','batang')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verification_note TEXT NOT NULL DEFAULT '',
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, workspace_owner),
  FOREIGN KEY (crop_cycle_id, workspace_owner)
    REFERENCES crop_cycles(id, workspace_owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS harvest_records_workspace_status ON harvest_records(workspace_owner, harvest_date DESC, verification_status);
CREATE INDEX IF NOT EXISTS harvest_records_cycle ON harvest_records(workspace_owner, crop_cycle_id, harvest_date DESC);

CREATE TABLE IF NOT EXISTS agriculture_audit (
  id TEXT PRIMARY KEY,
  workspace_owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin','ketua','sekretaris','bendahara','koordinator','anggota')),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('commodity','parcel','crop_cycle','harvest')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agriculture_audit_workspace_created ON agriculture_audit(workspace_owner, created_at DESC);
