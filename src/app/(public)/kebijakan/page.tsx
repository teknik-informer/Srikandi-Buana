import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import Link from "next/link";
import {PageIntro} from "../../_components/public/shared";
import {getPublicPolicyDocuments} from "@/lib/policy-documents";
export const metadata=pageMetadata("/kebijakan");
export const dynamic="force-dynamic";
export default async function Page() {
  const documents = await getPublicPolicyDocuments();
  const categories = ["Privasi & penggunaan","Tata kelola informasi","Legalitas situs","Layanan & bantuan"];
  const updated = documents.reduce((latest,doc)=>doc.updatedAt>latest?doc.updatedAt:latest,"2026-11-02");
  const updatedLabel = new Date(updated+"T00:00:00.000Z").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
  return <>
    <PageSchema path="/kebijakan"/>
    <PageIntro kicker="KEPERCAYAAN & LAYANAN" title="Informasi jelas. Kepercayaan terjaga." description="Temukan kebijakan penggunaan situs, pelindungan data, status legalitas, dan kanal layanan Srikandi Buana."/>
    <section className="pub-section pub-container">
      <div className="policy-hub-intro"><p>Dokumen resmi ditampilkan setelah diperiksa dan diterbitkan oleh pengelola. Dokumen draf dan nonaktif tidak ditampilkan kepada pengunjung.</p><span>Pembaruan terakhir {updatedLabel}</span></div>
      {categories.map(category=>{
        const entries=documents.filter(doc=>doc.category===category);
        return entries.length ? <section key={category} className="policy-category">
          <h2>{category}</h2>
          <div className="policy-card-grid">{entries.map(doc=><Link className="policy-card" key={doc.slug} href={"/"+doc.slug}>
            <span>Versi {doc.version}</span><h3>{doc.title}</h3><p>{doc.description}</p><strong>Baca selengkapnya ↗</strong>
          </Link>)}</div>
        </section> : null;
      })}
      <div className="policy-hub-links"><Link href="/faq">Pertanyaan umum</Link><Link href="/peta-situs">Peta situs</Link><Link href="/kontak">Hubungi pengelola</Link></div>
    </section>
  </>;
}
