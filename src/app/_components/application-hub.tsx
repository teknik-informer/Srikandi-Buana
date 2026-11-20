import Link from "next/link";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Globe2,
  Leaf,
  LockKeyhole,
  Network,
  Wallet,
} from "lucide-react";
import { platformApplications } from "@/features/platform/application-registry";
import type { EnterpriseDashboard } from "@/features/enterprise/registry";

const applicationIcons = {
  "platform-core": LockKeyhole,
  organization: Network,
  agriculture: Leaf,
  business: Wallet,
  "bi-analytics": ChartNoAxesCombined,
  "public-partnership": Globe2,
} as const;

const statusLabels = {
  foundation: "Fondasi",
  partial: "Bertahap",
  preview: "Preview",
} as const;

export default function ApplicationHub({
  dashboards,
  displayName,
  canOpenPlatformCore,
}: {
  dashboards: readonly EnterpriseDashboard[];
  displayName: string;
  canOpenPlatformCore: boolean;
}) {
  const byId = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]));
  const applications = platformApplications
    .filter((application) => application.id !== "platform-core" || canOpenPlatformCore)
    .map((application) => {
      const dashboard = byId.get(application.id);
      const enabled = application.id === "platform-core"
        ? canOpenPlatformCore
        : Boolean(dashboard?.features.length);
      return {
        application,
        Icon: applicationIcons[application.id],
        dashboard,
        enabled,
      };
    })
    .filter(({ enabled }) => enabled);

  return (
    <main className="workspace-page min-w-0 space-y-7" aria-labelledby="application-hub-title">
      <section className="relative isolate overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 -z-10 size-64 rounded-full border-[34px] border-primary/5" />
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">SRIKANDI BUANA · INTEGRATED PLATFORM</p>
        <h1 id="application-hub-title" className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
          Selamat datang, {displayName}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Pilih salah satu aplikasi untuk melanjutkan pekerjaan. Fitur yang tersedia mengikuti kewenangan akun Anda.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="application-list-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="application-list-title" className="text-lg font-semibold tracking-tight">Enam Aplikasi Srikandi Buana</h2>
            <p className="text-sm text-muted-foreground">Satu platform terpadu dengan enam ruang aplikasi utama.</p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{applications.length} aplikasi tersedia</span>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {applications.map(({ application, Icon }) => (
            <article key={application.id} className="flex min-w-0 min-h-56 flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {statusLabels[application.status]}
                </span>
              </div>
              <p className="mt-5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">{application.eyebrow}</p>
              <h3 className="mt-1 text-base font-semibold tracking-tight">{application.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{application.description}</p>
              <div className="mt-auto flex justify-end pt-5">
                <Link
                  href={application.route}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Buka aplikasi <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!applications.length && (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Belum ada aplikasi yang ditugaskan pada akun ini. Hubungi administrator organisasi.
          </p>
        )}
      </section>
    </main>
  );
}
