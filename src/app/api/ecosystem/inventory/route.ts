import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {textField} from '@/features/shared/validation.mjs';
export const dynamic='force-dynamic';
const canRead=(role:string)=>['admin','ketua','bendahara'].includes(role);
const canWrite=(role:string)=>['admin','bendahara'].includes(role);
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
  const [locations,items,balances,movements]=await Promise.all([
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
   c.db.prepare(`SELECT m.inventory_item_id,m.location_id,l.name AS location_name,i.name AS item_name,i.sku,i.unit_of_measure,
    SUM(m.quantity) AS on_hand
    FROM workspace_v14.stock_movements m
    JOIN workspace_v14.inventory_items i ON i.id=m.inventory_item_id AND i.organization_id=m.organization_id
    LEFT LEFT JOIN workspace_v14.inventory_locations l ON l.id=m.location_id AND l.organization_id=m.organization_id
    WHERE m.organization_id=? GROUP BY m.inventory_item_id,m.location_id,l.name,i.name,i.sku,i.unit_of_measure
    ORDER BY i.name,l.name`).bind(org).all(),
   c.db.prepare(`WITH movement_card AS (
    SELECT m.id,m.inventory_item_id,m.location_id,m.movement_type,m.quantity,m.unit_of_measure,
      m.reference_type,m.reference_id,m.occurred_at,m.note,i.name AS item_name,i.sku,COALESCE(l.name,'Lokasi belum dipetakan') AS location_name,
      SUM(m.quantity) OVER(PARTITION BY m.inventory_item_id,m.location_id ORDER BY m.occurred_at,m.created_at,m.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance_after
    FROM workspace_v14.stock_movements m
    JOIN workspace_v14.inventory_items i ON i.id=m.inventory_item_id AND i.organization_id=m.organization_id
    JOIN workspace_v14.inventory_locations l ON l.id=m.location_id AND l.organization_id=m.organization_id
    WHERE m.organization_id=?
   ) SELECT * FROM movement_card ORDER BY occurred_at DESC,id DESC LIMIT 500`).bind(org).all()
  ]);
  return json({locations:locations.results,items:items.results,balances:balances.results,movements:movements.results});
 }catch(e){return errorReply(e)}
}
export async function POST(request:Request){
 const c=await required(request,true);if(c.error)return c.error;
 if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat mengubah inventaris.'},403);
 try{
  const b=await readJsonObject(request,9000),now=new Date().toISOString(),owner=c.user.userId,actor=c.user.accountId;
  if(!await consumeRateLimit(c.db,'inventory:write:'+actor,100,3600000))return json({error:'Batas perubahan inventaris per jam telah tercapai.'},429);
  const organization=await c.db.prepare('SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?').bind(owner).first();
  if(!organization?.id)return json({error:'Ruang data organisasi belum disiapkan. Inventaris belum dapat diubah.'},503);
  const org=String(organization.id);
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
