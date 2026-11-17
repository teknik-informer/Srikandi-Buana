import {env} from '@/lib/runtime';
import {getGovernanceAdminUser} from '../../admin-auth';
import {visibleRecord} from '@/lib/permissions';
import {canReadRecord} from '@/features/identity/access-policy';
import {isModuleAvailableForUser} from '@/features/identity/access-policy';
import {allowedFileIds} from '@/lib/file-access';

export const dynamic='force-dynamic';

export async function GET(){
 const user=await getGovernanceAdminUser();
 if(!user)return new Response('Akses khusus Administrator Sistem atau Ketua.',{status:403,headers:{'Cache-Control':'no-store'}});
 if(!env.DB)return new Response('Database belum tersedia.',{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const exportedAt=new Date().toISOString();
  // This is a limited JSON data export, not a full database or storage backup.
  // Record the event before returning it; an audit failure blocks the export.
  await env.DB.prepare('INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)')
   .bind(crypto.randomUUID(),user.userId,user.accountId,'Ekspor data dasar terbatas','JSON terbatas',exportedAt).run();
  const [rows,files,messageSummary,settings,operationSummary,operationHistorySummary]=await Promise.all([
   env.DB.prepare('SELECT id,kind,data,created,updated FROM records WHERE owner=? ORDER BY created').bind(user.userId).all(),
   env.DB.prepare('SELECT id,name,mime,size,created,deleted_at FROM files WHERE owner=?').bind(user.userId).all(),
   // The Chair receives non-identifying oversight counts, never raw names, contacts, or message bodies.
   env.DB.prepare('SELECT status,COUNT(*) AS count FROM messages GROUP BY status ORDER BY status').all(),
   env.DB.prepare('SELECT key,data,updated FROM settings WHERE owner=?').bind(user.userId).all(),
   env.DB.prepare("SELECT category,status,COUNT(*) AS count FROM operational_requests WHERE owner=? AND (status<>'draft' OR requester_id=?) GROUP BY category,status ORDER BY category,status").bind(user.userId,user.accountId).all(),
   env.DB.prepare("SELECT e.action,COUNT(*) AS count FROM operational_events e JOIN operational_requests r ON r.id=e.request_id AND r.owner=e.owner WHERE e.owner=? AND (r.status<>'draft' OR r.requester_id=?) GROUP BY e.action ORDER BY e.action").bind(user.userId,user.accountId).all()
  ]);
  const fileIds=await allowedFileIds(user);
  const archive={
   formatVersion:5,
   organisasi:'KWT Srikandi Buana',
   diekspor:exportedAt,
   records:rows.results.flatMap(row=>{
    const record={id:String(row.id),kind:String(row.kind),data:JSON.parse(String(row.data)) as Record<string,unknown>};
    return canReadRecord(user,record) ? [{...row,data:visibleRecord(user,record).data}] : [];
   }),
   files:files.results.filter(file=>fileIds.has(String(file.id))).map(file=>({id:String(file.id),name:"Lampiran",mime:String(file.mime),size:Number(file.size),created:String(file.created)})),
   messageSummary:isModuleAvailableForUser(user,'crm')?messageSummary.results.map(row=>({status:String(row.status||'Belum diklasifikasikan'),count:Number(row.count||0)})):[],
   settings:isModuleAvailableForUser(user,'cms')?settings.results.map(row=>({...row,data:JSON.parse(String(row.data))})):[],
   operationSummary:isModuleAvailableForUser(user,'projects')?operationSummary.results.map(row=>({category:String(row.category),status:String(row.status),count:Number(row.count||0)})):[],
   operationHistorySummary:isModuleAvailableForUser(user,'projects')?operationHistorySummary.results.map(row=>({action:String(row.action),count:Number(row.count||0)})):[],
   catatan:'Ekspor JSON dasar terbatas untuk Administrator Sistem atau Ketua; record mengikuti masking field, dan draf pengajuan pribadi akun lain tidak disertakan. Berisi record JSON, metadata file yang diizinkan, ringkasan jumlah pesan per status tanpa identitas atau isi pesan mentah, pengaturan, ringkasan pengajuan operasional per kategori/status, dan ringkasan tindakan histori tanpa nama pengaju, nama pelaksana, atau catatan bebas. Tidak mencakup isi biner lampiran, buku besar/jurnal terstruktur, katalog dan pesanan terstruktur, tabel pertanian terstruktur, grant eksternal, atau seluruh state penyimpanan. Bukan backup penuh untuk pemulihan dan bukan paket laporan eksternal yang telah disahkan.'
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
