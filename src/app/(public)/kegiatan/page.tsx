import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import {getPublications} from "@/lib/public-content";
import {PageIntro,PublicationCards,PublicCTA} from "../../_components/public/shared";
import {NewsExplorer} from "../../_components/public/explorers";
export const dynamic="force-dynamic";export const metadata=pageMetadata('/kegiatan');
export default async function Page(){const feed=await getPublications();return <><PageSchema path="/kegiatan"/><PageIntro kicker="BELAJAR DAN BERGERAK BERSAMA" title="Dari pertemuan, menjadi langkah nyata." description="Agenda dan catatan kegiatan yang dipublikasikan kelompok. Informasi internal dan daftar peserta tetap tersimpan di ruang pengelola."/><section className="pub-section pub-container"><NewsExplorer events items={feed.items.filter(p=>p.category==='Kegiatan')} unavailable={feed.unavailable}/></section><PublicCTA/></>}
