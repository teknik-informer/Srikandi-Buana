"use client";
import Link from "next/link";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import type { EnterpriseDashboard, EnterpriseDashboardId } from "@/features/enterprise/registry";
import type { Role } from "@/lib/permissions";

const dashboardEyebrows: Record<EnterpriseDashboardId, string> = {
  ecosystem: "LAYANAN TERPADU",
  management: "PERENCANAAN & PENGENDALIAN",
  administration: "DATA & DOKUMEN RESMI",
  finance: "KEUANGAN & ASET",
  commerce: "USAHA & PERDAGANGAN",
  publication: "INFORMASI PUBLIK",
  system: "KONFIGURASI & AKUN",
};

export default function EnterpriseDashboardOverview({
  dashboard,
  role,
}: {
  dashboard: EnterpriseDashboard;
  role: Role;
}) {
  return (
    <main className="workspace-page" aria-labelledby="dashboard-overview-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {dashboardEyebrows[dashboard.id]}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="dashboard-overview-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard {dashboard.label}
          </h1>
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            {dashboard.features.length} modul tersedia
          </span>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {dashboard.description} Pilih modul yang sesuai dengan kebutuhan dan kewenangan akun Anda.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={"Modul "+dashboard.label}>
        {dashboard.features.map((feature) => {
          const label = role === "anggota" && feature.id === "anggota" ? "Data saya" : feature.label;
          return (
            <Link
              key={feature.id}
              href={feature.href}
              className="group flex min-h-36 flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LayoutGrid size={19} aria-hidden="true" />
                </div>
                <ArrowUpRight size={17} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <div className="mt-5">
                <h2 className="font-semibold">{label}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{feature.description}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
