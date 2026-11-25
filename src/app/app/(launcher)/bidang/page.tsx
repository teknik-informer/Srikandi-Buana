import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, CheckCircle2, Circle, ExternalLink, MapPin } from "lucide-react";
import { FIELDS } from "@/config/fields";
import { APPS } from "@/config/apps";
import { orgSummary } from "@/lib/org-summary";
import { Badge, Card } from "@/components/ui";
import { AppIcon } from "@/components/brand";

export const metadata: Metadata = { title: "Peta Bidang" };

/**
 * Peta aplikasi bidang.
 *
 * The old page was a two-column list of text blocks; it read as a document, not
 * as a map. This version is an actual map: one card per approved field, each
 * carrying its own photograph, its app icon and accent, live counts, and a
 * direct route into every module. A hub row underneath shows the applications
 * that sit outside the four fields (Pengurus, Keuangan, POS, Portal Anggota).
 */

const HERO: Record<string, { img: string; alt: string; tint: string }> = {
  organisasi: {
    img: "/images/komunitas.jpg",
    alt: "Anggota Srikandi Buana duduk bersama membahas catatan organisasi",
    tint: "from-[#0f2c19]/95 via-[#123a20]/80",
  },
  pertanian: {
    img: "/images/hero-kebun.jpg",
    alt: "Kebun kopi anggota Srikandi Buana di lereng Ngadimulyo",
    tint: "from-[#12331a]/95 via-[#1b4522]/80",
  },
  pelatihan: {
    img: "/images/galeri-pelatihan.jpg",
    alt: "Sesi pelatihan anggota Srikandi Buana di balai desa",
    tint: "from-[#1b2b3a]/95 via-[#274357]/80",
  },
  usaha: {
    img: "/images/galeri-bazar.jpg",
    alt: "Produk olahan anggota Srikandi Buana ditata pada bazar usaha",
    tint: "from-[#3a2a12]/95 via-[#54401c]/80",
  },
};

export default async function BidangIndex() {
  // Hitungan program di peta bidang harus sama dengan yang dilihat pengurus
  // di panel bidang — jadi dibaca dari dokumen bersama.
  const { programs: PROGRAMS } = await orgSummary();
  const activeApps = APPS.filter((a) => a.group !== "bidang" && a.key !== "studio" && a.key !== "launcher");
  const fieldApps = FIELDS.length;

  return (
    <div className="pb-10">
      {/* ── opening band: what this map is, and its numbers ── */}
      <section className="relative isolate overflow-hidden rounded-[18px] bg-[#0f2c19]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-kebun.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[58%_42%]" />
        <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(8,35,20,0.97)_0%,rgba(11,43,25,0.94)_38%,rgba(13,49,28,0.66)_62%,rgba(15,55,32,0.24)_100%)]" aria-hidden />
        <div className="relative px-5 py-5 sm:px-7 sm:py-6" data-contrast-bg="#0b2b18">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#dff0e2] ring-1 ring-inset ring-white/15">
              Registry bidang resmi
            </span>
            <span className="rounded-full bg-[#e6c56a]/18 px-2.5 py-1 text-[10px] font-bold text-[#f2dda2] ring-1 ring-inset ring-[#e6c56a]/30">
              Semua {fieldApps} aplikasi bidang aktif
            </span>
          </div>
          <h1 className="mt-2.5 max-w-[24ch] font-display text-[25px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[31px]">
            Peta aplikasi bidang
          </h1>
          <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-[#cfe3d3]">
            Empat bidang resmi, masing-masing dengan aplikasi operasionalnya sendiri. Status pengesahan
            organisasi dicatat terpisah dari status konfigurasi aplikasi — keduanya ditampilkan apa adanya.
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {[
              [`${FIELDS.length}`, "bidang resmi"],
              [`${FIELDS.reduce((n, f) => n + f.modules.length, 0)}`, "modul domain"],
              [`${PROGRAMS.filter((p) => p.status === "berjalan").length}`, "program berjalan"],
              [`${activeApps.length}`, "aplikasi pendukung"],
            ].map(([n, label]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="font-display text-[19px] font-extrabold text-white">{n}</dt>
                <dd className="text-[11.5px] font-semibold text-[#cfe3d3]">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── the map itself: 2×2, photo-first ── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const hero = HERO[f.slug] ?? HERO.organisasi;
          const prog = PROGRAMS.filter((p) => p.bidang === f.slug);
          const running = prog.filter((p) => p.status === "berjalan").length;
          const approval = f.appStatus === "aktif" ? "Aktif" : f.appStatus;
          return (
            <article
              key={f.fieldId}
              className="group relative isolate flex flex-col overflow-hidden rounded-[18px] bg-[#0f2c19] shadow-[0_1px_2px_rgba(15,26,43,0.06)] ring-1 ring-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.img}
                alt={hero.alt}
                className="absolute inset-0 h-full w-full object-cover object-[62%_40%] transition duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-[linear-gradient(160deg,rgba(8,35,20,0.95)_0%,rgba(10,40,23,0.86)_46%,rgba(12,46,26,0.52)_100%)]`} aria-hidden />

              <div className="relative flex flex-1 flex-col p-5" data-contrast-bg="#0b2b18">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-white shadow-sm" style={{ backgroundColor: f.accent }}>
                      <AppIcon name={f.icon} size={19} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-[17px] font-bold leading-tight text-white">{f.name}</h2>
                      <p className="mt-0.5 font-mono text-[10.5px] text-[#a6dab2]">{f.code} · {f.fieldId}</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                    f.appStatus === "aktif"
                      ? "bg-[#7ddc93]/18 text-[#c9f3d3] ring-[#7ddc93]/30"
                      : "bg-[#e6c56a]/18 text-[#f2dda2] ring-[#e6c56a]/30"
                  }`}>
                    {f.appStatus === "aktif" ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    {approval}
                  </span>
                </div>

                <p className="mt-3 min-h-[54px] max-w-[46ch] text-[12.5px] leading-relaxed text-[#d5e8d9] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">{f.mandate}</p>

                {/* live counts, stated as counts — never as claims */}
                <dl className="mt-3.5 grid grid-cols-3 gap-1.5">
                  {[
                    [`${f.modules.length}`, "modul"],
                    [`${prog.length}`, `program${running ? ` · ${running} jalan` : ""}`],
                    [`${f.teamSize}`, "tim"],
                  ].map(([n, label]) => (
                    <div key={label} className="rounded-[9px] bg-[#08220f]/55 px-2.5 py-1.5 ring-1 ring-inset ring-white/10">
                      <dt className="font-display text-[16px] font-extrabold leading-none text-white">{n}</dt>
                      <dd className="mt-0.5 truncate text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#a9c9b1]">{label}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-[#c9dccd]">
                    <MapPin size={11} />
                    {f.coordinator === "Belum tercatat"
                      ? "Koordinator menunggu keputusan"
                      : f.coordinator}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/app/bidang/${f.slug}`}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-white/25 px-3 text-[11.5px] font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
                    >
                      Ringkasan
                    </Link>
                    <Link
                      href={f.appHref}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full bg-[#f2dda2] px-3.5 text-[11.5px] font-bold text-[#2a1f00] shadow-sm transition hover:bg-[#f7e8bb]"
                    >
                      Buka aplikasi <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── hub: the applications that are not owned by a field ── */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Aplikasi lintas bidang</h2>
            <p className="text-[11.5px] text-muted">Dipakai bersama oleh semua bidang; kewenangan mengikuti peran, bukan bidang.</p>
          </div>
          <Link href="/app" className="text-[11.5px] font-semibold text-primary-700 hover:underline">Semua aplikasi →</Link>
        </div>
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {activeApps.map((a) => (
            <li key={a.key} className="bg-white">
              <Link href={a.href} className="flex min-h-[62px] items-center gap-3 px-4 py-3 transition hover:bg-[#f7fbf7]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#eaf6ec] text-[#127e2f] ring-1 ring-inset ring-[#d5e9d8]">
                  <AppIcon name={a.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold text-ink">{a.short}</span>
                    {a.badge ? <Badge tone="accent">{a.badge}</Badge> : null}
                  </span>
                  <span className="block truncate text-[10.5px] text-muted">{a.audience}</span>
                </span>
                <ArrowUpRight size={14} className="shrink-0 text-muted2" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── governance note, kept honest ── */}
      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-[14px] border border-[#f0dcae] bg-[#fffaf0] px-4 py-3">
        <Badge tone="warning">Catatan tata kelola</Badge>
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[#6b5320]">
          Menonaktifkan modul teknis tidak menghapus unit organisasi maupun data historis. Perubahan
          nama/mandat bidang hanya melalui proses administrasi organisasi yang berwenang — layar ini
          menampilkan keadaan, bukan mengubah struktur resmi.
        </p>
        <Link href="/dokumen" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#6b5320] underline-offset-2 hover:underline">
          Dasar keputusan <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}
