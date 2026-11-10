import { operationDB, OperationError } from "./repository";
import type { Data } from "../srikandi";
import type { PreparedStatement } from "../runtime";
export async function assertRecordUnlocked(owner:string,id:string,kind:string,deleting=false){
 if(!['kas','aset'].includes(kind))return;
 const where=kind==='kas'?'cash_record_id=?':deleting?'asset_id=?':"asset_id=? AND status IN ('approved','in_progress')";
 const row=await operationDB().prepare('SELECT id FROM operational_requests WHERE owner=? AND '+where+' LIMIT 1').bind(owner,id).first();
 if(row)throw new OperationError(kind==='kas'?'Transaksi sudah direkonsiliasi. Buka kembali realisasi pada Pusat Operasional sebelum mengoreksi buku kas.':deleting?'Aset memiliki riwayat operasional. Nonaktifkan aset agar riwayatnya tetap utuh.':'Aset sedang dicadangkan atau dipinjam. Selesaikan pengembalian melalui Pusat Operasional sebelum mengubah inventaris.',409);
}
export async function updateProtectedRecord(owner:string,id:string,kind:string,data:Data,expectedUpdated:string,title:string,normalizedWrites:PreparedStatement[]=[]){
 const db=operationDB(),now=new Date().toISOString(),auditId=crypto.randomUUID();
 const lock=kind==='kas'?'cash_record_id=?':"asset_id=? AND status IN ('approved','in_progress')";
 const sql="WITH changed AS (UPDATE records SET data=?,updated=to_char(GREATEST(CAST(? AS timestamptz),CAST(updated AS timestamptz)+INTERVAL '1 millisecond') AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') WHERE id=? AND owner=? AND updated=? AND NOT EXISTS(SELECT 1 FROM operational_requests WHERE owner=? AND "+lock+") RETURNING id) INSERT INTO audit(id,owner,action,title,created) SELECT ?,?,?,?,? FROM changed RETURNING id";
 const write=db.prepare(sql).bind(JSON.stringify(data),now,id,owner,expectedUpdated,owner,id,auditId,owner,'Diperbarui',title,now);
 const results=await db.batch([write,...normalizedWrites]);
 const changed=results[0] as {rows?:unknown[]}|undefined;
 if(!changed?.rows?.length)throw new OperationError('Data berubah atau terhubung dengan operasional. Muat ulang sebelum mengoreksi.',409);
}
