import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {moneyInteger} from '@/features/shared/validation.mjs';
import {notifyOwner} from '@/lib/ecosystem/notifications';
import {consumeRateLimit} from '@/lib/rate-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request){const c=await required(request);if(c.error)return c.error;try{
 const where=c.user.role==='admin'?'owner=?':'owner=? AND buyer_id=?',args=c.user.role==='admin'?[c.user.userId]:[c.user.userId,c.user.accountId];const rows=await c.db.prepare('SELECT o.id,o.product_name,o.quantity,o.unit_price,o.total,o.status,o.created,b.full_name AS buyer_name FROM commerce_orders o JOIN users b ON b.id=o.buyer_id AND b.workspace_owner=o.owner WHERE '+where.replaceAll('owner=','o.owner=').replaceAll('buyer_id=','o.buyer_id=')+' ORDER BY o.created DESC LIMIT 100').bind(...args).all();return json({items:rows.results});
 }catch(e){return errorReply(e)}}
export async function POST(request:Request){const c=await required(request,true);if(c.error)return c.error;try{const b=await readJsonObject(request,1500);
 if(typeof b.productId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.productId)||typeof b.clientRequestId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.clientRequestId)||!moneyInteger(b.quantity,10000)||Number(b.quantity)===0)return json({error:'Pilih produk dan jumlah yang valid.'},400);
 if(!await consumeRateLimit(c.db,'commerce:order:'+c.user.accountId,30,3600000))return json({error:'Batas pengajuan pesanan tercapai. Coba lagi nanti.'},429);
 const existing=await c.db.prepare('SELECT id,status FROM commerce_orders WHERE owner=? AND buyer_id=? AND client_request_id=?').bind(c.user.userId,c.user.accountId,b.clientRequestId).first();if(existing)return json({ok:true,id:existing.id,status:existing.status,reused:true});
 const id=crypto.randomUUID(),now=new Date().toISOString();
 // One atomic SQL statement: a concurrent order cannot oversell stock or create an unpaid phantom order.
 const sql=`WITH reserved AS (UPDATE commerce_products SET stock=stock-?,updated=? WHERE id=? AND owner=? AND published=TRUE AND stock>=? AND price*?<=1000000000000 RETURNING id,name,price) INSERT INTO commerce_orders(id,owner,buyer_id,product_id,product_name,quantity,unit_price,total,status,client_request_id,created,updated) SELECT ?,?,?,reserved.id,reserved.name,?,reserved.price,reserved.price*?,'submitted',?,?,? FROM reserved RETURNING id,total`;
 const row=await c.db.prepare(sql).bind(b.quantity,now,b.productId,c.user.userId,b.quantity,b.quantity,id,c.user.userId,c.user.accountId,b.quantity,b.quantity,b.clientRequestId,now,now).first();
 if(!row)return json({error:'Produk tidak tersedia atau stok tidak mencukupi.'},409);
 // No payment assertion; the order is merely submitted for manual processing.
 const admins=await c.db.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='admin' AND enabled=TRUE LIMIT 1").bind(c.user.userId).all();
 for(const admin of admins.results)await notifyOwner(c.user.userId,String(admin.id),'order:'+id,'Pesanan baru','Pesanan baru menunggu pemeriksaan.','/dashboard/penjualan','pesanan');
 return json({ok:true,id,total:row.total,status:'submitted'},201);
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return errorReply(e)}}
/** Administrator fulfils or cancels an order; cancellation restores reserved stock exactly once. */
export async function PATCH(request:Request){const c=await required(request,true);if(c.error)return c.error;if(c.user.role!=='admin')return json({error:'Hanya administrator yang dapat mengubah status pesanan.'},403);
 try{const b=await readJsonObject(request,1000);if(!await consumeRateLimit(c.db,'commerce:order-status:'+c.user.accountId,90,3600000))return json({error:'Batas perubahan status pesanan tercapai.'},429);if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||!['confirmed','cancelled','completed'].includes(String(b.action)))return json({error:'Pesanan atau tindakan tidak valid.'},400);
 const now=new Date().toISOString();
 if(b.action==='cancelled'){
  const buyer=await c.db.prepare('SELECT buyer_id FROM commerce_orders WHERE id=? AND owner=?').bind(b.id,c.user.userId).first();
  const row=await c.db.prepare("WITH changed AS (UPDATE commerce_orders SET status='cancelled',updated=? WHERE id=? AND owner=? AND status IN ('submitted','confirmed') RETURNING id,product_id,quantity), restored AS (UPDATE commerce_products p SET stock=p.stock+changed.quantity,updated=? FROM changed WHERE p.id=changed.product_id AND p.owner=? RETURNING p.id) SELECT id FROM restored").bind(now,b.id,c.user.userId,now,c.user.userId).first();
  if(row&&buyer)await notifyOwner(c.user.userId,String(buyer.buyer_id),'order:'+b.id+':cancelled','Pesanan dibatalkan','Pesanan dibatalkan oleh pengelola. Stok telah dikembalikan.','/dashboard/penjualan','pesanan');
  return row?json({ok:true}):json({error:'Pesanan tidak ditemukan atau tidak dapat dibatalkan.'},409);
 }
 const before=b.action==='confirmed'?'submitted':'confirmed';const row=await c.db.prepare('UPDATE commerce_orders SET status=?,updated=? WHERE id=? AND owner=? AND status=? RETURNING id,buyer_id').bind(b.action,now,b.id,c.user.userId,before).first();
 if(!row)return json({error:'Status pesanan telah berubah. Muat ulang halaman.'},409);
 await notifyOwner(c.user.userId,String(row.buyer_id),'order:'+b.id+':'+b.action,b.action==='confirmed'?'Pesanan dikonfirmasi':'Pesanan diselesaikan','Lihat rincian pesanan Anda di ruang kerja.','/dashboard/penjualan','pesanan');return json({ok:true});
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
