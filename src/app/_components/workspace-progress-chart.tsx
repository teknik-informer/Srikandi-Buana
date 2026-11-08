"use client";

import { useMemo, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ChartNoAxesColumnIncreasing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { NavItem } from "@/lib/navigation-config";
import type { Row } from "@/lib/srikandi";
import type { ProgramEvaluation } from "@/lib/program-evaluation";

type MonthPoint = {
  month: string;
  label: string;
  created: number;
  updated: number;
};

const chartConfig = {
  created: { label: "Catatan baru", color: "var(--color-chart-2)" },
  updated: { label: "Catatan diperbarui", color: "var(--color-chart-4)" },
  reports: { label: "Laporan tercatat", color: "var(--color-chart-2)" },
  openTasks: { label: "Tugas terbuka", color: "var(--color-chart-4)" },
  blocked: { label: "Program terkendala", color: "var(--color-chart-5)" },
} satisfies ChartConfig;

function validTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function monthKey(timestamp: number) {
  const date = new Date(timestamp);
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
}

export default function WorkspaceProgressChart({
  rows,
  features,
  dashboardLabel,
  loading,
  programEvaluations,
}: {
  rows: Row[];
  features: readonly NavItem[];
  dashboardLabel: string;
  loading: boolean;
  programEvaluations?: ProgramEvaluation[];
}) {
  const featureIds = useMemo(() => new Set(features.map((feature) => feature.id)), [features]);
  const scopedRows = useMemo(() => rows.filter((row) => featureIds.has(row.kind)), [rows, featureIds]);

  const months = useMemo<MonthPoint[]>(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
      const key = monthKey(date.getTime());
      return {
        month: key,
        label: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(date),
        created: 0,
        updated: 0,
      };
    });
    const byMonth = new Map(buckets.map((bucket) => [bucket.month, bucket]));
    for (const row of scopedRows) {
      const createdAt = validTimestamp(row.created);
      const updatedAt = validTimestamp(row.updated);
      if (createdAt !== null) {
        const bucket = byMonth.get(monthKey(createdAt));
        if (bucket) bucket.created += 1;
      }
      // The API returns created and updated timestamps. A distinct updated
      // timestamp is a recorded edit, not a claim that the task was completed.
      if (updatedAt !== null && row.updated !== row.created) {
        const bucket = byMonth.get(monthKey(updatedAt));
        if (bucket) bucket.updated += 1;
      }
    }
    return buckets;
  }, [scopedRows]);

  const moduleCounts = useMemo(() => {
    return features
      .map((feature) => ({
        id: feature.id,
        label: feature.label,
        count: scopedRows.filter((row) => row.kind === feature.id).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id"))
      .slice(0, 7);
  }, [features, scopedRows]);

  const maxModuleCount = Math.max(1, ...moduleCounts.map((item) => item.count));
  const hasTimeline = months.some((month) => month.created > 0 || month.updated > 0);
  const hasRecords = scopedRows.length > 0;
  const programChartRows = useMemo(
    () => (programEvaluations || []).map((program) => ({
      program: program.programName,
      reports: program.reportCount,
      openTasks: program.openTasks.length,
      blocked: Number(program.blocked),
    })),
    [programEvaluations],
  );

  return (
    <section className="space-y-3" aria-labelledby="workspace-progress-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">ANALISIS PERKEMBANGAN</p>
          <h2 id="workspace-progress-title" className="mt-1 text-base font-semibold">Ritme kerja {dashboardLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lihat kapan catatan dibuat, diperbarui, dan modul yang paling aktif.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <Activity className="size-3.5 text-primary" aria-hidden="true" />
          {loading ? "Memuat data" : scopedRows.length.toLocaleString("id-ID") + " catatan dalam akses"}
        </span>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">Perkembangan 6 bulan</CardTitle>
                <CardDescription>Jumlah catatan baru dan catatan yang mengalami pembaruan tiap bulan.</CardDescription>
              </div>
              <span className="rounded-lg border bg-muted/50 p-2 text-primary"><ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true" /></span>
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading ? (
              <div className="h-[250px] animate-pulse rounded-lg bg-muted/60" aria-label="Grafik sedang dimuat" />
            ) : hasTimeline ? (
              <>
                <ChartContainer config={chartConfig} className="workspace-equalizer-chart h-[250px] w-full aspect-auto">
                  <BarChart data={months} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={9} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="created" fill="var(--color-created)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="updated" fill="var(--color-updated)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ChartContainer>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Keterangan grafik">
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[var(--color-chart-2)]" />Catatan baru</span>
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[var(--color-chart-4)]" />Catatan diperbarui</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Grafik menunjukkan aktivitas pencatatan berdasarkan waktu dibuat/diperbarui, bukan persentase keberhasilan program atau penyelesaian pekerjaan.</p>
              </>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                <Activity className="size-8 text-muted-foreground/60" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">{hasRecords ? "Belum ada aktivitas dalam enam bulan terakhir" : "Belum ada catatan pada modul ini"}</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Grafik akan terisi otomatis ketika catatan dibuat atau diperbarui melalui modul sumber.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Equalizer aktivitas modul</CardTitle>
            <CardDescription>Perbandingan jumlah catatan per modul yang dapat Anda akses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }, (_, index) => <div key={index} className="h-9 animate-pulse rounded bg-muted/60" />)
            ) : moduleCounts.some((item) => item.count > 0) ? moduleCounts.map((item, index) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium">{item.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{item.count.toLocaleString("id-ID")}</span>
                </div>
                <div
                  className="workspace-equalizer-track h-2.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={item.label + ": " + item.count + " catatan"}
                >
                  <div
                    className="workspace-equalizer-fill h-full rounded-full bg-primary"
                    style={{ "--equalizer-width": (item.count / maxModuleCount) * 100 + "%", animationDelay: index * 65 + "ms" } as CSSProperties}
                  />
                </div>
              </div>
            )) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
                <ChartNoAxesColumnIncreasing className="size-7 text-muted-foreground/60" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">Belum ada distribusi aktivitas</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Modul akan muncul setelah ada catatan yang dapat diakses.</p>
              </div>
            )}
            <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">Skala setiap batang dibandingkan dengan modul tertinggi pada ruang kerja ini. Angka selalu ditampilkan agar panjang batang tidak menjadi satu-satunya petunjuk.</p>
          </CardContent>
        </Card>
      </div>

      {programEvaluations ? (
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Perkembangan program kerja</CardTitle>
            <CardDescription>Perbandingan laporan yang sudah tercatat, tugas terbuka, dan program dengan kendala berdasarkan data yang dapat diakses.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[340px] animate-pulse rounded-lg bg-muted/60" aria-label="Grafik program sedang dimuat" />
            ) : programChartRows.length ? (
              <>
                <ChartContainer config={chartConfig} className="h-[340px] w-full aspect-auto">
                  <BarChart data={programChartRows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }} accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="program" width={138} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.45 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="reports" fill="var(--color-reports)" radius={[0, 4, 4, 0]} maxBarSize={12} />
                    <Bar dataKey="openTasks" fill="var(--color-openTasks)" radius={[0, 4, 4, 0]} maxBarSize={12} />
                    <Bar dataKey="blocked" fill="var(--color-blocked)" radius={[0, 4, 4, 0]} maxBarSize={12} />
                  </BarChart>
                </ChartContainer>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Jumlah laporan bukan persentase target tercapai. Program tanpa laporan tidak otomatis berarti tidak berjalan; lengkapi laporan periode dan bukti capaian pada modul sumber.</p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Belum ada program yang termasuk dalam lingkup akses akun ini.</div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
