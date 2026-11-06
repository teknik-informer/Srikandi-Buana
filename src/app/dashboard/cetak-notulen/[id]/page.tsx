import {getAuthenticatedUser} from "@/lib/auth";
import {canReadRecord} from "@/lib/permissions";
import {env} from "@/lib/runtime";
import {notFound, redirect} from "next/navigation";
import {dateID} from "@/lib/srikandi";
export const dynamic = "force-dynamic";
export const metadata = {title:"Cetak notulen | Srikandi Buana",robots:{index:false,follow:false}};
type Params = {params:Promise<{id:string}>};
function text(value:unknown){return typeof value==="string"?value.trim():"";}
export default async function CetakNotulen({params}:Params){
 const {id}=await params;
 const user=await getAuthenticatedUser();
 if(!user)redirect("/masuk?return_to="+encodeURIComponent("/dashboard/cetak-notulen/"+encodeURIComponent(id)));
 if(!env.DB || !id || id.length>128)notFound();
 const row=await env.DB.prepare("SELECT id,kind,data,created,updated FROM records WHERE id=? AND owner=? AND kind='musyawarah'").bind(id,user.userId).first();
 if(!row)notFound();
 let data:Record<string,unknown>;
 try{data=JSON.parse(String(row.data));if(!data||Array.isArray(data)||typeof data!=="object")notFound();}catch{notFound();}
 if(!canReadRecord(user,{id:String(row.id),kind:"musyawarah",data}))notFound();
 const status=text(data.status)||"Belum ditetapkan";
 const accepted=["Disepakati","Ditindaklanjuti"].includes(status);
 const date=text(data.date);
 const showDate=/^\d{4}-\d{2}-\d{2}$/.test(date)?dateID(date):"Tanggal belum dikonfirmasi";
 const fields=[
  {label:"Agenda musyawarah",value:text(data.name)},
  {label:"Tanggal kegiatan",value:showDate},
  {label:"Pencatat / penanggung jawab",value:text(data.pic)},
  {label:"Hasil pembahasan & keputusan",value:text(data.notes)},
  {label:"Tindak lanjut & tenggat",value:text(data.followup)},
 ];
 return <main style={{maxWidth:850,margin:"2rem auto",padding:"2rem",fontFamily:"Arial, sans-serif",color:"#172b21",lineHeight:1.6}}>
 <style>{`@page{size:A4;margin:17mm} @media print{.print-controls{display:none!important}main{margin:0!important;padding:0!important;max-width:none!important}}`}</style>
 <div className="print-controls" style={{display:"flex",gap:12,marginBottom:24}}><a href="/dashboard/musyawarah">← Kembali ke musyawarah</a><span>Gunakan menu Print pada browser → Simpan sebagai PDF.</span></div>
 <p style={{fontSize:12,fontWeight:700,letterSpacing:2,margin:0}}>KWT SRIKANDI BUANA · ARSIP INTERNAL</p>
 <h1 style={{fontSize:26,margin:"8px 0 10px"}}>Catatan Musyawarah / Notulen</h1>
 <p style={{background:"#eef5ef",padding:"10px 14px",borderLeft:"3px solid #166534"}}>Status yang tercatat: <strong>{status}</strong>. {accepted?"Status internal berdasarkan catatan pada sistem, bukan tanda tangan elektronik resmi.":"Catatan masih berupa rancangan atau belum ditetapkan. Jangan gunakan sebagai surat keputusan resmi."}</p>
 <section aria-label="Rincian notulen">{fields.map(f=><div key={f.label} style={{padding:"12px 0",borderBottom:"1px solid #dde6df"}}><div style={{fontSize:12,color:"#56665d",fontWeight:700}}>{f.label}</div><div style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginTop:5}}>{f.value||"Belum dicatat"}</div></div>)}</section>
 <footer style={{marginTop:30,fontSize:11,color:"#56665d",borderTop:"1px solid #ddd",paddingTop:15}}>Dokumen ini dicetak dari catatan internal yang dapat berubah. Tidak memuat tanda tangan, nomor surat, atau pengesahan elektronik. Pembaruan catatan terakhir: {text(row.updated)||"tidak tersedia"}. Untuk naskah resmi, gunakan dokumen yang telah disetujui sesuai prosedur organisasi.</footer>
 </main>;
}
