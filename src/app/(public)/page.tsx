import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, LayoutGrid, Users, CalendarCheck, Wallet, FileBarChart, ShieldCheck,
  Sprout, GraduationCap, Store, MessageCircle, CheckCircle2, CalendarDays, BadgeCheck,
} from "lucide-react";
import { ORG } from "@/config/org";
import { FIELDS } from "@/config/fields";
import { PROGRAMS, PRODUCTS } from "@/data/operations";
import { NEWS } from "@/data/content";
import { formatIDR, formatDateID } from "@/lib/format";
import { Progress, SectionTitle } from "@/components/ui";
import { FieldMark } from "@/components/brand";

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
      {/* ───────────── HERO — two columns, copy left, photo right ───────────── */}
      <section className="relative isolate overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, #e8f6ec 0%, #ffffff 70%)" }}
          aria-hidden
        />
        <div className="sb-shell relative grid items-center gap-10 pb-12 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:pb-16 lg:pt-16">
          <div className="animate-rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--sb-primary-50)] px-3.5 py-1.5 text-[11.5px] font-bold text-primary-700">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              Platform Kolaborasi &amp; Produktivitas
            </div>
            <h1 className="font-display text-[40px] leading-[1.06] tracking-tight text-[var(--sb-ink)] sm:text-[52px] lg:text-[58px]">
              <span className="block">Srikandi Buana</span>
              <span className="block text-primary-700">Bersama, Berkarya,</span>
              <span className="block text-primary-700">Berdaya</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--sb-muted)]">
              Platform terpadu untuk mengelola organisasi, menjalankan kegiatan, dan mewujudkan tujuan
              bersama dengan mudah, aman dan modern.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/gabung" className="sb-btn sb-btn-primary !px-6 !py-3 text-[13.5px]">
                Mulai Sekarang
                <ArrowRight size={16} />
              </Link>
              <Link href="/profil" className="sb-btn sb-btn-outline !px-6 !py-3 text-[13.5px]">
                Pelajari Lebih Lanjut
              </Link>
            </div>
          </div>

          <div className="relative animate-rise" style={{ animationDelay: "90ms" }}>
            <div className="overflow-hidden rounded-[26px] shadow-[var(--sb-shadow-lg)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-kebun.jpg"
                alt="Anggota Srikandi Buana memetik kopi di terasering kebun desa"
                className="aspect-[4/3] w-full object-cover"
                width={960}
                height={720}
              />
            </div>
            <div className="absolute -right-2 top-6 hidden rotate-[3deg] rounded-2xl bg-white/95 px-4 py-2.5 shadow-[var(--sb-shadow)] backdrop-blur sm:block">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary-700">Kolaborasi</div>
              <div className="text-[12.5px] font-semibold text-ink">untuk Masa Depan</div>
            </div>
          </div>
        </div>
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

      {/* ───────────── SOLUSI — dashboard mockup + benefits ───────────── */}
      <section className="sb-shell py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          {/* mockup */}
          <div className="relative">
            <div className="overflow-hidden rounded-[20px] border border-line shadow-[var(--sb-shadow-lg)]">
              <div className="flex">
                {/* mini sidebar */}
                <div className="w-[86px] shrink-0 bg-[var(--sb-primary-900)] p-2.5 sm:w-[104px]">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 text-[9px] font-bold text-white">SB</span>
                    <span className="hidden text-[8.5px] font-bold leading-tight text-white sm:block">Srikandi<br />Buana</span>
                  </div>
                  {["Dashboard", "Anggota", "Kegiatan", "Keuangan", "Laporan"].map((m, i) => (
                    <div
                      key={m}
                      className={`mb-1 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8px] font-semibold ${
                        i === 0 ? "bg-[var(--sb-primary-700)] text-white" : "text-primary-100/90"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-sm ${i === 0 ? "bg-white" : "bg-primary-300/60"}`} />
                      {m}
                    </div>
                  ))}
                </div>
                {/* mini canvas */}
                <div className="min-w-0 flex-1 bg-[var(--sb-canvas)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink">Dashboard</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[7.5px] text-[var(--sb-muted)]">Cari…</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { l: "Anggota Aktif", v: "128", bg: "var(--sb-tint-green)", c: "#127e2f" },
                      { l: "Kegiatan", v: "12", bg: "var(--sb-tint-amber)", c: "#7a5210" },
                      { l: "Transaksi", v: "Rp 245 jt", bg: "var(--sb-tint-blue)", c: "#1d6fa5" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg p-1.5" style={{ background: s.bg }}>
                        <div className="text-[6.5px] font-bold uppercase tracking-wide" style={{ color: s.c }}>{s.l}</div>
                        <div className="text-[10px] font-extrabold" style={{ color: s.c }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 rounded-lg bg-white p-2">
                    <div className="mb-1.5 text-[7.5px] font-bold text-ink">Aktivitas Organisasi</div>
                    <svg viewBox="0 0 200 56" className="h-14 w-full" aria-hidden>
                      <polyline
                        points="0,44 25,38 50,40 75,28 100,32 125,20 150,24 175,12 200,16"
                        fill="none" stroke="#127e2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <polyline
                        points="0,52 25,48 50,49 75,42 100,44 125,36 150,38 175,30 200,32"
                        fill="none" stroke="#f0b429" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden h-20 w-20 rounded-2xl bg-[var(--sb-tint-green)] sm:block" aria-hidden />
          </div>

          {/* copy */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--sb-primary-50)] px-3 py-1.5 text-[11px] font-bold text-primary-700">
              Solusi Lengkap untuk Organisasi
            </div>
            <h2 className="font-display text-[30px] leading-[1.15] text-ink sm:text-[36px]">
              Kelola Organisasi<br />Lebih Mudah &amp; Efisien
            </h2>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-[var(--sb-muted)]">
              Dari administrasi hingga pelaporan, semua terintegrasi dalam satu platform yang intuitif
              dan responsif di semua perangkat.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Akses cepat di desktop, tablet & mobile",
                "Keamanan data berstandar tinggi",
                "Dukungan penuh untuk produktivitas Anda",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-[13.5px] text-ink">
                  <CheckCircle2 size={18} className="shrink-0 text-primary-700" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/program" className="sb-btn sb-btn-primary mt-7 !px-6 !py-3 text-[13.5px]">
              Jelajahi Fitur Lengkap
              <ArrowRight size={16} />
            </Link>
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
                <FieldMark icon={f.icon} accent={f.accent} />
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

      {/* ───────────── CTA BAND ───────────── */}
      <section className="sb-shell pb-4 pt-10">
        <div className="relative overflow-hidden rounded-[22px] bg-[var(--sb-forest)] px-6 py-8 sm:px-10">
          <div
            className="pointer-events-none absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full opacity-20 blur-2xl"
            style={{ background: "radial-gradient(circle, #8ed4a2 0%, transparent 70%)" }}
            aria-hidden
          />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">
                <Sprout size={20} className="text-[var(--sb-accent-500)]" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-[22px] leading-tight text-white sm:text-[26px]">
                  Mari bersama membangun organisasi yang lebih maju
                </h2>
                <p className="mt-1.5 max-w-xl text-[12.5px] text-primary-100/85">
                  {ORG.shortName} — platform untuk bekerja, berkarya, dan berdaya bersama.
                </p>
              </div>
            </div>
            <Link href="/gabung" className="sb-btn bg-white !px-6 !py-3 text-[13.5px] text-primary-800 hover:bg-[var(--sb-primary-50)]">
              Daftar Sekarang
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
