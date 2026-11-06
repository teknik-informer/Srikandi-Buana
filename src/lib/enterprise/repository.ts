import { env } from "../runtime";
import type { Principal } from "../permissions";
import { cleanOperation, type Operation, type OperationInput } from "./operations";
export class OperationError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function operationDB() { if (!env.DB) throw new OperationError("Database belum tersedia.",503); return env.DB; }
export async function findOperation(owner: string, id: string) {
  const row=await operationDB().prepare("SELECT * FROM operational_requests WHERE id=? AND owner=?").bind(id,owner).first();return row?cleanOperation(row):null;
}
export async function findAsset(owner:string,id:string) {
  const row=await operationDB().prepare("SELECT id,data,updated FROM records WHERE id=? AND owner=? AND kind='aset'").bind(id,owner).first();
  if(!row)return null;try{return {id:String(row.id),data:JSON.parse(String(row.data)) as Record<string,unknown>,updated:String(row.updated)};}catch{return null;}
}
export async function checkInputAsset(owner:string,input:OperationInput,complete:boolean) {
  if(!input.asset_id)return;
  const asset=await findAsset(owner,input.asset_id);
  if(!asset || complete&&(asset.data.condition!=="Baik"||asset.data.status==='Nonaktif'||!Number.isSafeInteger(Number(asset.data.quantity))||Number(asset.data.quantity)<input.quantity))throw new OperationError("Aset tidak aktif, kondisinya belum baik, atau jumlahnya tidak mencukupi.");
}
export function eventStatement(user:Principal,requestId:string,version:number,eventId:string,action:string,from:string,to:string,note:string,now:string) {
  return operationDB().prepare("INSERT INTO operational_events(id,owner,request_id,version,actor_id,actor_name,action,from_status,to_status,note,created) SELECT ?,?,?,CAST(? AS INTEGER),?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM operational_requests WHERE id=? AND owner=? AND last_event_id=?)")
    .bind(eventId,user.userId,requestId,version,user.accountId,user.displayName,action,from,to,note,now,requestId,user.userId,eventId);
}
export async function createOperation(user:Principal,id:string,input:OperationInput,submit:boolean) {
  const db=operationDB(),now=new Date().toISOString(),eventId=crypto.randomUUID(),status=submit?'submitted':'draft';
  const result=await db.batch([
    db.prepare("INSERT INTO operational_requests(id,owner,requester_id,requester_name,category,title,description,amount,fund,asset_id,quantity,desired_date,end_date,status,version,last_event_id,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id")
      .bind(id,user.userId,user.accountId,user.displayName,input.category,input.title,input.description,input.amount,input.fund,input.asset_id,input.quantity,input.desired_date,input.end_date,status,eventId,now,now),
    eventStatement(user,id,1,eventId,submit?'created_submitted':'created','',status,'',now),
  ]);
  if(!((result[0] as {rows?:unknown[]}).rows?.length)){
    const existing=await findOperation(user.userId,id);
    if(existing&&existing.requester_id===user.accountId&&existing.status===status&&Object.entries(input).every(([key,value])=>existing[key as keyof Operation]===value))return existing;
    throw new OperationError("Pengajuan awal mungkin sudah tersimpan. Muat ulang dan periksa sebelum membuat pengajuan lain.",409);
  }
  return (await findOperation(user.userId,id))!;
}
type UpdateOptions={condition?:string;conditionArgs?:unknown[];assetTouch?:{id:string;expectedUpdated?:string;data?:Record<string,unknown>};cashTouch?:string;object?:{key:string;bytes:ArrayBuffer;mime:string}};
export async function updateOperation(user:Principal,item:Operation,patch:Partial<Operation>,action:string,note:string,options:UpdateOptions={}) {
  const db=operationDB(),now=new Date().toISOString(),eventId=crypto.randomUUID(),version=item.version+1;
  const values={...patch,version,last_event_id:eventId,updated:now};
  const allowed=['category','title','description','amount','fund','asset_id','quantity','desired_date','end_date','status','cash_record_id','proof_id','proof_name','proof_mime','version','last_event_id','updated'];
  const entries=Object.entries(values).filter(([key])=>allowed.includes(key));
  const statements=[db.prepare("SELECT id FROM operational_requests WHERE id=? AND owner=? FOR UPDATE").bind(item.id,user.userId)];
  const recordTouch=options.assetTouch?.id||options.cashTouch;
  if(recordTouch)statements.push(db.prepare("SELECT id FROM records WHERE id=? AND owner=? FOR UPDATE").bind(recordTouch,user.userId));
  const updateIndex=statements.length;
  if(options.assetTouch?.expectedUpdated){options.condition=(options.condition?'('+options.condition+') AND ':'')+'EXISTS(SELECT 1 FROM records WHERE id=? AND owner=? AND updated=?)';options.conditionArgs=[...(options.conditionArgs||[]),options.assetTouch.id,user.userId,options.assetTouch.expectedUpdated];}
  statements.push(db.prepare("UPDATE operational_requests SET "+entries.map(([key])=>key+"=?").join(',')+" WHERE id=? AND owner=? AND version=? AND status=?"+(options.condition?" AND ("+options.condition+")":"")+" RETURNING id")
    .bind(...entries.map(([,value])=>value),item.id,user.userId,item.version,item.status,...(options.conditionArgs||[])));
  if(recordTouch){
    const data=options.assetTouch?.data;
    statements.push(db.prepare("UPDATE records SET "+(data?'data=?,':'')+"updated=to_char(GREATEST(CAST(? AS timestamptz),CAST(updated AS timestamptz)+INTERVAL '1 millisecond') AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') WHERE id=? AND owner=? AND EXISTS(SELECT 1 FROM operational_requests WHERE id=? AND last_event_id=?)")
      .bind(...(data?[JSON.stringify(data)]:[]),now,recordTouch,user.userId,item.id,eventId));
  }
  if(options.object)statements.push(db.prepare("INSERT INTO file_objects(key,content,content_type) SELECT ?,decode(?,'base64'),? WHERE EXISTS(SELECT 1 FROM operational_requests WHERE id=? AND owner=? AND last_event_id=?) ON CONFLICT(key) DO UPDATE SET content=excluded.content,content_type=excluded.content_type")
    .bind(options.object.key,Buffer.from(options.object.bytes).toString('base64'),options.object.mime,item.id,user.userId,eventId));
  statements.push(eventStatement(user,item.id,version,eventId,action,item.status,String(patch.status||item.status),note,now));
  let results;
  try{results=await db.batch(statements);}catch{
    if(patch.cash_record_id){const used=await db.prepare("SELECT id FROM operational_requests WHERE owner=? AND cash_record_id=?").bind(user.userId,patch.cash_record_id).first();if(used)throw new OperationError("Transaksi kas sudah terhubung ke pengajuan lain. Muat ulang sebelum melanjutkan.",409);}
    throw new OperationError("Perubahan belum tersimpan. Data mungkin sedang diperbarui pengguna lain; muat ulang sebelum mencoba kembali.",503);
  }
  if(!((results[updateIndex] as {rows?:unknown[]}).rows?.length))throw new OperationError("Pengajuan berubah, bukti transaksi tidak sesuai, atau ketersediaan aset tidak mencukupi. Muat ulang data.",409);
  return (await findOperation(user.userId,item.id))!;
}
