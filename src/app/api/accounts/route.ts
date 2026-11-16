import {env} from '@/lib/runtime';
import {getAuthenticatedUser} from '@/lib/auth';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {accessInput,accessAudit,inviteToken,activationLink,json,sameOrigin} from '@/lib/account-access';
import {sendAccountEmail} from '@/lib/account-mailer';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){
 const u=await getAuthenticatedUser();
 if(!u||!['admin','ketua'].includes(u.role))return json({error:'Akses khusus pengelola akun.'},403);
 if(!env.DB)return json({error:'Database belum tersedia.'},503);
 try{
  const members=await env.DB.prepare("SELECT id,data FROM records WHERE owner=? AND kind='anggota' ORDER BY created").bind(u.userId).all();
  const memberIds=members.results.map(row=>String(row.id));
  const memberPhones=new Map(members.results.map(row=>{try{return [String(row.id),String(JSON.parse(String(row.data)).phone||'')]}catch{return [String(row.id),'']}}));
  const linkedAccounts=memberIds.length
   ? await env.DB.prepare('SELECT id,email,login_phone,phone_verified_at,full_name,role,position,program_ids,member_id,enabled,created,workspace_owner FROM users WHERE member_id IN ('+memberIds.map(()=>'?').join(',')+')').bind(...memberIds).all()
   : {results:[]};
  const accountRows:Record<string,unknown>[]=[...new Map<string,Record<string,unknown>>(linkedAccounts.results.filter(row=>String(row.workspace_owner)===u.userId).map(({workspace_owner,...row})=>[String(row.id),{...row,member_phone:memberPhones.get(String(row.member_id))||''} as Record<string,unknown>])).values()];
  if(u.role==='admin'){
   const self=await env.DB.prepare('SELECT id,email,login_phone,phone_verified_at,full_name,role,position,program_ids,member_id,enabled,created FROM users WHERE id=?').bind(u.accountId).first();
   if(self)accountRows.unshift({...self,member_phone:''} as Record<string,unknown>);
  }
  const users={results:accountRows};
  const invitations=await env.DB.prepare('SELECT id,email,full_name,role,position,program_ids,member_id,purpose,login_phone,expires,consumed_at,revoked_at,created FROM account_invitations WHERE owner=? ORDER BY created DESC LIMIT 200').bind(u.userId).all();
  const audit=await env.DB.prepare('SELECT actor,action,target,created FROM access_audit WHERE owner=? ORDER BY created DESC LIMIT 50').bind(u.userId).all();
  const now=new Date().toISOString();
  const [activeChair,pendingChair]=await Promise.all([
   env.DB.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='ketua' LIMIT 1").bind(u.userId).first(),
   env.DB.prepare("SELECT id FROM account_invitations WHERE owner=? AND role='ketua' AND consumed_at IS NULL AND revoked_at IS NULL AND expires>? LIMIT 1").bind(u.userId,now).first()
  ]);
  return json({users:u.role==='admin'?users.results:users.results.map(({login_phone,phone_verified_at,member_phone,...row})=>({...row,email:String(row.email).endsWith('.invalid')?'':row.email,login_phone:null,phone_verified_at:null,member_phone:''})),invitations:u.role==='admin'?invitations.results:invitations.results.map(({login_phone,...row})=>({...row,email:String(row.email).endsWith('.invalid')?'':row.email,login_phone:null})),audit:audit.results,members:members.results.flatMap(r=>{try{const data=JSON.parse(String(r.data));return [{id:String(r.id),name:String(data.name||'Anggota'),status:String(data.status||''),verification:String(data.verification||''),...(u.role==='admin'?{phone:String(data.phone||'')}:{})}];}catch{return []}}),firstChairAvailable:!activeChair&&!pendingChair});
 }catch{return json({error:'Daftar akun belum dapat dimuat.'},503)}
}
export async function POST(request:Request){
 const u=await getAuthenticatedUser();
 if(!u||!['admin','ketua'].includes(u.role))return json({error:'Akses khusus Ketua.'},403);
 if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 if(!env.DB)return json({error:'Database belum tersedia.'},503);
 try{
  const raw=await readJsonObject(request,8000);
  if((raw.channel==='whatsapp'||raw.action==='reset_wa'||raw.action==='verify_phone')&&u.role!=='admin')return json({error:'Konfirmasi dan pemulihan WhatsApp manual hanya dapat dilakukan oleh Arsitek Sistem.'},403);
  if(u.role==='admin'&&!['invite','reset','reset_wa','change_email','verify_phone'].includes(String(raw.action)))return json({error:'Arsitek Sistem hanya dapat mengundang akun struktural, memulihkan akses, dan mengelola hak akses teknis.'},403);
  if(raw.action==='verify_phone'){
   const target=await env.DB.prepare('SELECT id,member_id,role,enabled FROM users WHERE id=? AND workspace_owner=?').bind(String(raw.userId||''),u.userId).first();
   if(!target||target.role==='admin'||target.role==='ketua'||target.id===u.accountId||!target.enabled)return json({error:'Akun ini tidak dapat diubah melalui verifikasi WhatsApp biasa.'},403);
   if(raw.whatsappConfirmed!==true)return json({error:'Admin harus menghubungi anggota dan mengonfirmasi kepemilikan nomor WhatsApp secara manual.'},400);
   const member=await env.DB.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(String(target.member_id||''),u.userId).first();
   if(!member)return json({error:'Data anggota tidak ditemukan.'},404);
   const data=JSON.parse(String(member.data)),digits=String(data.phone||'').replace(/\D/g,''),normalized=digits.startsWith('0')?'62'+digits.slice(1):digits.startsWith('62')?digits:'',phone=normalized&&/^628[0-9]{7,12}$/.test(normalized)?'+'+normalized:'';
   if(data.status!=='Aktif'||data.verification!=='Terverifikasi'||!phone)return json({error:'Data anggota harus aktif, terverifikasi, dan memiliki nomor WhatsApp yang valid.'},409);
   const duplicate=await env.DB.prepare('SELECT id FROM users WHERE login_phone=? AND id<>?').bind(phone,target.id).first();
   if(duplicate)return json({error:'Nomor WhatsApp sudah digunakan akun lain.'},409);
   const now=new Date().toISOString();
   await env.DB.batch([env.DB.prepare('UPDATE users SET login_phone=?,phone_verified_at=?,phone_verified_by=? WHERE id=? AND workspace_owner=?').bind(phone,now,u.accountId,target.id,u.userId),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id),await accessAudit(u.userId,u.accountId,'Nomor WhatsApp akun dikonfirmasi ulang; sesi dicabut',phone)]);
   return json({ok:true,verified:true,phone});
  }
  if(u.role==='admin'&&raw.action==='invite'&&raw.role==='ketua'){
   const nowCheck=new Date().toISOString();
   await env.DB.prepare("UPDATE account_invitations SET revoked_at=? WHERE owner=? AND role='ketua' AND purpose='activate' AND consumed_at IS NULL AND revoked_at IS NULL AND expires<=?").bind(nowCheck,u.userId,nowCheck).run();
   const existingChair=await env.DB.prepare("SELECT id FROM users WHERE workspace_owner=? AND role='ketua' LIMIT 1").bind(u.userId).first();
   const pendingChair=await env.DB.prepare("SELECT id FROM account_invitations WHERE owner=? AND role='ketua' AND consumed_at IS NULL AND revoked_at IS NULL AND expires>? LIMIT 1").bind(u.userId,nowCheck).first();
   if(existingChair||pendingChair)return json({error:'Akun Ketua sudah ditetapkan atau undangannya masih berlaku. Pergantian Ketua harus melalui prosedur serah-terima resmi.'},403);
  }
  if(u.role==='ketua'&&raw.action==='invite'&&raw.role==='ketua')return json({error:'Peran Ketua hanya ditetapkan melalui bootstrap Ketua pertama. Penyerahan kewenangan Ketua berikutnya memerlukan prosedur serah-terima resmi dan tidak melalui undangan biasa.'},403);
  if(raw.action==='change_email'&&u.role!=='admin')return json({error:'Perubahan email struktural hanya dapat dimulai oleh Arsitek Sistem.'},403);
  const purpose=raw.action==='reset_wa'?'reset_wa':raw.action==='reset'?'reset':raw.action==='change_email'?'change_email':raw.channel==='whatsapp'?'activate_wa':'activate';
  if(!['invite','reset','reset_wa','change_email'].includes(String(raw.action)))return json({error:'Tindakan tidak valid.'},400);
 const normalizePhone=(value:string)=>{const d=value.replace(/\D/g,'');const n=d.startsWith('0')?'62'+d.slice(1):d.startsWith('62')?d:'';return n&&/^628[0-9]{7,12}$/.test(n)?'+'+n:''};
 let memberId=String(raw.memberId||''),phone=normalizePhone(String(raw.phone||'')),email=String(raw.email||'').trim().toLowerCase(),fullName='',targetId:string|null=null,access=purpose==='change_email'?accessInput({role:'anggota'}):accessInput(raw);
 if(purpose==='reset'||purpose==='reset_wa'||purpose==='change_email'){
  const target=await env.DB.prepare('SELECT id,email,login_phone,phone_verified_at,full_name,member_id,role,position,program_ids,enabled FROM users WHERE id=? AND workspace_owner=?').bind(String(raw.userId||''),u.userId).first();
  if(!target||target.role==='admin'||target.role==='ketua'||target.id===u.accountId||(purpose==='change_email'&&!target.enabled))return json({error:purpose==='change_email'?'Email akun Ketua, Administrator Sistem, akun Arsitek, atau akun nonaktif tidak dapat diubah melalui alur biasa.':'Pemulihan akun Ketua tidak tersedia melalui pengelolaan akun biasa. Gunakan prosedur pemulihan khusus yang diaudit.'},403);
  targetId=String(target.id);memberId=String(target.member_id);if(purpose==='reset')email=String(target.email);if(purpose==='reset_wa'){if(!target.login_phone||!target.phone_verified_at)return json({error:'Nomor WhatsApp akun ini belum dikonfirmasi Admin.'},409);phone=String(target.login_phone);email='wa-'+phone.replace(/\D/g,'')+'@login.srikandibuana.invalid';}fullName=String(target.full_name);
  access=accessInput({role:target.role,position:target.position,programIds:JSON.parse(String(target.program_ids))});
 }
 if(purpose==='activate_wa'){if(!phone||raw.whatsappConfirmed!==true)return json({error:'Admin harus mencocokkan nomor WhatsApp dengan data anggota dan mengonfirmasi pemeriksaan manual.'},400);email='wa-'+phone.replace(/\D/g,'')+'@login.srikandibuana.invalid';const duplicatePhone=await env.DB.prepare('SELECT id FROM users WHERE login_phone=?').bind(phone).first();if(duplicatePhone)return json({error:'Nomor WhatsApp sudah terhubung dengan akun lain.'},409);}else if(purpose!=='reset_wa'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180))return json({error:'Masukkan email pribadi yang valid.'},400);
 const member=await env.DB.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(memberId,u.userId).first();if(!member)return json({error:'Pilih anggota yang terdaftar.'},400);const data=JSON.parse(String(member.data));if(data.verification!=='Terverifikasi'||data.status!=='Aktif')return json({error:'Verifikasi data anggota dan tetapkan status Aktif sebelum membuat undangan.'},400);fullName=String(data.name);if(purpose==='reset_wa'&&normalizePhone(String(data.phone||''))!==phone)return json({error:'Nomor WhatsApp pada data anggota berubah. Verifikasi ulang melalui Admin.'},409);if(purpose==='activate_wa'&&normalizePhone(String(data.phone||''))!==phone)return json({error:'Nomor WhatsApp tidak cocok dengan nomor pada data anggota. Perbarui data anggota terlebih dahulu.'},409);
 if(purpose==='activate'||purpose==='activate_wa'){const duplicate=await env.DB.prepare('SELECT id FROM users WHERE lower(email)=lower(?) OR (workspace_owner=? AND member_id=?)').bind(email,u.userId,memberId).first();if(duplicate)return json({error:'Akun untuk anggota ini sudah ada. Gunakan pemulihan akses.'},409)}
 if(purpose==='change_email'){
  const current=await env.DB.prepare('SELECT email FROM users WHERE id=? AND workspace_owner=?').bind(targetId,u.userId).first();
  if(!current||email===String(current.email).toLowerCase())return json({error:'Email baru sama dengan email yang sedang digunakan.'},400);
  const duplicate=await env.DB.prepare('SELECT id FROM users WHERE lower(email)=lower(?) AND id<>?').bind(email,targetId).first();
  if(duplicate)return json({error:'Email tersebut sudah digunakan oleh akun lain.'},409);
 }
 const {token,hash}=inviteToken(),id=crypto.randomUUID(),now=new Date().toISOString(),expires=new Date(Date.now()+(['activate','activate_wa'].includes(purpose)?48*3600000:3600000)).toISOString();const baseLink=activationLink(request,token);const url=purpose==='change_email'?baseLink.replace('/aktivasi#','/aktivasi?mode=email#'):['activate_wa','reset_wa'].includes(purpose)?baseLink.replace('/aktivasi#','/aktivasi?mode=whatsapp#'):baseLink;
 await env.DB.batch([env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE owner=? AND member_id=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,u.userId,memberId),env.DB.prepare('INSERT INTO account_invitations(id,token_hash,owner,member_id,email,full_name,role,position,program_ids,purpose,target_user_id,expires,created_by,created,login_phone,phone_verified_at,phone_verified_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,hash,u.userId,memberId,email,fullName,access.role,access.position,JSON.stringify(access.programIds),purpose,targetId,expires,u.accountId,now,['activate_wa','reset_wa'].includes(purpose)?phone:null,['activate_wa','reset_wa'].includes(purpose)?now:null,['activate_wa','reset_wa'].includes(purpose)?u.accountId:null),await accessAudit(u.userId,u.accountId,['reset','reset_wa'].includes(purpose)?'Tautan pemulihan dibuat':purpose==='change_email'?'Verifikasi perubahan email diminta':purpose==='activate_wa'?'Nomor WhatsApp dikonfirmasi Admin; tautan aktivasi dibuat':'Undangan dibuat',['activate_wa','reset_wa'].includes(purpose)?phone:email)]);
 if(['activate_wa','reset_wa'].includes(purpose))return json({ok:true,manual:true,url,expires,phone,purpose});
 try {
  await sendAccountEmail({to:email,name:fullName,url,expires,purpose:purpose as 'activate'|'reset'|'change_email'});
 } catch {
  const failedAt=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE id=? AND owner=? AND consumed_at IS NULL').bind(failedAt,id,u.userId),
   await accessAudit(u.userId,u.accountId,'Pengiriman email gagal; tautan otomatis dicabut',email),
  ]);
  return json({error:'Email belum dapat dikirim. Periksa konfigurasi Gmail App Password pada lingkungan Preview, lalu coba kembali.'},503);
 }
 return json({ok:true,sent:true,expires,email,purpose});
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);if(e instanceof Error&&/users_one_active_chair_per_workspace|account_invitations_one_pending_chair_per_workspace|duplicate key|unique constraint/i.test(e.message))return json({error:'Kewenangan Ketua atau undangannya sudah ditetapkan. Periksa akun dan undangan sebelum mencoba kembali.'},409);return json({error:e instanceof Error&&/Pilih|Jabatan|Program|Alamat/.test(e.message)?e.message:'Undangan belum tersimpan. Muat ulang dan coba kembali.'},400)}}
export async function PATCH(request:Request){const u=await getAuthenticatedUser();if(!u||!['admin','ketua'].includes(u.role))return json({error:'Akses khusus pengelola akun.'},403);if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);if(!env.DB)return json({error:'Database belum tersedia.'},503);try{const raw=await readJsonObject(request,8000);if(raw.action==='revoke'){const now=new Date().toISOString();await env.DB.batch([env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE id=? AND owner=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,String(raw.id||''),u.userId),await accessAudit(u.userId,u.accountId,'Undangan dicabut',String(raw.id||''))]);return json({ok:true})}
 const target=await env.DB.prepare('SELECT id,role,member_id,email FROM users WHERE id=? AND workspace_owner=?').bind(String(raw.userId||''),u.userId).first();if(!target)return json({error:'Akun tidak ditemukan.'},404);if(target.role==='admin'||target.role==='ketua'||target.id===u.accountId)return json({error:'Akun Administrator Sistem dan Ketua tidak dapat diubah melalui pengelolaan akun biasa.'},403);if(typeof raw.enabled!=='boolean')return json({error:'Status akun tidak valid.'},400);const access=accessInput(raw);if(access.role==='ketua'&&target.role!=='ketua')return json({error:'Penetapan Ketua pengganti memerlukan prosedur serah-terima resmi; perubahan role biasa tidak dapat memberi kewenangan Ketua.'},403);const now=new Date().toISOString();await env.DB.batch([env.DB.prepare('UPDATE users SET role=?,position=?,program_ids=?,enabled=? WHERE id=? AND workspace_owner=?').bind(access.role,access.position,JSON.stringify(access.programIds),raw.enabled,target.id,u.userId),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id),env.DB.prepare('UPDATE account_invitations SET revoked_at=? WHERE owner=? AND member_id=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(now,u.userId,target.member_id),await accessAudit(u.userId,u.accountId,raw.enabled?'Hak akses diperbarui; sesi dicabut':'Akun dinonaktifkan; sesi dicabut',String(target.email))]);return json({ok:true});
 }catch(e){if(e instanceof RequestBodyError)return json({error:e.message},e.status);return json({error:e instanceof Error&&/Pilih|Jabatan|Program/.test(e.message)?e.message:'Perubahan belum tersimpan.'},400)}}
