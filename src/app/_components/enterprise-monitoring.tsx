"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  Boxes,
  Newspaper,
  Server,
  Clock3,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { canReadRecord, canReadSection, visibleRecord, type Principal } from "@/lib/permissions";
import { modules } from "@/lib/srikandi";
import { buildEnterpriseMonitoring } from "@/lib/enterprise-monitoring";
import { recordHref, taskStatus } from "@/lib/management-insights";
import type { WorkspaceAudit, WorkspaceFile, AssetMovement } from "@/lib/workspace-types";
import type { Row } from "@/lib/srikandi";
import { StatusBadge, WorkspaceMetric, WorkspacePageHeader } from "./workspace-ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type Probe = {
  state: "checking" | "ok" | "error";
  latency: number | null;
  detail: string;
};

type SystemHealth = {
  api: Probe;
  database: Probe;
  checkedAt: string | null;
};

const monitoringChartConfig = {
  tasks: { label: "Tugas baru", color: "var(--color-chart-2)" },
  reports: { label: "Laporan program", color: "var(--color-chart-4)" },
  activities: { label: "Agenda baru", color: "var(--color-chart-5)" },
  count: { label: "Jumlah", color: "var(--color-chart-2)" },
  warning: { label: "Peringatan", color: "var(--color-chart-5)" },
  info: { label: "Pengingat", color: "var(--color-chart-3)" },
  openTasks: { label: "Tugas terbuka", color: "var(--color-chart-2)" },
  programReports: { label: "Laporan tercatat", color: "var(--color-chart-4)" },
  blocked: { label: "Program terkendala", color: "var(--color-chart-5)" },
} satisfies ChartConfig;

function jakartaMonthKey(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? year + "-" + month : null;
}

const checkingProbe: Probe = {
  state: "checking",
  latency: null,
  detail: "Sedang diperiksa",
};

function displayDate(value: string | null) {
  if (!value) return "Belum ada catatan";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })
    : "Tanggal tidak valid";
}

function HealthCard({
  title,
  description,
  probe,
  icon: Icon,
}: {
  title: string;
  description: string;
  probe: Probe;
  icon: typeof Server;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <span className="rounded-lg border p-2 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge value={
          probe.state === "checking" ? "Memeriksa" :
          probe.state === "ok" ? "Siap" : "Perlu diperiksa"
        } />
        <span className="text-sm tabular-nums text-muted-foreground">
          {probe.latency === null ? "—" : probe.latency + " ms"}
        </span>
        <p className="w-full text-xs text-muted-foreground">{probe.detail}</p>
      </CardContent>
    </Card>
  );
}

export default function EnterpriseMonitoring({
  rows,
  files,
  audit = [],
  assetMovements = [],
  user,
  loading,
  error,
  onRefresh,
}: {
  rows: Row[];
  files: WorkspaceFile[];
  audit?: WorkspaceAudit[];
  assetMovements?: AssetMovement[];
  user: Principal;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const snapshot = useMemo(
    () => buildEnterpriseMonitoring(rows, files, user),
    [rows, files, user],
  );
  const [health, setHealth] = useState<SystemHealth>({
    api: checkingProbe,
    database: checkingProbe,
    checkedAt: null,
  });
  const [checking, setChecking] = useState(false);

  const checkSystem = useCallback(async () => {
    setChecking(true);
    setHealth((current) => ({
      ...current,
      api: checkingProbe,
      database: checkingProbe,
    }));

    const probe = async (
      endpoint: string,
      expected: "ok" | "ready",
      label: string,
    ): Promise<Probe> => {
      const started = Date.now();
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = await response.json() as Record<string, unknown>;
        if (!response.ok || payload.status !== expected) {
          throw new Error("Endpoint merespons " + response.status + ".");
        }
        if (expected === "ready" && payload.database !== "ok") {
          throw new Error("Koneksi database belum siap.");
        }
        return {
          state: "ok",
          latency: Math.max(0, Date.now() - started),
          detail: label + " merespons normal.",
        };
      } catch (cause) {
        return {
          state: "error",
          latency: null,
          detail: cause instanceof Error ? cause.message : "Pemeriksaan gagal.",
        };
      }
    };

    const [api, database] = await Promise.all([
      probe("/api/health", "ok", "Health API"),
      probe("/api/ready", "ready", "Readiness API dan database"),
    ]);
    setHealth({ api, database, checkedAt: new Date().toISOString() });
    setChecking(false);
  }, []);

  useEffect(() => {
    // Defer the first probe so the effect only schedules synchronization work;
    // state updates happen from the scheduled callback, not during the effect.
    const initial = window.setTimeout(() => void checkSystem(), 0);
    const interval = window.setInterval(() => void checkSystem(), 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [checkSystem]);

  const operational = snapshot.operational;
  const metrics = [
    operational && {
      title: "Tugas terbuka",
      value: operational.openTasks,
      note: operational.overdueTasks + " melewati tenggat · " + operational.dueToday + " jatuh tempo hari ini",
      icon: ClipboardCheck,
    },
    operational && {
      title: "Tugas tanpa PIC",
      value: operational.tasksWithoutAssignee,
      note: "Pekerjaan terbuka yang belum memiliki pelaksana",
      icon: Users,
    },
    operational && {
      title: "Tugas tanpa tenggat",
      value: operational.tasksWithoutDueDate,
      note: "Tetapkan tanggal berdasarkan keputusan pengurus",
      icon: CalendarClock,
    },
    operational && {
      title: "Hasil menunggu verifikasi",
      value: operational.tasksAwaitingVerification,
      note: "Penyelesaian diajukan oleh pelaksana",
      icon: FileCheck2,
    },
    operational && {
      title: "Hasil perlu perbaikan",
      value: operational.tasksNeedingCorrection,
      note: "Baca catatan pemeriksaan Ketua",
      icon: AlertTriangle,
    },
    operational && {
      title: "Program terkendala",
      value: operational.blockedPrograms,
      note: "Berdasarkan laporan Koordinator yang tersedia",
      icon: Activity,
    },
    operational && {
      title: "Agenda mendatang",
      value: operational.upcomingActivities,
      note: operational.unresolvedPastActivities + " kegiatan lewat tanggal belum ditutup",
      icon: CalendarClock,
    },
    snapshot.membership && {
      title: "Keanggotaan",
      value: snapshot.membership.total,
      note: snapshot.membership.needsVerification + " belum terverifikasi",
      icon: Users,
    },
    {
      title: "Temuan kualitas data",
      value: snapshot.qualityFindings,
      note: snapshot.warningFindings + " perlu perhatian · " + snapshot.infoFindings + " pengingat",
      icon: AlertTriangle,
    },
    snapshot.finance && {
      title: "Transaksi kas",
      value: snapshot.finance.transactions,
      note: snapshot.finance.missingEvidence + " belum memiliki lampiran bukti",
      icon: Wallet,
    },
    snapshot.business && {
      title: "Aset kelompok dipinjam",
      value: snapshot.business.borrowedAssets,
      note: snapshot.business.overdueAssets + " terlambat · " + snapshot.business.assetsWithoutReturnDate + " tanpa tanggal kembali",
      icon: Boxes,
    },
    snapshot.business && {
      title: "Aset perlu penanganan",
      value: snapshot.business.damagedAssets + snapshot.business.maintenanceAssets,
      note: snapshot.business.damagedAssets + " rusak/hilang · " + snapshot.business.maintenanceAssets + " perawatan",
      icon: AlertTriangle,
    },
    snapshot.business && {
      title: "Kepemilikan belum jelas",
      value: snapshot.business.unclassifiedAssets,
      note: snapshot.business.memberOwnedAssets + " aset milik anggota dipisahkan dari inventaris kelompok",
      icon: ShieldCheck,
    },
  ].filter(Boolean) as Array<{
    title: string;
    value: number;
    note: string;
    icon: typeof Activity;
  }>;

  const domains = [
    operational && {
      title: "Program & aktivitas",
      description: operational.programs + " program · " + operational.openTasks + " tugas aktif · " + operational.tasksWithoutAssignee + " tanpa PIC · " + operational.tasksWithoutDueDate + " tanpa tenggat · " + operational.tasksAwaitingVerification + " hasil menunggu verifikasi · " + operational.blockedPrograms + " program terkendala.",
      href: canReadSection(user, "tindaklanjut") ? "/dashboard/tindaklanjut" : "/dashboard/kegiatan",
      label: "Buka operasional",
      icon: Activity,
      attention: operational.overdueTasks + operational.unresolvedPastActivities + operational.tasksWithoutAssignee + operational.tasksWithoutDueDate + operational.tasksAwaitingVerification + operational.tasksNeedingCorrection + operational.blockedPrograms,
    },
    snapshot.membership && {
      title: "Keanggotaan",
      description: snapshot.membership.active + " anggota aktif · " + snapshot.membership.needsVerification + " menunggu verifikasi · " + snapshot.membership.consentNeedsReview + " persetujuan perlu diperiksa.",
      href: "/dashboard/anggota",
      label: "Buka keanggotaan",
      icon: Users,
      attention: snapshot.membership.needsVerification + snapshot.membership.consentNeedsReview,
    },
    snapshot.administration && {
      title: "Administrasi & dokumen",
      description: snapshot.administration.documents + " catatan dokumen · " + snapshot.administration.needsReview + " perlu ditinjau · " + snapshot.administration.missingAttachments + " lampiran tidak ditemukan.",
      href: canReadSection(user, "register") ? "/dashboard/register" : "/dashboard/kelembagaan",
      label: "Buka administrasi",
      icon: FileCheck2,
      attention: snapshot.administration.needsReview + snapshot.administration.missingAttachments,
    },
    snapshot.finance && {
      title: "Keuangan",
      description: snapshot.finance.balanceSafe
        ? snapshot.finance.transactions + " transaksi · " + snapshot.finance.missingEvidence + " belum memiliki bukti · saldo buku kas tersedia."
        : snapshot.finance.transactions + " transaksi · saldo tidak ditampilkan karena data perlu pemeriksaan.",
      href: "/dashboard/kas",
      label: "Buka buku kas",
      icon: Wallet,
      attention: snapshot.finance.missingEvidence + snapshot.finance.invalidTransactions,
    },
    snapshot.business && {
      title: "Usaha & aset",
      description: snapshot.business.groupAssets + " aset milik kelompok · " + snapshot.business.borrowedAssets + " dipinjam · " + snapshot.business.overdueAssets + " terlambat kembali · " + snapshot.business.assetsWithoutReturnDate + " tanpa tanggal kembali · " + snapshot.business.memberOwnedAssets + " aset pribadi dipisahkan · " + snapshot.business.unclassifiedAssets + " belum jelas kepemilikannya · " + snapshot.business.lotsOnHold + " lot menunggu pemeriksaan/ditahan.",
      href: canReadSection(user, "aset") ? "/dashboard/aset" : "/dashboard/lotkopi",
      label: "Buka usaha & aset",
      icon: Boxes,
      attention: snapshot.business.assetsNeedAttention + snapshot.business.overdueAssets + snapshot.business.assetsWithoutReturnDate + snapshot.business.unclassifiedAssets + snapshot.business.lotsOnHold,
    },
    snapshot.publication && {
      title: "Publikasi",
      description: snapshot.publication.content + " konten · " + snapshot.publication.drafts + " draf · " + snapshot.publication.permissionNeedsReview + " izin foto perlu diperiksa.",
      href: "/dashboard/publikasi",
      label: "Buka publikasi",
      icon: Newspaper,
      attention: snapshot.publication.drafts + snapshot.publication.permissionNeedsReview,
    },
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    href: string;
    label: string;
    icon: typeof Activity;
    attention: number;
  }>;

  const visibleIssues = snapshot.issues
    .filter((issue) => canReadRecord(user, issue.row))
    .sort((a, b) => Number(b.severity === "warning") - Number(a.severity === "warning"))
    .slice(0, 12);

  // The same record-level permissions and field redaction used by operational
  // summaries are applied before chart data is derived.
  const chartRows = useMemo(
    () => rows.filter((row) => canReadRecord(user, row)).map((row) => visibleRecord(user, row) as Row),
    [rows, user],
  );

  const activityTrend = useMemo(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 6 + index, 1));
      const key = date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
      return {
        key,
        label: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(date),
        tasks: 0,
        reports: 0,
        activities: 0,
      };
    });
    const byMonth = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const row of chartRows) {
      const key = jakartaMonthKey(row.created);
      const bucket = key ? byMonth.get(key) : undefined;
      if (!bucket) continue;
      if (row.kind === "tindaklanjut") bucket.tasks += 1;
      if (row.kind === "laporan_program") bucket.reports += 1;
      if (row.kind === "kegiatan") bucket.activities += 1;
    }
    return buckets;
  }, [chartRows]);

  const taskStatusData = useMemo(() => {
    const counts = new Map<string, number>([
      ["Belum dimulai", 0],
      ["Berjalan", 0],
      ["Selesai", 0],
      ["Ditunda", 0],
    ]);
    for (const row of chartRows.filter((item) => item.kind === "tindaklanjut")) {
      const status = taskStatus(row);
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    return Array.from(counts, ([label, count]) => ({ label, count }));
  }, [chartRows]);

  const attentionData = operational ? [
    { label: "Melewati tenggat", count: operational.overdueTasks },
    { label: "Jatuh tempo hari ini", count: operational.dueToday },
    { label: "Tanpa penanggung jawab", count: operational.tasksWithoutAssignee },
    { label: "Tanpa tanggal tenggat", count: operational.tasksWithoutDueDate },
    { label: "Menunggu verifikasi", count: operational.tasksAwaitingVerification },
    { label: "Perlu perbaikan", count: operational.tasksNeedingCorrection },
    { label: "Kegiatan lewat tanggal", count: operational.unresolvedPastActivities },
  ] : [];

  const qualityByModule = useMemo(() => {
    const grouped = new Map<string, { label: string; warning: number; info: number }>();
    for (const issue of snapshot.issues) {
      const key = issue.row.kind;
      const current = grouped.get(key) || {
        label: modules[key]?.title || key.replaceAll("_", " "),
        warning: 0,
        info: 0,
      };
      if (issue.severity === "warning") current.warning += 1;
      else current.info += 1;
      grouped.set(key, current);
    }
    return Array.from(grouped.values())
      .sort((a, b) => (b.warning + b.info) - (a.warning + a.info) || a.label.localeCompare(b.label, "id"))
      .slice(0, 8);
  }, [snapshot.issues]);

  const programChartRows = useMemo(
    () => snapshot.programEvaluations
      .map((program) => ({
        program: program.programName,
        programReports: program.reportCount,
        openTasks: program.openTasks.length,
        blocked: Number(program.blocked),
      }))
      .filter((program) => program.programReports > 0 || program.openTasks > 0 || program.blocked > 0)
      .sort((a, b) =>
        (b.programReports + b.openTasks + b.blocked) - (a.programReports + a.openTasks + a.blocked) ||
        a.program.localeCompare(b.program, "id"),
      )
      .slice(0, 8),
    [snapshot.programEvaluations],
  );

  if (loading) {
    return (
      <div className="workspace-page">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="workspace-page min-w-0">
      <WorkspacePageHeader
        title="Monitoring operasional"
        eyebrow="PEMANTAUAN TERPADU"
        description="Pantau kesiapan aplikasi, pekerjaan lintas bagian, kualitas data, dan hal yang membutuhkan tindak lanjut."
        actions={
          <>
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw data-icon="inline-start" />
              Muat ulang data
            </Button>
            <Button variant="outline" onClick={() => void checkSystem()} disabled={checking}>
              <Activity data-icon="inline-start" />
              {checking ? "Memeriksa…" : "Periksa sistem"}
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Data monitoring belum lengkap</AlertTitle>
          <AlertDescription>{error} Sebagian indikator dapat belum mencerminkan kondisi terbaru.</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="monitoring-next-step-title">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/60">
                <ClipboardCheck className="size-5 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Langkah berikutnya</p>
                {visibleIssues[0] ? (
                  <>
                    <h2 id="monitoring-next-step-title" className="mt-1 font-semibold">{visibleIssues[0].title}</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{visibleIssues[0].detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Saran awal berdasarkan tingkat perhatian dan catatan yang dapat Anda akses. Periksa sumber sebelum mengambil keputusan.</p>
                  </>
                ) : (
                  <>
                    <h2 id="monitoring-next-step-title" className="mt-1 font-semibold">Belum ada perhatian prioritas yang terdeteksi</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">Lanjutkan pencatatan rutin dan tinjau kembali setelah ada pembaruan. Ketiadaan temuan otomatis bukan pengganti pemeriksaan petugas.</p>
                  </>
                )}
              </div>
            </div>
            {visibleIssues[0] && (
              <Button variant="outline" asChild className="shrink-0">
                <Link href={recordHref(visibleIssues[0].row)}>Periksa sumber</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="monitoring-system-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="monitoring-system-title" className="text-base font-semibold">Kondisi aplikasi</h2>
            <p className="text-sm text-muted-foreground">Pemeriksaan langsung terhadap endpoint health dan kesiapan koneksi database.</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {health.checkedAt ? "Pemeriksaan " + displayDate(health.checkedAt) : "Belum diperiksa"}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <HealthCard
            title="API aplikasi"
            description="Pemeriksaan endpoint /api/health."
            probe={health.api}
            icon={Server}
          />
          <HealthCard
            title="Database"
            description="Pemeriksaan endpoint /api/ready dan koneksi database."
            probe={health.database}
            icon={Database}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Status ini adalah pemeriksaan keterjangkauan endpoint saat ini, bukan pengukuran uptime historis atau pemantauan layanan eksternal yang belum diintegrasikan.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="monitoring-kpi-title">
        <h2 id="monitoring-kpi-title" className="text-base font-semibold">Indikator operasional</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <WorkspaceMetric
              key={metric.title}
              title={metric.title}
              value={metric.value}
              note={metric.note}
              icon={metric.icon}
            />
          ))}
          <WorkspaceMetric
            title="Catatan terbaca"
            value={snapshot.visibleRecords}
            note={"Catatan terlihat sesuai hak akses · terakhir diperbarui " + displayDate(snapshot.latestUpdate)}
            icon={Clock3}
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="monitoring-analytics-title">
        <div>
          <h2 id="monitoring-analytics-title" className="text-base font-semibold">Analisis grafik monitoring</h2>
          <p className="text-sm text-muted-foreground">Indikator lintas modul untuk membaca ritme kerja, kondisi tugas, kualitas pencatatan, dan perkembangan program dalam cakupan akses Anda.</p>
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Tren aktivitas operasional</CardTitle>
              <CardDescription>Catatan tugas, laporan program, dan agenda baru selama enam bulan terakhir berdasarkan tanggal dibuat.</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : activityTrend.some((item) => item.tasks + item.reports + item.activities > 0) ? (
                <ChartContainer config={monitoringChartConfig} className="h-[260px] w-full aspect-auto">
                  <BarChart data={activityTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="tasks" fill="var(--color-tasks)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="reports" fill="var(--color-reports)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="activities" fill="var(--color-activities)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada catatan tugas, laporan program, atau agenda baru dalam enam bulan terakhir.</div>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Grafik menghitung tanggal pembuatan catatan, bukan tanggal kegiatan atau bukti bahwa program telah selesai.</p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Status pekerjaan</CardTitle>
              <CardDescription>Distribusi seluruh tugas yang dapat Anda akses menurut status pencatatan saat ini.</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : taskStatusData.some((item) => item.count > 0) ? (
                <ChartContainer config={monitoringChartConfig} className="h-[260px] w-full aspect-auto">
                  <BarChart data={taskStatusData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }} accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={112} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada tugas yang tercatat pada ruang lingkup akses ini.</div>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Status “Selesai” mengikuti isian tugas. Pengesahan hasil tetap dihitung terpisah pada indikator verifikasi.</p>
            </CardContent>
          </Card>

          {operational && (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-base">Beban tindak lanjut</CardTitle>
                <CardDescription>Jumlah kondisi yang perlu diperhatikan agar pengurus dapat menentukan prioritas tindakan.</CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                {loading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : attentionData.some((item) => item.count > 0) ? (
                  <ChartContainer config={monitoringChartConfig} className="h-[280px] w-full aspect-auto">
                    <BarChart data={attentionData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }} accessibilityLayer>
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="label" width={148} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Tidak ada kondisi tindak lanjut yang terhitung pada data saat ini.</div>
                )}
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Kategori dapat saling tumpang tindih; misalnya satu tugas dapat terlambat sekaligus belum memiliki penanggung jawab. Jumlah batang tidak dijumlahkan menjadi total unik.</p>
              </CardContent>
            </Card>
          )}

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Kualitas data per bagian</CardTitle>
              <CardDescription>Perbandingan temuan peringatan dan pengingat berdasarkan modul sumber.</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : qualityByModule.length ? (
                <ChartContainer config={monitoringChartConfig} className="h-[280px] w-full aspect-auto">
                  <BarChart data={qualityByModule} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }} accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="warning" stackId="quality" fill="var(--color-warning)" radius={[0, 3, 3, 0]} maxBarSize={20} />
                    <Bar dataKey="info" stackId="quality" fill="var(--color-info)" radius={[0, 3, 3, 0]} maxBarSize={20} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada temuan kualitas data dari aturan pemeriksaan yang tersedia.</div>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Satu catatan dapat memiliki lebih dari satu temuan. Ini adalah jumlah temuan, bukan jumlah catatan bermasalah yang unik.</p>
            </CardContent>
          </Card>

          <Card className="min-w-0 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Pemantauan perkembangan program</CardTitle>
              <CardDescription>Perbandingan laporan yang tercatat, tugas aktif, dan sinyal kendala dari laporan terbaru. Tidak digunakan untuk menyimpulkan persentase target tercapai.</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : programChartRows.length ? (
                <ChartContainer config={monitoringChartConfig} className="h-[300px] w-full aspect-auto">
                  <BarChart data={programChartRows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }} accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="program" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="programReports" fill="var(--color-programReports)" radius={[0, 3, 3, 0]} maxBarSize={12} />
                    <Bar dataKey="openTasks" fill="var(--color-openTasks)" radius={[0, 3, 3, 0]} maxBarSize={12} />
                    <Bar dataKey="blocked" fill="var(--color-blocked)" radius={[0, 3, 3, 0]} maxBarSize={12} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada laporan atau tugas program dalam data yang dapat diakses.</div>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Nilai laporan dan tugas adalah jumlah catatan. Sinyal kendala bernilai 1 per program dengan kendala pada laporan terbaru, bukan ukuran tingkat keparahan kendala.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="monitoring-domain-title">
        <div>
          <h2 id="monitoring-domain-title" className="text-base font-semibold">Pemantauan per bagian</h2>
          <p className="text-sm text-muted-foreground">Arahkan perhatian ke modul yang menunjukkan pekerjaan tertunda atau data yang perlu diperiksa.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {domains.map((domain) => {
            const Icon = domain.icon;
            return (
              <Card key={domain.title} className="flex min-w-0 flex-col">
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-base">{domain.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{domain.description}</CardDescription>
                  </div>
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-3">
                  <Badge variant="outline">
                    {domain.attention > 0 ? domain.attention + " perhatian" : "Tidak ada temuan"}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={domain.href}>{domain.label}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {canReadSection(user, "aset") && (
        <section className="space-y-3" aria-labelledby="asset-movement-monitoring-title">
          <div className="space-y-1">
            <h2 id="asset-movement-monitoring-title" className="text-base font-semibold">Riwayat pergerakan aset kelompok</h2>
            <p className="text-sm text-muted-foreground">Peristiwa serah-terima dan pengembalian yang sudah tersinkron ke buku riwayat v14. Status aset saat ini tetap dibaca dari Inventaris Aset.</p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {assetMovements.slice(0, 12).map((event) => (
                <div key={event.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={event.event_type === "issued" ? "Diserahkan" : event.event_type === "returned" ? "Dikembalikan" : event.event_type === "maintenance" ? "Perawatan" : event.event_type === "damaged" ? "Rusak" : event.event_type === "lost" ? "Hilang" : "Perubahan status"} />
                      <span className="text-xs text-muted-foreground">{event.member_name}</span>
                    </div>
                    <p className="text-sm font-medium">{event.asset_name}</p>
                    <p className="text-sm text-muted-foreground">{event.notes || "Tidak ada catatan tambahan."}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{displayDate(event.occurred_at)}</span>
                </div>
              ))}
              {!assetMovements.length && (
                <p className="p-6 text-center text-sm text-muted-foreground">Belum ada peristiwa riwayat pada database yang terhubung. Catatan inventaris lama tetap tersedia; riwayat baru mulai terbentuk setelah sinkronisasi ledger aktif.</p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {["admin", "ketua", "sekretaris"].includes(user.role) && (
        <section className="space-y-3" aria-labelledby="meeting-priorities-title">
          <div className="space-y-1">
            <h2 id="meeting-priorities-title" className="text-base font-semibold">Bahan rapat dan keputusan pengurus</h2>
            <p className="text-sm text-muted-foreground">
              Daftar pembahasan disusun dari laporan Koordinator dan tugas yang tercatat. Gunakan sebagai bahan rapat, bukan keputusan otomatis.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <WorkspaceMetric
              title="Program dengan laporan"
              value={snapshot.programEvaluations.filter((item) => item.hasReportInPeriod).length}
              note="Memiliki laporan pada catatan yang tersedia."
              icon={FileText}
            />
            <WorkspaceMetric
              title="Program terkendala"
              value={snapshot.programEvaluations.filter((item) => item.blocked).length}
              note="Berdasarkan laporan terbaru yang dapat diakses."
              icon={AlertTriangle}
            />
            <WorkspaceMetric
              title="Agenda pembahasan"
              value={snapshot.meetingPriorities.length}
              note="Butir yang perlu dikonfirmasi atau diputuskan."
              icon={ClipboardCheck}
            />
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {snapshot.meetingPriorities.slice(0, 12).map((item) => {
                const target = item.task || item.source;
                const href = target ? recordHref(target) : "/dashboard/laporan_program";
                return (
                  <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.priority === "Tinggi" ? "destructive" : item.priority === "Sedang" ? "secondary" : "outline"}>
                          Prioritas {item.priority.toLocaleLowerCase("id-ID")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Program {item.programId} · {item.programName}</span>
                      </div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link href={href}>{item.task ? "Buka tugas" : item.source ? "Buka laporan" : "Buka laporan program"}</Link>
                    </Button>
                  </div>
                );
              })}
              {!snapshot.meetingPriorities.length && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada butir prioritas otomatis dalam catatan yang dapat diakses. Konfirmasi agenda dan kebutuhan pengurus tetap diperlukan.
                </p>
              )}
              {snapshot.meetingPriorities.length > 12 && (
                <p className="p-4 text-xs text-muted-foreground">
                  Menampilkan 12 dari {snapshot.meetingPriorities.length} butir. Daftar lengkap tersedia di evaluasi program.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="monitoring-quality-title">
        <div>
          <h2 id="monitoring-quality-title" className="text-base font-semibold">Pusat perhatian</h2>
          <p className="text-sm text-muted-foreground">Temuan berasal dari aturan kelengkapan dan konsistensi data. Temuan bukan keputusan otomatis bahwa suatu data salah.</p>
        </div>
        <Card>
          <CardContent className="divide-y p-0">
            {visibleIssues.map((issue) => (
              <div key={issue.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={issue.severity === "warning" ? "Perlu diperiksa" : "Pengingat"} />
                    <span className="text-xs text-muted-foreground">{issue.row.kind}</span>
                  </div>
                  <p className="text-sm font-medium">{issue.title}</p>
                  <p className="text-sm text-muted-foreground">{String(issue.row.data.name || "Catatan tanpa judul")} · {issue.detail}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={recordHref(issue.row)}>Periksa catatan</Link>
                </Button>
              </div>
            ))}
            {!visibleIssues.length && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Tidak ada temuan otomatis pada catatan yang dapat Anda akses. Pemeriksaan bukti dan validitas sumber tetap memerlukan verifikasi petugas.
              </p>
            )}
            {snapshot.issues.length > visibleIssues.length && (
              <div className="p-4 text-xs text-muted-foreground">
                Menampilkan {visibleIssues.length} temuan teratas dari {snapshot.issues.length} temuan dalam cakupan akses Anda.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {["admin", "ketua"].includes(user.role) && audit.length > 0 && (
        <section className="space-y-3" aria-labelledby="monitoring-audit-title">
          <div>
            <h2 id="monitoring-audit-title" className="text-base font-semibold">Aktivitas tercatat</h2>
            <p className="text-sm text-muted-foreground">Perubahan terbaru yang tersedia dalam audit aplikasi.</p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {audit.slice(0, 8).map((entry, index) => (
                <div key={index} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{displayDate(entry.created)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
