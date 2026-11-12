"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { buildManagementInsights, recordHref, validDate } from "@/lib/management-insights";
import { canReadSection, roles, type Principal } from "@/lib/permissions";
import type { Row } from "@/lib/srikandi";
import { AudienceBarChart, AudienceTrendChart, CashFlowTrendChart } from "./audience-dashboard-charts";

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function sixMonthWindow() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"),
      label: date.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Jakarta" }),
    };
  });
}

function monthlyActivity(rows: Row[]) {
  return sixMonthWindow().map((month) => ({
    label: month.label,
    records: rows.filter((row) => (row.created || "").slice(0, 7) === month.key).length,
  }));
}

function monthlyCash(rows: Row[]) {
  return sixMonthWindow().map((month) => {
    const transactions = rows.filter((row) =>
      row.kind === "kas" &&
      validDate(row.data.date) &&
      String(row.data.date).slice(0, 7) === month.key &&
      Number.isSafeInteger(Number(row.data.amount)) &&
      Number(row.data.amount) > 0
    );
    return {
      label: month.label,
      income: transactions.filter((row) => row.data.type === "Pemasukan").reduce((sum, row) => sum + Number(row.data.amount), 0),
      expense: transactions.filter((row) => row.data.type === "Pengeluaran").reduce((sum, row) => sum + Number(row.data.amount), 0),
    };
  });
}

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function ManagementAudienceDashboard({ user }: { user: Principal }) {
  const { rows, files, loading, error, load } = useWorkspaceData();
  const insights = useMemo(() => buildManagementInsights(rows, files, user), [rows, files, user]);
  const membersAccess = canReadSection(user, "anggota");
  const financeAccess = canReadSection(user, "kas");
  const programAccess = canReadSection(user, "program");
  const memberRows = membersAccess ? insights.rows.filter((row) => row.kind === "anggota") : [];
  const programRows = programAccess ? insights.rows.filter((row) => row.kind === "program") : [];
  const activeMembers = memberRows.filter((row) => row.data.status === "Aktif").length;
  const verifiedMembers = memberRows.filter((row) => row.data.status === "Aktif" && row.data.verification === "Terverifikasi").length;
  const openTasks = insights.tasks.filter((row) => !["Selesai", "Ditunda"].includes(String(row.data.status)));
  const roleLabel = roles[user.role];
  const activityData = useMemo(() => monthlyActivity(insights.rows), [insights.rows]);
  const cashData = useMemo(() => monthlyCash(insights.rows), [insights.rows]);
  const memberStatus = [
    { label: "Aktif", value: memberRows.filter((row) => row.data.status === "Aktif").length },
    { label: "Perlu verifikasi", value: memberRows.filter((row) => row.data.status === "Perlu verifikasi" || row.data.verification !== "Terverifikasi").length },
    { label: "Tidak aktif", value: memberRows.filter((row) => ["Tidak aktif", "Mengundurkan diri"].includes(String(row.data.status))).length },
  ];
  const taskStatus = [
    { label: "Belum mulai", value: insights.tasks.filter((row) => row.data.status === "Belum dimulai").length },
    { label: "Berjalan", value: insights.tasks.filter((row) => row.data.status === "Berjalan").length },
    { label: "Selesai", value: insights.tasks.filter((row) => row.data.status === "Selesai").length },
    { label: "Ditunda", value: insights.tasks.filter((row) => row.data.status === "Ditunda").length },
  ];
  const programStatus = [
    { label: "Rancangan", value: programRows.filter((row) => row.data.status === "Rancangan").length },
    { label: "Disepakati", value: programRows.filter((row) => row.data.status === "Disepakati").length },
    { label: "Berjalan", value: programRows.filter((row) => row.data.status === "Berjalan").length },
    { label: "Selesai", value: programRows.filter((row) => row.data.status === "Selesai").length },
    { label: "Ditunda", value: programRows.filter((row) => row.data.status === "Ditunda").length },
  ];
  const recentRows = [...insights.rows]
    .sort((a, b) => Date.parse(b.updated || b.created || "") - Date.parse(a.updated || a.created || ""))
    .slice(0, 5);
  const quickLinks = [
    membersAccess ? { href: "/dashboard/anggota", label: "Keanggotaan", icon: Users } : null,
    programAccess ? { href: "/dashboard/program", label: "Program kerja", icon: Sprout } : null,
    canReadSection(user, "tindaklanjut") ? { href: "/dashboard/tindaklanjut", label: "Tugas & tindak lanjut", icon: ClipboardCheck } : null,
    financeAccess ? { href: "/dashboard/kas", label: "Buku kas", icon: Wallet } : null,
  ].filter((item): item is { href: string; label: string; icon: LucideIcon } => item !== null);
  const foundationSteps = [
    canReadSection(user, "pengurus") ? {
      id: "pengurus",
      label: "Catat susunan pengurus",
      detail: "Masukkan nama dan peran yang sudah disepakati.",
      href: "/dashboard/pengurus",
      icon: ShieldCheck,
      hasRecord: insights.rows.some((row) => row.kind === "pengurus"),
    } : null,
    membersAccess ? {
      id: "anggota",
      label: "Mulai daftar anggota",
      detail: "Catat anggota yang benar-benar sudah bergabung.",
      href: "/dashboard/anggota",
      icon: Users,
      hasRecord: memberRows.length > 0,
    } : null,
    programAccess ? {
      id: "program",
      label: "Pilih program awal",
      detail: "Mulai dengan program sederhana yang realistis.",
      href: "/dashboard/program",
      icon: Sprout,
      hasRecord: programRows.length > 0,
    } : null,
    canReadSection(user, "kegiatan") ? {
      id: "kegiatan",
      label: "Jadwalkan pertemuan pertama",
      detail: "Catat waktu, tempat, dan tujuan pertemuan.",
      href: "/dashboard/kegiatan",
      icon: CalendarDays,
      hasRecord: insights.rows.some((row) => row.kind === "kegiatan"),
    } : null,
  ].filter((step): step is {
    id: string; label: string; detail: string; href: string;
    icon: LucideIcon; hasRecord: boolean;
  } => step !== null);
  const foundationRecorded = foundationSteps.filter((step) => step.hasRecord).length;
  const isFoundationStage = !loading && foundationSteps.length > 0 && foundationRecorded === 0;
  const today = new Date().toLocaleDateString("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" });

  return (
    <main className="workspace-page space-y-6" aria-labelledby="management-dashboard-title">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-[radial-gradient(circle_at_85%_12%,rgba(187,247,208,0.8),transparent_32%),linear-gradient(120deg,#effcf4_0%,#ffffff_52%,#e8f7ee_100%)] p-5 text-slate-900 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-20 -z-10 size-72 rounded-full border-[36px] border-emerald-700/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 -z-10 size-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-emerald-700/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/5">DASHBOARD PENGURUS</Badge>
              <span className="text-xs font-medium text-emerald-900/70">{roleLabel}</span>
            </div>
            <h1 id="management-dashboard-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Selamat datang, {user.displayName || user.fullName}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Pusat kendali Srikandi Buana untuk menjaga administrasi, program, kegiatan, dan pertanggungjawaban berjalan tertib.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {quickLinks.slice(0, 2).map((item) => (
                <Button key={item.href} asChild className="bg-emerald-800 text-white hover:bg-emerald-900">
                  <Link href={item.href}>{item.label}<ArrowRight className="ml-1 size-4" /></Link>
                </Button>
              ))}
              <span className="text-xs text-slate-500">{today}</span>
            </div>
          </div>
          <div className="min-w-48 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/60">Kondisi data</p>
            <div className="mt-2 flex items-center gap-2">
              {insights.issues.length ? <AlertCircle className="size-5 text-amber-600" /> : <CheckCircle2 className="size-5 text-emerald-700" />}
              <span className="font-semibold">{loading ? "Memuat…" : insights.issues.length ? "Perlu ditinjau" : "Terkendali"}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{loading ? "Membaca data sesuai hak akses." : insights.issues.length + " catatan pemeriksaan terdeteksi."}</p>
          </div>
        </div>
      </section>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Coba lagi</Button>
          </CardContent>
        </Card>
      )}

      {foundationSteps.length > 0 && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-labelledby="foundation-start-title">
          <div className="grid gap-5 bg-[linear-gradient(120deg,rgba(16,185,129,0.09),transparent_65%)] p-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:p-6">
            <div className="min-w-0">
              <Badge variant="outline" className="border-emerald-700/20 bg-background/80 text-emerald-800">LANGKAH AWAL</Badge>
              <h2 id="foundation-start-title" className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Mulai dari fondasi kelompok</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Hal-hal sederhana untuk membantu kelompok mulai tertata. Anda hanya melihat langkah yang sesuai dengan akses akun ini.</p>
            </div>
            <div className="rounded-xl border bg-background/85 p-4">
              <div className="flex items-end justify-between gap-2">
                <span className="text-sm font-medium">Catatan awal tersedia</span>
                <strong className="text-2xl tabular-nums">{foundationRecorded}<span className="text-sm font-normal text-muted-foreground">/{foundationSteps.length}</span></strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Catatan fondasi yang sudah tersedia" aria-valuemin={0} aria-valuemax={foundationSteps.length} aria-valuenow={foundationRecorded}>
                <div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: (foundationRecorded / foundationSteps.length * 100) + "%" }} />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{foundationRecorded === foundationSteps.length ? "Semua jenis catatan awal sudah tersedia." : "Pilih satu langkah dan lengkapi seperlunya."}</p>
            </div>
          </div>
          <div className="grid gap-2 border-t p-3 sm:grid-cols-2 sm:p-4">
            {foundationSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Link key={step.id} href={step.href} className="group flex min-h-20 items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{index + 1}. {step.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{step.detail}</span>
                    <span className="mt-1 block text-xs font-medium text-primary">{step.hasRecord ? "Catatan sudah ada · Periksa" : "Belum ada catatan · Mulai di sini"}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
          <p className="border-t px-4 py-3 text-xs leading-5 text-muted-foreground">Indikator ini hanya memeriksa keberadaan catatan. Status tercatat tidak otomatis berarti data telah diverifikasi atau disahkan.</p>
        </section>
      )}

      {!isFoundationStage && (
        <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ringkasan organisasi</h2>
          <p className="mt-1 text-sm text-muted-foreground">Angka dihitung dari catatan yang dapat diakses oleh peran {roleLabel}.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={"mr-2 size-4" + (loading ? " animate-spin" : "")} /> Perbarui data
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Metrik organisasi">
        {loading ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />) : (
          <>
            <MetricCard title="Anggota terdata" value={membersAccess ? memberRows.length : "—"} note={membersAccess ? activeMembers + " anggota berstatus aktif" : "Di luar kewenangan akun"} icon={Users} />
            <MetricCard title="Anggota terverifikasi" value={membersAccess ? verifiedMembers : "—"} note={membersAccess ? "Aktif dan sudah diverifikasi" : "Di luar kewenangan akun"} icon={ShieldCheck} />
            <MetricCard title="Tugas berjalan" value={canReadSection(user, "tindaklanjut") ? openTasks.length : "—"} note={canReadSection(user, "tindaklanjut") ? insights.overdue.length + " melewati tenggat" : "Di luar kewenangan akun"} icon={ClipboardCheck} />
            <MetricCard title="Saldo buku kas" value={financeAccess ? formatCurrency(insights.balance) : "—"} note={financeAccess ? insights.cashInvalid ? "Ada transaksi yang perlu diperiksa" : "Berdasarkan catatan Buku Kas" : "Di luar kewenangan akun"} icon={Wallet} />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Prioritas pekerjaan</CardTitle>
                <CardDescription>Mulai dari catatan yang memerlukan perhatian. Buka catatan sumber untuk memahami konteks dan langkah berikutnya.</CardDescription>
              </div>
              <Badge variant="outline">{loading ? "…" : insights.issues.length + " temuan"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-24" /> : insights.issues.slice(0, 5).map((issue) => (
              <Link key={issue.id} href={recordHref(issue.row)} className="flex min-h-14 items-start justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40">
                <span><span className="block text-sm font-medium">{issue.title}</span><span className="mt-1 block text-xs text-muted-foreground">{issue.detail}</span></span>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            {!loading && insights.issues.length === 0 && (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada temuan prioritas dari data yang dapat diakses.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Akses cepat</CardTitle>
            <CardDescription>Menu utama sesuai kewenangan akun.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} className="flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent/40"><span className="flex items-center gap-2"><Icon className="size-4 text-primary" />{item.label}</span><ArrowRight className="size-4 text-muted-foreground" /></Link>;
            })}
            <Link href="/dashboard/monitoring" className="flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent/40"><span className="flex items-center gap-2"><Activity className="size-4 text-primary" />Status sistem</span><ArrowRight className="size-4 text-muted-foreground" /></Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2" aria-label="Analisis organisasi">
        <AudienceTrendChart title="Aktivitas pencatatan" description="Jumlah catatan organisasi yang dibuat dalam enam bulan terakhir, berdasarkan waktu pencatatan." data={activityData} />
        {membersAccess ? (
          <AudienceBarChart title="Status keanggotaan" description="Komposisi anggota sesuai status dan verifikasi pada data yang dapat diakses." data={memberStatus} />
        ) : (
          <AudienceBarChart title="Status tindak lanjut" description="Komposisi pekerjaan sesuai penugasan yang dapat diakses." data={taskStatus} />
        )}
        {programAccess && <AudienceBarChart title="Perkembangan program kerja" description="Jumlah program menurut status yang tercatat, bukan estimasi capaian." data={programStatus} />}
        {canReadSection(user, "tindaklanjut") && <AudienceBarChart title="Status tugas dan tindak lanjut" description="Sebaran tugas berdasarkan status yang tercatat." data={taskStatus} />}
        {financeAccess && <CashFlowTrendChart data={cashData} />}
      </section>



      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold tracking-tight">Aktivitas terbaru</h2><p className="mt-1 text-sm text-muted-foreground">Data terbaru yang dapat dilihat oleh akun Anda.</p></div>
          <CalendarDays className="size-5 text-muted-foreground" />
        </div>
        {loading ? <Skeleton className="h-28" /> : recentRows.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {recentRows.map((row) => (
              <Link key={row.id} href={recordHref(row)} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.kind.replaceAll("_", " ")}</p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold">{String(row.data.name || "Catatan tanpa judul")}</p>
                <p className="mt-2 text-xs text-muted-foreground">{row.updated ? "Diperbarui" : "Dicatat"} {new Date(row.updated || row.created).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</p>
              </Link>
            ))}
          </div>
        ) : <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Belum ada catatan yang dapat ditampilkan.</div>}
      </section>

        </>
      )}
    </main>
  );
}
