"use client";

import {useCallback,useEffect,useState} from "react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Alert,AlertDescription,AlertTitle} from "@/components/ui/alert";
import {RefreshCw,FileCheck2,ShieldCheck,Clock3,Plus} from "lucide-react";
import {requestJSON} from "@/lib/request-json";
import type {Principal} from "@/lib/permissions";
import type {ReportGroupId} from "@/lib/enterprise-reporting";

type PackageItem={
 id:string;group_id:ReportGroupId;title:string;period_start:string|null;period_end:string|null;
 package_version:number;status:string;snapshot_hash:string;created_by:string;created_at:string;
 verified_by:string|null;verified_at:string|null;verification_note:string;approved_by:string|null;
 approved_at:string|null;approval_note:string;snapshot:{sourceCount?:number;summary?:{total?:number;verified?:number;consentRecorded?:number}};
};
const labels:Record<ReportGroupId,string>={operasional:"Program & kegiatan",keanggotaan:"Keanggotaan",administrasi:"Administrasi & dokumen",keuangan:"Keuangan",usaha:"Usaha & aset",publikasi:"Publikasi"};
const statusLabels:Record<string,string>={draft:"Draf",verified:"Terverifikasi",approved:"Disetujui Ketua",rejected:"Ditolak",superseded:"Digantikan versi baru"};
function canCreate(role:Principal["role"],group:ReportGroupId){
 if(role==="sekretaris")return ["operasional","keanggotaan","administrasi","publikasi"].includes(group);
 if(role==="bendahara")return ["keuangan","usaha"].includes(group);
 return role==="koordinator"&&group==="operasional";
}
function canVerify(role:Principal["role"],group:ReportGroupId){
 if(role==="sekretaris")return ["operasional","keanggotaan","administrasi","publikasi"].includes(group);
 return role==="bendahara"&&["keuangan","usaha"].includes(group);
}
function periodLabel(pkg:PackageItem){
 if(!pkg.period_start&&!pkg.period_end)return "Seluruh periode";
 return (pkg.period_start||"Awal tidak dibatasi")+" – "+(pkg.period_end||"Akhir tidak dibatasi");
}
async function api<T>(url:string,init:RequestInit={}){
 const {response,data}=await requestJSON<T&{error?:string}>(url,init);
 if(!response.ok||!data)throw Error(data?.error||"Layanan paket laporan belum merespons.");
 return data;
}
export default function ReportPackageManager({user}:{user:Principal}){
 const [items,setItems]=useState<PackageItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [group,setGroup]=useState<ReportGroupId>(user.role==="bendahara"?"keuangan":"operasional");
 const [title,setTitle]=useState("");
 const [start,setStart]=useState("");
 const [end,setEnd]=useState("");
 const [busy,setBusy]=useState(false);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const allowed=(["operasional","keanggotaan","administrasi","keuangan","usaha","publikasi"] as ReportGroupId[]).filter(id=>canCreate(user.role,id));
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const data=await api<{packages:PackageItem[]}>("/api/report-packages");setItems(data.packages||[]);}
  catch(e){setItems([]);setError((e as Error).message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function create(){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const result=await api<{id:string}>("/api/report-packages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({groupId:group,title,periodStart:start||null,periodEnd:end||null})});
   setTitle("");setNotice("Draf paket laporan berhasil dibuat. Paket harus diverifikasi sebelum dapat diajukan untuk persetujuan Ketua.");await load();
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }
 async function transition(pkg:PackageItem,action:"verify"|"approve"|"reject"){
  if(busy)return;
  const note=String(notes[pkg.id]||"").trim();
  if(note.length<3){setError("Isi catatan pemeriksaan atau keputusan minimal 3 karakter.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   await api("/api/report-packages",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:pkg.id,action,note})});
   setNotes(current=>({...current,[pkg.id]:""}));
   setNotice(action==="verify"?"Paket telah diverifikasi.":action==="approve"?"Paket telah disetujui Ketua.":"Paket telah ditolak dan riwayatnya tetap disimpan.");
   await load();
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }
 return <section className="space-y-4" aria-labelledby="report-package-title">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="space-y-1">
    <h2 id="report-package-title" className="text-lg font-semibold">Paket laporan resmi</h2>
    <p className="max-w-3xl text-sm text-muted-foreground">Draf yang memiliki snapshot, daftar sumber, versi, dan checksum. Verifikasi domain dan persetujuan Ketua dicatat terpisah.</p>
   </div>
   <Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading||busy}><RefreshCw data-icon="inline-start"/>Muat ulang</Button>
  </div>
  {error&&<Alert variant="destructive"><AlertTitle>Paket laporan belum dapat diproses</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
  {notice&&<Alert><AlertTitle>Perubahan tersimpan</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
  {allowed.length>0&&<Card>
   <CardHeader><CardTitle className="text-base">Susun paket baru</CardTitle><CardDescription>Data akan dibaca ulang dari catatan yang berada dalam cakupan akses akun. Penyusun tidak dapat memverifikasi paketnya sendiri.</CardDescription></CardHeader>
   <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div className="space-y-2"><Label htmlFor="package-group">Kelompok laporan</Label><select id="package-group" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={group} onChange={e=>setGroup(e.target.value as ReportGroupId)}>{allowed.map(id=><option key={id} value={id}>{labels[id]}</option>)}</select></div>
    <div className="space-y-2 sm:col-span-2 xl:col-span-1"><Label htmlFor="package-title">Judul paket</Label><Input id="package-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} placeholder="Contoh: Laporan kegiatan triwulan I"/></div>
    <div className="space-y-2"><Label htmlFor="package-start">Tanggal awal (opsional)</Label><Input id="package-start" type="date" value={start} onChange={e=>setStart(e.target.value)}/></div>
    <div className="space-y-2"><Label htmlFor="package-end">Tanggal akhir (opsional)</Label><Input id="package-end" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div>
    <div className="flex items-end"><Button onClick={()=>void create()} disabled={busy||title.trim().length<3||(start&&end&&start>end)}><Plus data-icon="inline-start"/>Buat draf paket</Button></div>
   </CardContent>
  </Card>}
  <div className="space-y-3">
   <div className="flex items-center justify-between"><h3 className="font-semibold">Riwayat paket</h3><span className="text-xs text-muted-foreground">{items.length} paket</span></div>
   {loading?<Card><CardContent className="py-8 text-sm text-muted-foreground">Memuat paket laporan…</CardContent></Card>:items.length===0?<Card><CardContent className="py-8 text-sm text-muted-foreground">Belum ada paket laporan dalam cakupan akun ini.</CardContent></Card>:items.map(pkg=><Card key={pkg.id}>
    <CardHeader className="gap-2">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <CardTitle className="text-base">{pkg.title}</CardTitle>
      <Badge variant={pkg.status==="approved"?"default":"outline"}>{statusLabels[pkg.status]||pkg.status}</Badge>
     </div>
     <CardDescription>{labels[pkg.group_id]} · Versi {pkg.package_version} · {periodLabel(pkg)}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
     <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1"><FileCheck2 size={14}/> {pkg.snapshot?.sourceCount??0} sumber</span>
      <span className="inline-flex items-center gap-1"><Clock3 size={14}/> {new Date(pkg.created_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}</span>
      <span className="inline-flex items-center gap-1"><ShieldCheck size={14}/> SHA-256 {pkg.snapshot_hash.slice(0,12)}…</span>
     </div>
     {pkg.snapshot?.summary?.total!==undefined&&<p className="text-sm">Ringkasan: {pkg.snapshot.summary.total} catatan{pkg.snapshot.summary.verified!==undefined?" · "+pkg.snapshot.summary.verified+" terverifikasi":""}{pkg.snapshot.summary.consentRecorded!==undefined?" · "+pkg.snapshot.summary.consentRecorded+" persetujuan tercatat":""}</p>}
     {pkg.verification_note&&<p className="text-sm text-muted-foreground">Catatan verifikasi: {pkg.verification_note}</p>}
     {pkg.approval_note&&<p className="text-sm text-muted-foreground">Catatan Ketua: {pkg.approval_note}</p>}
     {((canVerify(user.role,pkg.group_id)&&pkg.status==="draft")||(user.role==="ketua"&&pkg.status==="verified"))&&<div className="space-y-2 border-t pt-3">
      <Label htmlFor={"package-note-"+pkg.id}>{user.role==="ketua"?"Catatan keputusan Ketua":"Catatan verifikasi domain"}</Label>
      <Input id={"package-note-"+pkg.id} value={notes[pkg.id]||""} onChange={e=>setNotes(current=>({...current,[pkg.id]:e.target.value}))} maxLength={2000} placeholder="Tuliskan hasil pemeriksaan atau alasan keputusan"/>
      <div className="flex flex-wrap gap-2">
       {canVerify(user.role,pkg.group_id)&&pkg.status==="draft"&&<Button size="sm" onClick={()=>void transition(pkg,"verify")} disabled={busy}>Verifikasi domain</Button>}
       {user.role==="ketua"&&pkg.status==="verified"&&<><Button size="sm" onClick={()=>void transition(pkg,"approve")} disabled={busy}>Setujui paket</Button><Button size="sm" variant="outline" onClick={()=>void transition(pkg,"reject")} disabled={busy}>Tolak paket</Button></>}
      </div>
     </div>}
    </CardContent>
   </Card>)}
  </div>
  <p className="text-xs leading-relaxed text-muted-foreground">Paket yang disetujui belum otomatis menjadi surat resmi atau dokumen bertanda tangan. Generator PDF/Excel dan distribusi eksternal masih menunggu tahap lanjutan. Migrasi database diperlukan sebelum fitur ini aktif.</p>
 </section>;
}
