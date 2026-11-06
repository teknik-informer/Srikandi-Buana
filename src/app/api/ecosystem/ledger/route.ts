import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {balancedLines,textField} from '@/lib/ecosystem/validation.mjs';
export const dynamic='force-dynamic';
const canRead=(role:string)=>['admin','ketua','bendahara'].includes(role),canWrite=(role:string)=>['admin','bendahara'].includes(role);
export async function GET(request:Request){const c=await required(request);if(c.error)return c.error;if(!canRead(c.user.role))return json({error:'Akses akuntansi dibatasi.'},403);
 try{const accounts=await c.db.prepare('SELECT a.id,a.code,a.name,a.category,a.active,COALESCE(SUM(l.debit),0) AS debit,COALESCE(SUM(l.credit),0) AS credit FROM ledger_accounts a LEFT JOIN ledger_lines l ON l.account_id=a.id WHERE a.owner=? GROUP BY a.id ORDER BY a.code LIMIT 150').bind(c.user.userId).all();const entries=await c.db.prepare('SELECT id,posted_date,memo,reference,created FROM ledger_entries WHERE owner=? ORDER BY posted_date DESC,created DESC LIMIT 50').bind(c.user.userId).all();return json({accounts:accounts.results,entries:entries.results});}catch(e){return errorReply(e)}
}
export async function POST(request:Request){const c=await required(request,true);if(c.error)return c.error;if(!canWrite(c.user.role))return json({error:'Pencatatan jurnal hanya untuk bendahara atau administrator.'},403);
 try{const b=await readJsonObject(request,9000),now=new Date().toISOString();
 if(!await consumeRateLimit(c.db,'ledger:write:'+c.user.accountId,120,3600000))return json({error:'Batas pencatatan per jam telah tercapai.'},429);
 if(b.action==='account'){
 const code=typeof b.code==='string'?b.code.trim():null,name=textField(b.name,160),category=b.category;
 if(!code||!/^\d{3,8}$/.test(code)||!name||!['asset','liability','equity','revenue','expense'].includes(String(category)))return json({error:'Kode, nama, atau kategori akun tidak valid.'},400);
 const exists=await c.db.prepare('SELECT id FROM ledger_accounts WHERE owner=? AND code=?').bind(c.user.userId,code).first();if(exists)return json({error:'Kode akun sudah digunakan.'},409);
 const id=crypto.randomUUID();await c.db.prepare('INSERT INTO ledger_accounts(id,owner,code,name,category,created) VALUES(?,?,?,?,?,?)').bind(id,c.user.userId,code,name,category,now).run();return json({ok:true,id},201);
 }
 if(b.action!=='journal'||!textField(b.memo,500)||typeof b.postedDate!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.postedDate)||Number.isNaN(Date.parse(b.postedDate))||new Date(b.postedDate).toISOString().slice(0,10)!==b.postedDate||!balancedLines(b.lines))return json({error:'Jurnal harus memiliki tanggal valid dan jumlah debit sama dengan kredit.'},400);
 const lines=b.lines as Array<{accountId:string;debit:number;credit:number}>;const ids=[...new Set(lines.map(l=>l.accountId))];const rows=await c.db.prepare('SELECT id FROM ledger_accounts WHERE owner=? AND active=TRUE AND id IN ('+ids.map(()=>'?').join(',')+')').bind(c.user.userId,...ids).all();if(ids.length<2||rows.results.length!==ids.length)return json({error:'Pilih akun aktif dalam organisasi ini.'},400);
 const id=crypto.randomUUID(),reference=typeof b.reference==='string'&&b.reference.trim()?b.reference.trim().slice(0,80):id;
 const statements=[c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(id,c.user.userId,c.user.accountId,b.postedDate,String(b.memo).trim(),reference,now),...lines.map(l=>c.db.prepare('INSERT INTO ledger_lines(id,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,l.accountId,l.debit,l.credit)),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Jurnal diposting',reference,now)];
 await c.db.batch(statements);return json({ok:true,id},201);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
