import { notFound } from "next/navigation";
import { PageSchema } from "./structured-data";
import Link from "next/link";
import { PageIntro } from "./shared";
import { ArticleActions } from "./utilities";
import { getPublicPolicySettings } from "@/lib/public-policies";
import { getSiteSettings } from "@/lib/site-settings";
import { contactLink } from "@/lib/contact-topics";

export default async function InformationPage({ slug, path }: { slug: string; path?: string }) {
  const [settings, site] = await Promise.all([getPublicPolicySettings(), getSiteSettings()]);
  const page = settings.documents.find((document) => document.slug === slug && document.status === "published");
  if (!settings.enabled || !page) notFound();
  const route = path || "/" + slug;
  const updated = page.updatedAt || page.effectiveDate;
  return (
    <>
      <PageSchema path={route} />
      <PageIntro kicker={page.category.toUpperCase()} title={page.title} description={page.description} />
      <section className="pub-container pub-section policy-layout">
        <aside className="policy-toc">
          <Link href="/kebijakan" className="pub-text-link">← Pusat kebijakan</Link>
          <p>DI HALAMAN INI</p>
          <nav aria-label="Daftar isi kebijakan">
            {page.sections.map((section, index) => (
              <a key={section.id} href={"#" + section.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>{section.title}
              </a>
            ))}
          </nav>
          <div className="policy-version">
            <strong>Versi {page.version}</strong>
            <span>Berlaku {page.effectiveDate}</span>
            <span>Diperbarui {updated}</span>
          </div>
        </aside>
        <article className="policy-article">
          <div className="pub-reading-meta">
            <span>Berlaku pada layanan Srikandi Buana · {page.effectiveDate}</span>
            <ArticleActions title={page.title} label="Bagikan halaman" />
          </div>
          {page.sections.map((section) => (
            <section id={section.id} key={section.id} className="policy-section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {section.items?.length ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </section>
          ))}
          {["privasi", "hak-data-pribadi"].includes(slug) && (
            <p className="policy-reference">
              Rujukan hak data pribadi: <a href="https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/" target="_blank" rel="noopener noreferrer">UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, khususnya Pasal 5–9</a>.
            </p>
          )}
          <section className="policy-contact">
            <p className="pub-kicker">KANAL PENGELOLA</p>
            <h2>KWT Srikandi Buana</h2>
            <p>{site.address}</p>
            {site.email && <p><a href={"mailto:" + site.email}>{site.email}</a></p>}
            {site.phone && <p>{site.phone}</p>}
            <p>Gunakan formulir untuk mengirim keperluan Anda dan memperoleh referensi pesan.</p>
            <Link className="pub-button" href={contactLink(page.topic)}>Sampaikan {page.topic.toLowerCase()}</Link>
            <div className="policy-related">
              <Link href="/syarat-ketentuan">Syarat & ketentuan</Link>
              <Link href="/privasi">Kebijakan privasi</Link>
              <Link href="/pengaduan">Pengaduan</Link>
            </div>
          </section>
        </article>
      </section>
    </>
  );
}
