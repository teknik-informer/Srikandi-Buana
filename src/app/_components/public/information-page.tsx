import { notFound } from "next/navigation";
import {PageSchema} from "./structured-data";
import Link from "next/link";
import {PageIntro} from "./shared";
import {ArticleActions} from "./utilities";
import {getPublicPolicyDocument,getPublicPolicyDocuments} from "@/lib/policy-documents";
import {getSiteSettings} from "@/lib/site-settings";
import {contactLink} from "@/lib/contact-topics";

export default async function InformationPage({slug}:{slug:string}) {
  const [page, site, visibleDocuments] = await Promise.all([getPublicPolicyDocument(slug), getSiteSettings(), getPublicPolicyDocuments()]);
  if (!page) notFound();
  const visibleSlugs = new Set(visibleDocuments.map((document) => document.slug));
  const updated = new Date(page.updatedAt + "T00:00:00.000Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const effective = new Date(page.effectiveDate + "T00:00:00.000Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return <>
    <PageSchema path={"/"+slug}/>
    <PageIntro kicker={page.category.toUpperCase()} title={page.title} description={page.description}/>
    <section className="pub-container pub-section policy-layout">
      <aside className="policy-toc">
        <Link href="/kebijakan" className="pub-text-link">← Pusat kebijakan</Link>
        <p>DI HALAMAN INI</p>
        <nav aria-label="Daftar isi kebijakan">
          {page.sections.map((section,index)=><a key={section.id} href={"#"+section.id}><span>{String(index+1).padStart(2,"0")}</span>{section.title}</a>)}
        </nav>
        <div className="policy-version"><strong>Versi {page.version}</strong><span>Diperbarui {updated}</span></div>
      </aside>
      <article className="policy-article">
        <div className="pub-reading-meta">
          <span>Berlaku sejak {effective} · Versi {page.version}</span>
          <ArticleActions title={page.title} label="Bagikan halaman"/>
        </div>
        {page.sections.map(section=><section id={section.id} key={section.id} className="policy-section">
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
          {section.items?.length ? <ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul> : null}
        </section>)}
        {["privasi","hak-data-pribadi"].includes(slug) && <p className="policy-reference">Rujukan hak data pribadi: <a href="https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%20nomor%2027%20tahun%202022" target="_blank" rel="noopener noreferrer">UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi</a>.</p>}
        {slug === "legalitas" && <p className="policy-reference">Rujukan PSE: <a href="https://pse.komdigi.go.id/pertanyaan-umum" target="_blank" rel="noopener noreferrer">Portal resmi Pendaftaran PSE Lingkup Privat Komdigi</a>.</p>}
        <section className="policy-contact">
          <p className="pub-kicker">KANAL PENGELOLA</p>
          <h2>KWT Srikandi Buana</h2>
          <p>{site.address}</p>
          {site.email && <p><a href={"mailto:"+site.email}>{site.email}</a></p>}
          {site.phone && <p>{site.phone}</p>}
          <p>Gunakan formulir untuk menyampaikan permintaan dan memperoleh referensi pesan.</p>
          <Link className="pub-button" href={contactLink(page.topic)}>Sampaikan {page.topic.toLowerCase()}</Link>
          <div className="policy-related">
            <Link href="/kebijakan">Pusat kebijakan</Link>
            {visibleSlugs.has("privasi") && <Link href="/privasi">Kebijakan privasi</Link>}
            {visibleSlugs.has("pengaduan") && <Link href="/pengaduan">Pengaduan</Link>}
          </div>
        </section>
      </article>
    </section>
  </>;
}
