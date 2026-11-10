import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {textField} from '@/features/shared/validation.mjs';

export const dynamic='force-dynamic';
const canRead=(role:string)=>['admin','ketua','bendahara'].includes(role);
const canWrite=(role:string)=>['admin','bendahara'].includes(role);
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export async function GET(request:Request){
 const c=await required(request);if(c.error)return c.error;
 if(!canRead(c.user.role))return json({error:'Akses rekonsiliasi bank dibatasi.'},403);
 try{
  const accounts=await c.db.prepare("SELECT id,code,name,COALESCE(SUM(l.debit-l.credit),0) AS book_balance FROM ledger_accounts a LEFT JOIN ledger_lines l ON l.account_id=a.id AND l.owner=a.owner WHERE a.owner=? AND a.category='asset' GROUP BY a.id ORDER BY a.code").bind(c.user.userId).all();
  const reconciliations=await c.db.prepare("SELECT r.id,r.account_id,a.code AS account_code,a.name AS account_name,r.period_start,r.period_end,r.opening_balance,r.closing_balance,r.status,r.created,r.reconciled_at,(SELECT COUNT(*) FROM finance_bank_statement_lines s WHERE s.reconciliation_id=r.id AND s.owner=r.owner) AS statement_count,(SELECT COUNT(*) FROM finance_bank_statement_lines s WHERE s.reconciliation_id=r.id AND s.owner=r.owner AND s.matched_ledger_line_id IS NOT NULL) AS matched_count,(SELECT COALESCE(SUM(s.signed_amount),0) FROM finance_bank_statement_lines s WHERE s.reconciliation_id=r.id AND s.owner=r.owner) AS statement_net FROM finance_bank_reconciliations r JOIN ledger_accounts a ON a.id=r.account_id AND a.owner=r.owner WHERE r.owner=? ORDER BY r.period_end DESC,r.created DESC LIMIT 30").bind(c.user.userId).all();
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return json({accounts:accounts.results,reconciliations:reconciliations.results});
  const head=await c.db.prepare('SELECT r.*,a.code AS account_code,a.name AS account_name FROM finance_bank_reconciliations r JOIN ledger_accounts a ON a.id=r.account_id AND a.owner=r.owner WHERE r.id=? AND r.owner=?').bind(id,c.user.userId).first();
  if(!head)return json({error:'Rekonsiliasi tidak ditemukan.'},404);
  const lines=await c.db.prepare('SELECT s.id,s.transaction_date,s.description,s.reference,s.signed_amount,s.matched_ledger_line_id,e.reference AS ledger_reference,e.memo AS ledger_memo,e.posted_date FROM finance_bank_statement_lines s LEFT JOIN ledger_lines l ON l.id=s.matched_ledger_line_id AND l.owner=s.owner LEFT JOIN ledger_entries e ON e.id=l.entry_id AND e.owner=l.owner WHERE s.reconciliation_id=? AND s.owner=? ORDER BY s.transaction_date,s.created LIMIT 1000').bind(id,c.user.userId).all();
  const candidates=await c.db.prepare("SELECT l.id AS ledger_line_id,e.id AS entry_id,e.posted_date,e.reference,e.memo,l.debit-l.credit AS signed_amount,a.code,a.name FROM ledger_lines l JOIN ledger_entries e ON e.id=l.entry_id AND e.owner=l.owner JOIN ledger_accounts a ON a.id=l.account_id AND a.owner=l.owner WHERE l.owner=? AND l.account_id=? AND e.posted_date BETWEEN ? AND ? AND NOT EXISTS(SELECT 1 FROM finance_bank_statement_lines s WHERE s.owner=l.owner AND s.matched_ledger_line_id=l.id) ORDER BY e.posted_date,e.created LIMIT 300").bind(c.user.userId,String(head.account_id),String(head.period_start).slice(0,10),String(head.period_end).slice(0,10)).all();
  return json({accounts:accounts.results,reconciliations:reconciliations.results,reconciliation:head,lines:lines.results,candidates:candidates.results});
 }catch(e){return errorReply(e)}
}

export async function POST(request:Request){
 const c=await required(request,true);if(c.error)return c.error;
 if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat mengelola rekonsiliasi.'},403);
 try{
  const b=await readJsonObject(request,12000),now=new Date().toISOString();
  if(!await consumeRateLimit(c.db,'bank-reconciliation:write:'+c.user.accountId,100,3600000))return json({error:'Batas perubahan rekonsiliasi per jam telah tercapai.'},429);
  if(b.action==='create'){
   const accountId=typeof b.accountId==='string'?b.accountId:'',start=b.periodStart,end=b.periodEnd,opening=Number(b.openingBalance),closing=Number(b.closingBalance);
   if(!/^[a-f0-9-]{36}$/i.test(accountId)||!validDate(start)||!validDate(end)||end<start||!Number.isSafeInteger(opening)||!Number.isSafeInteger(closing)||Math.abs(opening)>1_000_000_000_000||Math.abs(closing)>1_000_000_000_000)return json({error:'Pilih akun aset, periode, saldo awal, dan saldo akhir yang valid.'},400);
   const account=await c.db.prepare("SELECT id FROM ledger_accounts WHERE id=? AND owner=? AND active=TRUE AND category='asset'").bind(accountId,c.user.userId).first();
   if(!account)return json({error:'Akun kas/bank aktif milik organisasi tidak ditemukan.'},400);
   const duplicate=await c.db.prepare("SELECT id FROM finance_bank_reconciliations WHERE owner=? AND account_id=? AND period_start=? AND period_end=?").bind(c.user.userId,accountId,start,end).first();
   if(duplicate)return json({error:'Rekonsiliasi untuk akun dan periode tersebut sudah tersedia.'},409);
   const id=crypto.randomUUID();
   await c.db.batch([c.db.prepare('INSERT INTO finance_bank_reconciliations(id,owner,account_id,period_start,period_end,opening_balance,closing_balance,actor_id,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,c.user.userId,accountId,start,end,opening,closing,c.user.accountId,now),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Periode rekonsiliasi dibuat',String(start)+' s.d. '+String(end),now)]);
   return json({ok:true,id},201);
  }
  const reconciliationId=typeof b.reconciliationId==='string'?b.reconciliationId:'';
  if(!/^[a-f0-9-]{36}$/i.test(reconciliationId))return json({error:'Rekonsiliasi tidak valid.'},400);
  const head=await c.db.prepare("SELECT id,account_id,period_start,period_end,status FROM finance_bank_reconciliations WHERE id=? AND owner=?").bind(reconciliationId,c.user.userId).first();
  if(!head)return json({error:'Rekonsiliasi tidak ditemukan.'},404);
  if(head.status!=='draft')return json({error:'Periode rekonsiliasi sudah dikunci.'},409);
  if(b.action==='add-line'){
   const date=b.transactionDate,description=textField(b.description,300),reference=textField(b.reference,100),amount=Number(b.signedAmount);
   if(!validDate(date)||String(date)<String(head.period_start).slice(0,10)||String(date)>String(head.period_end).slice(0,10)||!description||!Number.isSafeInteger(amount)||amount===0||Math.abs(amount)>1_000_000_000_000)return json({error:'Tanggal, uraian, dan nominal mutasi harus valid serta berada dalam periode.'},400);
   const id=crypto.randomUUID();
   await c.db.batch([c.db.prepare('INSERT INTO finance_bank_statement_lines(id,owner,reconciliation_id,transaction_date,description,reference,signed_amount,created) VALUES(?,?,?,?,?,?,?,?)').bind(id,c.user.userId,reconciliationId,date,description,reference||null,amount,now),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Mutasi rekening ditambahkan',String(date)+' · '+description.slice(0,160)+' · Rp '+String(amount),now)]);
   return json({ok:true,id},201);
  }
  if(b.action==='match'){
   const statementLineId=typeof b.statementLineId==='string'?b.statementLineId:'',ledgerLineId=typeof b.ledgerLineId==='string'?b.ledgerLineId:'';
   if(!/^[a-f0-9-]{36}$/i.test(statementLineId)||!/^[a-f0-9-]{36}$/i.test(ledgerLineId))return json({error:'Baris mutasi atau jurnal tidak valid.'},400);
   const line=await c.db.prepare('SELECT id,signed_amount,matched_ledger_line_id FROM finance_bank_statement_lines WHERE id=? AND reconciliation_id=? AND owner=?').bind(statementLineId,reconciliationId,c.user.userId).first();
   const ledger=await c.db.prepare('SELECT l.id,l.debit-l.credit AS signed_amount FROM ledger_lines l JOIN ledger_entries e ON e.id=l.entry_id AND e.owner=l.owner WHERE l.id=? AND l.owner=? AND l.account_id=? AND e.posted_date BETWEEN ? AND ?').bind(ledgerLineId,c.user.userId,String(head.account_id),String(head.period_start).slice(0,10),String(head.period_end).slice(0,10)).first();
   if(!line||!ledger)return json({error:'Mutasi atau baris buku besar tidak ditemukan dalam akun dan periode ini.'},404);
   if(line.matched_ledger_line_id)return json({error:'Mutasi sudah dipasangkan.'},409);
   if(Number(line.signed_amount)!==Number(ledger.signed_amount))return json({error:'Nominal mutasi tidak sama dengan nominal jurnal. Periksa tanggal, akun, dan arah debit/kredit.'},409);
   const duplicate=await c.db.prepare('SELECT id FROM finance_bank_statement_lines WHERE owner=? AND matched_ledger_line_id=?').bind(c.user.userId,ledgerLineId).first();
   if(duplicate)return json({error:'Baris jurnal tersebut sudah dipasangkan dengan mutasi lain.'},409);
   await c.db.batch([c.db.prepare('UPDATE finance_bank_statement_lines SET matched_ledger_line_id=? WHERE id=? AND owner=? AND matched_ledger_line_id IS NULL').bind(ledgerLineId,statementLineId,c.user.userId),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Mutasi rekening dicocokkan','Mutasi '+statementLineId+' dengan baris buku besar '+ledgerLineId,now)]);
   return json({ok:true});
  }
  if(b.action==='unmatch'){
   const statementLineId=typeof b.statementLineId==='string'?b.statementLineId:'';
   await c.db.batch([c.db.prepare('UPDATE finance_bank_statement_lines SET matched_ledger_line_id=NULL WHERE id=? AND reconciliation_id=? AND owner=? AND matched_ledger_line_id IS NOT NULL').bind(statementLineId,reconciliationId,c.user.userId),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Pencocokan mutasi dibatalkan','Mutasi '+statementLineId,now)]);
   return json({ok:true});
  }
  if(b.action==='finalize'){
   const summary=await c.db.prepare('SELECT COUNT(*) AS total,COUNT(matched_ledger_line_id) AS matched,COALESCE(SUM(signed_amount),0) AS net FROM finance_bank_statement_lines WHERE reconciliation_id=? AND owner=?').bind(reconciliationId,c.user.userId).first();
   if(Number(summary?.total??0)<1)return json({error:'Tambahkan mutasi rekening sebelum mengunci periode.'},409);
   const expected=Number(head.opening_balance)+Number(summary?.net??0);
      const current=await c.db.prepare('SELECT closing_balance FROM finance_bank_reconciliations WHERE id=? AND owner=?').bind(reconciliationId,c.user.userId).first();
   if(expected!==Number(current?.closing_balance))return json({error:'Saldo akhir tidak sama dengan saldo awal ditambah seluruh mutasi rekening.'},409);
   if(Number(summary?.total??0)!==Number(summary?.matched??0))return json({error:'Masih ada mutasi rekening yang belum dipasangkan dengan jurnal.'},409);
   await c.db.prepare("UPDATE finance_bank_reconciliations SET status='reconciled',reconciled_at=? WHERE id=? AND owner=? AND status='draft'").bind(now,reconciliationId,c.user.userId).run();
   await c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Rekonsiliasi bank dikunci','Periode '+String(head.period_start).slice(0,10)+' s.d. '+String(head.period_end).slice(0,10),now).run();
   return json({ok:true,status:'reconciled'});
  }
  return json({error:'Aksi rekonsiliasi tidak dikenal.'},400);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
