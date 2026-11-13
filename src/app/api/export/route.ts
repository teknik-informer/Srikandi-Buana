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
  // This is a limited JSON data export, not a full database or storage backup.
  // Record the event before returning it; an audit failure blocks the export.
  await env.DB.prepare('INSERT INTO access_audit(id,owner,actor,action,target,created) VALUES(?,?,?,?,?,?)')
   .bind(crypto.randomUUID(),user.userId,user.accountId,'Ekspor data dasar terbatas','JSON terbatas',exportedAt).run();
  const [rows,files,messageSummary,settings,operations,operationHistory]=await Promise.all([
   env.DB.prepare('SELECT id,kind,data,created,updated FROM records WHERE owner=? ORDER BY created').bind(user.userId).all(),
   env.DB.prepare('SELECT id,name,mime,size,created,deleted_at FROM files WHERE owner=?').bind(user.userId).all(),
   // The Chair receives non-identifying oversight counts, never raw names, contacts, or message bodies.
   env.DB.prepare('SELECT status,COUNT(*) AS count FROM messages GROUP BY status ORDER BY status').all(),
   env.DB.prepare('SELECT key,data,updated FROM settings WHERE owner=?').bind(user.userId).all(),
   env.DB.prepare("SELECT * FROM operational_requests WHERE owner=? AND (status<>'draft' OR requester_id=?) ORDER BY created,id").bind(user.userId,user.accountId).all(),
   env.DB.prepare("SELECT e.* FROM operational_events e JOIN operational_requests r ON r.id=e.request_id AND r.owner=e.owner WHERE e.owner=? AND (r.status<>'draft' OR r.requester_id=?) ORDER BY e.request_id,e.version").bind(user.userId,user.accountId).all()
  ]);
  const fileIds=await allowedFileIds(user);
  const archive={
   formatVersion:4,
   organisasi:'KWT Srikandi Buana',
   diekspor:exportedAt,
   records:rows.results.map(row=>{
    const record={id:String(row.id),kind:String(row.kind),data:JSON.parse(String(row.data)) as Record<string,unknown>};
    return {...row,data:visibleRecord(user,record).data};
   }),
   files:files.results.filter(file=>fileIds.has(String(file.id))),
   messageSummary:messageSummary.results.map(row=>({status:String(row.status||'Belum diklasifikasikan'),count:Number(row.count||0)})),
   settings:settings.results.map(row=>({...row,data:JSON.parse(String(row.data))})),
   operations:operations.results,
   operationHistory:operationHistory.results,
   catatan:'Ekspor JSON dasar terbatas untuk Ketua; record mengikuti masking field, dan draf pengajuan pribadi akun lain tidak disertakan. Berisi record JSON, metadata file yang diizinkan, ringkasan jumlah pesan per status tanpa identitas atau isi pesan mentah, pengaturan, dan histori pengajuan operasional yang dapat diakses. Tidak mencakup isi biner lampiran, buku besar/jurnal terstruktur, katalog dan pesanan terstruktur, tabel pertanian terstruktur, grant eksternal, atau seluruh state penyimpanan. Bukan backup penuh untuk pemulihan dan bukan paket laporan eksternal yang telah disahkan.'
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
