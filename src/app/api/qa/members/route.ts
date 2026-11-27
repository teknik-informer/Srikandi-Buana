import {env} from "@/lib/runtime";
import {getAuthenticatedUser} from "@/lib/auth";
import {normalizeIndonesianMobilePhone} from "@/lib/phone";
import {isArchitectQaPreview} from "@/features/shared/qa-preview.mjs";
import {sameOrigin,json} from "@/lib/account-access";
import {readJsonObject,RequestBodyError} from "@/lib/request-body";

export const dynamic="force-dynamic";
export const runtime="nodejs";
function enabled(){ return isArchitectQaPreview(process.env); }
async function principal(){
  if(!enabled())return {error:json({error:"Laboratorium anggota hanya tersedia pada Preview QA."},404)};
  const user=await getAuthenticatedUser();
  if(!user||user.role!=="admin"||user.architectFullAccess!==true)return {error:json({error:"Akses khusus Arsitek Sistem pada Preview QA."},403)};
  if(!env.DB)return {error:json({error:"Database QA belum tersedia."},503)};
  return {user,db:env.DB};
}
function valid(raw:Record<string,unknown>){
  const name=String(raw.name||"").trim();
  const dusun=String(raw.dusun||"").trim();
  const phone=normalizeIndonesianMobilePhone(raw.phone);
  if(name.length<3||name.length>100)return {error:"Nama anggota uji harus 3–100 karakter."};
  if(!/^Anggota Uji\b/i.test(name))return {error:"Untuk menjaga pemisahan data, nama harus diawali 'Anggota Uji'."};
  if(!["Gintung","Ngleri","Ngliwu","Craken"].includes(dusun))return {error:"Pilih dusun uji yang tersedia."};
  if(!phone)return {error:"Nomor WhatsApp uji tidak valid. Gunakan format 08…, 8…, atau +628…."};
  return {data:{name,dusun,phone,role:"Anggota",potential:"DATA SINTETIS QA — bukan data anggota organisasi.",status:"Aktif",verification:"Terverifikasi",consent:"Terdokumentasi",qaFixture:true,qaLabel:"DATA UJI — PREVIEW SAJA"}};
}
export async function GET(){
  try{
    const c=await principal();if("error" in c)return c.error;
    const rows=await c.db!.prepare("SELECT id,data,created,updated FROM records WHERE owner=? AND kind='anggota' ORDER BY created DESC").bind(c.user!.userId).all();
    const members=(rows.results||[]).flatMap(row=>{try{const d=JSON.parse(String(row.data));return d.qaFixture===true?[{id:String(row.id),name:String(d.name||""),dusun:String(d.dusun||""),phone:String(d.phone||""),status:String(d.status||""),verification:String(d.verification||""),created:String(row.created||"")}]:[]}catch{return []}});
    return json({members});
  }catch{return json({error:"Data anggota uji belum dapat dimuat."},503)}
}
export async function POST(request:Request){
  try{
    const c=await principal();if("error" in c)return c.error;
    if(!sameOrigin(request))return json({error:"Permintaan lintas situs ditolak."},403);
    const raw=await readJsonObject(request,6000),checked=valid(raw);
    if("error" in checked)return json({error:checked.error},400);
    const duplicate=await c.db!.prepare("SELECT id FROM records WHERE owner=? AND kind='anggota' AND data LIKE ? LIMIT 1").bind(c.user!.userId,"%"+String(checked.data!.phone)+"%").first();
    if(duplicate)return json({error:"Nomor WhatsApp tersebut sudah dipakai data uji lain. Gunakan nomor uji berbeda."},409);
    const id=crypto.randomUUID(),now=new Date().toISOString();
    await c.db!.batch([
      c.db!.prepare("INSERT INTO records(id,owner,kind,data,created,updated) VALUES(?,?,?,?,?,?)").bind(id,c.user!.userId,"anggota",JSON.stringify(checked.data),now,now),
      c.db!.prepare("INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),c.user!.userId,"Data sintetis QA dibuat","Anggota uji: "+String(checked.data!.name),now),
    ]);
    return json({ok:true,id,member:{id,name:checked.data!.name,dusun:checked.data!.dusun,phone:checked.data!.phone,status:checked.data!.status,verification:checked.data!.verification}},201);
  }catch(error){
    if(error instanceof RequestBodyError)return json({error:error.message},error.status);
    return json({error:"Anggota uji belum berhasil disimpan. Periksa kembali dan coba lagi."},503);
  }
}
