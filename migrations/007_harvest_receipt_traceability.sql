-- v13 additive: link accepted commodity receipts to verified agriculture harvest records.
ALTER TABLE harvest_records
  ADD COLUMN received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0
  CHECK (received_quantity >= 0 AND received_quantity <= quantity);

CREATE TABLE IF NOT EXISTS harvest_receipt_links (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  receipt_record_id TEXT NOT NULL UNIQUE REFERENCES records(id) ON DELETE RESTRICT,
  harvest_id TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_code TEXT NOT NULL CHECK (unit_code IN ('kg','kuintal','ton','liter','buah','ikat','batang')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (harvest_id, owner)
    REFERENCES harvest_records(id, workspace_owner) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS harvest_receipt_links_owner_harvest
  ON harvest_receipt_links(owner, harvest_id, created_at DESC);

CREATE OR REPLACE FUNCTION srikandi_post_harvest_receipt(
  p_owner TEXT, p_actor TEXT, p_record_id TEXT, p_data JSONB,
  p_now TEXT, p_edit BOOLEAN, p_expected_updated TEXT
) RETURNS TEXT AS $$
DECLARE
  v_harvest RECORD;
  v_product RECORD;
  v_quantity NUMERIC(14,3);
  v_sku TEXT;
  v_unit TEXT;
  v_commodity TEXT;
BEGIN
  IF p_data->>'status' <> 'Diterima'
     OR p_data->>'basis' <> 'Hasil timbang terverifikasi'
     OR p_data->>'originType' <> 'Hasil panen kelompok' THEN
    RAISE EXCEPTION 'Penerimaan panen harus berstatus diterima dan menggunakan hasil timbang terverifikasi.';
  END IF;
  v_quantity := (p_data->>'quantity')::NUMERIC;
  IF v_quantity <= 0 OR v_quantity <> trunc(v_quantity) THEN
    RAISE EXCEPTION 'Jumlah penerimaan yang masuk persediaan harus berupa bilangan bulat positif.';
  END IF;
  v_sku := upper(trim(p_data->>'productSku'));
  v_unit := trim(p_data->>'unit');
  v_commodity := trim(p_data->>'commodity');
  IF coalesce(v_sku,'') = '' OR coalesce(p_data->>'sourceHarvestId','') = '' THEN
    RAISE EXCEPTION 'SKU persediaan dan referensi hasil panen wajib diisi.';
  END IF;

  SELECT h.id, h.quantity, h.received_quantity, h.unit_code, a.name AS commodity_name
    INTO v_harvest
    FROM harvest_records h
    JOIN crop_cycles c ON c.id=h.crop_cycle_id AND c.workspace_owner=h.workspace_owner
    JOIN farm_parcels p ON p.id=c.parcel_id AND p.workspace_owner=c.workspace_owner
    JOIN agriculture_commodities a ON a.id=c.commodity_id AND a.workspace_owner=c.workspace_owner
   WHERE h.id=p_data->>'sourceHarvestId'
     AND h.workspace_owner=p_owner
     AND h.verification_status='verified'
     AND c.verification_status='verified'
     AND p.verification_status='verified'
     AND p.status='active'
   FOR UPDATE OF h;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hasil panen tidak ditemukan atau belum terverifikasi.'; END IF;
  IF v_harvest.unit_code <> v_unit OR v_harvest.commodity_name <> v_commodity THEN
    RAISE EXCEPTION 'Komoditas atau satuan penerimaan tidak cocok dengan sumber hasil panen.';
  END IF;
  IF v_harvest.received_quantity + v_quantity > v_harvest.quantity THEN
    RAISE EXCEPTION 'Jumlah penerimaan melebihi sisa hasil panen yang belum diterima.';
  END IF;

  SELECT id, unit, stock INTO v_product FROM commerce_products
   WHERE owner=p_owner AND sku=v_sku FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKU persediaan tidak ditemukan.'; END IF;
  IF v_product.unit <> v_unit OR v_product.stock + v_quantity > 1000000 THEN
    RAISE EXCEPTION 'Satuan produk tidak cocok atau kapasitas persediaan tidak mencukupi.';
  END IF;

  IF p_edit THEN
    UPDATE records SET data=p_data::text, updated=p_now
     WHERE id=p_record_id AND owner=p_owner AND kind='lotkopi' AND updated=p_expected_updated;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catatan penerimaan berubah di sesi lain. Muat ulang sebelum menyimpan.'; END IF;
  ELSE
    INSERT INTO records(id,owner,kind,data,created,updated)
    VALUES(p_record_id,p_owner,'lotkopi',p_data::text,p_now,p_now);
  END IF;

  UPDATE harvest_records SET received_quantity=received_quantity+v_quantity, updated_at=p_now, updated_by=p_actor
   WHERE id=v_harvest.id AND workspace_owner=p_owner;
  UPDATE commerce_products SET stock=stock+v_quantity, updated=p_now
   WHERE id=v_product.id AND owner=p_owner;
  INSERT INTO harvest_receipt_links(id,owner,receipt_record_id,harvest_id,quantity,unit_code,created_at)
  VALUES(gen_random_uuid()::text,p_owner,p_record_id,v_harvest.id,v_quantity,v_unit,p_now);
  INSERT INTO audit(id,owner,action,title,created)
  VALUES(gen_random_uuid()::text,p_owner,'Penerimaan hasil disahkan','Penerimaan hasil panen terhubung ke sumber panen; stok persediaan bertambah',p_now);
  RETURN p_record_id;
END;
$$ LANGUAGE plpgsql;
