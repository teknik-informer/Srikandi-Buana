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
import { canReadRecord, canReadSection, type Principal } from "@/lib/permissions";
import { dateID } from "@/lib/srikandi";
import { buildEnterpriseMonitoring } from "@/lib/enterprise-monitoring";
import { recordHref } from "@/lib/management-insights";
import type { WorkspaceAudit, WorkspaceFile } from "@/lib/workspace-types";
import type { Row } from "@/lib/srikandi";
import { StatusBadge, WorkspaceMetric, WorkspacePageHeader } from "./workspace-ui";

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
  user,
  loading,
  error,
  onRefresh,
}: {
  rows: Row[];
  files: WorkspaceFile[];
  audit?: WorkspaceAudit[];
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
    void checkSystem();
    const interval = window.setInterval(() => void checkSystem(), 60_000);
    return () => window.clearInterval(interval);
  }, [checkSystem]);

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
      description: snapshot.business.assets + " aset · " + snapshot.business.assetsNeedAttention + " kondisi perlu perhatian · " + snapshot.business.lotsOnHold + " lot menunggu pemeriksaan/ditahan.",
      href: canReadSection(user, "aset") ? "/dashboard/aset" : "/dashboard/lotkopi",
      label: "Buka usaha & aset",
      icon: Boxes,
      attention: snapshot.business.assetsNeedAttention + snapshot.business.lotsOnHold,
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

      {user.role === "admin" && audit.length > 0 && (
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
