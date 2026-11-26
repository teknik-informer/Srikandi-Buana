import { pageMetadata } from "@/lib/seo";
import { PageSchema } from "../_components/public/structured-data";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Files,
  Leaf,
} from "lucide-react";
import {
  ProgramCards,
  PublicationCards,
  PublicCTA,
} from "../_components/public/shared";
import { getSiteSettings } from "@/lib/site-settings";
import { settingImage } from "@/lib/settings-config";
import { getPublications, getProgramProgress } from "@/lib/public-content";
import BerandaSusunan from "../_components/public/beranda-susunan";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("/");

export default async function Home() {
  const [feed, site, progress] = await Promise.all([
    getPublications(),
    getSiteSettings(),
    getProgramProgress(),
  ]);

  const heroImage = settingImage(
    site.heroFileId,
    "/images/pertanian-premium-v1.webp",
  );

  const sections = {
    panel: (
      <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative overflow-hidden rounded-[16px] border border-stone-200 bg-emerald-50">
          <img
            src={heroImage}
            alt=""
            aria-hidden
            width={900}
            height={620}
            loading="lazy"
            className="h-auto w-full object-cover"
          />
        </div>
        <div>
          <ul className="space-y-3">
            {[
              [
                "Akses dari berbagai perangkat",
                "Ruang kerja dapat dibuka melalui desktop, tablet, dan ponsel.",
              ],
              [
                "Kewenangan berbasis peran",
                "Akses informasi dan tindakan mengikuti tanggung jawab pengguna.",
              ],
              [
                "Aktivitas yang tercatat",
                "Aktivitas pengelolaan penting dicatat sesuai modul dan kewenangan.",
              ],
            ].map(([judul, catatan]) => (
              <li
                key={judul}
                className="flex items-start gap-3 rounded-[14px] border border-stone-200 bg-white p-4"
              >
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-800"
                  aria-hidden
                />
                <span>
                  <span className="block text-[13px] font-semibold text-emerald-950">
                    {judul}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-stone-500">
                    {catatan}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/program"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-6 py-3 text-[13px] font-bold text-white transition hover:bg-emerald-800"
            >
              Lihat program kerja <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    ),
    modul: (
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Files,
            judul: "Dokumen organisasi",
            teks: "Informasi kelembagaan dan dokumen acuan.",
            href: "/dokumen",
          },
          {
            icon: Leaf,
            judul: "Galeri kegiatan",
            teks: "Dokumentasi kegiatan yang telah dipublikasikan.",
            href: "/galeri",
          },
          {
            icon: BookOpen,
            judul: "Informasi keanggotaan",
            teks: "Pertanyaan umum dan layanan komunikasi.",
            href: "/faq",
          },
        ].map((item) => (
          <Link
            key={item.judul}
            href={item.href}
            className="group flex items-start gap-3 rounded-[14px] border border-stone-200 bg-white p-5 transition hover:border-emerald-500"
          >
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <item.icon size={19} strokeWidth={1.9} aria-hidden />
            </span>
            <span className="flex-1">
              <strong className="block text-[13.5px] font-semibold text-emerald-950">
                {item.judul}
              </strong>
              <small className="mt-1 block text-[12px] leading-relaxed text-stone-500">
                {item.teks}
              </small>
            </span>
            <ArrowUpRight
              size={17}
              className="mt-1 shrink-0 text-stone-400 transition group-hover:text-emerald-800"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    ),
  };

  return (
    <>
      <PageSchema path="/" />
      <BerandaSusunan
        site={{
          heroTitle: site.heroTitle,
          heroSubtitle: site.heroSubtitle,
          heroCredit: site.heroCredit,
          intro: site.intro,
        }}
        heroImage={heroImage}
        urutan={["panel", "modul"]}
        sections={sections}
      />

      <section className="pub-section pub-soft">
        <div className="pub-container">
          <div className="pub-section-heading">
            <div>
              <p className="pub-kicker">PROGRAM KERJA</p>
              <h2>
                Prioritas organisasi.
                <br />
                <em>Pengembangan anggota.</em>
              </h2>
            </div>
            <div>
              <p>
                Sembilan prioritas mencakup tata kelola kelompok, kebutuhan
                anggota, keterampilan pertanian, literasi keuangan, dan
                pengembangan usaha.
              </p>
              <Link className="pub-text-link" href="/program">
                Lihat seluruh program <ArrowUpRight size={17} aria-hidden />
              </Link>
            </div>
          </div>
          <ProgramCards limit={3} progress={progress} />
        </div>
      </section>

      {feed.items.length > 0 && (
        <section className="pub-section pub-soft">
          <div className="pub-container">
            <div className="pub-section-heading">
              <div>
                <p className="pub-kicker">PUBLIKASI KELOMPOK</p>
                <h2>
                  Kabar &amp;
                  <br />
                  <em>kegiatan terbaru.</em>
                </h2>
              </div>
              <Link className="pub-text-link" href="/kabar">
                Semua publikasi <ArrowUpRight size={17} aria-hidden />
              </Link>
            </div>
            <PublicationCards items={feed.items.slice(0, 3)} />
          </div>
        </section>
      )}

      <PublicCTA />
    </>
  );
}
