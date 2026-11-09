-- v14 native ERP: controlled inter-location transfers and stocktake approval.
-- Quantity-only ledger; no valuation, cost, COGS or accounting postings are introduced.

CREATE TABLE IF NOT EXISTS workspace_v14.inventory_transfers (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
 transfer_number TEXT NOT NULL CHECK(length(transfer_number) BETWEEN 6 AND 40),
 source_location_id TEXT NOT NULL,
 destination_location_id TEXT NOT NULL,
 transfer_date DATE NOT NULL,
 note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 500),
 client_request_id TEXT NOT NULL CHECK(length(client_request_id)>=20),
 status TEXT NOT NULL DEFAULT 'posted' CHECK(status='posted'),
 created_by_user_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 UNIQUE(organization_id,transfer_number),
 UNIQUE(organization_id,client_request_id),
 FOREIGN KEY(source_location_id,organization_id)
   REFERENCES workspace_v14.inventory_locations(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(destination_location_id,organization_id)
   REFERENCES workspace_v14.inventory_locations(id,organization_id) ON DELETE RESTRICT,
 CHECK(source_location_id<>destination_location_id)
);
CREATE INDEX IF NOT EXISTS workspace_v14_inventory_transfers_history
 ON workspace_v14.inventory_transfers(organization_id,transfer_date DESC,created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.inventory_transfer_lines (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL,
 transfer_id TEXT NOT NULL,
 inventory_item_id TEXT NOT NULL,
 quantity NUMERIC(20,4) NOT NULL CHECK(quantity>0 AND quantity<=1000000000),
 unit_of_measure TEXT NOT NULL CHECK(length(unit_of_measure) BETWEEN 1 AND 30),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(transfer_id,inventory_item_id),
 FOREIGN KEY(transfer_id,organization_id)
   REFERENCES workspace_v14.inventory_transfers(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(inventory_item_id,organization_id)
   REFERENCES workspace_v14.inventory_items(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_inventory_transfer_lines_item
 ON workspace_v14.inventory_transfer_lines(organization_id,inventory_item_id,created_at DESC);

CREATE OR REPLACE FUNCTION workspace_v14.guard_inventory_transfer_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Posted inventory transfers are immutable; record a new corrective transfer.';
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_transfer_header_immutable ON workspace_v14.inventory_transfers;
CREATE TRIGGER workspace_v14_inventory_transfer_header_immutable
 BEFORE UPDATE OR DELETE ON workspace_v14.inventory_transfers
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_inventory_transfer_immutable();
DROP TRIGGER IF EXISTS workspace_v14_inventory_transfer_line_immutable ON workspace_v14.inventory_transfer_lines;
CREATE TRIGGER workspace_v14_inventory_transfer_line_immutable
 BEFORE UPDATE OR DELETE ON workspace_v14.inventory_transfer_lines
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_inventory_transfer_immutable();

CREATE OR REPLACE FUNCTION workspace_v14.apply_inventory_transfer_line()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
 transfer_row workspace_v14.inventory_transfers%ROWTYPE;
 item workspace_v14.inventory_items%ROWTYPE;
BEGIN
 SELECT * INTO transfer_row FROM workspace_v14.inventory_transfers
  WHERE id=NEW.transfer_id AND organization_id=NEW.organization_id;
 IF NOT FOUND OR transfer_row.status<>'posted' THEN
  RAISE EXCEPTION 'Inventory transfer header is missing or not posted.';
 END IF;
 SELECT * INTO item FROM workspace_v14.inventory_items
  WHERE id=NEW.inventory_item_id AND organization_id=NEW.organization_id
    AND item_type<>'equipment'
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Transfer item is not an organization stock item.'; END IF;
 IF lower(trim(item.unit_of_measure))<>lower(trim(NEW.unit_of_measure)) THEN
  RAISE EXCEPTION 'Transfer unit differs from inventory item unit.';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_locations
   WHERE id=transfer_row.source_location_id AND organization_id=NEW.organization_id AND active=TRUE
 ) OR NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_locations
   WHERE id=transfer_row.destination_location_id AND organization_id=NEW.organization_id AND active=TRUE
 ) THEN
  RAISE EXCEPTION 'Both transfer locations must be active and belong to this organization.';
 END IF;
 INSERT INTO workspace_v14.stock_movements(
  id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,
  reference_type,reference_id,occurred_at,actor_user_id,note,location_id
 ) VALUES (
  gen_random_uuid()::text,NEW.organization_id,NEW.inventory_item_id,'transfer_out',-NEW.quantity,NEW.unit_of_measure,
  'inventory_transfer_line',NEW.id,transfer_row.transfer_date::timestamptz,
  transfer_row.created_by_user_id,left('Transfer '||transfer_row.transfer_number||' · '||transfer_row.note,500),
  transfer_row.source_location_id
 );
 INSERT INTO workspace_v14.stock_movements(
  id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,
  reference_type,reference_id,occurred_at,actor_user_id,note,location_id
 ) VALUES (
  gen_random_uuid()::text,NEW.organization_id,NEW.inventory_item_id,'transfer_in',NEW.quantity,NEW.unit_of_measure,
  'inventory_transfer_line',NEW.id,transfer_row.transfer_date::timestamptz,
  transfer_row.created_by_user_id,left('Transfer '||transfer_row.transfer_number||' · '||transfer_row.note,500),
  transfer_row.destination_location_id
 );
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_transfer_apply ON workspace_v14.inventory_transfer_lines;
CREATE TRIGGER workspace_v14_inventory_transfer_apply
 AFTER INSERT ON workspace_v14.inventory_transfer_lines
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.apply_inventory_transfer_line();

CREATE OR REPLACE FUNCTION workspace_v14.assert_inventory_transfer_has_lines()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_transfer_lines
   WHERE transfer_id=NEW.id AND organization_id=NEW.organization_id
 ) THEN RAISE EXCEPTION 'Inventory transfer must contain at least one item line.'; END IF;
 RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_transfer_has_lines ON workspace_v14.inventory_transfers;
CREATE CONSTRAINT TRIGGER workspace_v14_inventory_transfer_has_lines
 AFTER INSERT ON workspace_v14.inventory_transfers
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.assert_inventory_transfer_has_lines();

CREATE TABLE IF NOT EXISTS workspace_v14.inventory_stocktakes (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES workspace_v14.organizations(id) ON DELETE RESTRICT,
 count_number TEXT NOT NULL CHECK(length(count_number) BETWEEN 6 AND 40),
 location_id TEXT NOT NULL,
 count_date DATE NOT NULL,
 status TEXT NOT NULL DEFAULT 'submitted'
   CHECK(status IN ('submitted','approved','recount_required')),
 note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 500),
 client_request_id TEXT NOT NULL CHECK(length(client_request_id)>=20),
 created_by_user_id TEXT NOT NULL,
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 approved_by_user_id TEXT,
 approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 UNIQUE(organization_id,count_number),
 UNIQUE(organization_id,client_request_id),
 FOREIGN KEY(location_id,organization_id)
   REFERENCES workspace_v14.inventory_locations(id,organization_id) ON DELETE RESTRICT,
 CHECK(
  (status='approved' AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)
  OR (status<>'approved' AND approved_by_user_id IS NULL AND approved_at IS NULL)
 )
);
CREATE INDEX IF NOT EXISTS workspace_v14_inventory_stocktakes_review
 ON workspace_v14.inventory_stocktakes(organization_id,status,submitted_at DESC);

CREATE TABLE IF NOT EXISTS workspace_v14.inventory_stocktake_lines (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL,
 stocktake_id TEXT NOT NULL,
 inventory_item_id TEXT NOT NULL,
 system_quantity NUMERIC(20,4) NOT NULL CHECK(system_quantity>=0),
 counted_quantity NUMERIC(20,4) NOT NULL CHECK(counted_quantity>=0 AND counted_quantity<=1000000000),
 unit_of_measure TEXT NOT NULL CHECK(length(unit_of_measure) BETWEEN 1 AND 30),
 note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(stocktake_id,inventory_item_id),
 FOREIGN KEY(stocktake_id,organization_id)
   REFERENCES workspace_v14.inventory_stocktakes(id,organization_id) ON DELETE RESTRICT,
 FOREIGN KEY(inventory_item_id,organization_id)
   REFERENCES workspace_v14.inventory_items(id,organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS workspace_v14_inventory_stocktake_lines_item
 ON workspace_v14.inventory_stocktake_lines(organization_id,inventory_item_id,created_at DESC);

CREATE OR REPLACE FUNCTION workspace_v14.guard_inventory_stocktake_line()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE header workspace_v14.inventory_stocktakes%ROWTYPE; item workspace_v14.inventory_items%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN
  RAISE EXCEPTION 'Stocktake count evidence is immutable.';
 END IF;
 SELECT * INTO header FROM workspace_v14.inventory_stocktakes
  WHERE id=NEW.stocktake_id AND organization_id=NEW.organization_id;
 IF NOT FOUND OR header.status<>'submitted' THEN
  RAISE EXCEPTION 'Stocktake must be submitted before count lines are recorded.';
 END IF;
 SELECT * INTO item FROM workspace_v14.inventory_items
  WHERE id=NEW.inventory_item_id AND organization_id=NEW.organization_id
    AND item_type<>'equipment';
 IF NOT FOUND THEN RAISE EXCEPTION 'Stocktake item is not an organization stock item.'; END IF;
 IF lower(trim(item.unit_of_measure))<>lower(trim(NEW.unit_of_measure)) THEN
  RAISE EXCEPTION 'Stocktake unit differs from inventory item unit.';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_locations
   WHERE id=header.location_id AND organization_id=NEW.organization_id AND active=TRUE
 ) THEN RAISE EXCEPTION 'Stocktake location must be active and belong to this organization.'; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_stocktake_line_guard ON workspace_v14.inventory_stocktake_lines;
CREATE TRIGGER workspace_v14_inventory_stocktake_line_guard
 BEFORE INSERT OR UPDATE OR DELETE ON workspace_v14.inventory_stocktake_lines
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_inventory_stocktake_line();

CREATE OR REPLACE FUNCTION workspace_v14.guard_inventory_stocktake_header()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
 line workspace_v14.inventory_stocktake_lines%ROWTYPE;
 current_quantity NUMERIC(20,4);
 delta NUMERIC(20,4);
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'Stocktake evidence is immutable.';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status','approved_by_user_id','approved_at','updated_at'])
    IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','approved_by_user_id','approved_at','updated_at']) THEN
  RAISE EXCEPTION 'Stocktake source and count details are immutable after submission.';
 END IF;
 IF OLD.status<>'submitted' OR NEW.status<>'approved' THEN
  RAISE EXCEPTION 'Only a submitted stocktake can be approved.';
 END IF;
 IF NEW.approved_by_user_id IS NULL OR NEW.approved_by_user_id=OLD.created_by_user_id THEN
  RAISE EXCEPTION 'Stocktake approval requires a different authorized reviewer.';
 END IF;
 IF NEW.approved_at IS NULL THEN RAISE EXCEPTION 'Stocktake approval timestamp is required.'; END IF;

 FOR line IN
  SELECT * FROM workspace_v14.inventory_stocktake_lines
   WHERE stocktake_id=OLD.id AND organization_id=OLD.organization_id
   ORDER BY inventory_item_id
 LOOP
  PERFORM id FROM workspace_v14.inventory_items
   WHERE id=line.inventory_item_id AND organization_id=OLD.organization_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stocktake item no longer belongs to this organization.'; END IF;
  SELECT COALESCE(SUM(quantity),0) INTO current_quantity
   FROM workspace_v14.stock_movements
   WHERE organization_id=OLD.organization_id
     AND inventory_item_id=line.inventory_item_id AND location_id=OLD.location_id;
  IF current_quantity IS DISTINCT FROM line.system_quantity THEN
   NEW.status:='recount_required';
   NEW.approved_by_user_id:=NULL;
   NEW.approved_at:=NULL;
   NEW.updated_at:=now();
   RETURN NEW;
  END IF;
 END LOOP;

 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_stocktake_lines
   WHERE stocktake_id=OLD.id AND organization_id=OLD.organization_id
 ) THEN RAISE EXCEPTION 'Stocktake must contain at least one counted item.'; END IF;

 FOR line IN
  SELECT * FROM workspace_v14.inventory_stocktake_lines
   WHERE stocktake_id=OLD.id AND organization_id=OLD.organization_id
   ORDER BY inventory_item_id
 LOOP
  delta:=line.counted_quantity-line.system_quantity;
  IF delta<>0 THEN
   INSERT INTO workspace_v14.stock_movements(
    id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,
    reference_type,reference_id,occurred_at,actor_user_id,note,location_id
   ) VALUES (
    gen_random_uuid()::text,OLD.organization_id,line.inventory_item_id,'adjustment',delta,line.unit_of_measure,
    'inventory_stocktake_line',line.id,OLD.count_date::timestamptz,NEW.approved_by_user_id,
    left('Opname '||OLD.count_number||' · '||COALESCE(line.note,OLD.note),500),OLD.location_id
   );
  END IF;
 END LOOP;
 NEW.updated_at:=now();
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_stocktake_header_guard ON workspace_v14.inventory_stocktakes;
CREATE TRIGGER workspace_v14_inventory_stocktake_header_guard
 BEFORE UPDATE OR DELETE ON workspace_v14.inventory_stocktakes
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_inventory_stocktake_header();

CREATE OR REPLACE FUNCTION workspace_v14.assert_inventory_stocktake_has_lines()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_stocktake_lines
   WHERE stocktake_id=NEW.id AND organization_id=NEW.organization_id
 ) THEN RAISE EXCEPTION 'Stocktake must contain at least one counted item.'; END IF;
 RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_stocktake_has_lines ON workspace_v14.inventory_stocktakes;
CREATE CONSTRAINT TRIGGER workspace_v14_inventory_stocktake_has_lines
 AFTER INSERT ON workspace_v14.inventory_stocktakes
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.assert_inventory_stocktake_has_lines();
