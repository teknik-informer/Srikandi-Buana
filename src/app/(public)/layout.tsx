import {OrganizationSchema} from "../_components/public/structured-data";
import BrandLogo from "@/components/brand-logo";
import SocialLinks from "../_components/public/social-links";
import ConnectionStatus from "../_components/connection-status";
import Link from "next/link";
import {ArrowUpRight,MapPin} from "lucide-react";
import PublicNavigation from "../_components/public/navigation";
import "./public.css";
import {getSiteSettings} from "@/lib/site-settings";
import {settingImage} from "@/lib/settings-config";
import {getPublications} from "@/lib/public-content";
import {getPublicPolicyDocuments} from "@/lib/policy-documents";
import {Breadcrumbs,BackToTop} from "../_components/public/utilities";

export const dynamic="force-dynamic";

export default async function PublicLayout({children}:{children:React.ReactNode}) {
  const [feed,site,policies]=await Promise.all([getPublications(),getSiteSettings(),getPublicPolicyDocuments()]);
  const policySlugs=new Set(policies.map((document)=>document.slug));
  return <div className="public-site">
    <OrganizationSchema site={site}/>
    <ConnectionStatus/>
    <a href="#public-main" className="skip-link">Langsung ke isi</a>
    <div className="public-topline">Kelompok Wanita Tani · Ngadimulyo, Kedu, Temanggung</div>
    <PublicNavigation
      logoUrl={site.logoFileId?settingImage(site.logoFileId,""):undefined}
      publications={feed.items.map(item=>({title:item.title,description:item.summary,href:"/kabar/"+item.id,group:item.category}))}
      policyDocuments={policies.map(doc=>({slug:doc.slug,title:doc.title,description:doc.description,category:doc.category}))}
    />
    <main id="public-main"><Breadcrumbs/>{children}</main>
    <footer className="public-footer">
      <div className="pub-container">
        <div className="pub-footer-top">
          <div className="pub-footer-brand">
            <Link href="/" className="public-brand"><BrandLogo src={site.logoFileId?settingImage(site.logoFileId,""):undefined}/></Link>
            <p>Kelompok Wanita Tani untuk pengembangan pertanian, pemberdayaan perempuan, dan kemandirian ekonomi keluarga.</p>
            <span className="pub-footer-address"><MapPin size={15}/><span>{site.address}</span></span>
            <SocialLinks site={site}/>
          </div>
          <div>
            <h3>Organisasi</h3>
            <Link href="/profil">Tentang Srikandi Buana</Link>
            <Link href="/visi-misi">Visi & misi</Link>
            <Link href="/program">Program kerja</Link>
            <Link href="/kemitraan">Kemitraan</Link>
            <Link href="/produk">Produk kelompok</Link>
          </div>
          <div>
            <h3>Informasi</h3>
            <Link href="/kegiatan">Kegiatan</Link>
            <Link href="/kabar">Kabar kelompok</Link>
            <Link href="/dokumen">Dokumen organisasi</Link>
            <Link href="/galeri">Galeri dokumentasi</Link>
            <Link href="/faq">Pertanyaan umum</Link>
            <Link href="/kontak">Hubungi kami <ArrowUpRight size={12}/></Link>
          </div>
          <div>
            <h3>Kebijakan & bantuan</h3>
            <Link href="/kebijakan">Pusat kebijakan & legalitas</Link>
            {policySlugs.has("pengaduan") && <Link href="/pengaduan">Pengaduan & pelaporan</Link>}
            {policySlugs.has("bantuan") && <Link href="/bantuan">Pusat bantuan</Link>}
            <Link href="/pasang">Pasang aplikasi</Link>
          </div>
        </div>
        <div className="pub-footer-bottom">
          <span>© {new Date().getFullYear()} KWT Srikandi Buana</span>
          <div>{policySlugs.has("aksesibilitas") && <Link href="/aksesibilitas">Aksesibilitas</Link>}<Link href="/peta-situs">Peta situs</Link><a href="/dashboard">Ruang pengelola <ArrowUpRight size={12}/></a></div>
        </div>
      </div>
    </footer>
    <BackToTop/>
  </div>;
}
