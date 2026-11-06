import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request){const c=await required(request);if(c.error)return c.error;try{
 const rows=await c.db.prepare('SELECT id,category,title,body,href,created,read_at FROM ecosystem_notifications WHERE owner=? AND recipient_id=? ORDER BY created DESC LIMIT 50').bind(c.user.userId,c.user.accountId).all();
 const count=await c.db.prepare('SELECT COUNT(*) AS n FROM ecosystem_notifications WHERE owner=? AND recipient_id=? AND read_at IS NULL').bind(c.user.userId,c.user.accountId).first();
 return json({items:rows.results,unread:Number(count?.n||0)});
 }catch(e){return errorReply(e)}}
export async function PATCH(request:Request){const c=await required(request,true);if(c.error)return c.error;try{
 const body=await readJsonObject(request,1000);if(!await consumeRateLimit(c.db,'notification:mark:'+c.user.accountId,120,3600000))return json({error:'Terlalu banyak perubahan notifikasi. Coba lagi nanti.'},429);const now=new Date().toISOString();
 if(body.all===true){await c.db.prepare('UPDATE ecosystem_notifications SET read_at=? WHERE owner=? AND recipient_id=? AND read_at IS NULL').bind(now,c.user.userId,c.user.accountId).run();return json({ok:true})}
 if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.id))return json({error:'Notifikasi tidak valid.'},400);
 const row=await c.db.prepare('UPDATE ecosystem_notifications SET read_at=? WHERE id=? AND owner=? AND recipient_id=? AND read_at IS NULL RETURNING id').bind(now,body.id,c.user.userId,c.user.accountId).first();return row?json({ok:true}):json({error:'Notifikasi tidak ditemukan atau sudah dibaca.'},404);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}}
