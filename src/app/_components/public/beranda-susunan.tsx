import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  FileBarChart,
  GraduationCap,
  LayoutGrid,
  MessageCircle,
  Play,
  Rocket,
  ShieldCheck,
  Sprout,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Susunan beranda yang mengikuti versi 9.2.
 *
 * Yang diambil dari 9.2 adalah **tata letaknya**, bukan warnanya:
 *   1. hero foto gelap, judul dua baris (baris kedua emas), dua tombol pil
 *   2. strip enam kemampuan berpembatas
 *   3. panel "satu layar" — gambar kerja di kiri, tiga poin centang di kanan
 *   4. kisi enam kartu modul berwarna lembut
 *   5. band hijau tua berisi angka organisasi
 *   6. tiga kartu program
 *   7. pita ajakan bertombol
 *
 * Warnanya tetap milik produksi: emerald tua dan kertas stone yang hangat —
 * bukan hijau terang #127e2f dan kanvas kebiruan yang dipakai 9.2. Pelajaran
 * dari percobaan sebelumnya: memindahkan warna 9.2 ke sini justru merusak.
 *
 * Semua teks berasal dari `site` yang sudah dibaca halaman, jadi tidak ada
 * isi karangan. Gerbang yang belum ada isinya tidak ditampilkan.
 */

type Site = {
  heroTitle: string;
  heroSubtitle: string;
  heroCredit: string;
  intro: string;
};

type SectionKey = "panel" | "modul";

type Props = {
  site: Site;
  heroImage: string;
  sections: Partial<Record<SectionKey, ReactNode>>;
  urutan?: SectionKey[];
};

const KEMAMPUAN = [
  { icon: LayoutGrid, atas: "Tata kelola", bawah: "Organisasi" },
  { icon: Users, atas: "Data", bawah: "Anggota" },
  { icon: CalendarCheck, atas: "Agenda", bawah: "Kegiatan" },
  { icon: Wallet, atas: "Kas &", bawah: "Keuangan" },
  { icon: Sprout, atas: "Lahan &", bawah: "Pertanian" },
  { icon: ShieldCheck, atas: "Peran &", bawah: "Kewenangan" },
];

const MODUL = [
  { icon: Users, judul: "Keanggotaan", teks: "Pendaftaran, verifikasi, dan riwayat anggota dalam satu tempat." },
  { icon: CalendarDays, judul: "Kegiatan", teks: "Agenda, presensi, dan notulen rapat tersimpan rapi." },
  { icon: Wallet, judul: "Keuangan", teks: "Kas, jurnal, dan laporan yang bisa ditelusuri." },
  { icon: Sprout, judul: "Produksi & lahan", teks: "Petak, panen, dan mutu tercatat per siklus." },
  { icon: FileBarChart, judul: "Laporan", teks: "Ringkasan untuk pengurus, siap dijadikan dasar keputusan." },
  { icon: Handshake, judul: "Kemitraan", teks: "Pencatatan komunikasi dan status kerja sama." },
];

const JALUR = [
  { icon: Users, judul: "Keanggotaan", teks: "Sampaikan minat bergabung dengan kelompok.", href: "/kontak?topik=Keanggotaan" },
  { icon: Store, judul: "Produk kelompok", teks: "Lihat komoditas dan hasil olahan anggota.", href: "/produk" },
  { icon: MessageCircle, judul: "Kemitraan", teks: "Ajukan kerja sama dan dukungan program.", href: "/kontak?topik=Kemitraan" },
];

const URUTAN_BAWAAN: SectionKey[] = ["panel", "modul"];

export default function BerandaSusunan({ site, heroImage, sections, urutan }: Props) {
  const garis = site.heroTitle.split("\n").map((l) => l.trim()).filter(Boolean);
  const barisUtama = garis.slice(0, -1);
  const barisEmas = garis.length > 1 ? garis[garis.length - 1] : "";

  return (
    <div className="public-srikandi-home">
      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-emerald-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt={site.heroCredit}
          width={1536}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[68%_38%] sm:object-[64%_40%] lg:object-[62%_42%]"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,28,16,0.95)_0%,rgba(7,32,18,0.9)_34%,rgba(8,38,21,0.66)_54%,rgba(9,44,24,0.18)_74%,rgba(9,44,24,0)_100%)]"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(4,20,11,0.5),rgba(4,20,11,0))]" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(6,30,17,0.6),rgba(6,30,17,0))]" aria-hidden />

        <div className="relative mx-auto flex min-h-[560px] w-[calc(100%-2.5rem)] sm:w-[calc(100%-4rem)] max-w-[1240px] flex-col justify-center pb-14 pt-16">
          <div className="max-w-[660px]">
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-amber-200" aria-hidden />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-amber-100">
                Kelompok Wanita Tani Srikandi Buana
              </span>
            </div>

            <h1 className="mt-4 !text-[38px] font-normal !leading-[1.03] !tracking-[-0.03em] text-white sm:!text-[50px] lg:!text-[62px]">
              {barisEmas ? (
                <>
                  <span className="block">{barisUtama.join(" ")}</span>
                  <span className="mt-1 block text-amber-100">{barisEmas}</span>
                </>
              ) : (
                <span className="block">{site.heroTitle}</span>
              )}
            </h1>

            <p className="mt-5 max-w-[46ch] !text-[14px] leading-relaxed !text-emerald-50 sm:!text-[15px]">
              {site.heroSubtitle}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                href="/program"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-[13px] font-bold text-white shadow-[0_16px_30px_-16px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/25 transition hover:bg-emerald-800"
              >
                <Rocket size={15} aria-hidden /> Program kerja <ArrowRight size={15} aria-hidden />
              </Link>
              <Link
                href="/profil"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 py-3 text-[13px] font-bold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-emerald-950">
                  <Play size={11} className="translate-x-[1px]" fill="currentColor" aria-hidden />
                </span>
                Profil organisasi
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] uppercase tracking-[1.2px] text-emerald-200">
              <span>Ngadimulyo, Kedu, Temanggung</span>
              <span className="hidden sm:inline">Pertanian · Pemberdayaan · Kemandirian</span>
            </div>
          </div>
        </div>
        <small className="absolute bottom-3 right-5 text-[6px] text-white/55">{site.heroCredit}</small>
      </section>

      {/* ── 2. STRIP ENAM KEMAMPUAN ─────────────────────────────────────── */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto w-[calc(100%-2.5rem)] max-w-[1240px] sm:w-[calc(100%-4rem)]">
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 md:divide-x md:divide-stone-200">
            {KEMAMPUAN.map((k) => (
              <li key={k.atas} className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <k.icon size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="text-[12px] font-semibold leading-tight text-emerald-950">
                  {k.atas}
                  <br />
                  <span className="font-medium text-stone-500">{k.bawah}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Profil organisasi: konten mengikuti pengaturan situs ──────────── */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto grid w-[calc(100%-2.5rem)] max-w-[1240px] gap-6 sm:w-[calc(100%-4rem)] lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">Profil organisasi</p>
            <h2 className="!text-[28px] font-normal !leading-[1.15] !tracking-[-1px] text-emerald-950 sm:!text-[34px]">
              Berbasis di desa.<br />Berfokus pada <span className="font-serif italic text-emerald-800">perempuan tani.</span>
            </h2>
          </div>
          <div>
            <p className="!text-[14px] !leading-[1.9] !text-stone-600">{site.intro}</p>
            <Link className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-emerald-800" href="/profil">
              Tentang Srikandi Buana <ArrowUpRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Seksi lanjutan diisi dari data halaman; tidak membuat angka semu ─ */}
      {(urutan ?? URUTAN_BAWAAN).map((jenis) => {
        const isi = sections[jenis];
        if (!isi) return null;
        if (jenis === "panel") return <PanelKerja key={jenis}>{isi}</PanelKerja>;
        return <KisiModul key={jenis}>{isi}</KisiModul>;
      })}

      {/* ── 7. JALUR PENGUNJUNG ─────────────────────────────────────────── */}
      <section className="bg-stone-50 py-16">
        <div className="mx-auto w-[calc(100%-2.5rem)] max-w-[1240px] sm:w-[calc(100%-4rem)]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                <span className="h-[5px] w-[5px] rounded-full bg-emerald-800" aria-hidden />
                Jalur pengunjung
              </p>
              <h2 className="!text-[28px] font-normal !leading-[1.15] !tracking-[-1px] text-emerald-950 sm:!text-[34px]">
                Tiga jalan masuk <span className="font-serif italic text-emerald-800">ke kelompok.</span>
              </h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {JALUR.map((j) => (
              <Link
                key={j.judul}
                href={j.href}
                className="group flex items-start gap-3 rounded-[14px] border border-stone-200 bg-white p-5 transition hover:border-emerald-500"
              >
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <j.icon size={19} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="flex-1">
                  <strong className="block text-[13.5px] font-semibold text-emerald-950">{j.judul}</strong>
                  <small className="mt-1 block text-[12px] leading-relaxed text-stone-500">{j.teks}</small>
                </span>
                <ArrowUpRight size={17} className="mt-1 shrink-0 text-stone-400 transition group-hover:text-emerald-800" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Pembungkus seksi, dipakai halaman untuk mengisi isi yang tersedia ── */

function PanelKerja({ children }: { children: ReactNode }) {
  return (
    <section className="py-16">
      <div className="mx-auto w-[calc(100%-2.5rem)] max-w-[1240px] sm:w-[calc(100%-4rem)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
              Satu layar, semua urusan
            </p>
            <h2 className="!text-[28px] font-normal !leading-[1.15] !tracking-[-1px] text-emerald-950 sm:!text-[34px]">
              Satu ruang kerja untuk organisasi
            </h2>
          </div>
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-stone-500">
            Data anggota, lahan, kas, program, dan kegiatan dikelola dalam satu ruang kerja —
            dengan akses sesuai peran masing-masing.
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function KisiModul({ children }: { children: ReactNode }) {
  return (
    <section className="bg-stone-50 py-16">
      <div className="mx-auto w-[calc(100%-2.5rem)] max-w-[1240px] sm:w-[calc(100%-4rem)]">
        <div className="mb-8 max-w-[52ch]">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
            <span className="h-[5px] w-[5px] rounded-full bg-emerald-800" aria-hidden />
            Yang dikerjakan kelompok
          </p>
          <h2 className="!text-[28px] font-normal !leading-[1.15] !tracking-[-1px] text-emerald-950 sm:!text-[34px]">
            Enam urusan organisasi, <span className="font-serif italic text-emerald-800">satu ruang kerja.</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODUL.map((m) => (
            <article
              key={m.judul}
              className="rounded-[14px] border border-stone-200 bg-white p-5 transition hover:border-emerald-500"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <m.icon size={20} strokeWidth={1.9} aria-hidden />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-emerald-950">{m.judul}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-500">{m.teks}</p>
            </article>
          ))}
        </div>
        {children}
      </div>
    </section>
  );
}

