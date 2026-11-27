import { pageMetadata } from "@/lib/seo";
import { PageSchema } from "../../_components/public/structured-data";
import Link from "next/link";
import { PageIntro } from "../../_components/public/shared";
import { getPublicPolicySettings, policyHref, publicPolicies } from "@/lib/public-policies";
import { notFound } from "next/navigation";

export const metadata = pageMetadata("/kebijakan");

export default async function Page() {
  const settings = await getPublicPolicySettings();
  if (!settings.enabled) notFound();
  const documents = publicPolicies(settings);
  const preferredCategories = ["Privasi & penggunaan", "Tata kelola informasi", "Layanan & bantuan"];
  const categories = [...preferredCategories, ...Array.from(new Set(documents.map((document) => document.category))).filter((category) => !preferredCategories.includes(category))];
  return (
    <>
      <PageSchema path="/kebijakan" />
      <PageIntro kicker="KEPERCAYAAN & LAYANAN" title="Informasi jelas. Kepercayaan terjaga." description="Temukan kebijakan penggunaan situs, pedoman organisasi, serta kanal bantuan dan permintaan Anda." />
      <section className="pub-section pub-container">
        <div className="policy-hub-intro">
          <p>Kebijakan dan panduan mengikuti layanan yang tersedia di Srikandi Buana. Pilih informasi yang Anda perlukan.</p>
          <span>{documents.length} dokumen tersedia</span>
        </div>
        {categories.map((category) => {
          const items = documents.filter((document) => document.category === category);
          if (!items.length) return null;
          return (
            <section key={category} className="policy-category">
              <h2>{category}</h2>
              <div className="policy-card-grid">
                {items.map((document) => (
                  <Link className="policy-card" key={document.id} href={policyHref(document.slug)}>
                    <span>{document.category}</span>
                    <h3>{document.title}</h3>
                    <p>{document.description}</p>
                    <strong>Baca selengkapnya ↗</strong>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        {!documents.length && <p className="policy-hub-intro">Belum ada dokumen yang diterbitkan.</p>}
        <div className="policy-hub-links">
          <Link href="/faq">Pertanyaan umum</Link>
          <Link href="/peta-situs">Peta situs</Link>
          <Link href="/kontak">Hubungi pengelola</Link>
        </div>
      </section>
    </>
  );
}
