import { getAuthenticatedUser } from "@/lib/auth";
import {notifyOwner} from "@/lib/ecosystem/notifications";
import { json, sameOrigin } from "@/lib/account-access";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { categories, statuses, canReview, canViewOperation, canFulfillCategory, operationActions, validateOperation as validateDomainOperation, cleanOperation, isFinancial, type Operation, type Category } from "@/lib/enterprise/operations";
import { operationDB, findOperation, findAsset, checkInputAsset, createOperation, updateOperation, OperationError } from "@/lib/enterprise/repository";
import type { Principal } from "@/lib/permissions";
export const dynamic="force-dynamic";
function validateOperation(raw:unknown,complete:boolean){try{return validateDomainOperation(raw,complete);}catch(e){throw new OperationError(e instanceof Error?e.message:'Isian pengajuan tidak valid.');}}
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value);
function visibleSQL(user:Principal){
 const parts=['requester_id=?'],args:unknown[]=[user.accountId];
 if(canReview(user))parts.push("status<>'draft'");
 const allowed=(Object.keys(categories)as Category[]).filter(c=>canFulfillCategory(user,c));
 if(allowed.length){parts.push("(category IN ("+allowed.map(()=>'?').join(',')+") AND status IN ('approved','in_progress','completed'))");args.push(...allowed);}
 return {sql:'('+parts.join(' OR ')+')',args};
}
async function catalog(user:Principal){
 const rows=await operationDB().prepare("SELECT id,data FROM records WHERE owner=? AND kind='aset' ORDER BY created DESC").bind(user.userId).all();
 const reservations=await operationDB().prepare("SELECT asset_id,SUM(quantity) AS reserved FROM operational_requests WHERE owner=? AND category='asset_loan' AND status IN ('approved','in_progress') GROUP BY asset_id").bind(user.userId).all();
 const used=new Map(reservations.results.map(r=>[String(r.asset_id),Number(r.reserved)]));
 return rows.results.flatMap(row=>{try{const d=JSON.parse(String(row.data));const total=Number(d.quantity);return Number.isSafeInteger(total)&&total>=0&&d.status!=='Nonaktif'?[{id:String(row.id),name:String(d.name),condition:String(d.condition||'Perlu verifikasi'),quantity:total,available:d.condition==='Baik'?Math.max(0,total-(used.get(String(row.id))||0)):0}]:[];}catch{return [];}});
}
export async function GET(request:Request){
 const user=await getAuthenticatedUser();if(!user)return json({error:'Silakan masuk.'},401);
 try{const db=operationDB(),url=new URL(request.url),id=url.searchParams.get('id');
  if(id){const item=await findOperation(user.userId,id);if(!item||!canViewOperation(user,item))return json({error:'Pengajuan tidak ditemukan.'},404);
   const history=await db.prepare("SELECT version,actor_name,action,from_status,to_status,note,created FROM operational_events WHERE owner=? AND request_id=? ORDER BY version ASC").bind(user.userId,id).all();
   const asset=item.asset_id?await findAsset(user.userId,item.asset_id):null;
   let cash:unknown[]=[];
   if(item.status==='approved'&&isFinancial(item.category)&&operationActions(user,item).includes('fulfill')){
    const rows=await db.prepare("SELECT c.id,c.data FROM records c JOIN files f ON f.id=(c.data::jsonb->>'attachmentId') AND f.owner=c.owner AND f.deleted_at IS NULL WHERE c.owner=? AND c.kind='kas' AND c.data::jsonb->>'type'='Pengeluaran' AND c.data::jsonb->>'amount'=? AND c.data::jsonb->>'fund'=? AND NOT EXISTS(SELECT 1 FROM operational_requests r WHERE r.owner=? AND r.cash_record_id=c.id) ORDER BY c.created DESC LIMIT 200").bind(user.userId,String(item.amount),item.fund,user.userId).all();
    cash=rows.results.flatMap(row=>{try{const d=JSON.parse(String(row.data));return d.type==='Pengeluaran'&&Number(d.amount)===item.amount&&d.fund===item.fund&&d.attachmentId?[{id:String(row.id),name:String(d.name),date:String(d.date),amount:Number(d.amount),fund:String(d.fund)}]:[];}catch{return [];}});
   }
   return json({item,actions:operationActions(user,item),history:history.results,cash,asset:asset?{name:String(asset.data.name),condition:String(asset.data.condition)}:null});
  }
  const scope=url.searchParams.get('scope')||'mine',filter=url.searchParams.get('status')||'all',query=(url.searchParams.get('q')||'').trim().slice(0,160);
  if(!['mine','review','fulfill','all'].includes(scope))return json({error:'Lingkup tidak valid.'},400);
  if(scope==='review'&&!canReview(user)||scope==='fulfill'&&!(Object.keys(categories)as Category[]).some(c=>canFulfillCategory(user,c)))return json({error:'Lingkup di luar kewenangan.'},403);
  const visibility=visibleSQL(user),conditions=['owner=?',visibility.sql],args:unknown[]=[user.userId,...visibility.args];
  if(scope==='mine'){conditions.push('requester_id=?');args.push(user.accountId);}
  if(scope==='review'){conditions.push("requester_id<>? AND status<>'draft'");args.push(user.accountId);}
  if(scope==='fulfill'){const allowed=(Object.keys(categories)as Category[]).filter(c=>canFulfillCategory(user,c));conditions.push("requester_id<>? AND category IN ("+allowed.map(()=>'?').join(',')+") AND status IN ('approved','in_progress','completed')");args.push(user.accountId,...allowed);}
  const summary=await db.prepare('SELECT status,COUNT(*) AS count FROM operational_requests WHERE '+conditions.join(' AND ')+' GROUP BY status').bind(...args).all();
  if(filter!=='all'){if(!(Object.hasOwn(statuses,filter)))return json({error:'Status tidak valid.'},400);conditions.push('status=?');args.push(filter);}
  if(query){conditions.push("LOWER(title||' '||description||' '||id) LIKE ?");args.push('%'+query.toLowerCase()+'%');}
  const where=conditions.join(' AND '),count=await db.prepare('SELECT COUNT(*) AS count FROM operational_requests WHERE '+where).bind(...args).first();
  const total=Number(count?.count||0),pages=Math.max(1,Math.ceil(total/20)),page=Math.min(pages,Math.max(1,Number.parseInt(url.searchParams.get('page')||'1',10)||1));
  const rows=await db.prepare('SELECT * FROM operational_requests WHERE '+where+' ORDER BY updated DESC,id DESC LIMIT 20 OFFSET ?').bind(...args,(page-1)*20).all();
  return json({items:rows.results.map(row=>{const item=cleanOperation(row);return {...item,actions:operationActions(user,item)};}),total,pages,page,counts:Object.fromEntries(summary.results.map(r=>[r.status,Number(r.count)])),assets:await catalog(user),canReview:canReview(user),canFulfill:(Object.keys(categories)as Category[]).some(c=>canFulfillCategory(user,c))});
 }catch(error){return json({error:error instanceof OperationError?error.message:'Layanan operasional belum dapat dimuat. Pastikan migrasi enterprise telah diterapkan.'},error instanceof OperationError?error.status:503);}
}
export async function POST(request:Request){
 const user=await getAuthenticatedUser();if(!user)return json({error:'Silakan masuk.'},401);if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 try{const db=operationDB(),raw=await readJsonObject(request,12000);if(raw.accountId!==user.accountId)return json({error:'Akun aktif berubah. Muat ulang.'},409);if(!uuid(raw.clientRequestId))throw new OperationError('Identitas pengajuan tidak valid. Buka formulir baru.');
 const submit=raw.submit===true,input=validateOperation(raw.data,submit);await checkInputAsset(user.userId,input,submit);
 if(submit&&input.category==='expense')throw new OperationError('Simpan draf dan unggah bukti pengeluaran sebelum mengajukan penggantian biaya.');
 if(!await consumeRateLimit(db,'operations:create:'+user.accountId,30,3600000))return json({error:'Terlalu banyak pengajuan. Coba kembali setelah satu jam.'},429);
 const item=await createOperation(user,String(raw.clientRequestId),input,submit);
 if(submit){const approvers=await db.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='ketua' AND enabled=TRUE ORDER BY created,id").bind(user.userId).all();for(const approver of approvers.results)if(String(approver.id)!==user.accountId)await notifyOwner(user.userId,String(approver.id),'operation:'+item.id+':submitted','Pengajuan menunggu persetujuan Ketua',input.title,'/dashboard/enterprise','operasional');}
 return json({ok:true,item});
 }catch(error){return failure(error);}
}
export async function PATCH(request:Request){
 const user=await getAuthenticatedUser();if(!user)return json({error:'Silakan masuk.'},401);if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 try{const db=operationDB(),raw=await readJsonObject(request,14000);if(raw.accountId!==user.accountId)return json({error:'Akun aktif berubah. Muat ulang.'},409);
 const item=await findOperation(user.userId,String(raw.id));if(!item||!canViewOperation(user,item))return json({error:'Pengajuan tidak ditemukan.'},404);
 if(Number(raw.version)!==item.version)return json({error:'Pengajuan sudah berubah. Muat ulang sebelum melanjutkan.'},409);
 const action=String(raw.action),note=String(raw.note||'').trim();if(note.length>2000)throw new OperationError('Catatan maksimal 2.000 karakter.');
 if(!operationActions(user,item).includes(action))return json({error:'Tindakan tidak diizinkan untuk akun atau tahap ini.'},403);
 if(['reject','request_revision','fulfill','return','reopen','cancel'].includes(action)&&note.length<5)throw new OperationError('Tambahkan catatan tindakan minimal 5 karakter.');
 if(action==='edit'){const submit=raw.submit===true,input=validateOperation(raw.data,submit);await checkInputAsset(user.userId,input,submit);if(submit&&input.category==='expense'&&!item.proof_id)throw new OperationError('Unggah bukti sebelum mengajukan penggantian biaya.');return json({ok:true,item:await updateOperation(user,item,{...input,status:submit?'submitted':item.status},submit?'updated_submitted':'edited',note)});}
 if(action==='submit'){const input=validateOperation(item,true);await checkInputAsset(user.userId,input,true);if(item.category==='expense'&&!item.proof_id)throw new OperationError('Unggah bukti pengeluaran terlebih dahulu.');return json({ok:true,item:await updateOperation(user,item,{status:'submitted'},action,note)});}
 if(action==='approve'){
  validateOperation(item,true);await checkInputAsset(user.userId,item,true);
  if(item.category==='asset_loan'){const condition="EXISTS(SELECT 1 FROM records a WHERE a.id=? AND a.owner=? AND a.kind='aset' AND (a.data::jsonb->>'condition')='Baik' AND COALESCE(a.data::jsonb->>'status','Aktif')<>'Nonaktif' AND CAST(a.data::jsonb->>'quantity' AS BIGINT)>=?+COALESCE((SELECT SUM(quantity) FROM operational_requests WHERE owner=? AND asset_id=? AND status IN ('approved','in_progress') AND id<>?),0))";
   return json({ok:true,item:await updateOperation(user,item,{status:'approved'},action,note,{condition,conditionArgs:[item.asset_id,user.userId,item.quantity,user.userId,item.asset_id,item.id],assetTouch:{id:item.asset_id!}})});
  }return json({ok:true,item:await updateOperation(user,item,{status:'approved'},action,note)});
 }
 if(action==='reject'||action==='request_revision'||action==='cancel')return json({ok:true,item:await updateOperation(user,item,{status:action==='reject'?'rejected':action==='cancel'?'cancelled':'revision'},action,note)});
 if(action==='fulfill'){
  if(isFinancial(item.category)){
   const cashId=String(raw.cashRecordId||'');if(!cashId)throw new OperationError('Pilih transaksi pengeluaran dengan nominal, pos dana, dan bukti yang sesuai.');
   const condition="EXISTS(SELECT 1 FROM records c JOIN files f ON f.id=(c.data::jsonb->>'attachmentId') AND f.owner=c.owner AND f.deleted_at IS NULL WHERE c.id=? AND c.owner=? AND c.kind='kas' AND c.data::jsonb->>'type'='Pengeluaran' AND c.data::jsonb->>'amount'=? AND c.data::jsonb->>'fund'=?)";
   return json({ok:true,item:await updateOperation(user,item,{status:'completed',cash_record_id:cashId},action,note,{condition,conditionArgs:[cashId,user.userId,String(item.amount),item.fund],cashTouch:cashId})});
  }return json({ok:true,item:await updateOperation(user,item,{status:item.category==='asset_loan'?'in_progress':'completed'},action,note)});
 }
 if(action==='return'){
  const condition=String(raw.condition||'');if(!['Baik','Perlu perawatan','Rusak'].includes(condition))throw new OperationError('Pilih kondisi aset saat dikembalikan.');
  const asset=await findAsset(user.userId,item.asset_id!);if(!asset)throw new OperationError('Aset tidak ditemukan.');
  if(asset.data.condition!=='Baik'&&condition==='Baik')throw new OperationError('Aset tercatat perlu perawatan atau rusak. Catat pengembalian dengan kondisi tersebut; pulihkan kondisi melalui Inventaris setelah seluruh pinjaman selesai.');
  return json({ok:true,item:await updateOperation(user,item,{status:'completed'},action,note+' · Kondisi: '+condition,{assetTouch:{id:asset.id,expectedUpdated:asset.updated,data:{...asset.data,condition}}})});
 }
 if(action==='reopen')return json({ok:true,item:await updateOperation(user,item,{status:'approved',cash_record_id:null},action,note)});
 throw new OperationError('Tindakan tidak tersedia.');
 }catch(error){return failure(error);}
}
function failure(error:unknown){return json({error:error instanceof Error&&(error instanceof OperationError||error instanceof RequestBodyError)?error.message:'Perubahan operasional belum tersimpan. Muat ulang data untuk memeriksa sebelum mengirim ulang.'},error instanceof OperationError?error.status:error instanceof RequestBodyError?error.status:503);}
