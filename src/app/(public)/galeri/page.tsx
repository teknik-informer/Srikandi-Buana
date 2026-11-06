import {pageMetadata} from "@/lib/seo";
import {PageSchema} from "../../_components/public/structured-data";
import {getSiteSettings} from "@/lib/site-settings";
import {getGallery} from "@/lib/public-content";
import {PageIntro,PublicCTA} from "../../_components/public/shared";
import {GalleryExplorer} from "../../_components/public/explorers";
export const dynamic='force-dynamic';export const metadata=pageMetadata('/galeri');
export default async function Page(){const [gallery,site]=await Promise.all([getGallery(),getSiteSettings()]);return <><PageSchema path="/galeri"/><PageIntro kicker="GALERI KEGIATAN" title="Dokumentasi Srikandi Buana." description={site.galleryIntro||"Foto kegiatan, pertemuan, dan program kelompok yang telah dipublikasikan."}/><section className="pub-section pub-container"><GalleryExplorer items={gallery.items} unavailable={gallery.unavailable}/></section><PublicCTA/></>}
