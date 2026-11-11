import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {balancedLines} from '@/features/finance/validation.mjs';
import {textField} from '@/features/shared/validation.mjs';
import {csvRows} from '@/lib/ecosystem/csv.mjs';
export const dynamic='force-dynamic';
const canRead=(role:string)=>['ketua','sekretaris','bendahara'].includes(role),canWrite=(role:string)=>role==='bendahara';
export async function GET(request:Request){const c=await required(request);if(c.error)return c.error;if(!canRead(c.user.role))return json({error:'Akses akuntansi dibatasi.'},403);
 try{
 if(new URL(request.url).searchParams.get('format')==='csv'){
  const result=await c.db.prepare('SELECT e.posted_date,e.reference,e.memo,a.code,a.name,l.debit,l.credit FROM ledger_entries e JOIN ledger_lines l ON l.entry_id=e.id AND l.owner=e.owner JOIN ledger_accounts a ON a.id=l.account_id AND a.owner=e.owner WHERE e.owner=? ORDER BY e.posted_date,e.created,e.id,a.code LIMIT 5000').bind(c.user.userId).all();
  const lines=[['Tanggal','Referensi','Uraian','Kode akun','Akun','Debit (Rp)','Kredit (Rp)'],...result.results.map(r=>[String(r.posted_date),String(r.reference),String(r.memo),String(r.code),String(r.name),String(r.debit),String(r.credit)])];
  return new Response(csvRows(lines),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="srikandi-jurnal.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 const accounts=await c.db.prepare('SELECT a.id,a.code,a.name,a.category,a.active,COALESCE(SUM(l.debit),0) AS debit,COALESCE(SUM(l.credit),0) AS credit FROM ledger_accounts a LEFT JOIN ledger_lines l ON l.account_id=a.id AND l.owner=a.owner WHERE a.owner=? GROUP BY a.id ORDER BY a.code LIMIT 150').bind(c.user.userId).all();const entries=await c.db.prepare('SELECT e.id,e.posted_date,e.memo,e.reference,e.created,(SELECT COUNT(*) FROM ledger_reversals r WHERE r.original_entry_id=e.id OR r.reversal_entry_id=e.id) AS correction_count FROM ledger_entries e WHERE e.owner=? ORDER BY e.posted_date DESC,e.created DESC LIMIT 50').bind(c.user.userId).all();return json({accounts:accounts.results,entries:entries.results});}catch(e){return errorReply(e)}
}
export async function POST(request:Request){const c=await required(request,true);if(c.error)return c.error;if(!canWrite(c.user.role))return json({error:'Pencatatan jurnal dan koreksi merupakan kewenangan Bendahara.'},403);
 try{const b=await readJsonObject(request,9000),now=new Date().toISOString();
 if(!await consumeRateLimit(c.db,'ledger:write:'+c.user.accountId,120,3600000))return json({error:'Batas pencatatan per jam telah tercapai.'},429);
 if(b.action==='reverse'){
  if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id))return json({error:'Nomor jurnal tidak valid.'},400);
  const old=await c.db.prepare('SELECT e.id,e.memo FROM ledger_entries e WHERE e.id=? AND e.owner=? AND NOT EXISTS(SELECT 1 FROM ledger_reversals r WHERE r.original_entry_id=e.id OR r.reversal_entry_id=e.id)').bind(b.id,c.user.userId).first();
  if(!old)return json({error:'Jurnal tidak ditemukan atau sudah memiliki koreksi.'},409);
  const lines=await c.db.prepare('SELECT l.account_id,l.debit,l.credit FROM ledger_lines l JOIN ledger_accounts a ON a.id=l.account_id WHERE l.entry_id=? AND l.owner=? AND a.owner=?').bind(b.id,c.user.userId,c.user.userId).all();
  if(lines.results.length<2)return json({error:'Jurnal belum memenuhi persyaratan koreksi.'},409);
  const id=crypto.randomUUID(),reference='REV-'+String(old.id),memo=('Koreksi jurnal: '+String(old.memo)).slice(0,500),date=now.slice(0,10);
  await c.db.batch([
   c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(id,c.user.userId,c.user.accountId,date,memo,reference,now),
   ...lines.results.map(l=>c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,id,String(l.account_id),Number(l.credit),Number(l.debit))),
   c.db.prepare('INSERT INTO ledger_reversals(id,owner,original_entry_id,reversal_entry_id,actor_id,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,b.id,id,c.user.accountId,now),
   c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Koreksi jurnal',reference,now)
  ]);
  return json({ok:true,id,corrects:b.id},201);
 }
 if(b.action==='account'){
 const code=typeof b.code==='string'?b.code.trim():null,name=textField(b.name,160),category=b.category;
 if(!code||!/^\d{3,8}$/.test(code)||!name||!['asset','liability','equity','revenue','expense'].includes(String(category)))return json({error:'Kode, nama, atau kategori akun tidak valid.'},400);
 const exists=await c.db.prepare('SELECT id FROM ledger_accounts WHERE owner=? AND code=?').bind(c.user.userId,code).first();if(exists)return json({error:'Kode akun sudah digunakan.'},409);
 const id=crypto.randomUUID();await c.db.prepare('INSERT INTO ledger_accounts(id,owner,code,name,category,created) VALUES(?,?,?,?,?,?)').bind(id,c.user.userId,code,name,category,now).run();return json({ok:true,id},201);
 }
 if(b.action!=='journal'||!textField(b.memo,500)||typeof b.postedDate!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.postedDate)||Number.isNaN(Date.parse(b.postedDate))||new Date(b.postedDate).toISOString().slice(0,10)!==b.postedDate||!balancedLines(b.lines))return json({error:'Jurnal harus memiliki tanggal valid dan jumlah debit sama dengan kredit.'},400);
 const lines=b.lines as Array<{accountId:string;debit:number;credit:number}>;const ids=[...new Set(lines.map(l=>l.accountId))];const rows=await c.db.prepare('SELECT id FROM ledger_accounts WHERE owner=? AND active=TRUE AND id IN ('+ids.map(()=>'?').join(',')+')').bind(c.user.userId,...ids).all();if(ids.length<2||rows.results.length!==ids.length)return json({error:'Pilih akun aktif dalam organisasi ini.'},400);
 const id=crypto.randomUUID(),reference=typeof b.reference==='string'&&b.reference.trim()?b.reference.trim().slice(0,80):id;
 const statements=[c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(id,c.user.userId,c.user.accountId,b.postedDate,String(b.memo).trim(),reference,now),...lines.map(l=>c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,id,l.accountId,l.debit,l.credit)),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Jurnal diposting',reference,now)];
 await c.db.batch(statements);return json({ok:true,id},201);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
