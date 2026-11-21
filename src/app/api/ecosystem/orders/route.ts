import {required,json,errorReply} from '@/lib/ecosystem/guard';
import { isModuleAvailableForUser } from '@/features/identity/access-policy';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {moneyInteger} from '@/features/shared/validation.mjs';
import {notifyOwner} from '@/lib/ecosystem/notifications';
import {consumeRateLimit} from '@/lib/rate-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request){const c=await required(request);if(c.error)return c.error;if(!isModuleAvailableForUser(c.user,'pos'))return json({error:'Aplikasi POS sedang dinonaktifkan atau diblokir untuk akun ini.'},403);try{
 const canReadAll=['ketua','bendahara'].includes(c.user.role);const where=canReadAll?'owner=?':'owner=? AND buyer_id=?',args=canReadAll?[c.user.userId]:[c.user.userId,c.user.accountId];
 const rows=await c.db.prepare(`SELECT o.id,o.product_name,o.quantity,o.unit_price,o.total,o.status,o.created,b.full_name AS buyer_name,
 COALESCE((SELECT SUM(p.amount) FROM commerce_order_payments p WHERE p.owner=o.owner AND p.order_id=o.id),0) AS paid_total,
 CASE WHEN COALESCE((SELECT SUM(p.amount) FROM commerce_order_payments p WHERE p.owner=o.owner AND p.order_id=o.id),0)>=o.total THEN 'paid'
      WHEN COALESCE((SELECT SUM(p.amount) FROM commerce_order_payments p WHERE p.owner=o.owner AND p.order_id=o.id),0)>0 THEN 'partial' ELSE 'unpaid' END AS payment_status,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('source_type',l.source_type,'source_ref',l.source_ref,'quantity',a.quantity) ORDER BY l.received_at,l.id) FROM commerce_order_lot_allocations a JOIN commerce_inventory_lots l ON l.id=a.lot_id AND l.owner=a.owner WHERE a.owner=o.owner AND a.order_id=o.id),'[]'::jsonb) AS allocations,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'amount',p.amount,'method',p.method,'received_date',p.received_date,'reference',p.payment_reference,'ledger_entry_id',p.ledger_entry_id) ORDER BY p.received_date,p.created) FROM commerce_order_payments p WHERE p.owner=o.owner AND p.order_id=o.id),'[]'::jsonb) AS payments
 FROM commerce_orders o JOIN users b ON b.id=o.buyer_id AND b.workspace_owner=o.owner WHERE `+where.replaceAll('owner=','o.owner=').replaceAll('buyer_id=','o.buyer_id=')+` ORDER BY o.created DESC LIMIT 100`).bind(...args).all();
 const paymentAccounts=c.user.role==='bendahara'?await c.db.prepare("SELECT id,code,name,category FROM ledger_accounts WHERE owner=? AND active=TRUE AND category IN ('asset','revenue') ORDER BY code").bind(c.user.userId).all():{results:[]};
 return json({items:rows.results,paymentAccounts:paymentAccounts.results});
 }catch(e){return errorReply(e)}}
export async function POST(request:Request){const c=await required(request,true);if(c.error)return c.error;if(!isModuleAvailableForUser(c.user,'pos'))return json({error:'Aplikasi POS sedang dinonaktifkan atau diblokir untuk akun ini.'},403);try{const b=await readJsonObject(request,1500);
 if(typeof b.productId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.productId)||typeof b.clientRequestId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.clientRequestId)||!moneyInteger(b.quantity,10000)||Number(b.quantity)===0)return json({error:'Pilih produk dan jumlah yang valid.'},400);
 if(!await consumeRateLimit(c.db,'commerce:order:'+c.user.accountId,30,3600000))return json({error:'Batas pengajuan pesanan tercapai. Coba lagi nanti.'},429);
 const existing=await c.db.prepare('SELECT id,status FROM commerce_orders WHERE owner=? AND buyer_id=? AND client_request_id=?').bind(c.user.userId,c.user.accountId,b.clientRequestId).first();if(existing)return json({ok:true,id:existing.id,status:existing.status,reused:true});
 const id=crypto.randomUUID(),now=new Date().toISOString();
 // Allocate the order against FIFO inventory lots, decrement aggregate stock, and append its event atomically.
 const row=await c.db.prepare("SELECT * FROM srikandi_create_order_with_fifo(?,?,?,?,?,?,?,?)")
  .bind(id,c.user.userId,c.user.accountId,c.user.accountId,b.productId,b.quantity,b.clientRequestId,now).first();
 if(!row)return json({error:'Produk tidak tersedia atau stok tidak mencukupi.'},409);
 const orderId=String(row.order_id||row.orderId||id);
 // The order remains submitted; payment is a separate Bendahara-verified transaction.
 const treasurers=await c.db.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='bendahara' AND enabled=TRUE ORDER BY created,id").bind(c.user.userId).all();
  for(const treasurer of treasurers.results)await notifyOwner(c.user.userId,String(treasurer.id),'order:'+orderId,'Pesanan baru','Pesanan baru menunggu pemeriksaan Bendahara.','/dashboard/penjualan','pesanan');return json({ok:true,id:orderId,total:row.total,status:'submitted',reused:Boolean(row.reused)},row.reused?200:201);
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return errorReply(e)}}
/** Treasurer fulfils or cancels an order; cancellation restores reserved stock exactly once. */
export async function PATCH(request:Request){const c=await required(request,true);if(c.error)return c.error;if(!isModuleAvailableForUser(c.user,'pos'))return json({error:'Aplikasi POS sedang dinonaktifkan atau diblokir untuk akun ini.'},403);if(c.user.role!=='bendahara')return json({error:'Hanya Bendahara yang dapat mengubah status pesanan.'},403);
 try{const b=await readJsonObject(request,1000);if(!await consumeRateLimit(c.db,'commerce:order-status:'+c.user.accountId,90,3600000))return json({error:'Batas perubahan status pesanan tercapai.'},429);if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||!['confirmed','cancelled','completed','payment'].includes(String(b.action)))return json({error:'Pesanan atau tindakan tidak valid.'},400);
 const now=new Date().toISOString();
 if(b.action==='payment'){
  if(typeof b.clientRequestId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.clientRequestId)||
     typeof b.cashAccountId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.cashAccountId)||
     typeof b.revenueAccountId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.revenueAccountId)||
     !moneyInteger(b.amount,1000000000000)||Number(b.amount)===0||
     !['tunai','transfer','qris'].includes(String(b.method))||
     typeof b.receivedDate!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(b.receivedDate)||
     Number.isNaN(Date.parse(b.receivedDate))||new Date(b.receivedDate).toISOString().slice(0,10)!==b.receivedDate||
     (b.reference!==undefined&&typeof b.reference!=='string'))
   return json({error:'Nominal, metode, akun, tanggal, atau identitas pembayaran tidak valid.'},400);
  if(!await consumeRateLimit(c.db,'commerce:payment:'+c.user.accountId,90,3600000))return json({error:'Batas pencatatan pembayaran tercapai.'},429);
  const paymentId=crypto.randomUUID();
  const row=await c.db.prepare("SELECT * FROM srikandi_post_order_payment(?,?,?,?,?,?,?,?,?,?,?,?)")
   .bind(paymentId,c.user.userId,c.user.accountId,b.id,b.amount,b.method,b.cashAccountId,b.revenueAccountId,b.clientRequestId,b.receivedDate,String(b.reference||'').slice(0,120),now).first();
  if(!row)return json({error:'Pembayaran belum dapat dibukukan.'},409);
  if(!row.reused)await notifyOwner(c.user.userId,String((await c.db.prepare('SELECT buyer_id FROM commerce_orders WHERE id=? AND owner=?').bind(b.id,c.user.userId).first())?.buyer_id||''),'order:'+b.id+':payment:'+String(row.payment_id||row.paymentId),'Pembayaran diterima','Pembayaran pesanan Anda telah dicatat oleh Bendahara.','/dashboard/penjualan','pesanan');
  return json({ok:true,paymentId:row.payment_id||row.paymentId,paidTotal:row.paid_total||row.paidTotal,paymentStatus:row.payment_status||row.paymentStatus,reused:Boolean(row.reused)},row.reused?200:201);
 }
 if(b.action==='cancelled'){
  const row=await c.db.prepare("SELECT * FROM srikandi_cancel_order_restore_fifo(?,?,?,?)")
   .bind(b.id,c.user.userId,c.user.accountId,now).first();
  if(row)await notifyOwner(c.user.userId,String(row.buyer_id||row.buyerId),'order:'+b.id+':cancelled','Pesanan dibatalkan','Pesanan dibatalkan oleh pengelola. Stok telah dikembalikan.','/dashboard/penjualan','pesanan');
  return row?json({ok:true}):json({error:'Pesanan tidak ditemukan atau tidak dapat dibatalkan.'},409);
 }
 const before=b.action==='confirmed'?'submitted':'confirmed';
 const sql=`WITH before AS MATERIALIZED (
  SELECT o.status FROM commerce_orders o WHERE o.id=? AND o.owner=? AND o.status=? AND (?<>'completed' OR COALESCE((SELECT SUM(p.amount) FROM commerce_order_payments p WHERE p.owner=o.owner AND p.order_id=o.id),0)>=o.total)
 ), changed AS (
  UPDATE commerce_orders SET status=?,updated=? WHERE id=? AND owner=? AND status=? AND EXISTS (SELECT 1 FROM before)
  RETURNING id,buyer_id
 ), logged AS (
  INSERT INTO commerce_order_events(owner,order_id,actor_id,from_status,to_status)
  SELECT ?,changed.id,?,before.status,? FROM changed CROSS JOIN before
  RETURNING order_id
 )
 SELECT changed.id,changed.buyer_id FROM changed JOIN logged ON logged.order_id=changed.id`;
 const row=await c.db.prepare(sql).bind(b.id,c.user.userId,before,b.action,b.action,now,b.id,c.user.userId,before,c.user.userId,c.user.accountId,b.action).first();
 if(!row)return json({error:b.action==='completed'?'Pesanan hanya dapat diselesaikan setelah seluruh pembayaran tercatat dan terverifikasi.':'Status pesanan telah berubah. Muat ulang halaman.'},409);
 await notifyOwner(c.user.userId,String(row.buyer_id),'order:'+b.id+':'+b.action,b.action==='confirmed'?'Pesanan dikonfirmasi':'Pesanan diselesaikan','Lihat rincian pesanan Anda di ruang kerja.','/dashboard/penjualan','pesanan');return json({ok:true});
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
