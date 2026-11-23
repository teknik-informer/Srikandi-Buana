import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, LayoutGrid, Play, Rocket, Users, CalendarCheck, Wallet, FileBarChart, ShieldCheck,
  Sprout, GraduationCap, Store, MessageCircle, CheckCircle2, CalendarDays, BadgeCheck,
} from "lucide-react";
import { ORG } from "@/config/org";
import { FIELDS } from "@/config/fields";
import { PROGRAMS, PRODUCTS } from "@/data/operations";
import { NEWS } from "@/data/content";
import { formatIDR, formatDateID } from "@/lib/format";
import { Progress, SectionTitle } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { DashboardArt } from "@/components/dashboard-art";
import { HeroRibbon } from "@/components/hero-ribbon";

export const metadata: Metadata = {
  title: "Beranda",
  alternates: { canonical: "/" },
};

/** Six capability tiles — mirrors the reference landing's feature strip. */
const CAPABILITIES = [
  { icon: LayoutGrid, label: "Manajemen", sub: "Organisasi" },
  { icon: Users, label: "Kolaborasi", sub: "Tim & Anggota" },
  { icon: CalendarCheck, label: "Pengelolaan", sub: "Kegiatan" },
  { icon: Wallet, label: "Transaksi &", sub: "Keuangan" },
  { icon: FileBarChart, label: "Laporan", sub: "Terpadu" },
  { icon: ShieldCheck, label: "Akses Multidevice", sub: "& Aman" },
];

/** Featured modules — tinted cards with a soft gradient, as in the reference. */
const MODULES = [
  { icon: Users, title: "Manajemen Anggota", desc: "Kelola data anggota dengan mudah", tint: "var(--sb-tint-green)", fg: "#127e2f" },
  { icon: CalendarDays, title: "Kegiatan & Agenda", desc: "Atur kegiatan dan pantau progres", tint: "var(--sb-tint-amber)", fg: "#7a5210" },
  { icon: Wallet, title: "Keuangan", desc: "Transparan dan akuntabel", tint: "var(--sb-tint-teal)", fg: "#1d6fa5" },
  { icon: Sprout, title: "Produksi & Lahan", desc: "Petak, panen, dan mutu tercatat", tint: "var(--sb-tint-green)", fg: "#127e2f" },
  { icon: FileBarChart, title: "Laporan", desc: "Analisis data untuk pengambilan keputusan", tint: "var(--sb-tint-violet)", fg: "#6b45c9" },
  { icon: MessageCircle, title: "Komunitas", desc: "Bangun jejaring lebih kuat", tint: "var(--sb-tint-blue)", fg: "#1d6fa5" },
];

export default function HomePage() {
  const published = NEWS.filter((n) => n.status === "published").slice(0, 3);
  const products = PRODUCTS.filter((p) => p.published).slice(0, 4);
  const programs = PROGRAMS.filter((p) => p.status !== "perencanaan").slice(0, 3);

  return (
    <div className="bg-white">
      {/* ───────────── HERO — one full photograph, copy on it, closed by the
           gold-and-green ribbon. The reference does not box the photo in a
           card: it fills the band, its left side darkens just enough for the
           words, and the page opens out of a curved green field. ───────────── */}
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

        {/* Legibility, done in three soft passes instead of a flat black film:
            a wide left-to-right wash for the copy column, a gentle top shade so
            the header never fights the sky, and a bottom shade that hands the
            photograph over to the ribbon. */}
        <div
          className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,28,16,0.94)_0%,rgba(7,32,18,0.88)_34%,rgba(8,38,21,0.62)_52%,rgba(9,44,24,0.14)_72%,rgba(9,44,24,0)_100%)]"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(4,20,11,0.55),rgba(4,20,11,0))]" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(6,30,17,0.62),rgba(6,30,17,0))]" aria-hidden />

        <div className="sb-shell relative flex min-h-[330px] flex-1 flex-col justify-center pb-10 pt-10 sm:min-h-[380px] sm:pb-12 sm:pt-12 lg:min-h-[430px] lg:pb-14 lg:pt-14">
          <div className="max-w-[640px]" data-contrast-bg="#082617">
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-[#e6c56a]" aria-hidden />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#f0d79a]">
                Platform Kolaborasi &amp; Produktivitas
              </span>
            </div>
            <h1 className="mt-4 font-display text-[38px] leading-[1.02] tracking-[-0.03em] text-white sm:text-[50px] lg:text-[60px]">
              <span className="block">Srikandi Buana</span>
              <span className="mt-1 block text-[#f2d493]">
                Bersama, Berkarya,
                <br />
                Berdaya
              </span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[14px] leading-relaxed text-[#e2efe4] sm:text-[15px]">
              Platform terpadu untuk mengelola organisasi, menjalankan kegiatan, dan mewujudkan
              tujuan bersama — mudah, aman, dan modern.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                href="/gabung"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#127e2f] px-4 py-2.5 text-[12.5px] font-bold text-white sm:px-5 sm:py-3 sm:text-[13px] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/25 transition hover:bg-[#159a3a]"
              >
                <Rocket size={15} /> Mulai Sekarang
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/profil"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white sm:px-5 sm:py-3 sm:text-[13px] backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#0d3a1f]">
                  <Play size={11} className="translate-x-[1px]" fill="currentColor" />
                </span>
                Pelajari Lebih Lanjut
              </Link>
            </div>
          </div>
        </div>

        <HeroRibbon id="landing" />
      </section>

      {/* ───────────── STRIP 6 CAPABILITIES ───────────── */}
      <section className="border-y border-line bg-white">
        <div className="sb-shell">
          <ul className="grid grid-cols-2 divide-line sm:grid-cols-3 md:grid-cols-6 md:divide-x">
            {CAPABILITIES.map((c) => (
              <li key={c.label} className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sb-primary-50)] text-primary-700">
                  <c.icon size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="text-[12px] font-semibold leading-tight text-ink">
                  {c.label}<br />
                  <span className="font-medium text-[var(--sb-muted)]">{c.sub}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── SOLUSI — a designed dashboard scene ─────────────
           Not a screenshot: an SVG composition in the same green-and-gold
           language as the hero, with abstract bars in place of real figures,
           so it reads as an invitation to the product and can never be
           mistaken for live data. */}
      <section className="sb-shell py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">Satu layar, semua urusan</div>
            <h2 className="font-display text-[30px] leading-[1.15] text-ink sm:text-[36px]">
              Kelola organisasi lebih mudah &amp; efisien
            </h2>
          </div>
          <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-[var(--sb-muted)]">
            Ringkasan anggota, lahan, kas, program, dan agenda bertemu di satu layar kerja —
            responsif di desktop, tablet, dan ponsel.
          </p>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <DashboardArt className="h-auto w-full" />
          <div>
            <ul className="space-y-3">
              {[
                ["Akses cepat di desktop, tablet & mobile", "Satu tata letak, tiga ukuran layar — tanpa aplikasi tambahan."],
                ["Keamanan data berstandar tinggi", "Peran dan kewenangan menentukan apa yang terlihat dan dapat diubah."],
                ["Dukungan penuh untuk produktivitas", "CRUD, ekspor CSV, dan jejak audit tercatat di setiap modul."],
              ].map(([title, note]) => (
                <li key={title} className="flex items-start gap-3 rounded-[14px] border border-line bg-white p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-700" aria-hidden />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{title}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-[var(--sb-muted)]">{note}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link href="/program" className="sb-btn sb-btn-primary !px-6 !py-3 text-[13.5px]">
                Jelajahi Fitur Lengkap
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── MODUL UNGGULAN — 6 tinted cards ───────────── */}
      <section className="bg-[var(--sb-canvas)] py-16">
        <div className="sb-shell">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-700 shadow-sm">
              Modul Unggulan
            </div>
            <h2 className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">
              Fitur Lengkap untuk Mendukung Produktivitas
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <article
                key={m.title}
                className="group relative overflow-hidden rounded-[18px] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-lg)]"
                style={{ background: `linear-gradient(160deg, ${m.tint} 0%, #ffffff 100%)` }}
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-white shadow-sm"
                  style={{ color: m.fg }}
                >
                  <m.icon size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <h3 className="mt-3.5 text-[15px] font-bold text-ink">{m.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--sb-muted)]">{m.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── BIDANG RESMI ───────────── */}
      <section className="sb-shell py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="sb-label mb-2">Empat bidang resmi</div>
            <h2 className="font-display text-[28px] leading-tight text-ink">Kerja yang terbagi, bukan tercecer.</h2>
          </div>
          <Link href="/profil#struktur" className="text-[12.5px] font-semibold text-primary-700 hover:underline">
            Lihat struktur organisasi →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <article key={f.fieldId} className="sb-card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-lg)]">
              <div className="flex items-start gap-3.5">
                <FieldMark icon={f.icon} accent={f.accent} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold leading-snug text-ink">{f.name}</h3>
                  <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-[var(--sb-muted)]">{f.mandate}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {f.modules.slice(0, 3).map((m) => (
                      <span key={m} className="sb-chip !text-[10.5px]">{m}</span>
                    ))}
                    <span className="sb-chip !text-[10.5px]">+{f.modules.length - 3} modul</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11.5px]">
                <span className="text-[var(--sb-muted)]">Koordinator: <span className="font-semibold text-ink">{f.coordinator}</span></span>
                <Link href={`/program?bidang=${f.slug}`} className="inline-flex items-center gap-1 font-semibold text-primary-700">
                  Program bidang <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ───────────── PROGRAM BERJALAN ───────────── */}
      <section className="bg-[var(--sb-primary-900)] py-16 text-white">
        <div className="sb-shell">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">Program berjalan 2026</div>
              <h2 className="font-display text-[28px] leading-tight text-white sm:text-[32px]">Tiga hal yang sedang kami rawat.</h2>
            </div>
            <Link href="/program" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-200 hover:text-white">
              Semua program <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {programs.map((p) => (
              <article key={p.code} className="rounded-[18px] bg-white/5 p-5 ring-1 ring-inset ring-white/10 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary-200">
                    {FIELDS.find((f) => f.slug === p.bidang)?.shortName ?? p.bidang}
                  </span>
                  <span className="rounded-full bg-[var(--sb-accent-500)] px-2 py-0.5 text-[10px] font-bold text-[#241500]">{p.status}</span>
                </div>
                <h3 className="mt-3 text-[17px] font-bold leading-snug text-white">{p.name}</h3>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-primary-100/85">{p.objective}</p>
                <div className="mt-4 flex items-center justify-between text-[11.5px] text-primary-200">
                  <span>Capaian indikator</span>
                  <span className="font-semibold text-white">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-[var(--sb-accent-500)]" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] text-primary-200">
                  {p.indicators.slice(0, 2).map((i) => (
                    <span key={i.label} className="rounded-md bg-white/5 px-2 py-1">
                      {i.label}: <span className="font-semibold text-white">{i.actual}</span>/{i.target}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── KOMUNITAS & KOLABORASI ───────────── */}
      <section className="sb-shell py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--sb-primary-50)] px-3 py-1.5 text-[11px] font-bold text-primary-700">
              <BadgeCheck size={13} aria-hidden />
              Komunitas &amp; Kolaborasi
            </div>
            <h2 className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">
              Bergabung dalam<br />Komunitas Srikandi Buana
            </h2>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-[var(--sb-muted)]">
              Diskusi, berbagi informasi, dan berkolaborasi bersama anggota lainnya dalam satu ekosistem.
            </p>
            <Link href="/portal" className="sb-btn sb-btn-primary mt-6 !px-6 !py-3 text-[13.5px]">
              Masuk ke Portal
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[22px] shadow-[var(--sb-shadow-lg)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/komunitas.jpg"
                alt="Lima anggota Srikandi Buana berdiskusi bersama sambil membuka laptop dan buku catatan di balai pertemuan desa"
                className="aspect-[16/10] w-full object-cover"
                width={960}
                height={600}
                loading="lazy"
              />
            </div>
            <div className="mt-3 grid gap-2 sm:absolute sm:-right-4 sm:top-6 sm:mt-0 sm:w-[220px]">
              {[
                { icon: MessageCircle, t: "Diskusi Aktif", d: "Topik teknis seputar organisasi" },
                { icon: Users, t: "Berbagi Pengetahuan", d: "Tips, pengalaman dan ide" },
                { icon: GraduationCap, t: "Kolaborasi Nyata", d: "Wujudkan program bersama" },
              ].map((c) => (
                <div key={c.t} className="flex items-start gap-2.5 rounded-xl bg-white/95 px-3 py-2.5 shadow-[var(--sb-shadow)] ring-1 ring-line backdrop-blur">
                  <c.icon size={15} className="mt-0.5 shrink-0 text-primary-700" aria-hidden />
                  <div>
                    <div className="text-[11.5px] font-bold text-ink">{c.t}</div>
                    <div className="text-[10px] leading-tight text-[var(--sb-muted)]">{c.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── KABAR ───────────── */}
      <section className="border-y border-line bg-[var(--sb-canvas)] py-14">
        <div className="sb-shell">
          <SectionTitle
            action={
              <Link href="/kabar" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 hover:underline">
                Semua kabar <ArrowRight size={14} />
              </Link>
            }
          >
            Kabar dari desa.
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {published.map((n) => (
              <Link key={n.slug} href={`/kabar/${n.slug}`} className="sb-card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-lg)]">
                <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                  <span className="text-primary-700">{n.kind}</span>
                  <span className="text-[var(--sb-muted-2)]">·</span>
                  <span className="font-medium normal-case tracking-normal text-[var(--sb-muted)]">{formatDateID(n.date)}</span>
                </div>
                <h3 className="mt-2.5 text-[16px] font-bold leading-snug text-ink group-hover:text-primary-800">{n.title}</h3>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-[var(--sb-muted)]">{n.excerpt}</p>
                <div className="mt-auto pt-4 text-[11.5px] font-semibold text-primary-700">Baca selengkapnya →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── PRODUK ───────────── */}
      <section className="bg-white py-14">
        <div className="sb-shell">
          <SectionTitle
            action={
              <Link href="/produk" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 hover:underline">
                Katalog lengkap <ArrowRight size={14} />
              </Link>
            }
          >
            Dari kebun anggota, dengan nama pembuatnya.
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} href={`/produk/${p.slug}`} className="group">
                <div className="overflow-hidden rounded-[18px] border border-line bg-[var(--sb-canvas)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]" width={520} height={520} loading="lazy" />
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-ink group-hover:text-primary-800">{p.name}</div>
                    <div className="text-[11.5px] text-[var(--sb-muted)]">{p.producer}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[13px] font-bold text-primary-800">{formatIDR(p.price)}</div>
                    <div className="text-[10.5px] text-[var(--sb-muted-2)]">/ {p.unit}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── CTA BAND ─────────────
           The old band was a flat `--sb-forest` rectangle with a Lucide sprout
           in a 44px box. Now it carries the organisation's own emblem — the
           mark alone, no wordmark — on a deep green gradient with a gold rule
           and a soft crest, so the ask reads as part of the brand rather than
           a generic call to action. */}
      <section className="pb-10 pt-10 sm:pb-14">
        <div className="sb-shell">
          <div className="relative isolate overflow-hidden rounded-[24px] ring-1 ring-inset ring-white/10">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "linear-gradient(118deg,#062b17 0%,#0b3a20 38%,#0f4b29 64%,#146033 100%)",
              }}
              aria-hidden
            />
            {/* two soft crests, echoing the hero ribbon without repeating it */}
            <svg
              className="pointer-events-none absolute -bottom-24 -right-24 -z-10 h-[340px] w-[760px]"
              viewBox="0 0 760 340"
              aria-hidden
              style={{ filter: "blur(26px)" }}
            >
              <defs>
                <linearGradient id="ctaCrest" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8ed4a2" stopOpacity="0" />
                  <stop offset="55%" stopColor="#8ed4a2" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#8ed4a2" stopOpacity="0.26" />
                </linearGradient>
                <linearGradient id="ctaGold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e6c56a" stopOpacity="0" />
                  <stop offset="70%" stopColor="#e6c56a" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#e6c56a" stopOpacity="0.30" />
                </linearGradient>
              </defs>
              <path d="M0 250 C 190 165, 430 140, 760 205 L760 340 L0 340 Z" fill="url(#ctaCrest)" />
              <path d="M0 300 C 230 230, 480 220, 760 275 L760 340 L0 340 Z" fill="url(#ctaGold)" />
            </svg>
            {/* a warm light source behind the emblem, so the mark sits in the field */}
            <div
              className="pointer-events-none absolute -left-10 top-1/2 -z-10 h-[320px] w-[320px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,197,106,0.16),transparent_62%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-[linear-gradient(90deg,rgba(230,197,106,0.55),rgba(230,197,106,0.1)_40%,transparent)]"
              aria-hidden
            />

            <div className="relative flex flex-wrap items-center justify-between gap-6 px-6 py-8 sm:px-9 sm:py-9">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* emblem only — no text lock-up */}
                <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-white/[0.07] ring-1 ring-inset ring-[#e6c56a]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_-20px_rgba(0,0,0,0.9)] sm:h-[72px] sm:w-[72px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/emblem-gold.png"
                    alt=""
                    aria-hidden
                    width={400}
                    height={400}
                    loading="lazy"
                    className="h-10 w-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:h-11 sm:w-11"
                  />
                </span>
                <div data-contrast-bg="#0a3a20">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className="h-px w-7 bg-[#e6c56a]" aria-hidden />
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#f0d79a]">
                      Bergabung
                    </span>
                  </div>
                  <h2 className="max-w-[24ch] font-display text-[21px] leading-[1.15] text-white sm:text-[26px]">
                    Mari bersama membangun organisasi yang lebih maju
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-[#d6ead9]">
                    {ORG.shortName} — platform untuk bekerja, berkarya, dan berdaya bersama.
                  </p>
                </div>
              </div>
              <Link
                href="/gabung"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2d493] px-5 py-3 text-[13px] font-bold text-[#14351f] shadow-[0_14px_28px_-16px_rgba(0,0,0,0.8)] transition hover:bg-[#f8e3b4]"
              >
                Daftar Sekarang
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
