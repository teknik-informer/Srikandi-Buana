import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import {PageIntro,PublicCTA} from "../../_components/public/shared";
import {FAQExplorer} from "../../_components/public/explorers";
export const metadata=pageMetadata('/faq');
export default function Page(){return <><PageSchema path="/faq"/><PageIntro kicker="RUANG UNTUK MEMAHAMI" title="Informasi yang jelas. Langkah yang lebih yakin." description="Temukan jawaban seputar kelompok, keanggotaan, program, usaha bersama, kemitraan dan penggunaan data."/><section className="pub-section pub-container"><FAQExplorer/></section><PublicCTA/></>}
