-- Agriculture & Production field records for land plots, cultivation cycles,
-- field visits, and harvest entries. No sample plot or harvest data is seeded.

CREATE TABLE IF NOT EXISTS v9.agriculture_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pertanian' CHECK (field_key = 'pertanian'),
  plot_code text NOT NULL,
  owner_membership_id uuid,
  owner_label text NOT NULL,
  hamlet text,
  village text NOT NULL,
  commodity text NOT NULL,
  land_use text,
  area_ha numeric(12,4) NOT NULL,
  location_note text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','archived')),
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key),
  UNIQUE (organization_id, field_key, plot_code),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_membership_id, organization_id)
    REFERENCES v9.memberships(id, organization_id) ON DELETE RESTRICT,
  CHECK (length(btrim(plot_code)) BETWEEN 2 AND 60),
  CHECK (length(btrim(owner_label)) BETWEEN 2 AND 160),
  CHECK (length(btrim(village)) BETWEEN 2 AND 120),
  CHECK (hamlet IS NULL OR length(btrim(hamlet)) <= 120),
  CHECK (length(btrim(commodity)) BETWEEN 2 AND 120),
  CHECK (land_use IS NULL OR length(btrim(land_use)) <= 120),
  CHECK (area_ha > 0 AND area_ha <= 100000),
  CHECK (location_note IS NULL OR length(location_note) <= 1000)
);

CREATE INDEX IF NOT EXISTS agriculture_plots_org_status_idx
  ON v9.agriculture_plots (organization_id, status, village, created_at DESC);

CREATE INDEX IF NOT EXISTS agriculture_plots_owner_idx
  ON v9.agriculture_plots (owner_membership_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v9.agriculture_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pertanian' CHECK (field_key = 'pertanian'),
  plot_id uuid NOT NULL,
  crop_name text NOT NULL,
  variety text,
  season_label text,
  planting_date date,
  planned_harvest_date date,
  harvested_on date,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','planted','growing','harvested','cancelled')),
  notes text,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id, field_key, plot_id),
  FOREIGN KEY (field_key, organization_id)
    REFERENCES v9.field_applications(field_key, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (plot_id, organization_id, field_key)
    REFERENCES v9.agriculture_plots(id, organization_id, field_key) ON DELETE RESTRICT,
  CHECK (length(btrim(crop_name)) BETWEEN 2 AND 120),
  CHECK (variety IS NULL OR length(btrim(variety)) <= 120),
  CHECK (season_label IS NULL OR length(btrim(season_label)) <= 100),
  CHECK (notes IS NULL OR length(notes) <= 3000),
  CHECK (planned_harvest_date IS NULL OR planting_date IS NULL OR planned_harvest_date >= planting_date),
  CHECK (harvested_on IS NULL OR planting_date IS NULL OR harvested_on >= planting_date),
  CHECK (
    (status = 'harvested' AND harvested_on IS NOT NULL)
    OR (status <> 'harvested' AND harvested_on IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS agriculture_cycles_plot_status_idx
  ON v9.agriculture_cycles (plot_id, status, planting_date DESC);

CREATE INDEX IF NOT EXISTS agriculture_cycles_org_status_idx
  ON v9.agriculture_cycles (organization_id, status, planned_harvest_date);

CREATE TABLE IF NOT EXISTS v9.agriculture_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pertanian' CHECK (field_key = 'pertanian'),
  plot_id uuid NOT NULL,
  cycle_id uuid,
  visit_date date NOT NULL,
  visit_type text NOT NULL
    CHECK (visit_type IN ('monitoring','budidaya','hama_penyakit','sarana','panen','lainnya')),
  observer_label text NOT NULL,
  findings text,
  recommendations text,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (plot_id, organization_id, field_key)
    REFERENCES v9.agriculture_plots(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (cycle_id, organization_id, field_key, plot_id)
    REFERENCES v9.agriculture_cycles(id, organization_id, field_key, plot_id) ON DELETE RESTRICT,
  CHECK (length(btrim(observer_label)) BETWEEN 2 AND 160),
  CHECK (findings IS NULL OR length(findings) <= 5000),
  CHECK (recommendations IS NULL OR length(recommendations) <= 3000)
);

CREATE INDEX IF NOT EXISTS agriculture_visits_plot_date_idx
  ON v9.agriculture_visits (plot_id, visit_date DESC);

CREATE INDEX IF NOT EXISTS agriculture_visits_org_date_idx
  ON v9.agriculture_visits (organization_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS v9.agriculture_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES v9.organizations(id) ON DELETE RESTRICT,
  field_key text NOT NULL DEFAULT 'pertanian' CHECK (field_key = 'pertanian'),
  plot_id uuid NOT NULL,
  cycle_id uuid NOT NULL,
  harvest_date date NOT NULL,
  commodity text NOT NULL,
  weight_kg numeric(14,3) NOT NULL,
  quality_grade text,
  moisture_percent numeric(5,2),
  recorded_by_label text NOT NULL,
  note text,
  created_by uuid REFERENCES v9.user_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (plot_id, organization_id, field_key)
    REFERENCES v9.agriculture_plots(id, organization_id, field_key) ON DELETE RESTRICT,
  FOREIGN KEY (cycle_id, organization_id, field_key, plot_id)
    REFERENCES v9.agriculture_cycles(id, organization_id, field_key, plot_id) ON DELETE RESTRICT,
  CHECK (length(btrim(commodity)) BETWEEN 2 AND 120),
  CHECK (weight_kg > 0 AND weight_kg <= 100000000),
  CHECK (quality_grade IS NULL OR length(btrim(quality_grade)) <= 60),
  CHECK (moisture_percent IS NULL OR moisture_percent BETWEEN 0 AND 100),
  CHECK (length(btrim(recorded_by_label)) BETWEEN 2 AND 160),
  CHECK (note IS NULL OR length(note) <= 3000)
);

CREATE INDEX IF NOT EXISTS agriculture_harvests_plot_date_idx
  ON v9.agriculture_harvests (plot_id, harvest_date DESC);

CREATE INDEX IF NOT EXISTS agriculture_harvests_org_date_idx
  ON v9.agriculture_harvests (organization_id, harvest_date DESC);

CREATE INDEX IF NOT EXISTS agriculture_harvests_cycle_idx
  ON v9.agriculture_harvests (cycle_id, harvest_date DESC);

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0011_agriculture_production_records.sql', 'sha256:initial-v9-agriculture-production-records')
ON CONFLICT (name) DO NOTHING;
