import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import {vision,missions} from "@/lib/srikandi";
import {PageIntro,PublicCTA} from "../../_components/public/shared";
import {Sprout} from "lucide-react";
import {getSiteSettings} from "@/lib/site-settings";
export const dynamic="force-dynamic";
export const metadata=pageMetadata('/visi-misi');
export default async function Page(){const site=await getSiteSettings();const publicMissions=[site.mission1,site.mission2,site.mission3,site.mission4,site.mission5,site.mission6];return <><PageSchema path="/visi-misi"/><PageIntro kicker="VISI & MISI" title="Kompak. Mandiri. Terampil. Berdaya." description="Arah organisasi Srikandi Buana dalam penguatan perempuan tani, pengembangan pertanian, dan kemandirian keluarga."/><section className="pub-section pub-container"><div className="pub-vision"><Sprout size={36}/><p className="pub-kicker">VISI SRIKANDI BUANA</p><blockquote>“{site.vision}”</blockquote></div></section><section className="pub-section pub-soft"><div className="pub-container"><p className="pub-kicker">ENAM MISI KAMI</p><h2>Enam misi.<br/><em>Satu arah organisasi.</em></h2><div className="pub-missions">{publicMissions.map((m,i)=><article key={i}><span>0{i+1}</span><h3>{['Organisasi & kebersamaan','Keterampilan perempuan tani','Kemandirian ekonomi','Peran dalam keputusan','Kerja sama transparan','Budaya belajar'][i]}</h3><p>{m}</p></article>)}</div></div></section><PublicCTA/></>}
