import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {textField} from '@/features/shared/validation.mjs';
import {ensureDefaultLedgerAccounts} from '@/features/finance/record-posting';
export const dynamic='force-dynamic';
const canRead=(role:string)=>['admin','ketua','bendahara'].includes(role);
const canWrite=(role:string)=>['admin','bendahara'].includes(role);
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export async function GET(request:Request){
 const c=await required(request);if(c.error)return c.error;if(!canRead(c.user.role))return json({error:'Akses pembelian dan utang usaha dibatasi.'},403);
 try{
  const [suppliers,bills,accounts]=await Promise.all([
   c.db.prepare('SELECT id,supplier_code,name,contact_name,email,phone,address,payment_terms_days,active,created,updated FROM commerce_suppliers WHERE owner=? ORDER BY active DESC,name LIMIT 500').bind(c.user.userId).all(),
   c.db.prepare(`SELECT b.id,b.supplier_id,s.name AS supplier_name,s.supplier_code,b.supplier_invoice_number,b.bill_number,b.issue_date,b.due_date,b.description,b.total_amount,b.paid_total,(b.total_amount-b.paid_total) AS outstanding_amount,b.status,b.created,b.updated,a.code AS expense_code,a.name AS expense_name,(SELECT COUNT(*) FROM commerce_purchase_bill_payments p WHERE p.bill_id=b.id AND p.owner=b.owner) AS payment_count FROM commerce_purchase_bills b JOIN commerce_suppliers s ON s.id=b.supplier_id AND s.owner=b.owner JOIN ledger_accounts a ON a.id=b.expense_account_id AND a.owner=b.owner WHERE b.owner=? ORDER BY b.due_date,b.created DESC LIMIT 300`).bind(c.user.userId).all(),
   c.db.prepare("SELECT id,code,name,category,active FROM ledger_accounts WHERE owner=? AND active=TRUE ORDER BY code").bind(c.user.userId).all()
  ]);
  return json({suppliers:suppliers.results,bills:bills.results,accounts:accounts.results});
 }catch(e){return errorReply(e)}
}
export async function POST(request:Request){
 const c=await required(request,true);if(c.error)return c.error;if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat mengelola pembelian.'},403);
 try{
  const b=await readJsonObject(request,9000),now=new Date().toISOString();
  if(!await consumeRateLimit(c.db,'purchases:write:'+c.user.accountId,100,3600000))return json({error:'Batas perubahan pembelian per jam telah tercapai.'},429);
  if(b.action==='supplier'){
   const name=textField(b.name,160),code=typeof b.supplierCode==='string'?b.supplierCode.trim().toUpperCase():'';
   const email=textField(b.email,160),phone=textField(b.phone,40),contact=textField(b.contactName,120),address=textField(b.address,500),notes=textField(b.notes,500);
   const terms=Number(b.paymentTermsDays??0);
   if(!name||!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(code)||!Number.isInteger(terms)||terms<0||terms>365||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return json({error:'Kode, nama, kontak, atau termin pembayaran pemasok tidak valid.'},400);
   const id=crypto.randomUUID();
   await c.db.batch([
    c.db.prepare('INSERT INTO commerce_suppliers(id,owner,supplier_code,name,contact_name,email,phone,address,payment_terms_days,notes,actor_id,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,c.user.userId,code,name,contact||null,email||null,phone||null,address||null,terms,notes||null,c.user.accountId,now,now),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Pemasok ditambahkan',code+' · '+name,now)
   ]);
   return json({ok:true,id},201);
  }
  if(b.action==='bill'){
   const supplierId=typeof b.supplierId==='string'?b.supplierId:'',supplierInvoice=textField(b.supplierInvoiceNumber,100),description=textField(b.description,500),accountId=typeof b.expenseAccountId==='string'?b.expenseAccountId:'';
   const issue=b.issueDate,due=b.dueDate,amount=Number(b.amount);
   if(!/^[a-f0-9-]{36}$/i.test(supplierId)||!/^[a-f0-9-]{36}$/i.test(accountId)||!supplierInvoice||!description||!validDate(issue)||!validDate(due)||due<issue||!Number.isSafeInteger(amount)||amount<=0||amount>1_000_000_000_000)return json({error:'Lengkapi pemasok, nomor faktur, uraian, akun beban, tanggal, jatuh tempo, dan nominal yang valid.'},400);
   const supplier=await c.db.prepare('SELECT id,supplier_code,name FROM commerce_suppliers WHERE id=? AND owner=? AND active=TRUE').bind(supplierId,c.user.userId).first();
   if(!supplier)return json({error:'Pemasok aktif tidak ditemukan pada organisasi ini.'},404);
   const account=await c.db.prepare("SELECT id,code,name FROM ledger_accounts WHERE id=? AND owner=? AND active=TRUE AND category='expense'").bind(accountId,c.user.userId).first();
   if(!account)return json({error:'Pilih akun beban aktif. Persediaan belum diposting sebelum metode valuasi disetujui.'},400);
   const existing=await c.db.prepare('SELECT id,bill_number FROM commerce_purchase_bills WHERE owner=? AND supplier_id=? AND supplier_invoice_number=?').bind(c.user.userId,supplierId,supplierInvoice).first();
   if(existing)return json({error:'Nomor faktur pemasok tersebut sudah pernah dicatat.',bill:existing},409);
   const accounts=await ensureDefaultLedgerAccounts(c.db,c.user.userId,now),payable=accounts.find(a=>a.code==='210003');
   if(!payable)return json({error:'Akun Utang Usaha belum tersedia.'},503);
   const id=crypto.randomUUID(),entryId=crypto.randomUUID(),billNumber='SB-BILL-'+issue.slice(0,4)+issue.slice(5,7)+'-'+id.slice(0,8).toUpperCase(),reference='BILL-'+id;
   await c.db.batch([
    c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(entryId,c.user.userId,c.user.accountId,issue,('Tagihan pemasok '+billNumber+' · '+String(supplier.name)).slice(0,500),reference,now),
    c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,entryId,accountId,amount,0),
    c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,entryId,String(payable.id),0,amount),
    c.db.prepare("INSERT INTO commerce_purchase_bills(id,owner,supplier_id,supplier_invoice_number,bill_number,issue_date,due_date,description,expense_account_id,total_amount,paid_total,status,ledger_entry_id,actor_id,created,updated) VALUES(?,?,?,?,?,?,?, ?,?,?,0,'issued',?,?,?,?)").bind(id,c.user.userId,supplierId,supplierInvoice,billNumber,issue,due,description,accountId,amount,entryId,c.user.accountId,now,now),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Tagihan pemasok dibukukan',billNumber+' · '+String(supplier.name)+' · Rp '+String(amount),now)
   ]);
   return json({ok:true,id,billNumber},201);
  }
  if(b.action==='payment'){
   const billId=typeof b.billId==='string'?b.billId:'',cashAccountId=typeof b.cashAccountId==='string'?b.cashAccountId:'',clientRequestId=typeof b.clientRequestId==='string'?b.clientRequestId:'',date=b.paidDate,amount=Number(b.amount),reference=textField(b.reference,100);
   if(!/^[a-f0-9-]{36}$/i.test(billId)||!/^[a-f0-9-]{36}$/i.test(cashAccountId)||!/^[a-f0-9-]{36}$/i.test(clientRequestId)||!validDate(date)||!Number.isSafeInteger(amount)||amount<=0||amount>1_000_000_000_000)return json({error:'Pilih tagihan, akun kas/bank, tanggal, dan nominal pembayaran yang valid.'},400);
   const reused=await c.db.prepare('SELECT id,ledger_entry_id FROM commerce_purchase_bill_payments WHERE owner=? AND client_request_id=?').bind(c.user.userId,clientRequestId).first();
   if(reused)return json({ok:true,reused:true,paymentId:reused.id,ledgerEntryId:reused.ledger_entry_id});
   const bill=await c.db.prepare('SELECT id,bill_number,issue_date,total_amount,paid_total,status,supplier_id FROM commerce_purchase_bills WHERE id=? AND owner=?').bind(billId,c.user.userId).first();
   if(!bill)return json({error:'Tagihan pemasok tidak ditemukan.'},404);
   const cash=await c.db.prepare("SELECT id,code,name FROM ledger_accounts WHERE id=? AND owner=? AND active=TRUE AND category='asset'").bind(cashAccountId,c.user.userId).first();
   if(!cash)return json({error:'Pilih akun kas/bank aset yang aktif.'},400);
   if(String(date)<String(bill.issue_date).slice(0,10))return json({error:'Tanggal pembayaran tidak boleh sebelum tanggal tagihan.'},400);
   const outstanding=Number(bill.total_amount)-Number(bill.paid_total);
   if(!Number.isSafeInteger(outstanding)||outstanding<=0||amount>outstanding)return json({error:'Nominal pembayaran melebihi sisa utang atau tagihan sudah lunas.'},409);
   const accounts=await ensureDefaultLedgerAccounts(c.db,c.user.userId,now),payable=accounts.find(a=>a.code==='210003');
   if(!payable)return json({error:'Akun Utang Usaha belum tersedia.'},503);
   const balance=await c.db.prepare('SELECT COALESCE(SUM(debit-credit),0) AS available FROM ledger_lines WHERE owner=? AND account_id=?').bind(c.user.userId,cashAccountId).first();
   if(Number(balance?.available??0)<amount)return json({error:'Saldo kas/bank tidak mencukupi untuk pembayaran ini.'},409);
   const paymentId=crypto.randomUUID(),entryId=crypto.randomUUID(),memo=('Pembayaran utang '+String(bill.bill_number)+(reference?' · '+reference:'')).slice(0,500),entryRef='BILLPAY-'+paymentId;
   await c.db.batch([
    c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(entryId,c.user.userId,c.user.accountId,date,memo,entryRef,now),
    c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,entryId,String(payable.id),amount,0),
    c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,entryId,cashAccountId,0,amount),
    c.db.prepare('INSERT INTO commerce_purchase_bill_payments(id,owner,bill_id,client_request_id,amount,paid_date,cash_account_id,ledger_entry_id,actor_id,created) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(paymentId,c.user.userId,billId,clientRequestId,amount,date,cashAccountId,entryId,c.user.accountId,now),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.user.userId,'Pembayaran utang pemasok diposting',String(bill.bill_number)+' · Rp '+String(amount),now)
   ]);
   return json({ok:true,paymentId,ledgerEntryId:entryId},201);
  }
  return json({error:'Aksi pembelian tidak dikenal.'},400);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
