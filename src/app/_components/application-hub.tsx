import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, Handshake, ShoppingCart, UsersRound } from "lucide-react";
import type { EnterpriseDashboard } from "@/features/enterprise/registry";

const appMeta = {
  hrm: { eyebrow: "HUMAN RESOURCE MANAGEMENT", icon: UsersRound, accent: "from-emerald-500/15 to-teal-500/5", modules: "Anggota · Pengurus · Presensi" },
  accounting: { eyebrow: "ACCOUNTING & FINANCE", icon: ChartNoAxesCombined, accent: "from-sky-500/15 to-blue-500/5", modules: "Kas · Buku Besar · Aset" },
  crm: { eyebrow: "CUSTOMER & RELATIONSHIP MANAGEMENT", icon: Handshake, accent: "from-violet-500/15 to-fuchsia-500/5", modules: "Mitra · Komunikasi · Publikasi" },
  projects: { eyebrow: "PROJECT MANAGEMENT", icon: BriefcaseBusiness, accent: "from-amber-500/15 to-orange-500/5", modules: "Program · Kegiatan · Tugas" },
  pos: { eyebrow: "POINT OF SALE", icon: ShoppingCart, accent: "from-rose-500/15 to-pink-500/5", modules: "Produk · Pesanan · Komoditas" },
} as const;

export default function ApplicationHub({ dashboards, displayName }: { dashboards: readonly EnterpriseDashboard[]; displayName: string }) {
  const operationalCount = dashboards.filter((dashboard) => !dashboard.catalogOnly).length;

  return (
    <main className="workspace-page space-y-7" aria-labelledby="application-hub-title">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-[radial-gradient(circle_at_86%_12%,rgba(167,243,208,0.72),transparent_34%),linear-gradient(120deg,#effcf4_0%,#ffffff_54%,#e8f7ee_100%)] p-6 text-slate-900 shadow-sm sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full border-[42px] border-emerald-700/5" />
        <p className="text-xs font-semibold tracking-[0.16em] text-emerald-900/70">SRIKANDI BUANA · INTEGRATED PLATFORM</p>
        <h1 id="application-hub-title" className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Selamat datang, {displayName}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Satu pintu untuk mengelola sumber daya manusia, keuangan, relasi, program, dan transaksi dalam ekosistem kerja yang saling terhubung.</p>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-950">
          <span className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-1.5">5 modul terdaftar</span>
          <span className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-1.5">Satu identitas pengguna</span>
          <span className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-1.5">Akses sesuai kewenangan</span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Application workspace</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Pilih aplikasi kerja</h2>
            <p className="mt-1 text-sm text-muted-foreground">Setiap aplikasi memiliki ruang kerja dan modul operasionalnya sendiri.</p>
          </div>
          <span className="text-xs text-muted-foreground">{operationalCount} aplikasi dengan akses operasional · {dashboards.length} modul terdaftar</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {dashboards.map((dashboard) => {
            const meta = appMeta[dashboard.id];
            const Icon = meta.icon;
            return (
              <article key={dashboard.id} className="group flex min-h-56 flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <p className="mt-5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">{meta.eyebrow}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{dashboard.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{dashboard.description}</p>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <span className="text-xs text-muted-foreground">
                    {dashboard.catalogOnly ? "Akses operasional belum ditugaskan" : meta.modules}
                  </span>
                  <Link href={dashboard.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                    {dashboard.catalogOnly ? "Lihat informasi" : "Buka aplikasi"} <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        {dashboards.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Belum ada aplikasi yang ditugaskan untuk akun ini. Hubungi pengelola akses organisasi.</div>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Satu platform, alur kerja terhubung</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Data anggota, program, transaksi, mitra, dan penjualan tetap mengikuti sumber data serta aturan akses masing-masing modul. Perubahan lintas aplikasi hanya dilakukan melalui alur integrasi yang tercatat.</p>
      </section>
    </main>
  );
}
