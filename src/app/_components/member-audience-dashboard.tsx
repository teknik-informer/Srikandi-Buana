"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarCheck, CircleUserRound, Clock3, Megaphone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import type { Principal } from "@/lib/permissions";
import type { Row } from "@/lib/srikandi";

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
  const profile = rows.find((row) => row.kind === "anggota" && row.id === user.memberId);
  const events = useMemo(() => rows
    .filter((row) =>
      row.kind === "kegiatan" &&
      typeof row.data.date === "string" &&
      String(row.data.date) >= today &&
      !["Selesai", "Ditunda"].includes(String(row.data.status))
    )
    .sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)))
    .slice(0, 5), [rows, today]);
  const nextEvent = events[0] as Row | undefined;



  return (
    <main className="workspace-page space-y-6" aria-labelledby="member-dashboard-title">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-[radial-gradient(circle_at_84%_10%,rgba(187,247,208,0.75),transparent_32%),linear-gradient(125deg,#effcf4_0%,#ffffff_55%,#eef7ff_100%)] p-5 text-slate-900 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 -z-10 size-64 rounded-full border-[32px] border-emerald-700/5" />
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <Badge className="border-emerald-700/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/5">DASHBOARD ANGGOTA</Badge>
            <h1 id="member-dashboard-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Sugeng rawuh, {profile?.data.name || user.displayName || user.fullName}.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Ruang pribadi anggota Srikandi Buana. Pantau informasi kelompok, agenda pertemuan, dan data keanggotaan Anda.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-700/20 bg-white/70 text-emerald-900"><ShieldCheck className="mr-1 size-3" />{profile ? "Status: " + String(profile.data.status || "Belum dicatat") : "Profil belum tertaut"}</Badge>
              <Link href="/kabar" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900">Pengumuman kelompok<ArrowRight className="size-4" /></Link>
            </div>
          </div>
          <div className="min-w-48 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/60">Agenda terdekat</p>
            {loading ? <Skeleton className="mt-3 h-12" /> : nextEvent ? (
              <>
                <p className="mt-2 text-lg font-semibold leading-6">{String(nextEvent.data.name)}</p>
                <p className="mt-1 text-xs text-slate-600">{dateLabel(String(nextEvent.data.date))}</p>
              </>
            ) : <p className="mt-2 text-sm text-slate-600">Belum ada agenda mendatang.</p>}
          </div>
        </div>
      </section>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => void load()} className="min-h-10 rounded-lg border px-3 text-sm font-medium">Muat ulang</button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CircleUserRound className="size-5 text-primary" /><CardTitle className="text-base">Profil keanggotaan saya</CardTitle></div>
            <CardDescription>Informasi yang saat ini tercatat dan boleh Anda lihat.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32" /> : profile ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Nama lengkap</dt><dd className="mt-1 font-medium">{String(profile.data.name || "—")}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Peran di kelompok</dt><dd className="mt-1 font-medium">{String(profile.data.role || "Anggota")}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Dusun / alamat</dt><dd className="mt-1 font-medium">{String(profile.data.dusun || "—")}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Nomor WhatsApp</dt><dd className="mt-1 font-medium">{String(profile.data.phone || "Belum dicatat")}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Status keanggotaan</dt><dd className="mt-1"><Badge variant="outline">{String(profile.data.status || "Belum tersedia")}</Badge></dd></div>
                <div><dt className="text-xs text-muted-foreground">Verifikasi data</dt><dd className="mt-1"><Badge variant={profile.data.verification === "Terverifikasi" ? "default" : "secondary"}>{String(profile.data.verification || "Belum tersedia")}</Badge></dd></div>
              </dl>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">Profil keanggotaan belum dapat ditampilkan. Hubungi pengurus untuk memeriksa hubungan akun dengan data anggota.</div>
            )}
          </CardContent>
        </Card>

      </section>



      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CalendarCheck className="size-5 text-primary" /><CardTitle className="text-base">Agenda dan pertemuan mendatang</CardTitle></div>
            <CardDescription>Jadwal kegiatan yang diumumkan dan dapat diakses anggota.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-28" /> : events.length ? events.map((event) => (
              <article key={event.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">{String(event.data.name || "Agenda kelompok")}</h3>
                  <Badge variant="outline">{String(event.data.status || "Direncanakan")}</Badge>
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{dateLabel(String(event.data.date))}</p>
                {event.data.location ? <p className="mt-1 text-sm text-muted-foreground">{String(event.data.location)}</p> : null}
              </article>
            )) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada agenda yang dijadwalkan untuk ditampilkan.</div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Megaphone className="size-5 text-primary" /><CardTitle className="text-base">Pengumuman kelompok</CardTitle></div>
              <CardDescription>Informasi dan kabar yang telah diterbitkan pengurus.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/kabar" className="flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent/40">Buka kabar dan pengumuman<ArrowRight className="size-4" /></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Clock3 className="size-5 text-primary" /><CardTitle className="text-base">Informasi akun</CardTitle></div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">Jaga kerahasiaan password Anda. Untuk pembaruan alamat, nomor kontak, atau informasi keanggotaan, sampaikan permintaan koreksi kepada pengurus.</p>
              <Link href="/dashboard/akun-saya" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">Pengaturan akun<ArrowRight className="size-4" /></Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
