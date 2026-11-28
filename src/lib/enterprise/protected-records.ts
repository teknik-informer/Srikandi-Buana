import { operationDB, OperationError } from "./repository";
import type { Data } from "../srikandi";
import type { PreparedStatement } from "../runtime";

export async function assertRecordUnlocked(owner:string,id:string,kind:string,deleting=false){
 if(!["kas","aset"].includes(kind))return;
 const where=kind==="kas"?"cash_record_id=?":deleting?"asset_id=?":"asset_id=? AND status IN ('approved','in_progress')";
 const row=await operationDB().prepare("SELECT id FROM operational_requests WHERE owner=? AND "+where+" LIMIT 1").bind(owner,id).first();
 if(row)throw new OperationError(kind==="kas"?"Transaksi sudah direkonsiliasi. Buka kembali realisasi pada Pusat Operasional sebelum mengoreksi buku kas.":deleting?"Aset memiliki riwayat operasional. Nonaktifkan aset agar riwayatnya tetap utuh.":"Aset sedang dicadangkan atau dipinjam. Selesaikan pengembalian melalui Pusat Operasional sebelum mengubah inventaris.",409);
}

/**
 * Update the source row, its audit event, and every dependent projection in one
 * serializable database transaction. The version predicate is part of the
 * UPDATE itself (not only a preceding read). A failed predicate deliberately
 * aborts the transaction before any normalized/ledger statement can run.
 */
export async function updateProtectedRecord(
 owner:string,
 id:string,
 kind:string,
 data:Data,
 expectedUpdated:string,
 title:string,
 normalizedWrites:PreparedStatement[]=[],
 auditAction="Diperbarui",
){
 const db=operationDB(),now=new Date().toISOString(),auditId=crypto.randomUUID();
 const lock=kind==="kas"
  ?" AND NOT EXISTS(SELECT 1 FROM operational_requests WHERE owner=? AND cash_record_id=?)"
  :kind==="aset"
   ?" AND NOT EXISTS(SELECT 1 FROM operational_requests WHERE owner=? AND asset_id=? AND status IN ('approved','in_progress'))"
   :"";
 const lockArgs=["kas","aset"].includes(kind)?[owner,id]:[];
 const sql=`
WITH changed AS (
 UPDATE records
 SET data=?,
     updated=to_char(
       GREATEST(CAST(? AS timestamptz),CAST(updated AS timestamptz)+INTERVAL '1 millisecond')
       AT TIME ZONE 'UTC',
       'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
     )
 WHERE id=? AND owner=? AND kind=? AND updated=?${lock}
 RETURNING id,updated
),
audit_written AS (
 INSERT INTO audit(id,owner,action,title,created)
 SELECT ?,?,?,?,? FROM changed
 RETURNING id
)
SELECT CASE
 WHEN EXISTS(SELECT 1 FROM changed) AND EXISTS(SELECT 1 FROM audit_written)
 THEN (SELECT updated FROM changed)
 ELSE (1 / CASE
   WHEN EXISTS(SELECT 1 FROM changed) AND EXISTS(SELECT 1 FROM audit_written)
   THEN 1 ELSE 0 END)::text
END AS updated
`;
 const write=db.prepare(sql).bind(
  JSON.stringify(data),now,id,owner,kind,expectedUpdated,
  ...lockArgs,
  auditId,owner,auditAction,title,now,
 );
 try{
  const results=await db.batch([write,...normalizedWrites]);
  const row=(results[0] as {rows?:Array<{updated?:unknown}>}|undefined)?.rows?.[0];
  if(!row?.updated)throw new OperationError("Data berubah atau tidak lagi tersedia. Muat ulang sebelum menyimpan.",409);
  return String(row.updated);
 }catch(error){
  const current=await db.prepare("SELECT updated FROM records WHERE id=? AND owner=? AND kind=?").bind(id,owner,kind).first();
  if(!current)throw new OperationError("Data tidak lagi tersedia pada ruang kerja ini.",404);
  if(String(current.updated)!==expectedUpdated){
   throw new OperationError("Catatan sudah diperbarui oleh pengguna lain. Perubahan Anda tidak disimpan; muat ulang data sebelum mencoba kembali.",409);
  }
  if(["kas","aset"].includes(kind))await assertRecordUnlocked(owner,id,kind);
  throw error;
 }
}
