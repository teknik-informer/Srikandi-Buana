"use client";

/**
 * Hero beranda yang membaca isi dari CMS.
 *
 * Sebelum ini, judul, kalimat pendukung, dan dua tombol ditulis langsung di
 * `page.tsx` sebagai teks tetap. Website Studio menampilkan susunannya tetapi
 * tidak dapat mengubahnya. Komponen ini memisahkan tampilan dari isi: markup,
 * fotografi, gradasi, dan pita hero tetap persis sama, sedangkan teksnya
 * diambil dari `useCmsPage("/")` sehingga suntingan di Studio langsung tampil.
 *
 * Server merender teks default (deterministik, tanpa ketidakcocokan hidrasi);
 * setelah mount, nilai tersimpan di perangkat mengambil alih.
 */
import Link from "next/link";
import { ArrowRight, Play, Rocket } from "lucide-react";
import { useCmsPage, field } from "@/lib/cms";

export function HomeHero() {
  const page = useCmsPage("/");
  const blocks = page.blocks;

  const eyebrow = field(blocks, "hero-editorial", "eyebrow", "Platform Kolaborasi & Produktivitas");
  const headline = field(blocks, "hero-editorial", "headline", "Srikandi Buana\nBersama, Berkarya, Berdaya");
  const sub = field(
    blocks,
    "hero-editorial",
    "subheadline",
    "Platform terpadu untuk mengelola organisasi, menjalankan kegiatan, dan mewujudkan tujuan bersama — mudah, aman, dan modern.",
  );
  const ctaPrimary = field(blocks, "hero-editorial", "ctaPrimary", "Mulai Sekarang");
  const hrefPrimary = field(blocks, "hero-editorial", "hrefPrimary", "/gabung");
  const ctaSecondary = field(blocks, "hero-editorial", "ctaSecondary", "Pelajari Lebih Lanjut");
  const hrefSecondary = field(blocks, "hero-editorial", "hrefSecondary", "/profil");

  return (
    /* Markup identik dengan versi sebelumnya — hanya teksnya yang bergerak. */
    <section className="relative isolate flex min-h-[430px] flex-col overflow-hidden bg-[#0b2b18] sm:min-h-[480px] lg:min-h-[540px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <picture>
        <source srcSet="/images/hero-pemanen.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-pemanen.jpg"
          alt="Empat anggota Srikandi Buana memanen kopi di kebun terasering dengan latar pegunungan"
          className="absolute inset-0 h-full w-full object-cover object-[68%_38%] sm:object-[64%_40%] lg:object-[62%_42%]"
          width={1536}
          height={1024}
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      <div
        className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,28,16,0.94)_0%,rgba(7,32,18,0.88)_34%,rgba(8,38,21,0.62)_52%,rgba(9,44,24,0.14)_72%,rgba(9,44,24,0)_100%)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(4,20,11,0.55),rgba(4,20,11,0))]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(6,30,17,0.62),rgba(6,30,17,0))]" aria-hidden />

      <div className="sb-shell relative flex min-h-[330px] flex-1 flex-col justify-center pb-10 pt-10 sm:min-h-[380px] sm:pb-12 sm:pt-12 lg:min-h-[430px] lg:pb-14 lg:pt-14">
        <div className="max-w-[640px]" data-contrast-bg="#082617">
          {eyebrow ? (
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-[#e6c56a]" aria-hidden />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#f0d79a]">
                {eyebrow}
              </span>
            </div>
          ) : null}

          {/* Baris pertama putih, baris berikutnya emas — seperti rancangan awal.
              Baris baru dari suntingan dipertahankan apa adanya. */}
          <h1 className="mt-4 font-display text-[38px] leading-[1.02] tracking-[-0.03em] text-white sm:text-[50px] lg:text-[60px]">
            {headline.split("\n").map((line, i) => (
              <span key={i} className={`block ${i === 0 ? "" : "mt-1 text-[#f2d493]"}`}>
                {line}
              </span>
            ))}
          </h1>

          {sub ? (
            <p className="mt-5 max-w-[46ch] text-[14px] leading-relaxed text-[#e2efe4] sm:text-[15px]">{sub}</p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {ctaPrimary ? (
              <Link
                href={hrefPrimary}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#127e2f] px-4 py-2.5 text-[12.5px] font-bold text-white sm:px-5 sm:py-3 sm:text-[13px] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/25 transition hover:bg-[#159a3a]"
              >
                <Rocket size={15} aria-hidden /> {ctaPrimary}
                <ArrowRight size={15} aria-hidden />
              </Link>
            ) : null}
            {ctaSecondary ? (
              <Link
                href={hrefSecondary}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white sm:px-5 sm:py-3 sm:text-[13px] backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#0d3a1f]">
                  <Play size={11} className="translate-x-[1px]" fill="currentColor" aria-hidden />
                </span>
                {ctaSecondary}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
