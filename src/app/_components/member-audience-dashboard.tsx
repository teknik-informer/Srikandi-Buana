"use client";

import { useMemo } from "react";
import MemberProfileCompletion from "./member-profile-completion";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, CalendarCheck, CircleUserRound, Clock3,
  HandCoins, Megaphone, ShieldCheck, UserRound, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { AudienceBarChart } from "./audience-dashboard-charts";
import type { Principal } from "@/lib/permissions";
import type { Row } from "@/lib/srikandi";

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function dateLabel(value: string) {
  const date = new Date(value + "T00:00:00+07:00");
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" })
    : value;
}

export default function MemberAudienceDashboard({ user }: { user: Principal }) {
  const { rows, loading, error, load } = useWorkspaceData();
  const today = jakartaToday();
  const profile = rows.find(row => row.kind === "anggota" && row.id === user.memberId);
  const events = useMemo(() => rows
    .filter(row => row.kind === "kegiatan" && typeof row.data.date === "string"
      && String(row.data.date) >= today
      && !["Selesai", "Ditunda"].includes(String(row.data.status)))
    .sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)))
    .slice(0, 5), [rows, today]);
  const nextEvent = events[0] as Row | undefined;
  const agendaMonthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() + index, 1);
      const key = month.getFullYear() + "-" + String(month.getMonth() + 1).padStart(2, "0");
      return {
        label: month.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Jakarta" }),
        value: rows.filter(row => row.kind === "kegiatan"
          && String(row.data.date || "").slice(0, 7) === key
          && String(row.data.date || "") >= today).length,
      };
    });
  }, [rows, today]);

  const displayName = String(profile?.data.name || user.displayName || user.fullName || "Anggota");
  const membershipStatus = String(profile?.data.status || "Status belum tersedia");
  const verification = String(profile?.data.verification || "Belum tersedia");

  return (
    <main className="workspace-page space-y-6" aria-labelledby="member-dashboard-title">
      <section className="relative isolate overflow-hidden rounded-3xl border bg-[linear-gradient(120deg,#123d32_0%,#1d5945_58%,#dcefe4_150%)] p-5 text-white shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 size-80 rounded-full border-[44px] border-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-inner sm:size-20">
              <UserRound className="size-9 sm:size-11" strokeWidth={1.35} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-100">Portal Anggota</p>
              <h1 id="member-dashboard-title" className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{displayName}</h1>
              <p className="mt-1 text-sm text-emerald-50/85">KWT Srikandi Buana · Ngadimulyo</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">{membershipStatus}</Badge>
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10"><ShieldCheck className="mr-1 size-3" />{verification}</Badge>
              </div>
            </div>
          </div>
          <div className="min-w-56 rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Agenda berikutnya</p>
            {loading ? <Skeleton className="mt-3 h-12" /> : nextEvent ? (
              <>
                <p className="mt-2 font-semibold leading-6">{String(nextEvent.data.name || "Kegiatan kelompok")}</p>
                <p className="mt-1 text-xs text-emerald-50/80">{dateLabel(String(nextEvent.data.date))}</p>
              </>
            ) : <p className="mt-2 text-sm text-emerald-50/85">Belum ada agenda baru.</p>}
          </div>
        </div>
        <nav className="mt-7 flex flex-wrap gap-2 border-t border-white/15 pt-4 text-sm" aria-label="Navigasi portal anggota">
          <a href="#profil-anggota" className="rounded-lg bg-white/15 px-3 py-2 font-medium hover:bg-white/20">Profil saya</a>
          <a href="#agenda-anggota" className="rounded-lg px-3 py-2 text-emerald-50 hover:bg-white/10">Agenda</a>
          <a href="#informasi-anggota" className="rounded-lg px-3 py-2 text-emerald-50 hover:bg-white/10">Informasi</a>
          <Link href="/dashboard/akun-saya" className="rounded-lg px-3 py-2 text-emerald-50 hover:bg-white/10">Pengaturan akun</Link>
        </nav>
      </section>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => void load()} className="min-h-10 rounded-lg border px-3 text-sm font-medium">Muat ulang</button>
          </CardContent>
        </Card>
      )}

      <section id="profil-anggota" className="scroll-mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/15">
            <div className="flex items-center gap-2"><CircleUserRound className="size-5 text-primary" /><CardTitle className="text-base">Profil keanggotaan</CardTitle></div>
            <CardDescription>Data pribadi dan keanggotaan yang terhubung dengan akun Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {loading ? <Skeleton className="h-32" /> : profile ? (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Nama lengkap</dt><dd className="mt-1 font-medium">{String(profile.data.name || "—")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Peran kelompok</dt><dd className="mt-1 font-medium">{String(profile.data.role || "Anggota")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Dusun</dt><dd className="mt-1 font-medium">{String(profile.data.dusun || "—")}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Nomor telepon</dt><dd className="mt-1 font-medium">{String(profile.data.phone || "Belum dicatat")}</dd></div>
                </dl>
                <MemberProfileCompletion profile={profile.data} onSaved={load} />
              </>
            ) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Profil belum tersedia. Hubungi pengurus untuk memeriksa data keanggotaan Anda.</div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /><CardTitle className="text-base">Kelengkapan profil</CardTitle></div>
              <CardDescription>Lengkapi CV singkat untuk mengenalkan pengalaman dan potensi Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Pendidikan, keahlian, pengalaman, dan kegiatan usaha dapat diperbarui dari bagian Profil saya.</p>
              <a href="#profil-anggota" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">Lengkapi profil <ArrowRight className="size-4" /></a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2"><HandCoins className="size-5 text-primary" /><CardTitle className="text-base">Iuran dan tabungan</CardTitle></div>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Belum tersedia</Badge>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Riwayat iuran akan ditampilkan setelah pencatatan keuangan anggota terhubung.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="agenda-anggota" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Agenda dan kegiatan</h2>
          <p className="text-sm text-muted-foreground">Jadwal kelompok yang dapat Anda ikuti.</p>
        </div>
        <AudienceBarChart title="Agenda enam bulan mendatang" description="Jumlah kegiatan yang telah dijadwalkan per bulan." data={agendaMonthly} emptyMessage="Belum ada agenda untuk ditampilkan." />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CalendarCheck className="size-5 text-primary" /><CardTitle className="text-base">Jadwal mendatang</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-28" /> : events.length ? events.map(event => (
              <article key={event.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4">
                <div className="min-w-0">
                  <h3 className="font-semibold">{String(event.data.name || "Agenda kelompok")}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{dateLabel(String(event.data.date))}</p>
                  {event.data.location ? <p className="mt-1 text-sm text-muted-foreground">{String(event.data.location)}</p> : null}
                </div>
                <Badge variant="outline">{String(event.data.status || "Direncanakan")}</Badge>
              </article>
            )) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada agenda yang dijadwalkan.</div>}
          </CardContent>
        </Card>
      </section>

      <section id="informasi-anggota" className="scroll-mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Megaphone className="size-5 text-primary" /><CardTitle className="text-base">Kabar kelompok</CardTitle></div>
            <CardDescription>Pengumuman dan informasi terbaru dari pengurus.</CardDescription>
          </CardHeader>
          <CardContent><Link href="/kabar" className="flex min-h-11 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent/40">Buka pengumuman <ArrowRight className="size-4" /></Link></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Clock3 className="size-5 text-primary" /><CardTitle className="text-base">Akun dan keamanan</CardTitle></div>
            <CardDescription>Kelola nama tampilan, foto, dan kata sandi akun.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Jaga kerahasiaan kata sandi. Koreksi data keanggotaan dapat diajukan kepada pengurus.</p>
            <Link href="/dashboard/akun-saya" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">Buka pengaturan akun <ArrowRight className="size-4" /></Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
