import {env} from '@/lib/runtime';
import {getGovernanceAdminUser} from '../../admin-auth';
import {visibleRecord} from '@/lib/permissions';
import {allowedFileIds} from '@/lib/file-access';

export const dynamic='force-dynamic';

export async function GET(){
 const user=await getGovernanceAdminUser();
 if(!user)return new Response('Akses khusus Ketua.',{status:403,headers:{'Cache-Control':'no-store'}});
 if(!env.DB)return new Response('Database belum tersedia.',{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const exportedAt=new Date().toISOString();
  // A full JSON archive contains personal, operational, financial, and correspondence data.
  // Record the event before returning the archive; an audit failure blocks the export.
  await env.DB.prepare('INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)')
   .bind(crypto.randomUUID(),user.userId,user.accountId,'Ekspor arsip organisasi','JSON penuh',exportedAt).run();
  const [rows,files,messages,settings,operations,operationHistory]=await Promise.all([
   env.DB.prepare('SELECT id,kind,data,created,updated FROM records WHERE owner=? ORDER BY created').bind(user.userId).all(),
   env.DB.prepare('SELECT id,name,mime,size,created,deleted_at FROM files WHERE owner=?').bind(user.userId).all(),
   env.DB.prepare('SELECT id,name,contact,topic,message,status,created,consent_version,consented_at FROM messages ORDER BY created').all(),
   env.DB.prepare('SELECT key,data,updated FROM settings WHERE owner=?').bind(user.userId).all(),
   env.DB.prepare("SELECT * FROM operational_requests WHERE owner=? AND (status<>'draft' OR requester_id=?) ORDER BY created,id").bind(user.userId,user.accountId).all(),
   env.DB.prepare("SELECT e.* FROM operational_events e JOIN operational_requests r ON r.id=e.request_id AND r.owner=e.owner WHERE e.owner=? AND (r.status<>'draft' OR r.requester_id=?) ORDER BY e.request_id,e.version").bind(user.userId,user.accountId).all()
  ]);
  const fileIds=await allowedFileIds(user);
  const archive={
   formatVersion:3,
   organisasi:'KWT Srikandi Buana',
   diekspor:exportedAt,
   records:rows.results.map(row=>{
    const record={id:String(row.id),kind:String(row.kind),data:JSON.parse(String(row.data)) as Record<string,unknown>};
    return {...row,data:visibleRecord(user,record).data};
   }),
   files:files.results.filter(file=>fileIds.has(String(file.id))),
   messages:messages.results,
   settings:settings.results.map(row=>({...row,data:JSON.parse(String(row.data))})),
   operations:operations.results,
   operationHistory:operationHistory.results,
   catatan:'Arsip JSON internal untuk Ketua. Draf operasional pribadi akun lain tidak disertakan. Berkas asli diunduh terpisah dari arsip. Ekspor ini tidak memuat isi biner lampiran; bukan paket laporan eksternal yang telah disahkan.'
  };
  return Response.json(archive,{headers:{
   'Content-Disposition':'attachment; filename=srikandi-buana-data.json',
   'Cache-Control':'private, no-store',
   'X-Content-Type-Options':'nosniff'
  }});
 }catch{
  return new Response('Ekspor arsip belum berhasil. Tidak ada berkas yang dikirim.',{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
