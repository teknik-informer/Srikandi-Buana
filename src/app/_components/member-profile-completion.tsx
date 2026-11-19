"use client";
import {useState,type FormEvent} from "react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {CheckCircle2,ChevronDown,LoaderCircle,UserRoundPen} from "lucide-react";

const fields=[
 {key:"education",label:"Pendidikan terakhir",placeholder:"Contoh: SMP / SMA / sederajat"},
 {key:"occupation",label:"Pekerjaan atau kegiatan utama",placeholder:"Contoh: Petani, pengolah hasil, usaha rumahan"},
 {key:"skills",label:"Keahlian",placeholder:"Keahlian yang dimiliki",multiline:true},
 {key:"farmArea",label:"Luas lahan garapan",placeholder:"Contoh: 0,25 hektare"},
 {key:"commodities",label:"Komoditas utama",placeholder:"Contoh: Kopi, cabai, sayuran"},
 {key:"experience",label:"Pengalaman pertanian dan usaha",placeholder:"Pengalaman, peran, atau kegiatan yang pernah dijalankan",multiline:true},
 {key:"trainingHistory",label:"Pelatihan dan sertifikasi",placeholder:"Pelatihan, pendampingan, atau sertifikasi yang pernah diikuti",multiline:true},
] as const;

export default function MemberProfileCompletion({profile,onSaved}:{profile:Record<string,unknown>;onSaved:()=>Promise<unknown>}){
 const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const completed=fields.filter(field=>String(profile[field.key]||"").trim()).length;
 const percent=Math.round(completed/fields.length*100);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving)return;setSaving(true);setError("");setSuccess("");
  const form=event.currentTarget;
  const values=Object.fromEntries(new FormData(form).entries()) as Record<string,string>;
  values.bio=String(profile.bio||"");
  try{
   const response=await fetch("/api/member/profile",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(values)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Profil belum dapat disimpan.");
   await onSaved();setEditing(false);setSuccess(result.profileCompleted?"Profil dan CV berhasil dilengkapi.":"Perubahan profil berhasil disimpan.");
  }catch(cause){setError(cause instanceof Error?cause.message:"Koneksi terputus. Coba kembali.");}
  finally{setSaving(false);}
 }
 return <div className="mt-5 rounded-xl border bg-muted/15 p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><div className="flex items-center gap-2"><UserRoundPen className="size-4 text-primary"/><p className="font-medium">Profil pribadi & CV anggota</p></div><p className="mt-1 text-xs text-muted-foreground">Lengkapi riwayat pendidikan, keahlian, pengalaman, dan potensi usaha Anda.</p></div>
   <Badge variant={percent===100?"secondary":"outline"}>{percent===100?"Profil lengkap":String(completed)+"/"+fields.length+" data terisi"}</Badge>
  </div>
  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{width:percent+"%"}}/></div>
  {success&&<p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>}
  {!editing?<Button type="button" size="sm" variant="outline" className="mt-4" onClick={()=>{setError("");setEditing(true)}}>{percent===100?"Perbarui profil":"Lengkapi profil & CV"}<ChevronDown className="ml-2 size-4"/></Button>:<form className="mt-4 space-y-4" onSubmit={submit} aria-busy={saving}>
   <div className="grid gap-3 sm:grid-cols-2">
    {fields.map(field=><label key={field.key} className="grid gap-1.5 text-sm"><span className="font-medium">{field.label}</span>{field.multiline?<Textarea name={field.key} rows={3} maxLength={1200} defaultValue={String(profile[field.key]||"")} placeholder={field.placeholder} disabled={saving}/>:<Input name={field.key} maxLength={1200} defaultValue={String(profile[field.key]||"")} placeholder={field.placeholder} disabled={saving}/>}</label>)}
   </div>
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   <p className="text-xs text-muted-foreground">Email, nomor telepon, status, dan data verifikasi tetap dikelola melalui alur identitas resmi. Formulir ini hanya memperbarui profil pribadi.</p>
   <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={()=>setEditing(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving?<><LoaderCircle className="mr-2 size-4 animate-spin"/>Menyimpan…</>:<><CheckCircle2 className="mr-2 size-4"/>Simpan profil</>}</Button></div>
  </form>}
 </div>;
}
