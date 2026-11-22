import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { ORG } from "@/config/org";
import { FIELDS } from "@/config/fields";
import { PROGRAMS, PRODUCTS } from "@/data/operations";
import { NEWS } from "@/data/content";
import { formatIDR, formatDateID } from "@/lib/format";
import { StatusBadge, Progress, SectionTitle } from "@/components/ui";
import { FieldMark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Beranda",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const published = NEWS.filter((n) => n.status === "published").slice(0, 3);
  const products = PRODUCTS.filter((p) => p.published).slice(0, 4);
  const programs = PROGRAMS.filter((p) => p.status !== "perencanaan").slice(0, 3);

  return (
    <div>
      {/* ───────────────────────── HERO (block: hero-editorial) ───────────────────────── */}
      <section className="hero-grain relative overflow-hidden border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pt-16">
          <div className="animate-rise">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Kelompok Wanita Tani · Kedu, Temanggung
            </div>
            <h1 className="font-display text-[38px] leading-[1.06] font-semibold tracking-tight text-primary-950 sm:text-[50px] lg:text-[54px]">
              Desa yang tumbuh dari kebun, kelas, dan kerja bersama.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink2">
              Sejak {ORG.founded}, {ORG.legalName} menyatukan perempuan tani di {ORG.village} untuk
              mengelola lahan, menguatkan keterampilan, dan memasarkan hasil dengan cara yang adil
              dan terbuka.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/profil" className="sb-btn sb-btn-primary">
                Kenali Srikandi Buana
                <ArrowRight size={15} />
              </Link>
              <Link href="/produk" className="sb-btn sb-btn-outline">
                Lihat produk anggota
              </Link>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                { k: "Anggota", v: "128" },
                { k: "Bidang resmi", v: "4" },
                { k: "Petak terdata", v: "42" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">{s.k}</dt>
                  <dd className="font-display text-[25px] font-semibold text-primary-800">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-rise" style={{ animationDelay: "90ms" }}>
            <div className="overflow-hidden rounded-[22px] border border-line shadow-[var(--sb-shadow-lg)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={"/images/hero-kebun.jpg"}
                alt="Anggota Srikandi Buana memetik kopi di terasering kebun desa"
                className="aspect-[4/3] w-full object-cover"
                width={960}
                height={720}
              />
            </div>
            <div className="sb-card absolute -bottom-6 left-4 right-4 flex items-center gap-3 p-3.5 sm:left-6 sm:right-auto sm:w-[320px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <span className="font-display text-[15px] font-bold">18</span>
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-ink">Panen kopi pekan ini</div>
                <div className="text-[11.5px] text-muted">1.180 kg grade A · 9 petak anggota</div>
              </div>
              <Link href="/kabar/panen-kopi-arabika-2026" aria-label="Baca berita panen" className="ml-auto text-primary-700">
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </div>
        <div className="batik-rule mt-8" />
      </section>

      {/* ───────────────────────── STAT STRIP ───────────────────────── */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-line px-4 sm:px-6 md:grid-cols-4">
          {[
            { k: "Anggota terdaftar", v: "128", n: "di 3 dusun" },
            { k: "Panen bulan ini", v: "2.340 kg", n: "kopi, madu, pangan" },
            { k: "Pelatihan tahun ini", v: "18", n: "112 peserta unik" },
            { k: "Produk terpublikasi", v: "9", n: "dari katalog anggota" },
          ].map((s, i) => (
            <div key={s.k} className={`px-4 py-5 sm:px-6 ${i === 0 ? "pl-0" : ""}`}>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">{s.k}</div>
              <div className="mt-1 font-display text-[26px] font-semibold text-ink">{s.v}</div>
              <div className="text-[11.5px] text-muted2">{s.n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── BIDANG RESMI ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="sb-label mb-2">Empat bidang resmi</div>
            <h2 className="font-display text-[27px] font-semibold text-ink">Kerja yang terbagi, bukan tercecer.</h2>
          </div>
          <Link href="/profil#struktur" className="text-[12.5px] font-semibold text-primary-700 hover:underline">
            Lihat struktur organisasi →
          </Link>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <article key={f.fieldId} className="sb-card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-lg)]">
              <div className="flex items-start gap-3.5">
                <FieldMark icon={f.icon} accent={f.accent} />
                <div className="min-w-0">
                  <h3 className="font-display text-[17px] font-semibold leading-snug text-ink">{f.name}</h3>
                  <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-muted">{f.mandate}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {f.modules.slice(0, 3).map((m) => (
                      <span key={m} className="sb-chip !text-[10.5px]">{m}</span>
                    ))}
                    <span className="sb-chip !text-[10.5px]">+{f.modules.length - 3} modul</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11.5px]">
                <span className="text-muted2">Koordinator: <span className="font-semibold text-muted">{f.coordinator}</span></span>
                <Link href={`/program?bidang=${f.slug}`} className="inline-flex items-center gap-1 font-semibold text-primary-700">
                  Program bidang <ArrowUpRight size={13} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ───────────────────────── PROGRAM BERJALAN ───────────────────────── */}
      <section className="border-y border-line bg-primary-950 py-14 text-primary-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">Program berjalan 2026</div>
              <h2 className="font-display text-[27px] font-semibold text-white">Tiga hal yang sedang kami rawat.</h2>
            </div>
            <Link href="/program" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-100 hover:text-white">
              Semua program <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {programs.map((p) => (
              <article key={p.code} className="rounded-[14px] border border-primary-800 bg-primary-900/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary-800 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary-200">
                    {FIELDS.find((f) => f.fieldId.toLowerCase().includes(p.bidang === "organisasi" ? "org" : p.bidang === "pertanian" ? "tani" : p.bidang === "pelatihan" ? "daya" : "usaha"))?.shortName ?? p.bidang}
                  </span>
                  <StatusBadge status={p.status === "berjalan" ? "Berjalan" : p.status} />
                </div>
                <h3 className="mt-3 font-display text-[19px] font-semibold leading-snug text-white">{p.name}</h3>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-primary-200/95">{p.objective}</p>
                <div className="mt-4 flex items-center justify-between text-[11.5px] text-primary-300">
                  <span>Capaian indikator</span>
                  <span className="font-semibold text-white">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary-800">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] text-primary-300">
                  {p.indicators.slice(0, 2).map((i) => (
                    <span key={i.label} className="rounded border border-primary-800 px-2 py-1">
                      {i.label}: <span className="font-semibold text-white">{i.actual}</span>/{i.target}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── KUTIPAN (story-quote) ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative">
            <div className="overflow-hidden rounded-[20px] border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={"/images/potret-ketua.jpg"} alt="Sri Wulandari, Ketua KWT Srikandi Buana" className="aspect-[4/5] w-full object-cover" width={720} height={900} loading="lazy" />
            </div>
            <div className="absolute -right-3 bottom-5 hidden rotate-[-3deg] rounded-lg border border-line bg-white px-4 py-2.5 shadow-[var(--sb-shadow)] sm:block">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Sri Wulandari</div>
              <div className="text-[11.5px] text-primary-700">Ketua KWT Srikandi Buana</div>
            </div>
          </div>
          <div>
            <Quote size={30} className="text-accent" aria-hidden />
            <blockquote className="mt-4 font-display text-[26px] leading-[1.3] font-medium text-primary-950 sm:text-[31px]">
              “Kami tidak menunggu bantuan datang. Kami mencatat apa yang kami punya, belajar apa
              yang belum kami bisa, lalu menjual apa yang kami rawat sendiri.”
            </blockquote>
            <p className="mt-5 max-w-xl text-[13.5px] leading-relaxed text-muted">
              Kutipan atas persetujuan yang bersangkutan. Cerita lengkap perjalanan sepuluh tahun
              Srikandi Buana tersedia di halaman profil.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/profil" className="sb-btn sb-btn-primary">Baca perjalanan kami</Link>
              <Link href="/kabar?jenis=artikel" className="sb-btn sb-btn-ghost">Catatan dari lapangan →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── PRODUK ───────────────────────── */}
      <section className="border-y border-line bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle
            action={
              <Link href="/produk" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 hover:underline">
                Katalog lengkap <ArrowUpRight size={14} />
              </Link>
            }
          >
            Dari kebun anggota, dengan nama pembuatnya.
          </SectionTitle>
          <p className="-mt-1 mb-6 max-w-2xl text-[13px] text-muted">
            Hanya produk yang telah dipublikasikan oleh Bidang Usaha &amp; Kemitraan yang tampil di sini.
            Ketersediaan stok internal tidak dibuka ke publik.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} href={`/produk/${p.slug}`} className="group">
                <div className="overflow-hidden rounded-[14px] border border-line bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]" width={520} height={520} loading="lazy" />
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink group-hover:text-primary-800">{p.name}</div>
                    <div className="text-[11.5px] text-muted">{p.producer}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[13px] font-semibold text-primary-800">{formatIDR(p.price)}</div>
                    <div className="text-[10.5px] text-muted2">/ {p.unit}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── KABAR ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionTitle
          action={
            <Link href="/kabar" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 hover:underline">
              Semua kabar <ArrowUpRight size={14} />
            </Link>
          }
        >
          Kabar dari desa.
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {published.map((n, i) => (
            <Link key={n.slug} href={`/kabar/${n.slug}`} className="sb-card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-lg)]">
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                <span className={i === 0 ? "text-accent-700" : "text-primary-700"}>{n.kind}</span>
                <span className="text-muted2">·</span>
                <span className="font-medium normal-case tracking-normal text-muted">{formatDateID(n.date)}</span>
              </div>
              <h3 className="mt-2.5 font-display text-[18px] font-semibold leading-snug text-ink group-hover:text-primary-800">{n.title}</h3>
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted">{n.excerpt}</p>
              <div className="mt-auto pt-4 text-[11.5px] font-semibold text-primary-700">Baca selengkapnya →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────────────────── CTA GABUNG ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[22px] border border-primary-200 bg-primary-50 p-7 sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-2xl" aria-hidden />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <div className="sb-label mb-2">Minat bergabung</div>
              <h2 className="font-display text-[27px] font-semibold leading-tight text-primary-950 sm:text-[31px]">
                Ada perempuan tani di sekitarmu yang perlu rumah untuk tumbuh?
              </h2>
              <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-ink2">
                Isi formulir minat bergabung. Bidang Organisasi &amp; Keanggotaan akan menghubungi
                untuk verifikasi. Keanggotaan dan akun aplikasi adalah dua proses terpisah.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row md:justify-end">
              <Link href="/gabung" className="sb-btn sb-btn-primary">Isi formulir</Link>
              <Link href="/faq" className="sb-btn sb-btn-outline">Baca FAQ</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
