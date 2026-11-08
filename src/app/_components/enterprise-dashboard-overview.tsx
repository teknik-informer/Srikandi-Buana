"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2,
  ClipboardCheck, Clock3, FileCheck2, FileText, LayoutGrid, Newspaper,
  ShieldCheck, Users, Wallet,
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

const eyebrows: Record<EnterpriseDashboardId, string> = {
  ecosystem: "LAYANAN TERPADU",
  management: "PERENCANAAN & PENGENDALIAN",
  administration: "DATA & DOKUMEN RESMI",
  finance: "KEUANGAN & ASET",
  commerce: "USAHA & RANTAI PASOK",
  publication: "INFORMASI PUBLIK",
  system: "KONFIGURASI & AKUN",
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
      { title: "Pembaruan terakhir", value: dateLabel(s.latestUpdate), note: s.visibleRecords + " catatan dalam ruang lingkup akses", icon: Clock3 },
    ];
    case "management": return [
      { title: "Tugas terbuka", value: s.operational?.openTasks ?? "—", note: (s.operational?.overdueTasks ?? 0) + " melewati tenggat", icon: ClipboardCheck },
      { title: "Jatuh tempo hari ini", value: s.operational?.dueToday ?? "—", note: "Tugas aktif yang perlu ditindaklanjuti", icon: CalendarClock },
      { title: "Menunggu verifikasi", value: s.operational?.tasksAwaitingVerification ?? "—", note: (s.operational?.tasksNeedingCorrection ?? 0) + " perlu perbaikan", icon: FileCheck2 },
      { title: "Program terkendala", value: s.operational?.blockedPrograms ?? "—", note: "Berdasarkan laporan perkembangan tercatat", icon: AlertTriangle },
    ];
    case "administration": return [
      { title: "Anggota terdata", value: s.membership?.total ?? "—", note: s.membership ? s.membership.needsVerification + " menunggu verifikasi" : "Tidak tersedia untuk akun ini", icon: Users },
      { title: "Dokumen terdaftar", value: s.administration?.documents ?? "—", note: (s.administration?.needsReview ?? 0) + " memerlukan pemeriksaan", icon: FileText },
      { title: "Lampiran bermasalah", value: s.administration?.missingAttachments ?? "—", note: "Referensi lampiran tidak tersedia pada arsip", icon: FileCheck2 },
    ];
    case "finance": return [
      { title: "Transaksi tercatat", value: s.finance?.transactions ?? "—", note: (s.finance?.missingEvidence ?? 0) + " tanpa bukti lampiran", icon: Wallet },
      { title: "Saldo buku kas", value: s.finance?.balanceSafe ? rupiah(s.finance.balance) : "Perlu rekonsiliasi", note: s.finance?.balanceSafe ? "Dari transaksi terbaca dan tervalidasi" : "Saldo disembunyikan bila data belum lengkap/tidak valid", icon: CheckCircle2 },
      { title: "Transaksi perlu pemeriksaan", value: s.finance?.invalidTransactions ?? "—", note: "Nilai transaksi yang tidak lolos validasi", icon: AlertTriangle },
    ];
    case "commerce": return [
      { title: "Lot penerimaan", value: s.business?.lots ?? "—", note: (s.business?.lotsOnHold ?? 0) + " ditahan/menunggu pemeriksaan", icon: Activity },
      { title: "Kemitraan tercatat", value: s.business?.partnerships ?? "—", note: "Catatan kemitraan yang dapat diakses", icon: Users },
      { title: "Rencana usaha", value: s.business?.businessPlans ?? "—", note: "Kajian dan rencana usaha tercatat", icon: FileText },
    ];
    case "publication": return [
      { title: "Konten terbit", value: s.publication?.published ?? "—", note: (s.publication?.drafts ?? 0) + " konten masih draf", icon: Newspaper },
      { title: "Dokumentasi galeri", value: s.publication?.galleryItems ?? "—", note: "Item galeri yang tercatat", icon: FileText },
      { title: "Izin perlu diperiksa", value: s.publication?.permissionNeedsReview ?? "—", note: "Media dengan status izin belum jelas", icon: ShieldCheck },
    ];
    case "system": return [
      { title: "Temuan kualitas data", value: s.qualityFindings, note: s.warningFindings + " peringatan · " + s.infoFindings + " pengingat", icon: AlertTriangle },
      { title: "Catatan dalam akses", value: s.visibleRecords, note: "Data yang terlihat sesuai kewenangan akun", icon: FileText },
      { title: "Pembaruan terakhir", value: dateLabel(s.latestUpdate), note: "Perubahan data terbaru yang dapat diakses", icon: Clock3 },
    ];
  }
}

export default function EnterpriseDashboardOverview({ dashboard, user }: { dashboard: EnterpriseDashboard; user: Principal }) {
  const { rows, files, loading, error, load } = useWorkspaceData();
  const snapshot = useMemo(() => buildEnterpriseMonitoring(rows, files, user), [rows, files, user]);
  const metrics = useMemo(() => dashboardMetrics(dashboard.id, snapshot), [dashboard.id, snapshot]);
  const utilities = getVisibleEnterpriseUtilities(user.role);
  const issues = snapshot.issues.slice(0, 5);

  return (
    <main className="workspace-page space-y-7" aria-labelledby="dashboard-overview-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrows[dashboard.id]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="dashboard-overview-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard {dashboard.label}</h1>
          <Badge variant="outline">{dashboard.features.length} modul tersedia</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{dashboard.description} Ringkasan dihitung dari catatan yang dapat diakses oleh akun Anda.</p>
      </header>

      {error && <Alert variant="destructive"><AlertTriangle /><AlertTitle>Data belum berhasil dimuat</AlertTitle><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void load()}>Coba muat ulang</Button></AlertDescription></Alert>}

      <section className="space-y-3" aria-label={"Ringkasan " + dashboard.label}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-base font-semibold">Ringkasan operasional</h2><p className="text-sm text-muted-foreground">Angka aktual sesuai hak akses, bukan data contoh.</p></div>
          <span className="text-xs text-muted-foreground">{loading ? "Memuat data…" : "Diperbarui " + dateLabel(snapshot.latestUpdate)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />) : metrics.map((m) => <WorkspaceMetric key={m.title} title={m.title} value={m.value} note={m.note} icon={m.icon} />)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card className="min-w-0">
          <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><CardTitle className="text-base">Prioritas yang perlu ditindaklanjuti</CardTitle><CardDescription>Temuan berasal dari kelengkapan dan status catatan yang tersedia.</CardDescription></div><Badge variant="outline">{snapshot.issues.length} temuan</Badge></div></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-28 w-full" /> : issues.length ? issues.map((issue) => <Link key={issue.id} href={recordHref(issue.row)} className="flex min-h-16 items-start justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="min-w-0"><span className="block text-sm font-medium">{issue.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{issue.detail}</span></span><ArrowUpRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" /></Link>) : <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Belum ada temuan pada catatan yang dapat diakses. Periksa kembali setelah ada pembaruan data.</div>}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-base">Akses kerja cepat</CardTitle><CardDescription>Menu lintas dashboard sesuai peran Anda.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {utilities.map((item) => <Link key={item.id} href={item.href} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="min-w-0"><span className="block font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span><ArrowUpRight size={16} className="shrink-0" aria-hidden="true" /></Link>)}
            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">Perubahan data tetap dilakukan melalui modul sumber agar riwayat dan pemeriksaan terjaga.</div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-label={"Modul " + dashboard.label}>
        <div><h2 className="text-base font-semibold">Modul kerja</h2><p className="text-sm text-muted-foreground">Buka modul sumber untuk membuat, memeriksa, atau memperbarui catatan.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboard.features.map((feature) => {
            const label = user.role === "anggota" && feature.id === "anggota" ? "Data saya" : feature.label;
            return <Link key={feature.id} href={feature.href} className="group flex min-h-32 flex-col justify-between rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><div className="flex items-start justify-between gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><LayoutGrid size={18} aria-hidden="true" /></div><ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></div><div className="mt-4"><h3 className="font-semibold">{label}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{feature.description}</p></div></Link>;
          })}
        </div>
      </section>
    </main>
  );
}
