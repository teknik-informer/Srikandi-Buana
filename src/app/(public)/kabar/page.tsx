import Link from "next/link";
import type { Metadata } from "next";
import { NEWS } from "@/data/content";
import { formatDateID } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { halamanPublik, teksDari } from "@/lib/public-cms-server";

export const metadata: Metadata = {
  title: "Kabar & Artikel",
  description: "Berita, artikel, dan pengumuman dari KWT Srikandi Buana.",
};

export default async function KabarPage({ searchParams }: { searchParams: Promise<{ jenis?: string }> }) {
  const { jenis } = await searchParams;

  // Judul & pembuka dari Website Studio.
  const halaman = await halamanPublik("/kabar");
  const judul = teksDari(halaman.blocks, "news-list", "headline", "Kabar & artikel");
  const pembuka = teksDari(
    halaman.blocks,
    "news-list",
    "subheadline",
    "Catatan dari lapangan, pengumuman organisasi, dan tulisan pendek tentang kerja tani.",
  );
  const published = NEWS.filter((n) => n.status === "published").filter((n) => !jenis || n.kind === jenis);
  const [lead, ...rest] = published;

  return (
    <div className="sb-shell py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="sb-label mb-2">Informasi</div>
          {/* Judul & pembuka dari Website Studio, bukan teks tetap. */}
          <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">{judul}</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] text-muted">{pembuka}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/kabar" className={`sb-chip ${!jenis ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Semua</Link>
          <Link href="/kabar?jenis=berita" className={`sb-chip ${jenis === "berita" ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Berita</Link>
          <Link href="/kabar?jenis=artikel" className={`sb-chip ${jenis === "artikel" ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Artikel</Link>
          <Link href="/kabar?jenis=pengumuman" className={`sb-chip ${jenis === "pengumuman" ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Pengumuman</Link>
        </div>
      </div>

      {lead ? (
        <Link href={`/kabar/${lead.slug}`} className="group mt-8 block">
          <div className="grid gap-6 overflow-hidden rounded-[20px] border border-line bg-white lg:grid-cols-2">
            <div className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lead.image} alt={lead.title} className="h-full min-h-[260px] w-full object-cover transition duration-500 group-hover:scale-[1.02]" width={900} height={650} />
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                <span className="text-accent-700">{lead.kind}</span>
                <span className="text-muted2">·</span>
                <span className="font-medium normal-case tracking-normal text-muted">{formatDateID(lead.date)}</span>
              </div>
              <h2 className="mt-3 font-display text-[26px] leading-snug font-semibold text-ink group-hover:text-primary-800 sm:text-[30px]">{lead.title}</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">{lead.excerpt}</p>
              <div className="mt-5 text-[12px] font-semibold text-primary-700">Baca selengkapnya →</div>
            </div>
          </div>
        </Link>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((n) => (
          <Link key={n.slug} href={`/kabar/${n.slug}`} className="sb-card group flex flex-col p-5 transition hover:-translate-y-0.5">
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em]">
              <span className="text-primary-700">{n.kind}</span>
              <span className="text-muted2">·</span>
              <span className="font-medium normal-case tracking-normal text-muted">{formatDateID(n.date)}</span>
            </div>
            <h3 className="mt-2 font-display text-[18px] font-semibold leading-snug text-ink group-hover:text-primary-800">{n.title}</h3>
            <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted">{n.excerpt}</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
              {n.tags.map((t) => <span key={t} className="sb-chip !text-[10px]">{t}</span>)}
            </div>
          </Link>
        ))}
      </div>

      {published.length === 0 && (
        <Card className="mt-8 px-6 py-10 text-center text-[13px] text-muted">Belum ada kabar untuk kategori ini.</Card>
      )}
    </div>
  );
}
