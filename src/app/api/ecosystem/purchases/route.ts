import {required,json,errorReply} from '@/lib/ecosystem/guard';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {textField} from '@/features/shared/validation.mjs';
import {ensureDefaultLedgerAccounts} from '@/features/finance/record-posting';
export const dynamic='force-dynamic';
const canRead=(role:string)=>['admin','ketua','bendahara'].includes(role);
const canWrite=(role:string)=>['admin','bendahara'].includes(role);
const canApprove=(role:string)=>['admin','ketua'].includes(role);
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const id=()=>crypto.randomUUID();
export async function GET(request:Request){
 const c=await required(request);if(c.error)return c.error;if(!canRead(c.user.role))return json({error:'Akses pengadaan dibatasi.'},403);
 try{
  const organization=await c.db.prepare('SELECT id FROM workspace_v14.organizations WHERE source_owner_user_id=?').bind(c.user.userId).first();
  if(!organization?.id)return json({error:'Ruang data organisasi belum disiapkan.'},503);
  const org=String(organization.id);
  const [suppliers,bills,accounts,requests,requestLines,orders,receipts,orderLines,matchableReceiptLines,stockItems,stockLocations]=await Promise.all([
   c.db.prepare('SELECT id,supplier_code,name,contact_name,email,phone,address,payment_terms_days,active,created,updated FROM commerce_suppliers WHERE owner=? ORDER BY active DESC,name LIMIT 500').bind(c.user.userId).all(),
   c.db.prepare(`SELECT b.id,b.supplier_id,s.name AS supplier_name,s.supplier_code,b.supplier_invoice_number,b.bill_number,b.issue_date,b.due_date,b.description,b.total_amount,b.paid_total,(b.total_amount-b.paid_total) AS outstanding_amount,b.status,b.match_status,b.purchase_order_id,po.order_number,b.created,b.updated,a.code AS expense_code,a.name AS expense_name,(SELECT COUNT(*) FROM commerce_purchase_bill_payments p WHERE p.bill_id=b.id AND p.owner=b.owner) AS payment_count FROM commerce_purchase_bills b JOIN commerce_suppliers s ON s.id=b.supplier_id AND s.owner=b.owner JOIN ledger_accounts a ON a.id=b.expense_account_id AND a.owner=b.owner LEFT JOIN commerce_purchase_orders po ON po.id=b.purchase_order_id AND po.owner=b.owner WHERE b.owner=? ORDER BY b.due_date,b.created DESC LIMIT 300`).bind(c.user.userId).all(),
   c.db.prepare("SELECT id,code,name,category,active FROM ledger_accounts WHERE owner=? AND active=TRUE ORDER BY code").bind(c.user.userId).all(),
   c.db.prepare(`SELECT r.*, (SELECT COUNT(*) FROM commerce_purchase_request_lines l WHERE l.request_id=r.id AND l.owner=r.owner) AS line_count FROM commerce_purchase_requests r WHERE r.owner=? ORDER BY r.created DESC LIMIT 200`).bind(c.user.userId).all(),
   c.db.prepare(`SELECT id,request_id,item_name,description,unit,quantity,estimated_unit_cost FROM commerce_purchase_request_lines WHERE owner=? ORDER BY created`).bind(c.user.userId).all(),
   c.db.prepare(`SELECT o.*,s.name AS supplier_name,(SELECT COUNT(*) FROM commerce_purchase_order_lines l WHERE l.purchase_order_id=o.id AND l.owner=o.owner) AS line_count,(SELECT COALESCE(SUM(quantity-received_quantity),0) FROM commerce_purchase_order_lines l WHERE l.purchase_order_id=o.id AND l.owner=o.owner) AS remaining_quantity FROM commerce_purchase_orders o JOIN commerce_suppliers s ON s.id=o.supplier_id AND s.owner=o.owner WHERE o.owner=? ORDER BY o.created DESC LIMIT 200`).bind(c.user.userId).all(),
   c.db.prepare(`SELECT g.id,g.receipt_number,g.received_date,g.delivery_reference,g.purchase_order_id,g.inventory_location_id,o.order_number FROM commerce_goods_receipts g JOIN commerce_purchase_orders o ON o.id=g.purchase_order_id AND o.owner=g.owner WHERE g.owner=? ORDER BY g.created DESC LIMIT 200`).bind(c.user.userId).all(),
   c.db.prepare(`SELECT l.id,l.purchase_order_id,l.item_name,l.unit,l.quantity,l.received_quantity,(l.quantity-l.received_quantity) AS remaining_quantity,l.unit_cost,l.inventory_item_id,i.name AS inventory_item_name,o.order_number FROM commerce_purchase_order_lines l JOIN commerce_purchase_orders o ON o.id=l.purchase_order_id AND o.owner=l.owner LEFT JOIN workspace_v14.inventory_items i ON i.id=l.inventory_item_id AND i.organization_id=? WHERE l.owner=? AND o.status IN ('approved','partially_received') AND l.received_quantity<l.quantity ORDER BY o.order_date,l.created`).bind(org,c.user.userId).all(),
   c.db.prepare(`SELECT grl.id AS receipt_line_id,grl.quantity AS received_quantity,grl.invoiced_quantity,(grl.quantity-grl.invoiced_quantity) AS remaining_receipt_quantity,pol.id AS purchase_order_line_id,pol.item_name,pol.unit,pol.unit_cost,pol.quantity AS ordered_quantity,pol.invoiced_quantity AS order_invoiced_quantity,(pol.quantity-pol.invoiced_quantity) AS remaining_order_quantity,gr.id AS receipt_id,gr.receipt_number,gr.received_date,po.id AS purchase_order_id,po.order_number,po.supplier_id,s.name AS supplier_name,po.status AS order_status FROM commerce_goods_receipt_lines grl JOIN commerce_goods_receipts gr ON gr.id=grl.receipt_id AND gr.owner=grl.owner JOIN commerce_purchase_order_lines pol ON pol.id=grl.purchase_order_line_id AND pol.owner=grl.owner JOIN commerce_purchase_orders po ON po.id=gr.purchase_order_id AND po.owner=gr.owner JOIN commerce_suppliers s ON s.id=po.supplier_id AND s.owner=po.owner WHERE grl.owner=? AND po.status IN ('partially_received','received') AND grl.invoiced_quantity<grl.quantity AND pol.invoiced_quantity<pol.quantity ORDER BY gr.received_date,gr.created`).bind(c.user.userId).all(),
   c.db.prepare(`SELECT id,sku,name,item_type,unit_of_measure FROM workspace_v14.inventory_items WHERE organization_id=? AND item_type<>'equipment' ORDER BY name LIMIT 1000`).bind(org).all(),
   c.db.prepare(`SELECT id,location_code,name,location_type,active FROM workspace_v14.inventory_locations WHERE organization_id=? ORDER BY active DESC,name`).bind(org).all()
  ]);
  return json({suppliers:suppliers.results,bills:bills.results,accounts:accounts.results,requests:requests.results,requestLines:requestLines.results,purchaseOrders:orders.results,goodsReceipts:receipts.results,orderLines:orderLines.results,matchableReceiptLines:matchableReceiptLines.results,stockItems:stockItems.results,stockLocations:stockLocations.results});
 }catch(e){return errorReply(e)}
}
export async function POST(request:Request){
 const c=await required(request,true);if(c.error)return c.error;
 try{
  const b=await readJsonObject(request,16000),now=new Date().toISOString(),owner=c.user.userId,actor=c.user.accountId;
  if(!await consumeRateLimit(c.db,'purchases:write:'+actor,100,3600000))return json({error:'Batas perubahan pengadaan per jam telah tercapai.'},429);
  if(b.action==='request'){
   if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat mengajukan pengadaan.'},403);
   const purpose=textField(b.purpose,500),date=b.requestedDate,lines=Array.isArray(b.lines)?b.lines:[];
   if(!purpose||!validDate(date)||lines.length<1||lines.length>50)return json({error:'Tujuan, tanggal, dan 1–50 baris kebutuhan wajib diisi.'},400);
   let total=0;const clean=lines.map((v:Record<string,unknown>)=>{const name=textField(v.itemName,160),unit=textField(v.unit,24),description=textField(v.description,300),qty=Number(v.quantity),cost=Number(v.estimatedUnitCost);if(!name||!unit||!Number.isFinite(qty)||qty<=0||qty>1e9||!Number.isSafeInteger(cost)||cost<0||cost>1e12)throw new Error('Baris kebutuhan tidak valid.');const lineTotal=Math.ceil(qty*cost);if(!Number.isSafeInteger(lineTotal)||lineTotal>1e12)throw new Error('Nilai estimasi terlalu besar.');total+=lineTotal;if(!Number.isSafeInteger(total)||total>1e12)throw new Error('Total estimasi terlalu besar.');return{id:id(),name,unit,description,qty,cost}});
   const requestId=id(),number='PR-'+date.replaceAll('-','')+'-'+requestId.slice(0,6).toUpperCase();
   const stmts=[c.db.prepare("INSERT INTO commerce_purchase_requests(id,owner,request_number,requested_date,purpose,status,requester_id,created,updated) VALUES(?,?,?,?,?,'submitted',?,?,?)").bind(requestId,owner,number,date,purpose,actor,now,now),...clean.map((x)=>c.db.prepare('INSERT INTO commerce_purchase_request_lines(id,owner,request_id,item_name,description,unit,quantity,estimated_unit_cost,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(x.id,owner,requestId,x.name,x.description||null,x.unit,x.qty,x.cost,now)),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Permintaan pengadaan diajukan',number+' · '+purpose,now)];
   await c.db.batch(stmts);return json({ok:true,id:requestId,requestNumber:number,estimatedTotal:total},201);
  }
  if(b.action==='review-request'){
   if(!canApprove(c.user.role))return json({error:'Persetujuan permintaan hanya untuk ketua atau administrator.'},403);
   const requestId=b.requestId,note=textField(b.note,500),decision=b.decision;
   if(!uuid(requestId)||!['approve','reject'].includes(String(decision)))return json({error:'Permintaan atau keputusan tidak valid.'},400);
   const req=await c.db.prepare('SELECT id,request_number,status,requester_id FROM commerce_purchase_requests WHERE id=? AND owner=?').bind(requestId,owner).first();
   if(!req)return json({error:'Permintaan tidak ditemukan.'},404);
   if(req.status!=='submitted')return json({error:'Permintaan sudah diproses.'},409);
   if(String(req.requester_id)===actor)return json({error:'Pengaju tidak boleh menyetujui permintaannya sendiri.'},403);
   await c.db.batch([
    c.db.prepare('UPDATE commerce_purchase_requests SET status=?,reviewer_id=?,reviewed_at=?,review_note=?,updated=? WHERE id=? AND owner=? AND status=\'submitted\'').bind(decision==='approve'?'approved':'rejected',actor,now,note||null,now,requestId,owner),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,decision==='approve'?'Permintaan pengadaan disetujui':'Permintaan pengadaan ditolak',String(req.request_number)+(note?' · '+note:''),now)
   ]);return json({ok:true});
  }
  if(b.action==='create-order'){
   if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat membuat Purchase Order.'},403);
   const requestId=b.requestId,supplierId=b.supplierId,orderDate=b.orderDate,expected=b.expectedDate;
   if(!uuid(requestId)||!uuid(supplierId)||!validDate(orderDate)||(expected!==null&&expected!==undefined&&expected!==''&&!validDate(expected)))return json({error:'Permintaan, pemasok, dan tanggal Purchase Order tidak valid.'},400);
   const req=await c.db.prepare("SELECT id,request_number,status FROM commerce_purchase_requests WHERE id=? AND owner=?").bind(requestId,owner).first();
   if(!req||req.status!=='approved')return json({error:'Purchase Order hanya dapat dibuat dari permintaan yang telah disetujui.'},409);
   const supplier=await c.db.prepare('SELECT id,name FROM commerce_suppliers WHERE id=? AND owner=? AND active=TRUE').bind(supplierId,owner).first();if(!supplier)return json({error:'Pemasok aktif tidak ditemukan.'},404);
   const prior=await c.db.prepare('SELECT id,order_number FROM commerce_purchase_orders WHERE owner=? AND request_id=?').bind(owner,requestId).first();if(prior)return json({error:'Permintaan ini sudah memiliki Purchase Order.',purchaseOrder:prior},409);
   const source=await c.db.prepare('SELECT id,item_name,description,unit,quantity,estimated_unit_cost FROM commerce_purchase_request_lines WHERE request_id=? AND owner=? ORDER BY created').bind(requestId,owner).all();
   if(!source.results.length)return json({error:'Permintaan tidak memiliki rincian.'},409);
   const total=source.results.reduce((sum,x)=>sum+Math.ceil(Number(x.quantity)*Number(x.estimated_unit_cost)),0);
   if(!Number.isSafeInteger(total)||total>1e12)return json({error:'Total Purchase Order melebihi batas.'},400);
   const mappings=(b.inventoryMappings&&typeof b.inventoryMappings==='object'&&!Array.isArray(b.inventoryMappings)?b.inventoryMappings:{}) as Record<string,unknown>;
   const mappedLines:Array<{source:Record<string,unknown>;inventoryItemId:string|null}>=[];
   for(const sourceLine of source.results){
    const rawItem=mappings[String(sourceLine.id)];
    if(rawItem===undefined||rawItem===null||rawItem===''){mappedLines.push({source:sourceLine,inventoryItemId:null});continue;}
    if(!uuid(rawItem))return json({error:'Pemetaan barang inventaris pada Purchase Order tidak valid.'},400);
    const item=await c.db.prepare(`SELECT id,unit_of_measure FROM workspace_v14.inventory_items WHERE id=? AND organization_id=? AND item_type<>'equipment'`).bind(rawItem,org).first();
    if(!item)return json({error:'Barang stok tidak ditemukan dalam organisasi ini.'},404);
    if(String(item.unit_of_measure).toLowerCase()!==String(sourceLine.unit).toLowerCase())return json({error:'Satuan barang permintaan harus sama dengan satuan barang inventaris. Perbaiki data sebelum membuat PO.'},409);
    mappedLines.push({source:sourceLine,inventoryItemId:String(item.id)});
   }
   const orderId=id(),number='PO-'+orderDate.replaceAll('-','')+'-'+orderId.slice(0,6).toUpperCase();
   const stmts=[c.db.prepare("INSERT INTO commerce_purchase_orders(id,owner,order_number,request_id,supplier_id,order_date,expected_date,status,total_estimate,created_by,created,updated) VALUES(?,?,?,?,?,?,?,'pending_approval',?,?,?,?)").bind(orderId,owner,number,requestId,supplierId,orderDate,expected||null,total,actor,now,now),...mappedLines.map(({source:x,inventoryItemId})=>c.db.prepare('INSERT INTO commerce_purchase_order_lines(id,owner,purchase_order_id,request_line_id,item_name,description,unit,quantity,unit_cost,created,inventory_item_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id(),owner,orderId,x.id,x.item_name,x.description,x.unit,x.quantity,x.estimated_unit_cost,now,inventoryItemId)),c.db.prepare("UPDATE commerce_purchase_requests SET status='ordered',updated=? WHERE id=? AND owner=? AND status='approved'").bind(now,requestId,owner),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Purchase Order dibuat',number+' · '+String(supplier.name),now)];
   await c.db.batch(stmts);return json({ok:true,id:orderId,orderNumber:number},201);
  }
  if(b.action==='approve-order'){
   if(!canApprove(c.user.role))return json({error:'Persetujuan Purchase Order hanya untuk ketua atau administrator.'},403);
   const orderId=b.purchaseOrderId,note=textField(b.note,500);if(!uuid(orderId))return json({error:'Purchase Order tidak valid.'},400);
   const po=await c.db.prepare('SELECT id,order_number,created_by,status FROM commerce_purchase_orders WHERE id=? AND owner=?').bind(orderId,owner).first();
   if(!po||po.status!=='pending_approval')return json({error:'Purchase Order tidak ditemukan atau sudah diproses.'},409);
   if(String(po.created_by)===actor)return json({error:'Pembuat Purchase Order tidak boleh menyetujui dokumennya sendiri.'},403);
   await c.db.batch([c.db.prepare("UPDATE commerce_purchase_orders SET status='approved',approved_by=?,approved_at=?,approval_note=?,updated=? WHERE id=? AND owner=? AND status='pending_approval'").bind(actor,now,note||null,now,orderId,owner),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Purchase Order disetujui',String(po.order_number)+(note?' · '+note:''),now)]);
   return json({ok:true});
  }
  if(b.action==='receive'){
   if(!canWrite(c.user.role))return json({error:'Hanya bendahara atau administrator yang dapat mencatat penerimaan.'},403);
   const orderId=b.purchaseOrderId,date=b.receivedDate,lines=Array.isArray(b.lines)?b.lines:[],delivery=textField(b.deliveryReference,100),notes=textField(b.notes,500),clientRequestId=b.clientRequestId,inventoryLocationId=b.inventoryLocationId;
   if(!uuid(orderId)||!uuid(clientRequestId)||!validDate(date)||lines.length<1||lines.length>100)return json({error:'Purchase Order, kunci idempotensi, tanggal, dan rincian penerimaan wajib diisi.'},400);
   const reused=await c.db.prepare('SELECT id,receipt_number FROM commerce_goods_receipts WHERE owner=? AND client_request_id=?').bind(owner,clientRequestId).first();
   if(reused)return json({ok:true,reused:true,id:reused.id,receiptNumber:reused.receipt_number});
   const po=await c.db.prepare("SELECT id,order_number,status FROM commerce_purchase_orders WHERE id=? AND owner=?").bind(orderId,owner).first();
   if(!po||!['approved','partially_received'].includes(String(po.status)))return json({error:'Penerimaan hanya dapat dicatat untuk Purchase Order yang disetujui.'},409);
   const orderLines=await c.db.prepare('SELECT id,item_name,unit,quantity,received_quantity,inventory_item_id FROM commerce_purchase_order_lines WHERE purchase_order_id=? AND owner=?').bind(orderId,owner).all();
   const byId=new Map(orderLines.results.map(x=>[String(x.id),x]));const clean=lines.map((v:Record<string,unknown>)=>{const line=byId.get(String(v.orderLineId)),qty=Number(v.quantity);if(!line||!Number.isFinite(qty)||qty<=0||qty>1e9||Number(line.received_quantity)+qty>Number(line.quantity))throw new Error('Jumlah penerimaan melebihi sisa pesanan atau baris tidak valid.');return{lineId:String(line.id),qty,condition:textField(v.conditionNote,300)}});if(new Set(clean.map(x=>x.lineId)).size!==clean.length) return json({error:'Baris pesanan tidak boleh dicantumkan dua kali dalam satu penerimaan.'},400);
   const includesStock=clean.some(x=>Boolean(byId.get(x.lineId)?.inventory_item_id));
   if(includesStock&&!uuid(inventoryLocationId))return json({error:'Pilih lokasi penyimpanan untuk barang stok yang diterima.'},400);
   if(inventoryLocationId){const loc=await c.db.prepare('SELECT id FROM workspace_v14.inventory_locations WHERE id=? AND organization_id=? AND active=TRUE').bind(inventoryLocationId,org).first();if(!loc)return json({error:'Lokasi penyimpanan tidak aktif atau bukan milik organisasi ini.'},404);}
   const receiptId=id(),number='GR-'+date.replaceAll('-','')+'-'+receiptId.slice(0,6).toUpperCase();
   const stmts=[c.db.prepare('INSERT INTO commerce_goods_receipts(id,owner,receipt_number,purchase_order_id,received_date,delivery_reference,notes,received_by,created,inventory_location_id,client_request_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(receiptId,owner,number,orderId,date,delivery||null,notes||null,actor,now,inventoryLocationId||null,clientRequestId),...clean.map(x=>c.db.prepare('INSERT INTO commerce_goods_receipt_lines(id,owner,receipt_id,purchase_order_line_id,quantity,condition_note,created) VALUES(?,?,?,?,?,?,?)').bind(id(),owner,receiptId,x.lineId,x.qty,x.condition||null,now)),c.db.prepare("UPDATE commerce_purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM commerce_purchase_order_lines l WHERE l.purchase_order_id=? AND l.owner=? AND l.received_quantity<l.quantity) THEN 'received' ELSE 'partially_received' END,updated=? WHERE id=? AND owner=?").bind(orderId,owner,now,orderId,owner),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Penerimaan barang dicatat',number+' · '+String(po.order_number),now)];
   await c.db.batch(stmts);return json({ok:true,id:receiptId,receiptNumber:number},201);
  }
  if(b.action==='supplier'){
   if(!canWrite(c.user.role))return json({error:'Akses perubahan pemasok ditolak.'},403);
   const name=textField(b.name,160),code=typeof b.supplierCode==='string'?b.supplierCode.trim().toUpperCase():'',email=textField(b.email,160),phone=textField(b.phone,40),contact=textField(b.contactName,120),address=textField(b.address,500),notes=textField(b.notes,500),terms=Number(b.paymentTermsDays??0);
   if(!name||!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(code)||!Number.isInteger(terms)||terms<0||terms>365||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return json({error:'Kode, nama, kontak, atau termin pembayaran pemasok tidak valid.'},400);
   const supplierId=id();await c.db.batch([c.db.prepare('INSERT INTO commerce_suppliers(id,owner,supplier_code,name,contact_name,email,phone,address,payment_terms_days,notes,actor_id,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(supplierId,owner,code,name,contact||null,email||null,phone||null,address||null,terms,notes||null,actor,now,now),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Pemasok ditambahkan',code+' · '+name,now)]);return json({ok:true,id:supplierId},201);
  }
  if(b.action==='bill'){
   if(!canWrite(c.user.role))return json({error:'Akses pencatatan tagihan ditolak.'},403);
   const supplierId=typeof b.supplierId==='string'?b.supplierId:'',purchaseOrderId=b.purchaseOrderId, supplierInvoice=textField(b.supplierInvoiceNumber,100),description=textField(b.description,500),accountId=typeof b.expenseAccountId==='string'?b.expenseAccountId:'',issue=b.issueDate,due=b.dueDate,amount=Number(b.amount),inputLines=Array.isArray(b.lines)?b.lines:[];
   if(!uuid(supplierId)||!uuid(purchaseOrderId)||!uuid(accountId)||!supplierInvoice||!description||!validDate(issue)||!validDate(due)||due<issue||!Number.isSafeInteger(amount)||amount<=0||amount>1e12||inputLines.length<1||inputLines.length>100)return json({error:'Lengkapi pemasok, PO, nomor faktur, rincian barang, akun beban, tanggal, jatuh tempo, dan total yang valid.'},400);
   const supplier=await c.db.prepare('SELECT id,name FROM commerce_suppliers WHERE id=? AND owner=? AND active=TRUE').bind(supplierId,owner).first();if(!supplier)return json({error:'Pemasok aktif tidak ditemukan.'},404);
   const po=await c.db.prepare("SELECT id,order_number,supplier_id,status FROM commerce_purchase_orders WHERE id=? AND owner=?").bind(purchaseOrderId,owner).first();
   if(!po||String(po.supplier_id)!==supplierId||!['partially_received','received'].includes(String(po.status)))return json({error:'PO harus berasal dari pemasok yang sama dan sudah memiliki penerimaan barang.'},409);
   const account=await c.db.prepare("SELECT id FROM ledger_accounts WHERE id=? AND owner=? AND active=TRUE AND category='expense'").bind(accountId,owner).first();if(!account)return json({error:'Pilih akun beban aktif. Kapitalisasi persediaan belum diaktifkan.'},400);
   const existing=await c.db.prepare('SELECT id,bill_number FROM commerce_purchase_bills WHERE owner=? AND supplier_id=? AND supplier_invoice_number=?').bind(owner,supplierId,supplierInvoice).first();if(existing)return json({error:'Nomor faktur pemasok tersebut sudah pernah dicatat.',bill:existing},409);
   const seen=new Set<string>();let matchedTotal=0;const matchedLines:Array<{id:string;receiptLineId:string;poLineId:string;itemName:string;quantity:number;unitCost:number;lineTotal:number}>=[];
   for(const raw of inputLines){
    const line=raw as Record<string,unknown>,receiptLineId=line.receiptLineId,quantity=Number(line.quantity),unitCost=Number(line.unitCost);
    if(!uuid(receiptLineId)||seen.has(receiptLineId)||!Number.isFinite(quantity)||quantity<=0||quantity>1e9||Math.round(quantity*1000)!==quantity*1000||!Number.isSafeInteger(unitCost)||unitCost<0||unitCost>1e12)return json({error:'Rincian faktur tidak valid atau bukti penerimaan dipilih lebih dari sekali.'},400);
    seen.add(receiptLineId);
    const source=await c.db.prepare(`SELECT grl.id AS receipt_line_id,grl.quantity AS received_quantity,grl.invoiced_quantity,grl.purchase_order_line_id,gr.received_date,gr.purchase_order_id,po.supplier_id,po.status AS order_status,pol.item_name,pol.unit_cost AS ordered_unit_cost,pol.quantity AS ordered_quantity,pol.invoiced_quantity AS order_invoiced_quantity FROM commerce_goods_receipt_lines grl JOIN commerce_goods_receipts gr ON gr.id=grl.receipt_id AND gr.owner=grl.owner JOIN commerce_purchase_orders po ON po.id=gr.purchase_order_id AND po.owner=gr.owner JOIN commerce_purchase_order_lines pol ON pol.id=grl.purchase_order_line_id AND pol.owner=grl.owner WHERE grl.id=? AND grl.owner=?`).bind(receiptLineId,owner).first();
    if(!source||String(source.purchase_order_id)!==purchaseOrderId||String(source.supplier_id)!==supplierId||!['partially_received','received'].includes(String(source.order_status)))return json({error:'Bukti penerimaan tidak termasuk PO dan pemasok yang dipilih.'},409);
    if(String(source.received_date).slice(0,10)>issue)return json({error:'Tanggal faktur tidak boleh mendahului tanggal penerimaan barang.'},409);
    if(unitCost!==Number(source.ordered_unit_cost))return json({error:'Harga satuan faktur berbeda dari harga Purchase Order. Selisih harus diperiksa sebelum dibukukan.'},409);
    if(quantity>Number(source.received_quantity)-Number(source.invoiced_quantity)||quantity>Number(source.ordered_quantity)-Number(source.order_invoiced_quantity))return json({error:'Jumlah faktur melebihi barang yang diterima atau sisa kuantitas pesanan.'},409);
    const lineTotal=Math.round(quantity*unitCost);if(!Number.isSafeInteger(lineTotal)||lineTotal>1e12)return json({error:'Nilai baris faktur melebihi batas.'},400);
    matchedTotal+=lineTotal;if(!Number.isSafeInteger(matchedTotal)||matchedTotal>1e12)return json({error:'Total rincian faktur melebihi batas.'},400);
    matchedLines.push({id:id(),receiptLineId,poLineId:String(source.purchase_order_line_id),itemName:String(source.item_name),quantity,unitCost,lineTotal});
   }
   if(matchedTotal!==amount)return json({error:'Total faktur harus sama persis dengan jumlah rincian yang lolos pencocokan PO dan penerimaan. Pajak, ongkir, diskon, atau selisih harga belum diatur dalam kebijakan pencocokan.'},409);
   const accounts=await ensureDefaultLedgerAccounts(c.db,owner,now),payable=accounts.find(a=>a.code==='210003');if(!payable)return json({error:'Akun Utang Usaha belum tersedia.'},503);
   const billId=id(),entryId=id(),billNumber='SB-BILL-'+issue.slice(0,4)+issue.slice(5,7)+'-'+billId.slice(0,8).toUpperCase();
   const statements=[
    c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(entryId,owner,actor,issue,('Tagihan pemasok '+billNumber+' · '+String(supplier.name)).slice(0,500),'BILL-'+billId,now),
    c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(id(),owner,entryId,accountId,amount,0),
    c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(id(),owner,entryId,String(payable.id),0,amount),
    c.db.prepare("INSERT INTO commerce_purchase_bills(id,owner,supplier_id,supplier_invoice_number,bill_number,issue_date,due_date,description,expense_account_id,total_amount,paid_total,status,ledger_entry_id,actor_id,created,updated,purchase_order_id,match_status,matched_at) VALUES(?,?,?,?,?,?,?,?,?,?,0,'issued',?,?,?,?,?,'matched',?)").bind(billId,owner,supplierId,supplierInvoice,billNumber,issue,due,description,accountId,amount,entryId,actor,now,now,purchaseOrderId,now),
    ...matchedLines.map(line=>c.db.prepare('INSERT INTO commerce_purchase_bill_lines(id,owner,bill_id,purchase_order_line_id,goods_receipt_line_id,item_name,quantity,unit_cost,line_total,created) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(line.id,owner,billId,line.poLineId,line.receiptLineId,line.itemName,line.quantity,line.unitCost,line.lineTotal,now)),
    c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Tagihan pemasok lolos pencocokan tiga arah',billNumber+' · '+String(po.order_number)+' · Rp '+String(amount),now)
   ];
   await c.db.batch(statements);
   return json({ok:true,id:billId,billNumber,matchStatus:'matched',purchaseOrderNumber:po.order_number,matchedLineCount:matchedLines.length},201);
  }
  if(b.action==='payment'){
   if(!canWrite(c.user.role))return json({error:'Akses pembayaran ditolak.'},403);
   const billId=b.billId,cashAccountId=b.cashAccountId,clientRequestId=b.clientRequestId,date=b.paidDate,amount=Number(b.amount),reference=textField(b.reference,100);
   if(!uuid(billId)||!uuid(cashAccountId)||!uuid(clientRequestId)||!validDate(date)||!Number.isSafeInteger(amount)||amount<=0||amount>1e12)return json({error:'Data pembayaran tidak valid.'},400);
   const reused=await c.db.prepare('SELECT id,ledger_entry_id FROM commerce_purchase_bill_payments WHERE owner=? AND client_request_id=?').bind(owner,clientRequestId).first();if(reused)return json({ok:true,reused:true,paymentId:reused.id,ledgerEntryId:reused.ledger_entry_id});
   const bill=await c.db.prepare('SELECT id,bill_number,issue_date,total_amount,paid_total FROM commerce_purchase_bills WHERE id=? AND owner=?').bind(billId,owner).first();if(!bill)return json({error:'Tagihan pemasok tidak ditemukan.'},404);
   const cash=await c.db.prepare("SELECT id FROM ledger_accounts WHERE id=? AND owner=? AND active=TRUE AND category='asset'").bind(cashAccountId,owner).first();if(!cash)return json({error:'Pilih akun kas/bank aktif.'},400);
   if(date<String(bill.issue_date).slice(0,10))return json({error:'Tanggal pembayaran tidak boleh sebelum tanggal tagihan.'},400);
   const outstanding=Number(bill.total_amount)-Number(bill.paid_total);if(!Number.isSafeInteger(outstanding)||outstanding<=0||amount>outstanding)return json({error:'Nominal pembayaran melebihi sisa utang.'},409);
   const accounts=await ensureDefaultLedgerAccounts(c.db,owner,now),payable=accounts.find(a=>a.code==='210003');if(!payable)return json({error:'Akun Utang Usaha belum tersedia.'},503);
   const balance=await c.db.prepare('SELECT COALESCE(SUM(debit-credit),0) AS available FROM ledger_lines WHERE owner=? AND account_id=?').bind(owner,cashAccountId).first();if(Number(balance?.available??0)<amount)return json({error:'Saldo kas/bank tidak mencukupi.'},409);
   const paymentId=id(),entryId=id();await c.db.batch([c.db.prepare('INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)').bind(entryId,owner,actor,date,'Pembayaran utang '+String(bill.bill_number)+(reference?' · '+reference:''),'BILLPAY-'+paymentId,now),c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(id(),owner,entryId,String(payable.id),amount,0),c.db.prepare('INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)').bind(id(),owner,entryId,cashAccountId,0,amount),c.db.prepare('INSERT INTO commerce_purchase_bill_payments(id,owner,bill_id,client_request_id,amount,paid_date,cash_account_id,ledger_entry_id,actor_id,created) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(paymentId,owner,billId,clientRequestId,amount,date,cashAccountId,entryId,actor,now),c.db.prepare('INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)').bind(id(),owner,'Pembayaran utang pemasok diposting',String(bill.bill_number)+' · Rp '+String(amount),now)]);return json({ok:true,paymentId,ledgerEntryId:entryId},201);
  }
  return json({error:'Aksi pengadaan tidak dikenal.'},400);
 }catch(e){return e instanceof RequestBodyError?json({error:e.message},e.status):errorReply(e)}
}
