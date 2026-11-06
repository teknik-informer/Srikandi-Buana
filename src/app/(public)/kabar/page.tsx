import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import {getPublications} from "@/lib/public-content";
import {PageIntro,PublicationCards,PublicCTA} from "../../_components/public/shared";
import {NewsExplorer} from "../../_components/public/explorers";
export const dynamic="force-dynamic";export const metadata=pageMetadata('/kabar');
export default async function Page(){const feed=await getPublications();return <><PageSchema path="/kabar"/><PageIntro kicker="CATATAN PERJALANAN" title="Kabar, pembelajaran, dan cerita bersama." description="Informasi yang diterbitkan pengelola tentang langkah, gagasan, dan perkembangan Srikandi Buana."/><section className="pub-section pub-container"><NewsExplorer items={feed.items} unavailable={feed.unavailable}/></section><PublicCTA/></>}
