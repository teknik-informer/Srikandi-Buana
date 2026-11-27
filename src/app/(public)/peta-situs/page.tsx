import { pageMetadata } from "@/lib/seo";
import { PageSchema } from "../../_components/public/structured-data";
import Link from "next/link";
import { PageIntro } from "../../_components/public/shared";
import { publicMenus } from "@/lib/navigation-config";
import { getPublicPolicySettings, publicPolicies, policyHref } from "@/lib/public-policies";

export const metadata = pageMetadata("/peta-situs");

export default async function Page() {
  const policySettings = await getPublicPolicySettings();
  const documents = publicPolicies(policySettings);
  return (
    <>
      <PageSchema path="/peta-situs" />
      <PageIntro kicker="NAVIGASI SITUS" title="Temukan halaman yang Anda perlukan." description="Direktori halaman publik Srikandi Buana, dikelompokkan berdasarkan kebutuhan." />
      <section className="pub-section pub-container policy-sitemap">
        <section>
          <h2>Akses utama</h2>
          <Link href="/">Beranda</Link>
          <Link href="/cari">Cari informasi</Link>
          <Link href="/pasang">Pasang aplikasi</Link>
          <Link href="/masuk">Masuk anggota & pengurus</Link>
        </section>
        {publicMenus.filter((menu) => policySettings.enabled || menu.id !== "layanan").map((menu) => (
          <section key={menu.id}>
            <h2>{menu.label}</h2>
            {menu.groups.flatMap((group) => group.items).filter((item) =>
              policySettings.enabled || !["/kebijakan", "/syarat-ketentuan", "/privasi", "/kebijakan-cookie", "/kebijakan-publikasi", "/hak-data-pribadi", "/pedoman-komunitas", "/aksesibilitas", "/pengaduan", "/bantuan", "/pengelola"].includes(item.href)
            ).map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}
          </section>
        ))}
        {policySettings.enabled && (
          <section>
            <h2>Kebijakan & layanan</h2>
            <Link href="/kebijakan">Pusat kebijakan</Link>
            {documents.map((document) => <Link key={document.id} href={policyHref(document.slug)}>{document.title}</Link>)}
          </section>
        )}
      </section>
    </>
  );
}
