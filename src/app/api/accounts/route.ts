import {env} from '@/lib/runtime';
import {getGovernanceAdminUser} from '../../admin-auth';
import {getAuthenticatedUser} from '@/lib/auth';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {accessInput,accessAudit,inviteToken,activationLink,json,sameOrigin} from '@/lib/account-access';
export const dynamic='force-dynamic';
export async function GET(){const u=await getAuthenticatedUser();if(!u||!['admin','ketua'].includes(u.role))return json({error:'Akses khusus Ketua.'},403);if(!env.DB)return json({error:'Database belum tersedia.'},503);try{
 if(u.role==='admin'){
  const activeChair=await env.DB.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='ketua' AND enabled=TRUE LIMIT 1").bind(u.userId).first();
  const pendingChair=await env.DB.prepare("SELECT id FROM account_invitations WHERE owner=? AND role='ketua' AND consumed_at IS NULL AND revoked_at IS NULL AND expires>? LIMIT 1").bind(u.userId,new Date().toISOString()).first();
  const firstChairAvailable=!activeChair&&!pendingChair;
  const candidateRows=firstChairAvailable?await env.DB.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota' ORDER BY created").bind(u.userId).all():{results:[]};
  const members=candidateRows.results.flatMap(r=>{try{const d=JSON.parse(String(r.data));return d.status==='Aktif'&&d.verification==='Terverifikasi'?[{id:String(r.id),name:String(d.name||''),status:d.status,verification:d.verification}]:[]}catch{return[]}});
  return json({users:[],invitations:[],audit:[],members,firstChairAvailable});
 }
 if(u.role!=='ketua')return json({error:'Akses khusus Ketua.'},403);
 const [users,invitations,audit,members]=await Promise.all([
 env.DB.prepare('SELECT id,email,full_name,role,position,program_ids,member_id,enabled,created FROM users WHERE workspace_owner=? ORDER BY created').bind(u.userId).all(),
 env.DB.prepare('SELECT id,email,full_name,role,position,program_ids,member_id,purpose,expires,consumed_at,revoked_at,created FROM account_invitations WHERE owner=? ORDER BY created DESC LIMIT 200').bind(u.userId).all(),
 env.DB.prepare('SELECT actor,action,target,created FROM access_audit WHERE owner=? ORDER BY created DESC LIMIT 50').bind(u.userId).all(),
 env.DB.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota' ORDER BY created").bind(u.userId).all()]);
 return json({users:users.results,invitations:invitations.results,audit:audit.results,members:members.results.map(r=>({id:r.id,...JSON.parse(String(r.data))})),firstChairAvailable:false});}catch{return json({error:'Daftar akun belum dapat dimuat.'},503)}}
export async function POST(request:Request){
 const u=await getAuthenticatedUser();
 if(!u||!['admin','ketua'].includes(u.role))return json({error:'Akses khusus Ketua.'},403);
 if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 if(!env.DB)return json({error:'Database belum tersedia.'},503);
 try{
  const raw=await readJsonObject(request,8000);
  if(u.role==='admin'){
   if(raw.action!=='invite'||raw.role!=='ketua')return json({error:'Administrator Sistem hanya dapat memulai undangan Ketua pertama; pengelolaan akun organisasi selanjutnya menjadi kewenangan Ketua.'},403);
   const nowCheck=new Date().toISOString();
   const activeChair=await env.DB.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='ketua' AND enabled=TRUE LIMIT 1").bind(u.userId).first();
   const pendingChair=await env.DB.prepare("SELECT id FROM account_invitations WHERE owner=? AND role='ketua' AND consumed_at IS NULL AND revoked_at IS NULL AND expires>? LIMIT 1").bind(u.userId,nowCheck).first();
   if(activeChair||pendingChair)return json({error:'Undangan Ketua pertama sudah digunakan atau masih berlaku. Pengelolaan akun kini hanya melalui Ketua.'},403);
  }
  const purpose=raw.action==='reset'?'reset':'activate';
  if(!['invite','reset'].includes(String(raw.action)))return json({error:'Tindakan tidak valid.'},400);
 let memberId=String(raw.memberId||''),email=String(raw.email||'').trim().toLowerCase(),fullName='',targetId:string|null=null,access=accessInput(raw);
 if(purpose==='reset'){const target=await env.DB.prepare('SELECT id,email,full_name,member_id,role,position,program_ids FROM users WHERE id=? AND workspace_owner=?').bind(String(raw.userId||''),u.userId).first();if(!target||target.role==='admin')return json({error:'Pemulihan ini hanya untuk akun anggota dan pengurus.'},403);targetId=String(target.id);memberId=String(target.member_id);email=String(target.email);fullName=String(target.full_name);access=accessInput({role:target.role,position:target.position,programIds:JSON.parse(String(target.program_ids))})}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180)return json({error:'Masukkan email pribadi yang valid.'},400);
 const member=await env.DB.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(memberId,u.userId).first();if(!member)return json({error:'Pilih anggota yang terdaftar.'},400);const data=JSON.parse(String(member.data));if(data.verification!=='Terverifikasi'||data.status!=='Aktif')return json({error:'Verifikasi data anggota dan tetapkan status Aktif sebelum membuat undangan.'},400);fullName=String(data.name);
 if(purpose==='activate'){const duplicate=await env.DB.prepare('SELECT id FROM users WHERE email=? OR (workspace_owner=? AND member_id=?)').bind(email,u.userId,memberId).first();if(duplicate)return json({error:'Akun untuk email atau anggota ini sudah ada. Gunakan pemulihan password.'},409)}
 const {token,hash}=inviteToken(),id=crypto.randomUUID(),now=new Date().toISOString(),expires=new Date(Date.now()+(purpose==='reset'?3600000:48*3600000)).toISOString();const url=activationLink(request,token);
 await env.DB.batch([env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE owner=? AND member_id=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,u.userId,memberId),env.DB.prepare('INSERT INTO account_invitations(id,token_hash,owner,member_id,email,full_name,role,position,program_ids,purpose,target_user_id,expires,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,hash,u.userId,memberId,email,fullName,access.role,access.position,JSON.stringify(access.programIds),purpose,targetId,expires,u.accountId,now),await accessAudit(u.userId,u.accountId,purpose==='reset'?'Tautan pemulihan dibuat':'Undangan dibuat',email)]);
 return json({ok:true,url,expires,email,purpose});
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return json({error:e instanceof Error&&/Pilih|Jabatan|Program|Alamat/.test(e.message)?e.message:'Undangan belum tersimpan. Muat ulang dan coba kembali.'},400)}}
export async function PATCH(request:Request){const u=await getGovernanceAdminUser();if(!u)return json({error:'Akses khusus administrator.'},403);if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);if(!env.DB)return json({error:'Database belum tersedia.'},503);try{const raw=await readJsonObject(request,8000);if(raw.action==='revoke'){const now=new Date().toISOString();await env.DB.batch([env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE id=? AND owner=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,String(raw.id||''),u.userId),await accessAudit(u.userId,u.accountId,'Undangan dicabut',String(raw.id||''))]);return json({ok:true})}
 const target=await env.DB.prepare('SELECT id,role,member_id,email FROM users WHERE id=? AND workspace_owner=?').bind(String(raw.userId||''),u.userId).first();if(!target)return json({error:'Akun tidak ditemukan.'},404);if(target.role==='admin'||target.id===u.accountId)return json({error:'Akun pemilik tidak dapat diubah dari menu ini.'},403);if(typeof raw.enabled!=='boolean')return json({error:'Status akun tidak valid.'},400);const access=accessInput(raw),now=new Date().toISOString();await env.DB.batch([env.DB.prepare('UPDATE users SET role=?,position=?,program_ids=?,enabled=? WHERE id=? AND workspace_owner=?').bind(access.role,access.position,JSON.stringify(access.programIds),raw.enabled,target.id,u.userId),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id),env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE owner=? AND member_id=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,u.userId,target.member_id),await accessAudit(u.userId,u.accountId,raw.enabled?'Hak akses diperbarui; sesi dicabut':'Akun dinonaktifkan; sesi dicabut',String(target.email))]);return json({ok:true});
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return json({error:e instanceof Error&&/Pilih|Jabatan|Program/.test(e.message)?e.message:'Perubahan belum tersimpan.'},400)}}
