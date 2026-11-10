import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {textField} from '@/features/shared/validation.mjs';
export const dynamic='force-dynamic';
const canRead=(role:string)=>['admin','ketua','bendahara'].includes(role);
const canWrite=(role:string)=>['admin','bendahara'].includes(role);
const canApprove=(role:string)=>['admin','ketua'].includes(role);
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const itemTypes=new Set(['product','raw_material','packaging','consumable']);
const locationTypes=new Set(['warehouse','storage','field','other']);
const id=()=>crypto.randomUUID();
export async function GET(request:Request){
 const c=await required(request);if(c.error)return c.error;
 if(!canRead(c.user.role))return json({error:'Akses inventaris hanya tersedia untuk pengurus yang berwenang.'},403);
 try{
  const organization=await c.db.prepare('SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?').bind(c.user.userId).first();
  if(!organization?.id)return json({error:'Ruang data organisasi belum disiapkan. Inventaris belum dapat dibuka.'},503);
  const org=String(organization.id);
  const [locations,items,balances,movements,transfers,transferLines,stocktakes,stocktakeLines]=await Promise.all([
   c.db.prepare(`SELECT l.id,l.location_code,l.name,l.location_type,l.active,l.notes,l.created_at,
    COUNT(DISTINCT m.inventory_item_id) AS item_count
    FROM workspace_v14.inventory_locations l LEFT JOIN workspace_v14.stock_movements m
      ON m.location_id=l.id AND m.organization_id=l.organization_id
    WHERE l.organization_id=? GROUP BY l.id ORDER BY l.active DESC,l.name`).bind(org).all(),
   c.db.prepare(`SELECT i.id,i.sku,i.name,i.item_type,i.unit_of_measure,i.reorder_level,i.published,i.metadata,
    COALESCE(SUM(m.quantity),0) AS on_hand,
    CASE WHEN COALESCE(SUM(m.quantity),0)<=i.reorder_level THEN TRUE ELSE FALSE END AS reorder_warning,
    COUNT(DISTINCT m.location_id) AS location_count
    FROM workspace_v14.inventory_items i LEFT JOIN workspace_v14.stock_movements m
      ON m.inventory_item_id=i.id AND m.organization_id=i.organization_id
    WHERE i.organization_id=? AND i.item_type<>'equipment'
    GROUP BY i.id ORDER BY i.name LIMIT 1000`).bind(org).all(),
   c.db.prepare(`SELECT m.inventory_item_id,m.location_id,COALESCE(l.name,'Lokasi belum dipetakan') AS location_name,i.name AS item_name,i.sku,i.unit_of_measure,
    SUM(m.quantity) AS on_hand
    FROM workspace_v14.stock_movements m
    JOIN workspace_v14.inventory_items i ON i.id=m.inventory_item_id AND i.organization_id=m.organization_id
    LEFT JOIN workspace_v14.inventory_locations l ON l.id=m.location_id AND l.organization_id=m.organization_id
    WHERE m.organization_id=? GROUP BY m.inventory_item_id,m.location_id,l.name,i.name,i.sku,i.unit_of_measure
    ORDER BY i.name,l.name`).bind(org).all(),
   c.db.prepare(`WITH movement_card AS (
    SELECT m.id,m.inventory_item_id,m.location_id,m.movement_type,m.quantity,m.unit_of_measure,
      m.reference_type,m.reference_id,m.occurred_at,m.note,i.name AS item_name,i.sku,COALESCE(l.name,'Lokasi belum dipetakan') AS location_name,
      SUM(m.quantity) OVER(PARTITION BY m.inventory_item_id,m.location_id ORDER BY m.occurred_at,m.created_at,m.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance_after
    FROM workspace_v14.stock_movements m
    JOIN workspace_v14.inventory_items i ON i.id=m.inventory_item_id AND i.organization_id=m.organization_id
    LEFT JOIN workspace_v14.inventory_locations l ON l.id=m.location_id AND l.organization_id=m.organization_id
    WHERE m.organization_id=?
   ) SELECT * FROM movement_card ORDER BY occurred_at DESC,id DESC LIMIT 500`).bind(org).all()
,
   c.db.prepare(`SELECT t.id,t.transfer_number,t.source_location_id,t.destination_location_id,
    src.name AS source_location_name,dst.name AS destination_location_name,t.transfer_date,t.note,t.status,t.created_at,
    COUNT(l.id) AS line_count,COALESCE(SUM(l.quantity),0) AS total_quantity
    FROM workspace_v14.inventory_transfers t
    JOIN workspace_v14.inventory_locations src ON src.id=t.source_location_id AND src.organization_id=t.organization_id
    JOIN workspace_v14.inventory_locations dst ON dst.id=t.destination_location_id AND dst.organization_id=t.organization_id
    LEFT JOIN workspace_v14.inventory_transfer_lines l ON l.transfer_id=t.id AND l.organization_id=t.organization_id
    WHERE t.organization_id=? GROUP BY t.id,src.name,dst.name ORDER BY t.transfer_date DESC,t.created_at DESC LIMIT 100`).bind(org).all(),
   c.db.prepare(`SELECT l.id,l.transfer_id,l.inventory_item_id,i.sku,i.name AS item_name,l.quantity,l.unit_of_measure
    FROM workspace_v14.inventory_transfer_lines l
    JOIN workspace_v14.inventory_items i ON i.id=l.inventory_item_id AND i.organization_id=l.organization_id
    WHERE l.organization_id=? ORDER BY l.created_at DESC LIMIT 1000`).bind(org).all(),
   c.db.prepare(`SELECT s.id,s.count_number,s.location_id,l.name AS location_name,s.count_date,s.status,s.note,
    s.created_by_user_id,s.submitted_at,s.approved_by_user_id,s.approved_at,s.created_at,
    COUNT(sl.id) AS line_count,COALESCE(SUM(sl.counted_quantity-sl.system_quantity),0) AS total_variance
    FROM workspace_v14.inventory_stocktakes s
    JOIN workspace_v14.inventory_locations l ON l.id=s.location_id AND l.organization_id=s.organization_id
    LEFT JOIN workspace_v14.inventory_stocktake_lines sl ON sl.stocktake_id=s.id AND sl.organization_id=s.organization_id
    WHERE s.organization_id=? GROUP BY s.id,l.name ORDER BY s.submitted_at DESC LIMIT 100`).bind(org).all(),
   c.db.prepare(`SELECT sl.id,sl.stocktake_id,sl.inventory_item_id,i.sku,i.name AS item_name,
    sl.system_quantity,sl.counted_quantity,sl.counted_quantity-sl.system_quantity AS variance,
    sl.unit_of_measure,sl.note
    FROM workspace_v14.inventory_stocktake_lines sl
    JOIN workspace_v14.inventory_items i ON i.id=sl.inventory_item_id AND i.organization_id=sl.organization_id
    WHERE sl.organization_id=? ORDER BY sl.created_at DESC LIMIT 2000`).bind(org).all()
  ]);
  return json({locations:locations.results,items:items.results,balances:balances.results,movements:movements.results,transfers:transfers.results,transferLines:transferLines.results,stocktakes:stocktakes.results.map((s:Record<string,unknown>)=>({...s,can_approve:canApprove(c.user.role)&&String(s.created_by_user_id)!==String(c.user.accountId)&&s.status==='submitted'})),stocktakeLines:stocktakeLines.results});
 }catch(e){return errorReply(e)}
}
export async function POST(request:Request){
 const c=await required(request,true);if(c.error)return c.error;
 if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat mengubah inventaris.'},403);
 try{
  const b=await readJsonObject(request,64000),now=new Date().toISOString(),owner=c.user.userId,actor=c.user.accountId;
  if(!await consumeRateLimit(c.db,'inventory:write:'+actor,100,3600000))return json({error:'Batas perubahan inventaris per jam telah tercapai.'},429);
  const organization=await c.db.prepare('SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?').bind(owner).first();
  if(!organization?.id)return json({error:'Ruang data organisasi belum disiapkan. Inventaris belum dapat diubah.'},503);
  const org=String(organization.id);
  if(b.action==='transfer'){
   const sourceLocationId=b.sourceLocationId,destinationLocationId=b.destinationLocationId;
   const transferDate=b.transferDate,clientRequestId=b.clientRequestId,note=textField(b.note,500);
   const inputLines=Array.isArray(b.lines)?b.lines:[];
   if(!uuid(sourceLocationId)||!uuid(destinationLocationId)||sourceLocationId===destinationLocationId||!validDate(transferDate)||!uuid(clientRequestId)||!note||inputLines.length<1||inputLines.length>100)return json({error:'Lokasi asal, tujuan berbeda, tanggal, alasan, kunci permintaan, dan minimal satu barang wajib diisi.'},400);
   const reused=await c.db.prepare('SELECT id,transfer_number FROM workspace_v14.inventory_transfers WHERE organization_id=? AND client_request_id=?').bind(org,clientRequestId).first();
   if(reused)return json({ok:true,reused:true,id:reused.id,transferNumber:reused.transfer_number});
   const locations=await c.db.prepare('SELECT id FROM workspace_v14.inventory_locations WHERE organization_id=? AND active=TRUE AND id IN (?,?)').bind(org,sourceLocationId,destinationLocationId).all();
   if(locations.results.length!==2)return json({error:'Lokasi asal atau tujuan tidak aktif atau bukan milik organisasi ini.'},404);
   const clean=inputLines.map((line:Record<string,unknown>)=>({inventoryItemId:line.inventoryItemId,quantity:Number(line.quantity)}));
   if(clean.some(x=>!uuid(x.inventoryItemId)||!Number.isFinite(x.quantity)||x.quantity<=0||x.quantity>1e9||Math.round(x.quantity*10000)!==x.quantity*10000)||new Set(clean.map(x=>x.inventoryItemId)).size!==clean.length)return json({error:'Rincian transfer berisi barang duplikat atau kuantitas tidak valid.'},400);
   const itemIds=clean.map(x=>String(x.inventoryItemId));
   const stockItems=await c.db.prepare(`SELECT id,sku,name,unit_of_measure FROM workspace_v14.inventory_items
    WHERE organization_id=? AND item_type<>'equipment' AND id IN (${itemIds.map(()=>'?').join(',')})`).bind(org,...itemIds).all();
   if(stockItems.results.length!==clean.length)return json({error:'Satu atau lebih barang stok tidak ditemukan pada organisasi ini.'},404);
   const itemsById=new Map(stockItems.results.map((x:Record<string,unknown>)=>[String(x.id),x]));
   const transferId=id(),number='TRF-'+transferDate.replaceAll('-','')+'-'+transferId.slice(0,6).toUpperCase();
   const statements=[c.db.prepare(`INSERT INTO workspace_v14.inventory_transfers(id,organization_id,transfer_number,source_location_id,destination_location_id,transfer_date,note,client_request_id,status,created_by_user_id,created_at)
    VALUES(?,?,?,?,?,?,?,?,'draft',?,?::timestamptz)`).bind(transferId,org,number,sourceLocationId,destinationLocationId,transferDate,note,clientRequestId,actor,now)];
   for(const line of clean){
    const item=itemsById.get(String(line.inventoryItemId)) as Record<string,unknown>;
    statements.push(c.db.prepare(`INSERT INTO workspace_v14.inventory_transfer_lines(id,organization_id,transfer_id,inventory_item_id,quantity,unit_of_measure,created_at)
     VALUES(?,?,?,?,?,?,?::timestamptz)`).bind(id(),org,transferId,line.inventoryItemId,line.quantity,String(item.unit_of_measure),now));
   }
   statements.push(c.db.prepare("UPDATE workspace_v14.inventory_transfers SET status='posted' WHERE id=? AND organization_id=? AND status='draft'").bind(transferId,org));
   statements.push(c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Transfer stok dicatat',number+' · '+String(clean.length)+' barang',now));
   await c.db.batch(statements);
   return json({ok:true,id:transferId,transferNumber:number},201);
  }
  if(b.action==='stocktake'){
   const locationId=b.locationId,countDate=b.countDate,clientRequestId=b.clientRequestId,note=textField(b.note,500);
   const inputLines=Array.isArray(b.lines)?b.lines:[];
   if(!uuid(locationId)||!validDate(countDate)||!uuid(clientRequestId)||!note||inputLines.length<1||inputLines.length>500)return json({error:'Lokasi, tanggal, alasan, kunci permintaan, dan minimal satu hasil hitung wajib diisi.'},400);
   const reused=await c.db.prepare('SELECT id,count_number,status FROM workspace_v14.inventory_stocktakes WHERE organization_id=? AND client_request_id=?').bind(org,clientRequestId).first();
   if(reused)return json({ok:true,reused:true,id:reused.id,countNumber:reused.count_number,status:reused.status});
   const location=await c.db.prepare('SELECT id FROM workspace_v14.inventory_locations WHERE id=? AND organization_id=? AND active=TRUE').bind(locationId,org).first();
   if(!location)return json({error:'Lokasi opname tidak aktif atau bukan milik organisasi ini.'},404);
   const clean=inputLines.map((line:Record<string,unknown>)=>({inventoryItemId:line.inventoryItemId,countedQuantity:Number(line.countedQuantity),lineNote:textField(line.note,300)}));
   if(clean.some(x=>!uuid(x.inventoryItemId)||!Number.isFinite(x.countedQuantity)||x.countedQuantity<0||x.countedQuantity>1e9||Math.round(x.countedQuantity*10000)!==x.countedQuantity*10000)||new Set(clean.map(x=>x.inventoryItemId)).size!==clean.length)return json({error:'Hasil opname berisi barang duplikat atau jumlah fisik tidak valid.'},400);
   const itemIds=clean.map(x=>String(x.inventoryItemId));
   const stockItems=await c.db.prepare(`SELECT id,sku,name,unit_of_measure FROM workspace_v14.inventory_items
    WHERE organization_id=? AND item_type<>'equipment' AND id IN (${itemIds.map(()=>'?').join(',')})`).bind(org,...itemIds).all();
   if(stockItems.results.length!==clean.length)return json({error:'Satu atau lebih barang stok tidak ditemukan pada organisasi ini.'},404);
   const itemsById=new Map(stockItems.results.map((x:Record<string,unknown>)=>[String(x.id),x]));
   const snapshots=await c.db.prepare(`SELECT inventory_item_id,COALESCE(SUM(quantity),0) AS system_quantity
    FROM workspace_v14.stock_movements WHERE organization_id=? AND location_id=?
      AND inventory_item_id IN (${itemIds.map(()=>'?').join(',')}) GROUP BY inventory_item_id`).bind(org,locationId,...itemIds).all();
   const balancesById=new Map(snapshots.results.map((x:Record<string,unknown>)=>[String(x.inventory_item_id),Number(x.system_quantity)]));
   const stocktakeId=id(),number='OPN-'+countDate.replaceAll('-','')+'-'+stocktakeId.slice(0,6).toUpperCase();
   const statements=[c.db.prepare(`INSERT INTO workspace_v14.inventory_stocktakes(id,organization_id,count_number,location_id,count_date,status,note,client_request_id,created_by_user_id,submitted_at,created_at,updated_at)
    VALUES(?,?,?,?,?,'draft',?,?,?,?::timestamptz,?::timestamptz,?::timestamptz)`).bind(stocktakeId,org,number,locationId,countDate,note,clientRequestId,actor,now,now,now)];
   for(const line of clean){
    const item=itemsById.get(String(line.inventoryItemId)) as Record<string,unknown>;
    statements.push(c.db.prepare(`INSERT INTO workspace_v14.inventory_stocktake_lines(id,organization_id,stocktake_id,inventory_item_id,system_quantity,counted_quantity,unit_of_measure,note,created_at)
     VALUES(?,?,?,?,?,?,?,?,?::timestamptz)`).bind(id(),org,stocktakeId,line.inventoryItemId,balancesById.get(String(line.inventoryItemId))??0,line.countedQuantity,String(item.unit_of_measure),line.lineNote||null,now));
   }
   statements.push(c.db.prepare("UPDATE workspace_v14.inventory_stocktakes SET status='submitted',submitted_at=?::timestamptz,updated_at=?::timestamptz WHERE id=? AND organization_id=? AND status='draft'").bind(now,now,stocktakeId,org));
   statements.push(c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Hasil stok opname diajukan',number+' · '+String(clean.length)+' barang',now));
   await c.db.batch(statements);
   return json({ok:true,id:stocktakeId,countNumber:number,status:'submitted'},201);
  }
  if(b.action==='approve-stocktake'){
   if(!canApprove(c.user.role))return json({error:'Persetujuan stok opname hanya untuk ketua atau administrator.'},403);
   const stocktakeId=b.stocktakeId;
   if(!uuid(stocktakeId))return json({error:'Dokumen stok opname tidak valid.'},400);
   const doc=await c.db.prepare('SELECT id,count_number,status,created_by_user_id FROM workspace_v14.inventory_stocktakes WHERE id=? AND organization_id=?').bind(stocktakeId,org).first();
   if(!doc||doc.status!=='submitted')return json({error:'Stok opname tidak ditemukan atau sudah diproses.'},409);
   if(String(doc.created_by_user_id)===String(actor))return json({error:'Pembuat stok opname tidak boleh menyetujui hasil hitungnya sendiri.'},403);
   await c.db.batch([
    c.db.prepare(`UPDATE workspace_v14.inventory_stocktakes
     SET status='approved',approved_by_user_id=?,approved_at=?::timestamptz,updated_at=?::timestamptz
     WHERE id=? AND organization_id=? AND status='submitted'`).bind(actor,now,now,stocktakeId,org),
    c.db.prepare(`INSERT INTO audit(id,owner,action,title,created)
     SELECT ?,?,?,count_number||CASE WHEN status='approved' THEN ' · disetujui' ELSE ' · perlu hitung ulang' END,?
     FROM workspace_v14.inventory_stocktakes WHERE id=? AND organization_id=?`).bind(id(),owner,'Persetujuan stok opname diproses',now,stocktakeId,org)
   ]);
   const result=await c.db.prepare('SELECT status FROM workspace_v14.inventory_stocktakes WHERE id=? AND organization_id=?').bind(stocktakeId,org).first();
   if(result?.status==='recount_required')return json({error:'Saldo berubah setelah penghitungan diajukan. Tidak ada koreksi yang diposting; lakukan stok opname baru.',status:'recount_required'},409);
   if(result?.status!=='approved')return json({error:'Stok opname belum berhasil disetujui.'},409);
   return json({ok:true,status:'approved'});
  }
  if(b.action==='map-catalog-product'){
   if(c.user.role!=='admin')return json({error:'Pemetaan katalog hanya dapat dilakukan administrator.'},403);
   const productId=b.productId,itemId=b.inventoryItemId;
   if(!uuid(productId)||!uuid(itemId))return json({error:'Produk katalog atau barang inventaris tidak valid.'},400);
   const product=await c.db.prepare('SELECT id,sku,name,unit FROM commerce_products WHERE id=? AND owner=?').bind(productId,owner).first();
   if(!product)return json({error:'Produk katalog tidak ditemukan pada organisasi ini.'},404);
   const item=await c.db.prepare("SELECT id,sku,name,unit_of_measure,source_legacy_product_id FROM workspace_v14.inventory_items WHERE id=? AND organization_id=? AND item_type='product'").bind(itemId,org).first();
   if(!item)return json({error:'Pilih barang jadi pada inventaris.'},404);
   if(String(product.unit).trim().toLowerCase()!==String(item.unit_of_measure).trim().toLowerCase())return json({error:'Satuan katalog dan inventaris harus sama persis sebelum dipetakan.'},409);
   if(item.source_legacy_product_id&&String(item.source_legacy_product_id)!==String(productId))return json({error:'Barang inventaris ini sudah dipetakan ke produk katalog lain.'},409);
   await c.db.batch([
    c.db.prepare('UPDATE workspace_v14.inventory_items SET source_legacy_product_id=?,updated_at=?::timestamptz WHERE id=? AND organization_id=? AND (source_legacy_product_id IS NULL OR source_legacy_product_id=?)').bind(productId,now,itemId,org,productId),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Produk katalog dipetakan ke inventaris',String(product.sku)+' → '+String(item.sku),now)
   ]);
   const mapped=await c.db.prepare('SELECT source_legacy_product_id FROM workspace_v14.inventory_items WHERE id=? AND organization_id=?').bind(itemId,org).first();
   if(String(mapped?.source_legacy_product_id)!==String(productId))return json({error:'Pemetaan produk berubah bersamaan. Muat ulang dan coba lagi.'},409);
   return json({ok:true});
  }
  if(b.action==='location'){
   const code=typeof b.locationCode==='string'?b.locationCode.trim().toUpperCase():'',name=textField(b.name,160),type=String(b.locationType||'warehouse'),notes=textField(b.notes,500);
   if(!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)||!name||!locationTypes.has(type))return json({error:'Kode, nama, dan jenis lokasi penyimpanan tidak valid.'},400);
   const locationId=id();
   await c.db.batch([
    c.db.prepare('INSERT INTO workspace_v14.inventory_locations(id,organization_id,location_code,name,location_type,active,notes,created_at,updated_at) VALUES(?,?,?,?,?,TRUE,?,?,?)').bind(locationId,org,code,name,type,notes||null,now,now),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Lokasi inventaris ditambahkan',code+' · '+name,now)
   ]);
   return json({ok:true,id:locationId},201);
  }
  if(b.action==='item'){
   const sku=typeof b.sku==='string'?b.sku.trim().toUpperCase():'',name=textField(b.name,160),unit=textField(b.unitOfMeasure,30),type=String(b.itemType||'raw_material'),reorder=Number(b.reorderLevel??0),opening=Number(b.openingQuantity??0),locationId=b.locationId,openingNote=textField(b.openingNote,500);
   if(!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(sku)||!name||!unit||!itemTypes.has(type)||!Number.isFinite(reorder)||reorder<0||reorder>1e9||Math.round(reorder*10000)!==reorder*10000||!Number.isFinite(opening)||opening<0||opening>1e9||Math.round(opening*10000)!==opening*10000)return json({error:'Kode, nama, satuan, kategori, batas minimum, atau saldo awal tidak valid.'},400);
   if(opening>0&&(!uuid(locationId)||!openingNote))return json({error:'Saldo awal harus memiliki lokasi penyimpanan dan alasan pencatatan.'},400);
   if(opening>0){const loc=await c.db.prepare('SELECT id FROM workspace_v14.inventory_locations WHERE id=? AND organization_id=? AND active=TRUE').bind(locationId,org).first();if(!loc)return json({error:'Lokasi saldo awal tidak aktif atau bukan milik organisasi ini.'},404);}
   const existing=await c.db.prepare('SELECT id FROM workspace_v14.inventory_items WHERE organization_id=? AND sku=?').bind(org,sku).first();
   if(existing)return json({error:'Kode barang sudah digunakan pada organisasi ini.'},409);
   const itemId=id(),statements=[c.db.prepare(`INSERT INTO workspace_v14.inventory_items(id,organization_id,sku,name,item_type,unit_of_measure,reorder_level,published,metadata,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,FALSE,'{}'::jsonb,?::timestamptz,?::timestamptz)`).bind(itemId,org,sku,name,type,unit,reorder,now,now)];
   if(opening>0)statements.push(c.db.prepare(`INSERT INTO workspace_v14.stock_movements(id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,reference_type,reference_id,occurred_at,actor_user_id,note,location_id)
    VALUES(?,?,?,'opening',?,?, 'inventory_item', ?,?::timestamptz,?,?,?)`).bind(id(),org,itemId,opening,unit,itemId,now,actor,openingNote,locationId));
   statements.push(c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Barang inventaris ditambahkan',sku+' · '+name+(opening>0?' · saldo awal '+opening+' '+unit:''),now));
   await c.db.batch(statements);
   return json({ok:true,id:itemId},201);
  }
  if(b.action==='movement'){
   const itemId=b.inventoryItemId,locationId=b.locationId,kind=String(b.movementType||''),quantity=Number(b.quantity),note=textField(b.note,500),clientRequestId=b.clientRequestId;
   if(!uuid(itemId)||!uuid(locationId)||!uuid(clientRequestId)||!Number.isFinite(quantity)||quantity<=0||quantity>1e9||Math.round(quantity*10000)!==quantity*10000||!note||!['adjustment','production_input','return'].includes(kind))return json({error:'Barang, lokasi, jenis pergerakan, kuantitas, alasan, atau kunci permintaan tidak valid.'},400);
   const item=await c.db.prepare(`SELECT id,sku,name,unit_of_measure FROM workspace_v14.inventory_items
    WHERE id=? AND organization_id=? AND item_type<>'equipment'`).bind(itemId,org).first();
   if(!item)return json({error:'Barang stok tidak ditemukan pada organisasi ini.'},404);
   const location=await c.db.prepare('SELECT id FROM workspace_v14.inventory_locations WHERE id=? AND organization_id=? AND active=TRUE').bind(locationId,org).first();
   if(!location)return json({error:'Lokasi penyimpanan tidak aktif atau bukan milik organisasi ini.'},404);
   const reused=await c.db.prepare('SELECT id FROM workspace_v14.stock_movements WHERE organization_id=? AND reference_type=\'inventory_action\' AND reference_id=?').bind(org,clientRequestId).first();
   if(reused)return json({ok:true,reused:true,movementId:reused.id});
   const signed=kind==='production_input'?-quantity:kind==='adjustment'?(b.direction==='out'?-quantity:quantity):quantity;
   const movementId=id();
   await c.db.batch([
    c.db.prepare(`INSERT INTO workspace_v14.stock_movements(id,organization_id,inventory_item_id,movement_type,quantity,unit_of_measure,reference_type,reference_id,occurred_at,actor_user_id,note,location_id)
     VALUES(?,?,?,?,?,?, 'inventory_action', ?,?::timestamptz,?,?,?)`).bind(movementId,org,itemId,kind,signed,String(item.unit_of_measure),clientRequestId,now,actor,note,locationId),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Pergerakan stok dicatat',String(item.sku)+' · '+String(item.name)+' · '+String(signed)+' '+String(item.unit_of_measure),now)
   ]);
   return json({ok:true,movementId},201);
  }
  return json({error:'Aksi inventaris tidak dikenal.'},400);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
