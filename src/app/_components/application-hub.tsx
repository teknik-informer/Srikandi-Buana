import Link from "next/link";
import {
  ArrowUpRight, ChartNoAxesCombined, Globe2,
  Leaf, LockKeyhole, Network, Wallet,
} from "lucide-react";
import type { EnterpriseDashboard } from "@/features/enterprise/registry";
import { platformApplications } from "@/features/platform/application-registry";

const applicationPresentation = {
  "platform-core": { icon: LockKeyhole, modules: "Identitas · Keamanan · Audit", legacy: [] as const },
  organization: { icon: Network, modules: "Anggota · Pengurus · Presensi", legacy: ["hrm"] as const },
  agriculture: { icon: Leaf, modules: "Petani · Lahan · Produksi", legacy: ["projects"] as const },
  business: { icon: Wallet, modules: "Keuangan · Usaha · Transaksi", legacy: ["accounting", "pos"] as const },
  "bi-analytics": { icon: ChartNoAxesCombined, modules: "KPI · Tren · Kualitas Data", legacy: ["analytics"] as const },
  "public-partnership": { icon: Globe2, modules: "Publikasi · Mitra · Transparansi", legacy: ["crm"] as const },
} as const;

export default function ApplicationHub({ dashboards, displayName, canOpenPlatformCore }: { dashboards: readonly EnterpriseDashboard[]; displayName: string; canOpenPlatformCore: boolean }) {
  const byId = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]));
  const applications = platformApplications.map((application) => {
    const presentation = applicationPresentation[application.id];
    const matched = presentation.legacy.map((id) => byId.get(id)).filter(Boolean);
    const dashboard = matched.find((item) => !item?.catalogOnly && !item?.accessOnly) ?? matched[0];
    const enabled = application.id === "platform-core" ? canOpenPlatformCore : matched.length > 0;
    // Canonical application routes own app-level launches; legacy dashboards remain\n    // compatibility workspaces and must not override the application destination.\n    const href = application.route;
    const restricted = !enabled || Boolean(dashboard?.catalogOnly || dashboard?.accessOnly);
    return { application, presentation, href, enabled, restricted, dashboard };
  });
  const operationalCount = applications.filter((item) => item.enabled && !item.restricted).length;

  return (
    <main className="workspace-page space-y-7" aria-labelledby="application-hub-title">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-[radial-gradient(circle_at_86%_12%,rgba(167,243,208,0.72),transparent_34%),linear-gradient(120deg,#effcf4_0%,#ffffff_54%,#e8f7ee_100%)] p-6 text-slate-900 shadow-sm sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full border-[42px] border-emerald-700/5" />
        <p className="text-xs font-semibold tracking-[0.16em] text-emerald-900/70">SRIKANDI BUANA · INTEGRATED PLATFORM</p>
        <h1 id="application-hub-title" className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Selamat datang, {displayName}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Satu platform organisasi dengan enam aplikasi terpadu. Setiap aplikasi memiliki domain kerja, navigasi, dan kewenangan yang terhubung.</p>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-950">
          <span className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-1.5">6 aplikasi utama</span>
          <span className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-1.5">Satu identitas pengguna</span>
          <span className="rounded-full border border-emerald-800/15 bg-white/70 px-3 py-1.5">Akses sesuai kewenangan</span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Integrated application suite</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Enam aplikasi Srikandi Buana</h2>
            <p className="mt-1 text-sm text-muted-foreground">Workspace operasional lama tetap dipertahankan sebagai bagian dari aplikasi utama.</p>
          </div>
          <span className="text-xs text-muted-foreground">{operationalCount} aplikasi dengan akses operasional · {applications.length} aplikasi terdaftar</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {applications.map(({ application, presentation, href, enabled, restricted, dashboard }) => {
            const Icon = presentation.icon;
            return (
              <article key={application.id} className="group flex min-h-56 flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" aria-hidden="true" />
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {application.status === "foundation" ? "Fondasi" : application.status === "preview" ? "Preview" : "Bertahap"}
                  </span>
                </div>
                <p className="mt-5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">{application.eyebrow}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{application.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{application.description}</p>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <span className="text-xs text-muted-foreground">
                    {!enabled ? "Belum tersedia untuk kewenangan akun ini" : restricted ? "Katalog aplikasi · akses data tetap dibatasi" : presentation.modules}
                  </span>
                  {enabled && !restricted ? (
                    <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                      Buka aplikasi <ArrowUpRight className="size-4" />
                    </Link>
                  ) : (
                    <span aria-disabled="true" className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground">
                      {restricted && dashboard?.catalogOnly ? "Lihat info" : "Belum ditugaskan"} <LockKeyhole className="size-3.5" />
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Satu platform, alur kerja terhubung</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Data anggota, pertanian, transaksi, mitra, dan publikasi mengikuti sumber data serta aturan akses masing-masing domain. Katalog aplikasi tidak memberikan hak membaca atau mengubah data; seluruh tindakan tetap diperiksa oleh kebijakan server.</p>
      </section>
    </main>
  );
}
