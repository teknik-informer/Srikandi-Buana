import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../../_components/public/structured-data";
import {getProgramProgress} from "@/lib/public-content";
export const dynamic="force-dynamic";
export const dynamicParams=false;
export function generateStaticParams(){return programs.map(p=>({id:p.id}))}
import {notFound} from "next/navigation";
import Link from "next/link";
import {Check,ArrowLeft,ArrowUpRight} from "lucide-react";
import {programs} from "@/lib/srikandi";
import {PageIntro,PublicCTA} from "../../../_components/public/shared";
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const p=programs.find(p=>p.id===id);if(!p)notFound();return pageMetadata("/program/"+p.id,p.name,p.goal);}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const p=programs.find(p=>p.id===id);if(!p)notFound();const progress=await getProgramProgress();return <><PageSchema path={"/program/"+p.id} title={p.name} description={p.goal} parent={{name:"Program kerja",path:"/program"}}/><PageIntro kicker={`PROGRAM 0${p.id} · ${p.category.toUpperCase()}`} title={p.name} description={p.goal}/><section className="pub-section pub-container pub-detail-grid"><div><Link href="/program" className="pub-text-link"><ArrowLeft size={15}/>Semua program</Link><h2>Ruang lingkup<br/><em>program.</em></h2><div className="pub-task-list">{p.tasks.map((t,i)=><div key={t}><span>0{i+1}</span><h3>{t}</h3><Check size={18}/></div>)}</div><p className="pub-lead">Koordinasi pelaksanaan program mengikuti keputusan musyawarah dan penetapan pengurus kelompok.</p>{p.id==='6'&&<div className="pub-notice"><strong>Pengembangan usaha bersama</strong><p>Pengembangan usaha dilaksanakan setelah penetapan bentuk usaha, permodalan, pembagian peran, dan kesepakatan anggota.</p></div>}</div><aside className="pub-detail-aside"><small>INFORMASI PROGRAM</small><dl><dt>Periode perencanaan</dt><dd>{p.period}</dd><dt>Bidang</dt><dd>{p.category}</dd><dt>Koordinasi</dt><dd>{p.pic}</dd><dt>Pendanaan</dt><dd>{p.funding}</dd><dt>Target keluaran</dt><dd>{p.evidence}</dd><dt>Status program</dt><dd>{progress[p.id]||"Rencana kerja"}</dd><dt>Dasar pelaksanaan</dt><dd>Kesepakatan musyawarah anggota</dd></dl><Link href="/kontak" className="pub-button">Informasi program <ArrowUpRight size={16}/></Link><p>Jadwal dapat berubah sesuai kondisi dan kesiapan kelompok.</p></aside></section><PublicCTA/></>}
