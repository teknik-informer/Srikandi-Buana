"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle, ArrowUpRight, Bell, BookOpen, BriefcaseBusiness,
  CalendarClock, CalendarDays, Camera, CheckCircle2, ClipboardCheck, FileCheck2,
  FileText, Files, FolderCheck, Handshake, Landmark, LayoutGrid, Megaphone,
  MessagesSquare, PackageCheck, RefreshCw, Settings2, ShieldCheck, ShoppingBag, Sprout,
  Users, Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getVisibleEnterpriseUtilities, type EnterpriseDashboard, type EnterpriseDashboardId } from "@/features/enterprise/registry";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { buildEnterpriseMonitoring } from "@/lib/enterprise-monitoring";
import { recordHref } from "@/lib/management-insights";
import type { Principal } from "@/lib/permissions";
import { WorkspaceMetric } from "./workspace-ui";
import { modules } from "@/lib/srikandi";

const eyebrows: Record<EnterpriseDashboardId, string> = {
  ecosystem: "ORGANISASI",
  finance: "PELAPORAN",
  publication: "PUBLIKASI",
  system: "ADMINISTRASI",
};

const featureIcons: Record<string, LucideIcon> = {
  portal: Users, notifikasi: Bell, program: CalendarDays, laporan_program: FileCheck2,
  tindaklanjut: ClipboardCheck, kegiatan: CalendarClock, kehadiran: Users,
  musyawarah: MessagesSquare, pengajuan: FileText, enterprise: ShieldCheck,
  anggota: Users, pengurus: BriefcaseBusiness, persetujuan: ShieldCheck,
  surat: FileText, "surat-resmi": FileText, register: FolderCheck, sumber: BookOpen, kelembagaan: Files,
  transkripsi: FileCheck2, dokumen: Files, kas: Wallet, akuntansi: Landmark,
  aset: PackageCheck, penjualan: ShoppingBag, lotkopi: Sprout, usaha: Sprout,
  kemitraan: Handshake, publikasi: Megaphone, galeri: Camera,
  pesan: MessagesSquare, akun: ShieldCheck, "akun-saya": Users, pengaturan: Settings2,
};

const briefingAppearance = {
  attention: {
    border: "border-amber-500/30",
    background: "from-amber-500/10 via-card to-card",
    badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
  },
  steady: {
    border: "border-emerald-500/25",
    background: "from-emerald-500/10 via-card to-card",
    badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  limited: {
    border: "border-border",
    background: "from-muted/70 via-card to-card",
    badgeClass: "border-border bg-muted text-muted-foreground",
    icon: ShieldCheck,
  },
};

function dateLabel(value: string | null) {
  if (!value) return "Belum ada pembaruan";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })
    : "Tanggal tidak tersedia";
}

function rupiah(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(value);
}

function dashboardMetrics(id: EnterpriseDashboardId, s: ReturnType<typeof buildEnterpriseMonitoring>) {
  switch (id) {
    case "ecosystem": return [
      { title: "Anggota terdata", value: s.membership?.total ?? "—", note: s.membership ? s.membership.active + " berstatus aktif" : "Di luar kewenangan akun", icon: Users },
      { title: "Perlu verifikasi", value: s.membership?.needsVerification ?? "—", note: "Data anggota yang belum terverifikasi", icon: ShieldCheck },
      { title: "Pembaruan terakhir", value: dateLabel(s.latestUpdate), note: s.visibleRecords + " catatan dalam ruang lingkup akses", icon: CalendarClock },
    ];
    case "finance": return [
      { title: "Transaksi tercatat", value: s.finance?.transactions ?? "—", note: (s.finance?.missingEvidence ?? 0) + " tanpa bukti lampiran", icon: Wallet },
      { title: "Saldo buku kas", value: !s.finance ? "—" : s.finance.balanceSafe ? rupiah(s.finance.balance) : "Perlu rekonsiliasi", note: !s.finance ? "Data keuangan tidak termasuk kewenangan akun ini" : s.finance.balanceSafe ? "Dari transaksi terbaca dan tervalidasi" : "Saldo disembunyikan bila data belum lengkap/tidak valid", icon: CheckCircle2 },
      { title: "Transaksi perlu pemeriksaan", value: s.finance?.invalidTransactions ?? "—", note: "Nilai transaksi yang tidak lolos validasi", icon: AlertTriangle },
    ];
    case "publication": return [
      { title: "Konten terbit", value: s.publication?.published ?? "—", note: (s.publication?.drafts ?? 0) + " konten masih draf", icon: Megaphone },
      { title: "Dokumentasi galeri", value: s.publication?.galleryItems ?? "—", note: "Item galeri yang tercatat", icon: Camera },
      { title: "Izin perlu diperiksa", value: s.publication?.permissionNeedsReview ?? "—", note: "Media dengan status izin belum jelas", icon: ShieldCheck },
    ];
    case "system": return [
      { title: "Temuan kualitas data", value: s.qualityFindings, note: s.warningFindings + " peringatan · " + s.infoFindings + " pengingat", icon: AlertTriangle },
      { title: "Catatan dalam akses", value: s.visibleRecords, note: "Data yang terlihat sesuai kewenangan akun", icon: Files },
      { title: "Pembaruan terakhir", value: dateLabel(s.latestUpdate), note: "Perubahan data terbaru yang dapat diakses", icon: CalendarClock },
    ];
  }
}

export default function EnterpriseDashboardOverview({ dashboard, user }: { dashboard: EnterpriseDashboard; user: Principal }) {
  const { rows, files, loading, error, load } = useWorkspaceData();
  const snapshot = useMemo(() => buildEnterpriseMonitoring(rows, files, user), [rows, files, user]);
  const metrics = useMemo(() => dashboardMetrics(dashboard.id, snapshot), [dashboard.id, snapshot]);
  const briefing = useMemo(() => {
    const count = snapshot.issues.length;
    return {
      state: count ? "attention" as const : "steady" as const,
      eyebrow: "STATUS DATA",
      title: count ? "Catatan memerlukan perhatian" : "Tidak ada temuan prioritas",
      description: count ? `${count} catatan memerlukan pemeriksaan sesuai kewenangan.` : "Tidak ada catatan prioritas berdasarkan data yang tersedia.",
      actions: [] as { id: string; href: string; title: string; detail: string; actionLabel: string }[],
    };
  }, [snapshot]);
  const utilities = getVisibleEnterpriseUtilities(user.role);
  const issues = snapshot.issues.slice(0, 5);
  const recentRecords = useMemo(
    () => [...rows]
      .sort((a, b) => {
        const aDate = Date.parse(a.updated || a.created || "");
        const bDate = Date.parse(b.updated || b.created || "");
        return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
      })
      .slice(0, 4),
    [rows],
  );
  const firstFeature = dashboard.features[0];
  const AppearanceIcon = briefingAppearance[briefing.state].icon;

  return (
    <main className="workspace-page" aria-labelledby="dashboard-overview-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrows[dashboard.id]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="dashboard-overview-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{dashboard.label}</h1>
          <Badge variant="outline"></Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{dashboard.description}</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Data belum berhasil dimuat</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void load()}>Muat ulang data</Button>
          </AlertDescription>
        </Alert>
      )}

      <section
        className={"overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm sm:p-6 " + briefingAppearance[briefing.state].border + " " + briefingAppearance[briefing.state].background}
        aria-labelledby="workspace-briefing-title"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-xl border bg-background/80 text-primary">
                <AppearanceIcon className="size-4" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">{briefing.eyebrow}</p>
              <Badge variant="outline" className={briefingAppearance[briefing.state].badgeClass}>
                {briefing.state === "attention" ? "Perlu tindak lanjut" : briefing.state === "steady" ? "Terkendali" : "Sesuai hak akses"}
              </Badge>
            </div>
            <h2 id="workspace-briefing-title" className="text-xl font-semibold tracking-tight sm:text-2xl">{briefing.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{briefing.description}</p>
          </div>
          <div className="rounded-xl border bg-background/75 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Catatan dalam akses</p>
            <p className="text-2xl font-semibold tabular-nums">{loading ? "…" : snapshot.visibleRecords}</p>
            <p className="text-xs text-muted-foreground">Pembaruan: {dateLabel(snapshot.latestUpdate)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28" />)
          ) : briefing.actions.length ? (
            briefing.actions.map((action, index) => (
              <Link
                key={action.id}
                href={action.href}
                className="group flex min-h-32 flex-col justify-between rounded-xl border bg-background/85 p-4 transition-colors hover:border-primary/50 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground">PRIORITAS 0{index + 1}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{action.detail}</p>
                  <span className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary">{action.actionLabel}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-background/70 p-4 md:col-span-2 xl:col-span-3">
              <p className="text-sm font-medium">"Tidak ada tindak lanjut prioritas."</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                "Tidak ada catatan prioritas berdasarkan data yang dapat diakses."
              </p>
              {firstFeature && <Link className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline" href={firstFeature.href}>{firstFeature.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
            </div>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Rekomendasi ini berasal dari data aktual yang terlihat oleh akun Anda. Tidak ada perubahan data yang dilakukan dari kartu ringkasan ini.
        </p>
      </section>

      <section className="space-y-3" aria-label={"Ringkasan " + dashboard.label}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-base font-semibold">Kondisi saat ini</h2><p className="text-sm text-muted-foreground">Nilai berdasarkan data yang tersedia. Data yang belum tercatat tidak ditampilkan sebagai nol.</p><p className="mt-1 text-xs text-muted-foreground">{loading ? "Sedang mengambil data terbaru…" : "Pembaruan sumber: " + dateLabel(snapshot.latestUpdate)}</p></div>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={"size-4" + (loading ? " animate-spin" : "")} aria-hidden="true" />
            Perbarui data
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />) : metrics.map((m) => <WorkspaceMetric key={m.title} title={m.title} value={m.value} note={m.note} icon={m.icon} />)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Perlu perhatian</CardTitle>
                <CardDescription>Temuan berasal dari kelengkapan dan status catatan yang tersedia. Buka catatan sumber untuk memeriksa konteksnya.</CardDescription>
              </div>
              <Badge variant="outline">{snapshot.issues.length} temuan</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-28 w-full" /> : issues.length ? issues.map((issue) => (
              <Link key={issue.id} href={recordHref(issue.row)} className="flex min-h-16 items-start justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{issue.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{issue.detail}</span>
                </span>
                <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed p-5">
                <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />Tidak ada temuan prioritas yang terdeteksi</div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">Pemeriksaan ini hanya mencakup catatan yang dapat diakses saat ini. Lanjutkan pembaruan agar kondisi tetap relevan.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Administrasi dan pemantauan</CardTitle>
            <CardDescription>Akses pemantauan dan administrasi sesuai kewenangan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {utilities.map((item) => (
              <Link key={item.id} href={item.href} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="min-w-0"><span className="block font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
                <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
            <Link href="/dashboard/panduan" className="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="flex min-w-0 items-center gap-2"><BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" /><span><span className="block font-medium">Bantuan</span><span className="block text-xs text-muted-foreground">Dokumen bantuan dan ketentuan penggunaan.</span></span></span>
              <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">Setiap perubahan dicatat pada modul sumber.</div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="recent-workspace-records-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="recent-workspace-records-title" className="text-base font-semibold">Aktivitas yang baru tercatat</h2>
            <p className="text-sm text-muted-foreground">Catatan terbaru yang berada dalam lingkup akses Anda. Pilih catatan untuk membuka sumbernya.</p>
          </div>
          <Badge variant="outline">{loading ? "…" : recentRecords.length + " catatan terbaru"}</Badge>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}
          </div>
        ) : recentRecords.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recentRecords.map((row) => (
              <Link key={row.id} href={recordHref(row)} className="group min-w-0 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">{modules[row.kind]?.title || row.kind}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
                <h3 className="mt-3 line-clamp-2 font-semibold">{String(row.data.name || "Catatan tanpa judul")}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{row.updated ? "Diperbarui " : "Dicatat "}{dateLabel(row.updated || row.created || null)}</p>
                {row.data.status ? <p className="mt-2 text-xs text-muted-foreground">Status: {String(row.data.status)}</p> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-5">
            <p className="text-sm font-medium">Belum ada catatan untuk ditampilkan</p>
            <p className="mt-1 text-sm text-muted-foreground">Saat aktivitas baru dicatat pada modul yang dapat Anda akses, pembaruan terbaru akan muncul di sini.</p>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-label={"Modul " + dashboard.label}>
        <div><h2 className="text-base font-semibold">Ruang kerja Anda</h2><p className="text-sm text-muted-foreground">Modul utama. Seluruh menu tersedia pada navigasi utama.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboard.features.slice(0, 4).map((feature) => {
            const label = user.role === "anggota" && feature.id === "anggota" ? "Data saya" : feature.label;
            const Icon = featureIcons[feature.id] ?? LayoutGrid;
            return (
              <Link key={feature.id} href={feature.href} className="group flex min-h-36 flex-col justify-between rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-primary/5 text-primary"><Icon size={19} aria-hidden="true" /></span>
                  <ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold">{label}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{feature.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
