-- SRIKANDI BUANA v14.0 — normalized group-asset custody history.
-- Additive only. Apply to a verified QA branch before enabling application writes.
-- Personal/member-owned property is deliberately excluded from group inventory.

ALTER TABLE workspace_v14.inventory_items
  ADD COLUMN IF NOT EXISTS source_legacy_asset_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_v14_inventory_legacy_asset
  ON workspace_v14.inventory_items(organization_id, source_legacy_asset_id)
  WHERE source_legacy_asset_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS workspace_v14.member_asset_movement_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
  assignment_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  member_profile_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'issued','returned','maintenance','damaged','lost','status_changed'
  )),
  from_status TEXT,
  to_status TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  actor_id TEXT REFERENCES public.users(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_json) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (assignment_id, organization_id)
    REFERENCES workspace_v14.member_asset_assignments(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (inventory_item_id, organization_id)
    REFERENCES workspace_v14.inventory_items(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (member_profile_id, organization_id)
    REFERENCES workspace_v14.member_profiles(id, organization_id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id)
);

CREATE INDEX IF NOT EXISTS workspace_v14_asset_movement_timeline
  ON workspace_v14.member_asset_movement_events(organization_id, inventory_item_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS workspace_v14_asset_movement_member
  ON workspace_v14.member_asset_movement_events(organization_id, member_profile_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION workspace_v14.guard_asset_movement_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Asset movement history is append-only; record a correcting event instead';
END;
$$;

DROP TRIGGER IF EXISTS member_asset_movement_events_immutable ON workspace_v14.member_asset_movement_events;
CREATE TRIGGER member_asset_movement_events_immutable
  BEFORE UPDATE OR DELETE ON workspace_v14.member_asset_movement_events
  FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_asset_movement_event();
