-- v14 inventory document lifecycle hardening.
-- Transfer and stocktake lines can only be written while their parent is a draft.
-- Posting/submission freezes the documents; all stock ledger effects remain transactional.

ALTER TABLE workspace_v14.inventory_transfers
 DROP CONSTRAINT IF EXISTS inventory_transfers_status_check;
ALTER TABLE workspace_v14.inventory_transfers
 ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE workspace_v14.inventory_transfers
 ADD CONSTRAINT inventory_transfers_status_check CHECK(status IN ('draft','posted'));

CREATE OR REPLACE FUNCTION workspace_v14.guard_inventory_transfer_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
 line workspace_v14.inventory_transfer_lines%ROWTYPE;
 item workspace_v14.inventory_items%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'Posted inventory transfers are immutable; record a new corrective transfer.';
 END IF;
 IF OLD.status<>'draft' OR NEW.status<>'posted' THEN
  RAISE EXCEPTION 'Only a draft inventory transfer can be posted.';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status']) THEN
  RAISE EXCEPTION 'Transfer details are immutable while posting.';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_transfer_lines
   WHERE transfer_id=OLD.id AND organization_id=OLD.organization_id
 ) THEN RAISE EXCEPTION 'Inventory transfer must contain at least one item line.'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_locations
   WHERE id=OLD.source_location_id AND organization_id=OLD.organization_id AND active=TRUE
 ) OR NOT EXISTS (
  SELECT 1 FROM workspace_v14.inventory_locations
   WHERE id=OLD.destination_location_id AND organization_id=OLD.organization_id AND active=TRUE
 ) THEN
  RAISE EXCEPTION 'Both transfer locations must be active and belong to this organization.';
 END IF;

 FOR line IN
  SELECT * FROM workspace_v14.inventory_transfer_lines
   WHERE transfer_id=OLD.id AND organization_id=OLD.organization_id
   ORDER BY inventory_item_id
 LOOP
  SELECT * INTO item FROM workspace_v14.inventory_items
   WHERE id=line.inventory_item_id AND organization_id=OLD.organization_id
     AND item_type<>'equipment'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer item is not an organization stock item.'; END IF;
  IF lower(trim(item.unit_of_measure))<>lower(trim(line.unit_of_measure)) THEN
   RAISE EXCEPTION 'Transfer unit differs from inventory item unit.';
  END IF;
  INSERT INTO workspace_v14.stock_movements(
   id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,
   reference_type,reference_id,occurred_at,actor_user_id,note,location_id
  ) VALUES (
   gen_random_uuid()::text,OLD.organization_id,line.inventory_item_id,'transfer_out',-line.quantity,line.unit_of_measure,
   'inventory_transfer_line',line.id,OLD.transfer_date::timestamptz,
   OLD.created_by_user_id,left('Transfer '||OLD.transfer_number||' · '||OLD.note,500),
   OLD.source_location_id
  );
  INSERT INTO workspace_v14.stock_movements(
   id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,
   reference_type,reference_id,occurred_at,actor_user_id,note,location_id
  ) VALUES (
   gen_random_uuid()::text,OLD.organization_id,line.inventory_item_id,'transfer_in',line.quantity,line.unit_of_measure,
   'inventory_transfer_line',line.id,OLD.transfer_date::timestamptz,
   OLD.created_by_user_id,left('Transfer '||OLD.transfer_number||' · '||OLD.note,500),
   OLD.destination_location_id
  );
 END LOOP;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION workspace_v14.guard_inventory_transfer_line_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
 transfer_row workspace_v14.inventory_transfers%ROWTYPE;
 item workspace_v14.inventory_items%ROWTYPE;
BEGIN
 SELECT * INTO transfer_row FROM workspace_v14.inventory_transfers
  WHERE id=NEW.transfer_id AND organization_id=NEW.organization_id;
 IF NOT FOUND OR transfer_row.status<>'draft' THEN
  RAISE EXCEPTION 'Transfer lines can only be added while the transfer is a draft.';
 END IF;
 SELECT * INTO item FROM workspace_v14.inventory_items
  WHERE id=NEW.inventory_item_id AND organization_id=NEW.organization_id
    AND item_type<>'equipment';
 IF NOT FOUND THEN RAISE EXCEPTION 'Transfer item is not an organization stock item.'; END IF;
 IF lower(trim(item.unit_of_measure))<>lower(trim(NEW.unit_of_measure)) THEN
  RAISE EXCEPTION 'Transfer unit differs from inventory item unit.';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS workspace_v14_inventory_transfer_apply ON workspace_v14.inventory_transfer_lines;
DROP TRIGGER IF EXISTS workspace_v14_inventory_transfer_line_insert_guard ON workspace_v14.inventory_transfer_lines;
CREATE TRIGGER workspace_v14_inventory_transfer_line_insert_guard
 BEFORE INSERT ON workspace_v14.inventory_transfer_lines
 FOR EACH ROW EXECUTE FUNCTION workspace_v14.guard_inventory_transfer_line_insert();

ALTER TABLE workspace_v14.inventory_stocktakes
 DROP CONSTRAINT IF EXISTS inventory_stocktakes_status_check;
ALTER TABLE workspace_v14.inventory_stocktakes
 ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE workspace_v14.inventory_stocktakes
 ADD CONSTRAINT inventory_stocktakes_status_check
 CHECK(status IN ('draft','submitted','approved','recount_required'));

CREATE OR REPLACE FUNCTION workspace_v14.guard_inventory_stocktake_line()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE header workspace_v14.inventory_stocktakes%ROWTYPE; item workspace_v14.inventory_items%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN
  RAISE EXCEPTION 'Stocktake count evidence is immutable.';
 END IF;
 SELECT * INTO header FROM workspace_v14.inventory_stocktakes
  WHERE id=NEW.stocktake_id AND organization_id=NEW.organization_id;
 IF NOT FOUND OR header.status<>'draft' THEN
  RAISE EXCEPTION 'Stocktake lines can only be added while the stocktake is a draft.';
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

 -- Freeze all submitted count evidence at the draft -> submitted boundary.
 IF OLD.status='draft' AND NEW.status='submitted' THEN
  IF (to_jsonb(NEW)-ARRAY['status','submitted_at','updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','submitted_at','updated_at']) THEN
   RAISE EXCEPTION 'Stocktake details cannot change while submitting.';
  END IF;
  IF NOT EXISTS (
   SELECT 1 FROM workspace_v14.inventory_stocktake_lines
    WHERE stocktake_id=OLD.id AND organization_id=OLD.organization_id
  ) THEN RAISE EXCEPTION 'Stocktake must contain at least one counted item.'; END IF;
  NEW.submitted_at:=now();
  NEW.updated_at:=now();
  RETURN NEW;
 END IF;

 -- Only an independent reviewer can approve a submitted count.
 IF OLD.status<>'submitted' OR NEW.status<>'approved' THEN
  RAISE EXCEPTION 'Only a submitted stocktake can be approved.';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['status','approved_by_user_id','approved_at','updated_at'])
    IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','approved_by_user_id','approved_at','updated_at']) THEN
  RAISE EXCEPTION 'Submitted stocktake evidence is immutable.';
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
