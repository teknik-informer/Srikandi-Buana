import { pageMetadata } from "@/lib/seo";
import { PageSchema } from "../../_components/public/structured-data";
import Link from "next/link";
import { PageIntro } from "../../_components/public/shared";
import { getPublicPolicySettings } from "@/lib/public-policy-store";
import { publicPolicyHref } from "@/lib/public-policies";
export const metadata = pageMetadata("/kebijakan");

export default async function Page() {
  const settings = await getPublicPolicySettings();
  const documents = settings.enabled ? settings.documents.filter(document => document.status === "published") : [];
  if (!settings.enabled) return <PageIntro kicker="KEPERCAYAAN & LAYANAN" title="Pusat kebijakan tidak tersedia." description="Informasi kebijakan situs sedang tidak ditampilkan oleh pengelola." />;
  const categories = [...new Set(documents.map(document => document.category))];
  return (
    <>
      <PageSchema path="/kebijakan" />
      <PageIntro kicker="KEPERCAYAAN & LAYANAN" title="Informasi jelas. Kepercayaan terjaga." description="Temukan kebijakan penggunaan situs, pedoman organisasi, serta kanal bantuan dan permintaan Anda." />
      <section className="pub-section pub-container">
        <div className="policy-hub-intro">
          <p>Kebijakan dan panduan mengikuti layanan yang tersedia di Srikandi Buana. Pilih informasi yang Anda perlukan.</p>
          <span>{documents.length} dokumen diterbitkan</span>
        </div>
        {categories.map(category => (
          <section key={category} className="policy-category">
            <h2>{category}</h2>
            <div className="policy-card-grid">
              {documents.filter(document => document.category === category).map(document => (
                <Link className="policy-card" key={document.slug} href={publicPolicyHref(document.slug)}>
                  <span>{document.category}</span>
                  <h3>{document.title}</h3>
                  <p>{document.description}</p>
                  <strong>Baca selengkapnya ↗</strong>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {documents.length === 0 && <p className="section-note">Belum ada dokumen yang diterbitkan.</p>}
        <div className="policy-hub-links"><Link href="/faq">Pertanyaan umum</Link><Link href="/peta-situs">Peta situs</Link><Link href="/kontak">Hubungi pengelola</Link></div>
      </section>
    </>
  );
}
