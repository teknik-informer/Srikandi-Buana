import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import {getProgramProgress} from "@/lib/public-content";
export const dynamic="force-dynamic";
import {PageIntro,ProgramCards,PublicCTA} from "../../_components/public/shared";
import {ProgramExplorer} from "../../_components/public/explorers";
export const metadata=pageMetadata('/program');
export default async function Page(){const progress=await getProgramProgress();return <><PageSchema path="/program"/><PageIntro kicker="PROGRAM KERJA" title="Program pengembangan Srikandi Buana." description="Sembilan prioritas organisasi untuk penguatan anggota, pertanian, pemberdayaan perempuan, dan pengembangan usaha."/><section className="pub-section pub-container"><ProgramExplorer progress={progress}/></section><PublicCTA/></>}