import {assertRecordUnlocked,updateProtectedRecord} from '@/lib/enterprise/protected-records';
import {OperationError} from '@/lib/enterprise/repository';
import {readJsonObject,RequestBodyError} from "@/lib/request-body";
import { env } from "@/lib/runtime";
import {getAuthenticatedUser} from "@/lib/auth";
import {canReadRecord,canWriteRecord,visibleRecord} from "@/lib/permissions";
import {allowedFileIds} from "@/lib/file-access";
import { modules, programs, type Data } from "@/lib/srikandi";
import { taskVerificationError } from "@/lib/enterprise/task-verification";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
async function context(req:Request,write=false){
 const user=await getAuthenticatedUser(); if(!user) return {error:json({error:"Silakan masuk untuk mengelola data."},401)};
 if(write && (req.headers.get("origin")!==new URL(req.url).origin && req.headers.get("sec-fetch-site")!=="same-origin")) return {error:json({error:"Permintaan lintas situs ditolak."},403)};
 if(!env.DB)return {error:json({error:"Database belum tersedia. Coba kembali beberapa saat lagi."},503)};
 return {user,db:env.DB};
}
export async function GET(req:Request){try{const c=await context(req);if(c.error)return c.error;const [records,audit,files]=await Promise.all([
 c.db!.prepare("SELECT * FROM records WHERE owner=? ORDER BY created DESC").bind(c.user!.userId).all(),
 c.db!.prepare("SELECT action,title,created FROM audit WHERE owner=? ORDER BY created DESC LIMIT 12").bind(c.user!.userId).all(),
 c.db!.prepare("SELECT id,name,size,mime,created,deleted_at,uploader_id FROM files WHERE owner=? ORDER BY created DESC").bind(c.user!.userId).all()
 ]);const u=c.user!;const readable=records.results.map(r=>({...r,id:String(r.id),kind:String(r.kind),owner:undefined,data:JSON.parse(String(r.data))})).filter(r=>canReadRecord(u,r)).map(r=>visibleRecord(u,r));const fileIds=u.role==='admin'?null:await allowedFileIds(u);return json({records:readable,audit:['admin','ketua'].includes(u.role)?audit.results:[],files:fileIds?files.results.filter(f=>fileIds.has(String(f.id))):files.results,user:u.displayName});}catch{return json({error:"Data belum dapat dimuat. Silakan coba lagi."},503)}}
function validate(kind:string,raw:unknown):Data{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Formulir tidak valid.");
 const d=raw as Data;const out:Data={};
 if(kind==="program"){
 if(!programs.some(p=>p.id===String(d.programId))||!["Rancangan","Disepakati","Berjalan","Selesai","Ditunda"].includes(String(d.status)))throw new Error("Program atau status tidak valid.");
 if(["Disepakati","Berjalan","Selesai"].includes(String(d.status))&&!String(d.notes||"").trim())throw new Error("Tambahkan catatan keputusan atau hasil kegiatan.");
 return {programId:String(d.programId),status:String(d.status),name:String(d.name||"Program kerja").slice(0,200),notes:String(d.notes||"").slice(0,5000)};
 }
 const module=modules[kind];if(!module)throw new Error("Modul tidak ditemukan.");
 for(const f of module.fields){let v=String(d[f.key]??"").trim();if(f.required&&!v)throw new Error(`${f.label} wajib diisi.`);if(v.length>5000)throw new Error(`${f.label} terlalu panjang.`);
 if(f.options&&!v)v=f.options[0];
 if(f.options&&!f.options.includes(v))throw new Error(`${f.label} tidak valid.`);
 if(f.type==="date"&&v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||(!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)))throw new Error("Tanggal tidak valid.");
 if(f.type==="number"||f.type==="decimal"){const n=Number(v||0);if((f.type==="number"?!Number.isSafeInteger(n):!Number.isFinite(n))||n<0||n>1e12||(f.key==="amount"&&n===0))throw new Error(`${f.label} harus berupa bilangan bulat yang valid.`);out[f.key]=n;}else out[f.key]=v;
 }
 return out;
}
export async function POST(req:Request){return save(req,false)}
export async function PUT(req:Request){return save(req,true)}
async function save(req:Request,edit:boolean){try{const c=await context(req,true);if(c.error)return c.error;
 if(Number(req.headers.get("content-length")||0)>40000)return json({error:"Formulir terlalu besar."},413);
 const body=await readJsonObject(req,40000) as {kind:string;id?:string;data:unknown;expectedUpdated?:string};const data=validate(body.kind,body.data);if(body.kind==='galeri'&&data.status==='Terbit'&&data.publicationPermission!=='Dikonfirmasi')return json({error:'Konfirmasikan izin publikasi foto sebelum menerbitkan. Simpan sebagai Draf jika izin belum tersedia.'},400);if(body.kind==='publikasi'&&data.status==='Terbit'&&data.fileId&&data.publicationPermission!=='Dikonfirmasi')return json({error:'Konfirmasikan izin foto sampul sebelum menerbitkan konten. Hapus foto sampul jika tidak digunakan.'},400);if(!canWriteRecord(c.user!,{id:body.id||'',kind:body.kind,data}))return json({error:'Anda tidak memiliki izin mengubah data ini.'},403);const readableFiles=c.user!.role==='admin'?null:await allowedFileIds(c.user!);if(readableFiles&&[data.fileId,data.attachmentId].some(id=>id&&!readableFiles.has(String(id))))return json({error:'Berkas di luar hak akses Anda.'},403);if(data.fileId){const file=await c.db!.prepare("SELECT mime FROM files WHERE id=? AND owner=? AND deleted_at IS NULL").bind(data.fileId,c.user!.userId).first();if(!file||!["image/png","image/jpeg"].includes(String(file.mime)))return json({error:"Pilih foto JPG/PNG yang tersedia di arsip akun Anda."},400);}
 if(data.attachmentId){const attachment=await c.db!.prepare("SELECT id FROM files WHERE id=? AND owner=? AND deleted_at IS NULL").bind(data.attachmentId,c.user!.userId).first();if(!attachment)return json({error:"Lampiran tidak tersedia di arsip Anda."},400);}
 if(body.kind==="lotkopi"){const duplicate=await c.db!.prepare("SELECT id FROM records WHERE owner=? AND kind='lotkopi' AND json_extract(data,'$.name')=? AND id!=?").bind(c.user!.userId,data.name,body.id||"").first();if(duplicate)return json({error:"Kode lot sudah digunakan. Gunakan kode unik."},409);}
 const id=edit?body.id:crypto.randomUUID();const now=new Date().toISOString();if(!id)return json({error:"ID tidak valid."},400);
 let previousTaskData:Data|undefined;
 if(edit){
  const old=await c.db!.prepare("SELECT id,updated,data FROM records WHERE id=? AND owner=? AND kind=?").bind(id,c.user!.userId,body.kind).first();
  if(!old)return json({error:"Data tidak ditemukan."},404);
  const oldData=JSON.parse(String(old.data)) as Data;
  if(!canWriteRecord(c.user!,{id:String(old.id),kind:body.kind,data:oldData}))return json({error:'Data di luar penugasan Anda.'},403);
  if(body.expectedUpdated&&old.updated!==body.expectedUpdated)return json({error:"Catatan sudah berubah di sesi lain. Muat ulang sebelum menyimpan."},409);
  if(body.kind==="tindaklanjut"){
   previousTaskData=oldData;
   if(c.user!.role!=="admin"&&c.user!.role!=="ketua")data.reviewNote=String(oldData.reviewNote||"");
  }
  if(['kas','aset'].includes(body.kind)){
   await assertRecordUnlocked(c.user!.userId,id,body.kind);
   await updateProtectedRecord(c.user!.userId,id,body.kind,data,String(old.updated),`${body.kind}: ${data.name}`);
   return json({ok:true,id});
  }
 }
 if(body.kind==="tindaklanjut"){
  const verificationError=taskVerificationError({
   role:c.user!.role,
   previousVerification:String(previousTaskData?.verification||""),
   previousStatus:String(previousTaskData?.status||""),
   previousReviewNote:String(previousTaskData?.reviewNote||""),
   verification:String(data.verification||"Belum diajukan"),
   status:String(data.status||""),
   completionEvidence:String(data.completionEvidence||""),
   attachmentId:String(data.attachmentId||""),
   reviewNote:String(data.reviewNote||""),
  });
  if(verificationError)return json({error:verificationError},403);
 }
 if(body.kind==="program"&&!edit){const found=await c.db!.prepare("SELECT id FROM records WHERE owner=? AND kind='program' AND json_extract(data,'$.programId')=?").bind(c.user!.userId,String(data.programId)).first();if(found)return json({error:"Program sudah tercatat. Muat ulang sebelum memperbarui."},409);}
 const previousVerification=String(previousTaskData?.verification||"Belum diajukan");
 const nextVerification=String(data.verification||"Belum diajukan");
 const auditAction=body.kind==="tindaklanjut"&&edit&&previousVerification!==nextVerification
  ? nextVerification==="Menunggu verifikasi"?"Hasil diajukan untuk verifikasi"
    : nextVerification==="Terverifikasi"?"Hasil tugas disahkan"
    : nextVerification==="Perlu perbaikan"?"Perbaikan tugas diminta"
    : "Status verifikasi diperbarui"
  : edit?"Diperbarui":"Ditambahkan";
 await c.db!.batch([edit?c.db!.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=?").bind(JSON.stringify(data),now,id,c.user!.userId):c.db!.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,?,?,?,?)").bind(id,c.user!.userId,body.kind,JSON.stringify(data),now,now),c.db!.prepare("INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),c.user!.userId,auditAction,`${body.kind}: ${data.name}`,now)]);
 return json({ok:true,id});}catch(e){if(e instanceof OperationError)return json({error:e.message},e.status);if(e instanceof RequestBodyError)return json({error:e.message},e.status);return json({error:e instanceof SyntaxError?"Formulir tidak valid.":e instanceof Error&& !/D1|SQL|database/i.test(e.message)?e.message:"Perubahan belum tersimpan. Silakan coba lagi."},400)}}
export async function DELETE(req:Request){try{const c=await context(req,true);if(c.error)return c.error;const id=new URL(req.url).searchParams.get("id");const row=await c.db!.prepare("SELECT kind,data FROM records WHERE id=? AND owner=?").bind(id,c.user!.userId).first();if(!row)return json({error:"Data tidak ditemukan."},404);if(!canWriteRecord(c.user!,{id:String(id),kind:String(row.kind),data:JSON.parse(String(row.data))}))return json({error:'Anda tidak memiliki izin menghapus data ini.'},403);if(c.user!.role==="ketua"&&row.kind==="tindaklanjut")return json({error:"Ketua dapat memperbarui status tugas, tetapi tidak menghapus riwayat tindak lanjut."},403);await assertRecordUnlocked(c.user!.userId,String(id),String(row.kind),true);if(row.kind==="anggota"){const linked=await c.db!.prepare('SELECT id FROM users WHERE workspace_owner=? AND member_id=?').bind(c.user!.userId,id).first();if(linked)return json({error:'Anggota terhubung dengan akun. Nonaktifkan keanggotaan dan akun; riwayat tetap disimpan.'},409);const used=await c.db!.prepare("SELECT r.id FROM records r,json_each(json_extract(r.data,'$.memberIds')) j WHERE r.owner=? AND r.kind='kehadiran' AND j.value=? LIMIT 1").bind(c.user!.userId,id).first();if(used)return json({error:"Anggota memiliki riwayat kehadiran. Ubah status menjadi Tidak aktif, atau perbarui daftar hadir sebelum menghapus."},409);}await c.db!.batch([c.db!.prepare("DELETE FROM records WHERE owner=? AND kind='kehadiran' AND json_extract(data,'$.eventId')=?").bind(c.user!.userId,id),c.db!.prepare("DELETE FROM records WHERE id=? AND owner=?").bind(id,c.user!.userId),c.db!.prepare("INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),c.user!.userId,"Dihapus",`${row.kind}: ${JSON.parse(row.data as string).name}`,new Date().toISOString())]);return json({ok:true});}catch(error){if(error instanceof OperationError)return json({error:error.message},error.status);return json({error:"Data belum dapat dihapus."},500)}}
