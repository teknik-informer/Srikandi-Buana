import { pageMetadata } from "@/lib/seo";
import { PageSchema } from "../../_components/public/structured-data";
import Link from "next/link";
import { PageIntro } from "../../_components/public/shared";
import { publicMenus } from "@/lib/navigation-config";
import { getPublicPolicySettings } from "@/lib/public-policy-store";
import { publicPolicyHref } from "@/lib/public-policies";
export const metadata = pageMetadata("/peta-situs");

export default async function Page() {
  const settings = await getPublicPolicySettings();
  const documents = settings.enabled ? settings.documents.filter(document => document.status === "published") : [];
  return (
    <>
      <PageSchema path="/peta-situs" />
      <PageIntro kicker="NAVIGASI SITUS" title="Temukan halaman yang Anda perlukan." description="Direktori halaman publik Srikandi Buana, dikelompokkan berdasarkan kebutuhan." />
      <section className="pub-section pub-container policy-sitemap">
        <section><h2>Akses utama</h2><Link href="/">Beranda</Link><Link href="/cari">Cari informasi</Link><Link href="/pasang">Pasang aplikasi</Link><Link href="/masuk">Masuk anggota & pengurus</Link></section>
        {publicMenus.map(menu => <section key={menu.id}><h2>{menu.label}</h2>{menu.groups.flatMap(group => group.items).map(item => <Link key={item.id} href={item.href}>{item.label}</Link>)}</section>)}
        {settings.enabled && <section><h2>Kebijakan & layanan</h2><Link href="/kebijakan">Pusat kebijakan</Link>{documents.map(document => <Link key={document.slug} href={publicPolicyHref(document.slug)}>{document.title}</Link>)}</section>}
      </section>
    </>
  );
}
