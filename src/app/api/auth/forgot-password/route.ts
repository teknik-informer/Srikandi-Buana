import {env} from '@/lib/runtime';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {consumeRateLimit} from '@/lib/rate-limit';
import {digest} from '@/lib/auth';
import {inviteToken,activationLink,accessAudit,json,sameOrigin} from '@/lib/account-access';
import {sendAccountEmail} from '@/lib/account-mailer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const genericMessage='Jika alamat tersebut terdaftar dan memenuhi syarat, tautan pemulihan akan dikirim ke email pemilik akun. Periksa kotak masuk dan folder spam.';

export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 if(!env.DB)return json({error:'Layanan akun sementara tidak tersedia.'},503);
 try{
  const raw=await readJsonObject(request,2000);
  const email=String(raw.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180)return json({error:'Masukkan alamat email yang valid.'},400);
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||request.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const [ipAllowed,emailAllowed]=await Promise.all([
   consumeRateLimit(env.DB,'forgot-password-ip:'+digest(ip),5,900000),
   consumeRateLimit(env.DB,'forgot-password-email:'+digest(email),3,3600000)
  ]);
  if(!ipAllowed||!emailAllowed)return json({ok:true,message:genericMessage});
  const account=await env.DB.prepare("SELECT u.id,u.email,u.full_name,u.member_id,u.workspace_owner,u.role,u.position,u.program_ids,o.email AS owner_email,o.enabled AS owner_enabled,o.role AS owner_role FROM users u JOIN users o ON o.id=u.workspace_owner WHERE lower(u.email)=lower(?) AND u.enabled=TRUE AND u.role!='admin'").bind(email).first();
  if(!account||!account.member_id||!account.owner_enabled||account.owner_role!=='admin'||String(account.owner_email).toLowerCase()!==(process.env.ADMIN_EMAIL||'').trim().toLowerCase())return json({ok:true,message:genericMessage});
  const member=await env.DB.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(account.member_id,account.workspace_owner).first();
  if(!member)return json({ok:true,message:genericMessage});
  const memberData=JSON.parse(String(member.data));
  if(memberData.status!=='Aktif'||memberData.verification!=='Terverifikasi')return json({ok:true,message:genericMessage});
  const {token,hash}=inviteToken(),id=crypto.randomUUID(),now=new Date().toISOString(),expires=new Date(Date.now()+3600000).toISOString();
  const url=activationLink(request,token).replace('/aktivasi#','/aktivasi?mode=reset#');
  await env.DB.batch([
   env.DB.prepare("UPDATE account_invitations SET revoked_at=? WHERE owner=? AND member_id=? AND consumed_at IS NULL AND revoked_at IS NULL").bind(now,account.workspace_owner,account.id),
   env.DB.prepare("INSERT INTO account_invitations(id,token_hash,owner,member_id,email,full_name,role,position,program_ids,purpose,target_user_id,expires,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,hash,account.workspace_owner,account.member_id,email,account.full_name,account.role,account.position,String(account.program_ids||'[]'),'reset',account.id,expires,account.id,now),
   accessAudit(String(account.workspace_owner),String(account.id),'Permintaan pemulihan mandiri diterima',email)
  ]);
  try{
   await sendAccountEmail({to:email,name:String(account.full_name||memberData.name||'Anggota'),url,expires,purpose:'reset'});
  }catch(error){
   const failedAt=new Date().toISOString();
   await env.DB.batch([
    env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE id=? AND owner=? AND consumed_at IS NULL').bind(failedAt,id,account.workspace_owner),
    accessAudit(String(account.workspace_owner),String(account.id),'Pengiriman pemulihan mandiri gagal; tautan dicabut',email)
   ]);
   console.error('[account-recovery:email]',error instanceof Error?error.message:'email delivery failed');
  }
  return json({ok:true,message:genericMessage});
 }catch(error){
  if(error instanceof RequestBodyError)return json({error:error.message},error.status);
  return json({error:'Permintaan pemulihan belum dapat diproses. Coba kembali beberapa saat lagi.'},503);
 }
}
