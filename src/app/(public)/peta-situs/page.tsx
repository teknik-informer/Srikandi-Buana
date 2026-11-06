import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import Link from 'next/link';
import {PageIntro} from '../../_components/public/shared';
import {publicMenus} from '@/lib/navigation-config';
import {informationPages} from '@/lib/information-pages';
export const metadata=pageMetadata('/peta-situs');
export default function Page(){return <><PageSchema path="/peta-situs"/><PageIntro kicker="NAVIGASI SITUS" title="Temukan halaman yang Anda perlukan." description="Direktori halaman publik Srikandi Buana, dikelompokkan berdasarkan kebutuhan."/><section className="pub-section pub-container policy-sitemap"><section><h2>Akses utama</h2><Link href="/">Beranda</Link><Link href="/cari">Cari informasi</Link><Link href="/pasang">Pasang aplikasi</Link><Link href="/masuk">Masuk anggota & pengurus</Link></section>{publicMenus.map(m=><section key={m.id}><h2>{m.label}</h2>{m.groups.flatMap(g=>g.items).map(i=><Link key={i.id} href={i.href}>{i.label}</Link>)}</section>)}<section><h2>Kebijakan & layanan</h2><Link href="/kebijakan">Pusat kebijakan</Link>{Object.entries(informationPages).map(([slug,p])=><Link key={slug} href={'/'+slug}>{p.title}</Link>)}</section></section></>}
