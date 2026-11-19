import {getAuthenticatedUser} from '@/lib/auth';
import {env} from '@/lib/runtime';
import {accessAudit} from '@/lib/account-access';
import {readSourcePackage} from '@/lib/source-package';

export async function GET(request:Request){
 const user=await getAuthenticatedUser();
 if(!user||!['admin','sekretaris'].includes(user.role))return new Response('Akses khusus Sekretariat atau Administrator Sistem.',{status:401});
 if(!env.DB)return new Response('Audit akses dokumen belum tersedia.',{status:503,headers:{'Cache-Control':'no-store'}});
 const reason=new URL(request.url).searchParams.get('reason')?.trim()||'';
 if(user.role==='admin'&&(reason.length<10||reason.length>500))return new Response('Administrator Sistem wajib mengisi alasan akses minimal 10 karakter.',{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const action=user.role==='admin'?'Akses istimewa dokumen sumber privat oleh Administrator Sistem':'Unduh dokumen sumber privat oleh Sekretariat';
  const target=user.role==='admin'?'Paket_Kelembagaan_Srikandi_Buana_v1.1.docx | Alasan: '+reason:'Paket_Kelembagaan_Srikandi_Buana_v1.1.docx';
  const auditStatement=await accessAudit(user.userId,user.accountId,action,target);
  await auditStatement.run();
  const source=await readSourcePackage();
  const bytes=Uint8Array.from(atob(source.document),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename=Paket_Kelembagaan_Srikandi_Buana_v1.1.docx','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 }catch{return new Response('Dokumen belum tersedia atau audit akses gagal. Tidak ada berkas yang dikirim.',{status:503,headers:{'Cache-Control':'no-store'}})}
}