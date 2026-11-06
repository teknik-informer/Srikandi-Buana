import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {getAuthenticatedUser} from '@/lib/auth';
import {env} from '@/lib/runtime';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {moneyInteger,textField} from '@/features/shared/validation.mjs';
import {skuValid} from '@/features/commerce/validation.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const user=await getAuthenticatedUser();const db=env.DB;if(!db)return json({error:'Katalog belum tersedia.'},503);
 const managed=user?.role==='admin'&&new URL(request.url).searchParams.get('manage')==='1';
 const rows=managed?await db.prepare('SELECT id,sku,name,description,unit,price,stock,published,updated FROM commerce_products WHERE owner=? ORDER BY updated DESC LIMIT 100').bind(user.userId).all():await db.prepare("SELECT p.id,p.sku,p.name,p.description,p.unit,p.price,p.stock FROM commerce_products p JOIN users u ON u.id=p.owner AND u.role='admin' WHERE p.published=TRUE AND u.enabled=TRUE AND LOWER(u.email)=LOWER(?) ORDER BY p.name ASC LIMIT 100").bind(process.env.ADMIN_EMAIL||'').all();
 return json({items:rows.results,manage:managed});
 }catch(e){return errorReply(e)}}
export async function POST(request:Request){const c=await required(request,true);if(c.error)return c.error;if(c.user.role!=='admin')return json({error:'Pengelolaan produk hanya untuk administrator.'},403);
 try{const b=await readJsonObject(request,4500);if(!await consumeRateLimit(c.db,'commerce:product:'+c.user.accountId,60,3600000))return json({error:'Batas perubahan katalog tercapai.'},429);const name=textField(b.name,160),sku=typeof b.sku==='string'?b.sku.trim().toUpperCase():null,unit=textField(b.unit,30);if(!name||!skuValid(sku)||!unit||!moneyInteger(b.price)||!moneyInteger(b.stock,1000000)||typeof b.published!=='boolean'||(typeof b.description!=='string'&&b.description!==undefined)||String(b.description||'').length>2000)return json({error:'Data produk tidak valid. Periksa kode, harga, stok, dan deskripsi.'},400);
 const id=crypto.randomUUID(),now=new Date().toISOString();const existing=await c.db.prepare('SELECT id FROM commerce_products WHERE owner=? AND sku=?').bind(c.user.userId,sku).first();if(existing)return json({error:'Kode produk sudah digunakan.'},409);
 await c.db.batch([c.db.prepare('INSERT INTO commerce_products(id,owner,sku,name,description,unit,price,stock,published,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,c.user.userId,sku,name,String(b.description||''),unit,b.price,b.stock,b.published,now,now),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Produk ditambahkan',sku+' · '+name,now)]);
 return json({ok:true,id},201);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}}
export async function PATCH(request:Request){const c=await required(request,true);if(c.error)return c.error;if(c.user.role!=='admin')return json({error:'Akses ditolak.'},403);
 try{const b=await readJsonObject(request,4500);if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||typeof b.expectedUpdated!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(b.expectedUpdated)||!textField(b.name,160)||!textField(b.unit,30)||!moneyInteger(b.price)||!moneyInteger(b.stock,1000000)||typeof b.published!=='boolean'||typeof b.description!=='string'||b.description.length>2000)return json({error:'Data produk tidak valid.'},400);
 const now=new Date().toISOString();const sql=`WITH target AS (
 SELECT id,owner,stock AS stock_before FROM commerce_products
 WHERE id=? AND owner=? AND updated=? FOR UPDATE
),
changed AS (
 UPDATE commerce_products p SET name=?,description=?,unit=?,price=?,stock=?,published=?,updated=?
 FROM target t WHERE p.id=t.id AND p.owner=t.owner
 RETURNING p.id,p.owner,p.updated,p.stock
),
stock_logged AS (
 INSERT INTO commerce_stock_history(id,owner,product_id,change_amount,stock_before,stock_after,created)
 SELECT ?,c.owner,c.id,c.stock-t.stock_before,t.stock_before,c.stock,?
 FROM changed c JOIN target t ON t.id=c.id AND t.owner=c.owner
 WHERE c.stock<>t.stock_before
 RETURNING product_id
)
SELECT id,updated FROM changed`;
 const row=await c.db.prepare(sql).bind(
  b.id,c.user.userId,b.expectedUpdated,
  String(b.name).trim(),b.description,String(b.unit).trim(),b.price,b.stock,b.published,now,
  crypto.randomUUID(),now
 ).first();return row?json({ok:true}):json({error:'Data produk telah berubah atau tidak ditemukan. Muat ulang daftar sebelum menyimpan.'},409);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}}
