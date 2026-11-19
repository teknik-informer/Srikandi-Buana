import {env} from '@/lib/runtime';
import {getAuthenticatedUser} from '@/lib/auth';
import {readJsonObject,RequestBodyError} from '@/lib/request-body';
import {accessAudit,json,sameOrigin} from '@/lib/account-access';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const profileFields=['education','occupation','skills','farmArea','commodities','experience','trainingHistory','bio'] as const;

export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 const user=await getAuthenticatedUser();
 if(!user||user.role!=='anggota'||!user.memberId)return json({error:'Fitur ini hanya tersedia bagi pemilik akun anggota yang aktif.'},403);
 if(!env.DB)return json({error:'Database belum tersedia.'},503);
 try{
  const raw=await readJsonObject(request,12000);
  const patch:Record<string,string>={};
  for(const key of profileFields){
   const value=String(raw[key]??'').trim();
   if(value.length>1200)return json({error:'Salah satu isian profil terlalu panjang.'},400);
   patch[key]=value;
  }
  const record=await env.DB.prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='anggota'").bind(user.memberId,user.userId).first();
  if(!record)return json({error:'Data keanggotaan tidak ditemukan.'},404);
  const current=JSON.parse(String(record.data)) as Record<string,unknown>;
  if(current.status!=='Aktif'||current.verification!=='Terverifikasi')return json({error:'Profil dapat dilengkapi setelah status keanggotaan aktif dan terverifikasi.'},403);
  const merged={...current,...patch};
  const complete=profileFields.every(key=>String(merged[key]||'').trim().length>0);
  const completedAt=complete?(String(current.profileCompletedAt||'')||new Date().toISOString()):'';
  merged.profileCompletedAt=completedAt||null;
  const now=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare("UPDATE records SET data=?,updated=? WHERE id=? AND owner=? AND kind='anggota'").bind(JSON.stringify(merged),now,user.memberId,user.userId),
   await accessAudit(user.userId,user.accountId,'Profil anggota diperbarui','Data profil dan CV pribadi')
  ]);
  return json({ok:true,profileCompleted:complete,profileCompletedAt:completedAt||null});
 }catch(error){
  if(error instanceof RequestBodyError)return json({error:error.message},error.status);
  return json({error:'Profil belum dapat disimpan. Silakan coba kembali.'},503);
 }
}
