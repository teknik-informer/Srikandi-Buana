"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Database,
  RefreshCw,
  ShieldCheck,
  Users,
  ClipboardList,
  FolderKanban,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { buildEnterpriseAnalytics } from "@/lib/enterprise-analytics";
import type { Principal } from "@/lib/permissions";
import { WorkspaceMetric, WorkspacePageHeader } from "./workspace-ui";

const trendConfig = {
  records: { label: "Catatan diperbarui", color: "var(--chart-2)" },
};
const domainConfig = {
  count: { label: "Catatan", color: "var(--chart-3)" },
};

function displayDate(value: string | null) {
  if (!value) return "Belum ada pembaruan";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })
    : "Tanggal tidak tersedia";
}

export default function BusinessIntelligenceWorkspace({ user }: { user: Principal }) {
  const { rows, files, loading, error, load } = useWorkspaceData();
  const analytics = useMemo(
    () => buildEnterpriseAnalytics(rows, files, user),
    [rows, files, user],
  );

  const metrics = [
    { title: "Catatan terbaca", value: analytics.records, note: "Sesuai hak akses akun", icon: Database },
    analytics.programs !== null
      ? { title: "Program tercatat", value: analytics.programs, note: "Program dalam lingkup akses", icon: FolderKanban }
      : null,
    analytics.openTasks !== null
      ? { title: "Tugas terbuka", value: analytics.openTasks, note: "Tugas yang belum selesai atau ditunda", icon: ClipboardList }
      : null,
    analytics.members !== null
      ? { title: "Anggota terdata", value: analytics.members, note: "Rekap agregat tanpa menampilkan identitas", icon: Users }
      : null,
    { title: "Temuan kualitas data", value: analytics.qualityFindings, note: analytics.warningFindings + " peringatan · " + analytics.infoFindings + " pengingat", icon: AlertTriangle },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (loading) {
    return (
      <div className="workspace-page">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page min-w-0">
      <WorkspacePageHeader
        title="BI & Analitik"
        eyebrow="BUSINESS INTELLIGENCE · ORGANIZATION ANALYTICS"
        description="Ringkasan indikator, tren perubahan catatan, distribusi data, dan kualitas informasi organisasi berdasarkan kewenangan akun."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw data-icon="inline-start" />
            Muat ulang data
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Data analitik belum lengkap</AlertTitle>
          <AlertDescription>{error} Angka yang ditampilkan mengikuti data yang berhasil dimuat.</AlertDescription>
        </Alert>
      )}

      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl border bg-background/80 text-primary">
                <BarChart3 className="size-4" aria-hidden="true" />
              </span>
              <Badge variant="outline">Analitik berbasis data aktual</Badge>
              <Badge variant="outline">Akses terkontrol</Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Gambaran kinerja organisasi</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Seluruh indikator dihitung dari catatan tersimpan yang dapat dibaca akun ini. Data pribadi dan transaksi yang berada di luar kewenangan tidak dimasukkan.
            </p>
          </div>
          <div className="min-w-44 rounded-xl border bg-background/75 px-4 py-3">
            <p className="text-xs text-muted-foreground">Pembaruan sumber terakhir</p>
            <p className="mt-1 text-sm font-semibold">{displayDate(analytics.latestUpdate)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{analytics.records.toLocaleString("id-ID")} catatan dianalisis</p>
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="bi-kpi-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="bi-kpi-title" className="text-base font-semibold">Indikator utama</h2>
            <p className="text-sm text-muted-foreground">Nilai dihitung ulang dari catatan yang dapat diakses.</p>
          </div>
          <span className="text-xs text-muted-foreground">Tanpa angka demonstrasi</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <WorkspaceMetric key={metric.title} title={metric.title} value={metric.value} note={metric.note} icon={metric.icon} />
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Tren perubahan data</CardTitle>
                <CardDescription>Jumlah catatan yang dibuat atau diperbarui per bulan selama enam bulan terakhir.</CardDescription>
              </div>
              <CalendarClock className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {analytics.records ? (
              <ChartContainer config={trendConfig} className="h-[260px] w-full">
                <AreaChart data={analytics.monthlyTrend} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area type="monotone" dataKey="records" stroke="var(--color-records)" fill="var(--color-records)" fillOpacity={0.16} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed px-5 text-center text-sm text-muted-foreground">
                Belum ada catatan yang dapat dianalisis pada akun ini.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Distribusi data per domain</CardTitle>
                <CardDescription>Kelompok data yang tersedia sesuai izin baca akun.</CardDescription>
              </div>
              <Activity className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {analytics.domains.length ? (
              <ChartContainer config={domainConfig} className="h-[260px] w-full">
                <BarChart data={analytics.domains} layout="vertical" margin={{ left: 8, right: 18, top: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={132} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 5, 5, 0]} maxBarSize={24} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed px-5 text-center text-sm text-muted-foreground">
                Belum ada domain yang termasuk kewenangan baca akun.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kualitas informasi</CardTitle>
            <CardDescription>Indikator pemeriksaan kelengkapan dan konsistensi data yang dapat diakses.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <span className="text-sm font-medium">Peringatan</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{analytics.warningFindings}</p>
              <p className="mt-1 text-xs text-muted-foreground">Temuan yang memerlukan pemeriksaan.</p>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="size-4" aria-hidden="true" />
                <span className="text-sm font-medium">Pengingat</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{analytics.infoFindings}</p>
              <p className="mt-1 text-xs text-muted-foreground">Hal yang perlu dilengkapi atau ditinjau.</p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
              Satu catatan dapat memiliki lebih dari satu temuan. Angka ini bukan jumlah anggota bermasalah dan tidak mengubah data secara otomatis.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cakupan analisis</CardTitle>
            <CardDescription>Transparansi sumber dan batas perhitungan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Database className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>Hanya catatan yang lolos pemeriksaan izin baca dan ruang lingkup program.</p>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>Identitas pribadi tidak ditampilkan dalam grafik agregat.</p>
            </div>
            <div className="flex items-start gap-2">
              <Activity className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>Tren menggunakan tanggal pembaruan atau tanggal pencatatan, bukan estimasi aktivitas.</p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>Angka kosong atau tanpa akses tidak diganti dengan data contoh.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
