"use client";

import {useCallback,useEffect,useState,type FormEvent} from "react";
import {requestJSON} from "@/lib/request-json";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Field,FieldGroup,FieldLabel} from "@/components/ui/field";
import {NativeSelect,NativeSelectOption} from "@/components/ui/native-select";
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card";
import {Alert,AlertDescription,AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from "@/components/ui/table";
import {Plus,RefreshCw,ShieldCheck,Users} from "lucide-react";

type Member={id:string;name:string;dusun:string;phone:string;status:string;verification:string;created:string};
export default function QaMemberLab(){
 const [members,setMembers]=useState<Member[]>([]);
 const [name,setName]=useState("Anggota Uji 01");
 const [dusun,setDusun]=useState("Gintung");
 const [phone,setPhone]=useState("081234567801");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const {response,data}=await requestJSON<{members?:Member[];error?:string}>("/api/qa/members",{cache:"no-store"});
   if(!response.ok)throw Error(data?.error||"Daftar anggota uji tidak dapat dimuat.");
   setMembers(Array.isArray(data?.members)?data.members:[]);
  }catch(e){setError(e instanceof Error?e.message:"Koneksi QA gagal.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError("");setNotice("");
  try{
   const {response,data}=await requestJSON<{ok?:boolean;error?:string;member?:Member}>("/api/qa/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,dusun,phone})});
   if(!response.ok)throw Error(data?.error||"Anggota uji belum tersimpan.");
   setNotice("Anggota uji berhasil dibuat di database Preview QA. Data ini bukan data organisasi.");
   setName("Anggota Uji "+String(members.length+2).padStart(2,"0"));
   const digits=phone.replace(/\D/g,"");const n=Number(digits.slice(-3))+1;setPhone("081234567"+String(n).padStart(3,"0"));
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Penyimpanan gagal.");}
  finally{setSaving(false);}
 }
 return <section className="workspace workspace-page space-y-6" aria-labelledby="qa-member-title">
  <div className="workspace-page-header">
   <div className="min-w-0">
    <p className="text-xs font-semibold tracking-[.16em] text-muted-foreground">ARSITEK SISTEM · DATA SINTETIS</p>
    <h1 id="qa-member-title" className="mt-2 text-2xl font-semibold tracking-tight">Laboratorium Anggota QA</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Buat data anggota sintetis untuk menguji formulir keanggotaan, undangan akun, pencocokan WhatsApp, dan akses setiap profil. Data disimpan hanya di database Preview dan diberi penanda QA.</p>
   </div>
   <Badge variant="outline">Preview QA saja</Badge>
  </div>
  <Alert>
   <ShieldCheck className="size-4"/>
   <AlertTitle>Isolasi data aktif</AlertTitle>
   <AlertDescription>Nama wajib diawali “Anggota Uji”. Data ini tidak ditampilkan sebagai data anggota organisasi dan tidak dapat dibuat melalui endpoint ini di Production.</AlertDescription>
  </Alert>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
   <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5"/>Tambah anggota uji</CardTitle><CardDescription>Nomor WhatsApp harus nomor sintetis khusus pengujian, bukan nomor pribadi anggota.</CardDescription></CardHeader>
    <CardContent>
     <form onSubmit={submit} className="space-y-4">
      <FieldGroup>
       <Field><FieldLabel htmlFor="qa-member-name">Nama anggota uji</FieldLabel><Input id="qa-member-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Anggota Uji 01" required maxLength={100}/></Field>
       <Field><FieldLabel htmlFor="qa-member-dusun">Dusun uji</FieldLabel><NativeSelect id="qa-member-dusun" value={dusun} onChange={e=>setDusun(e.target.value)}><NativeSelectOption value="Gintung">Gintung</NativeSelectOption><NativeSelectOption value="Ngleri">Ngleri</NativeSelectOption><NativeSelectOption value="Ngliwu">Ngliwu</NativeSelectOption><NativeSelectOption value="Craken">Craken</NativeSelectOption></NativeSelect></Field>
       <Field><FieldLabel htmlFor="qa-member-phone">Nomor WhatsApp sintetis</FieldLabel><Input id="qa-member-phone" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="081234567801" required maxLength={24}/></Field>
      </FieldGroup>
      <div className="rounded-lg border p-3 text-sm text-muted-foreground">Untuk memudahkan pengujian akun, data akan dibuat dengan status <strong>Aktif</strong> dan <strong>Terverifikasi</strong>. Ini hanya kondisi fixture QA, bukan pengesahan keanggotaan nyata.</div>
      <Button type="submit" disabled={saving} className="w-full">{saving?<RefreshCw className="size-4 animate-spin"/>:<Plus className="size-4" />}{saving?"Menyimpan…":"Simpan anggota uji"}</Button>
     </form>
    </CardContent>
   </Card>
   <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5"/>Data anggota uji</CardTitle><CardDescription>{members.length} data sintetis dalam lingkungan Preview ini.</CardDescription></CardHeader>
    <CardContent className="space-y-3">
     {error&&<Alert variant="destructive"><AlertTitle>Belum berhasil</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
     {notice&&<Alert><AlertTitle>Data tersimpan</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
     <div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?"size-4 animate-spin":"size-4"}/>Muat ulang</Button></div>
     <div className="overflow-x-auto">
      <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Dusun</TableHead><TableHead>WhatsApp</TableHead><TableHead>Status QA</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={4}>Memuat data QA…</TableCell></TableRow>:members.length===0?<TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Belum ada anggota uji. Buat data pertama melalui formulir.</TableCell></TableRow>:members.map(member=><TableRow key={member.id}><TableCell className="font-medium">{member.name}<div className="text-xs text-muted-foreground">{member.id.slice(0,8)}</div></TableCell><TableCell>{member.dusun}</TableCell><TableCell className="whitespace-nowrap">{member.phone}</TableCell><TableCell><Badge variant="outline">Aktif · Terverifikasi</Badge></TableCell></TableRow>)}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>
  </div>
 </section>;
}
