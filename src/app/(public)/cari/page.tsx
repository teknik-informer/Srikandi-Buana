import Link from "next/link";
import { PageIntro } from "../../_components/public/shared";
import { staticSearch } from "@/lib/site-content";
import { getPublications } from "@/lib/public-content";
import { pageMetadata } from "@/lib/seo";
import { getPublicPolicySettings, publicPolicies, policyHref } from "@/lib/public-policies";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("/cari", "Cari Informasi", "Cari halaman, program, dan publikasi Srikandi Buana.", { noindex: true });

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const q = String(params.q || "").trim().slice(0, 150);
  const [feed, policySettings] = await Promise.all([getPublications(), getPublicPolicySettings()]);
  const hiddenPolicyPaths = ["/kebijakan", "/privasi", "/syarat-ketentuan", "/kebijakan-cookie", "/kebijakan-publikasi", "/pedoman-komunitas", "/pengaduan", "/hak-data-pribadi", "/aksesibilitas", "/bantuan", "/pengelola"];
  const policyEntries = publicPolicies(policySettings).map((document) => ({
    title: document.title, description: document.description, href: policyHref(document.slug), group: document.category,
  }));
  const all = [
    ...staticSearch.filter((entry) => !hiddenPolicyPaths.includes(entry.href)),
    ...(policySettings.enabled ? policyEntries : []),
    ...feed.items.map((item) => ({ title: item.title, description: item.summary, href: "/kabar/" + item.id, group: item.category })),
  ];
  const results = all.filter((entry) => q && (entry.title + " " + entry.description + " " + entry.group).toLocaleLowerCase("id-ID").includes(q.toLocaleLowerCase("id-ID")));
  const pages = Math.max(1, Math.ceil(results.length / 12));
  const page = Math.min(pages, Math.max(1, parseInt(String(params.page || "1"), 10) || 1));
  const href = (number: number) => "/cari?q=" + encodeURIComponent(q) + "&page=" + number;
  return (
    <>
      <PageIntro kicker="PENCARIAN SITUS" title="Temukan informasi yang Anda perlukan." description="Cari informasi publik, program, bantuan dan kebijakan Srikandi Buana." />
      <section className="pub-section pub-container search-page">
        <form action="/cari" method="get">
          <label htmlFor="site-search">Kata pencarian</label>
          <div><input type="search" id="site-search" name="q" defaultValue={q} maxLength={150} placeholder="Cari program, anggota, privasi…" /><button className="pub-button" type="submit">Cari</button></div>
        </form>
        <p className="search-total">{q ? results.length + ' hasil untuk “' + q + '”' : "Masukkan kata pencarian untuk melihat hasil."}</p>
        {feed.unavailable && <p className="section-note">Publikasi terbaru belum dapat dimuat. Hasil halaman dan program tetap tersedia.</p>}
        <div className="search-result-list">
          {results.slice((page - 1) * 12, page * 12).map((result) => (
            <Link key={result.href} href={result.href}>
              <small>{result.group}</small><h2>{result.title}</h2><p>{result.description}</p><span>Buka halaman ↗</span>
            </Link>
          ))}
        </div>
        {q && !results.length && <p>Belum ada hasil. Coba istilah lain atau <Link href="/kontak">hubungi pengelola</Link>.</p>}
        {pages > 1 && <nav className="policy-hub-links" aria-label="Halaman hasil pencarian">{page > 1 && <Link href={href(page - 1)}>← Sebelumnya</Link>}<span>{page} / {pages}</span>{page < pages && <Link href={href(page + 1)}>Berikutnya →</Link>}</nav>}
      </section>
    </>
  );
}
