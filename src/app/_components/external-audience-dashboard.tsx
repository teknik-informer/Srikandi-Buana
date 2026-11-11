import Link from "next/link";
import { Building2, CalendarClock, FileCheck2, Handshake, LogOut, ShieldCheck, Sprout, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExternalAgricultureSummary } from "@/lib/external-agriculture-summary";
import type { ExternalGrant, ExternalOrganizationType } from "@/lib/external-access-policy";
import { AudienceBarChart } from "./audience-dashboard-charts";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })
    : "Tanggal tidak tersedia";
}

const scopeLabels: Record<string, string> = {
  project: "Proyek",
  program: "Program",
  region: "Wilayah",
  aggregate: "Ringkasan agregat",
};
const aggregateLabels: Record<string, string> = {
  members: "Anggota terverifikasi",
  land: "Luas lahan",
  harvest: "Hasil panen",
};

function SummaryValue({ availability, value, suffix = "" }: { availability: string; value: string | number | null; suffix?: string }) {
  if (availability === "not_granted") return <p className="mt-2 text-sm text-muted-foreground">Tidak termasuk izin akses</p>;
  if (availability === "suppressed") return <p className="mt-2 text-sm font-medium text-muted-foreground">Disamarkan untuk melindungi privasi anggota</p>;
  if (availability === "empty") return <p className="mt-2 text-sm text-muted-foreground">Belum ada data terverifikasi</p>;
  if (availability !== "available" || value === null) return <p className="mt-2 text-sm text-muted-foreground">Ringkasan belum tersedia</p>;
  return <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}{suffix}</p>;
}

export default function ExternalAudienceDashboard({
  organizationType,
  organizationName,
  fullName,
  email,
  grants,
  summary,
}: {
  organizationType: ExternalOrganizationType;
  organizationName: string;
  fullName: string;
  email: string;
  grants: ExternalGrant[];
  summary: ExternalAgricultureSummary;
}) {
  const isGovernment = organizationType === "government";
  const eyebrow = isGovernment ? "DASHBOARD PEMERINTAH / DINAS" : "DASHBOARD MITRA NGO / YAYASAN";
  const label = isGovernment ? "Instansi Pemerintah" : organizationType === "ngo" ? "NGO / Yayasan" : "Mitra";
  const harvestUnits = [...new Set(summary.harvest.items.map((item) => item.unit))];
  const today = new Date().toLocaleDateString("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_88%_5%,rgba(187,247,208,0.34),transparent_28%),linear-gradient(180deg,#f8faf8,#f2f6f3)] px-4 py-6 text-slate-800 sm:px-8 sm:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-900/10 bg-white/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-800 text-white">{isGovernment ? <Building2 size={22} /> : <Handshake size={22} />}</div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Srikandi Buana</p><p className="text-sm text-slate-500">{label}</p></div>
          </div>
          <Link href="/keluar" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut size={16} />Keluar</Link>
        </header>

        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-[radial-gradient(circle_at_85%_12%,rgba(167,243,208,0.8),transparent_31%),linear-gradient(120deg,#eaf8f0_0%,#ffffff_55%,#eef5f2_100%)] p-5 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-14 -top-20 -z-10 size-72 rounded-full border-[36px] border-emerald-700/5" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <Badge className="border-emerald-700/15 bg-emerald-900/5 text-emerald-900 hover:bg-emerald-900/5">{eyebrow}</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Selamat datang, {fullName}.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{isGovernment ? "Panel pemantauan monografi kelompok, data pertanian terverifikasi, dan program sesuai kewenangan instansi." : "Ruang pemantauan program kemitraan, capaian kegiatan, serta pertanggungjawaban yang secara khusus dibagikan kepada organisasi Anda."}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-700/20 bg-white/70 text-emerald-900"><ShieldCheck className="mr-1 size-3" />Akses terverifikasi</Badge>
                <span className="text-xs text-slate-500">{today}</span>
              </div>
            </div>
            <div className="min-w-56 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/60">Organisasi</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{organizationName}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{email}</p>
              <p className="mt-3 text-xs text-slate-600">{grants.length} izin akses aktif</p>
            </div>
          </div>
        </section>

        {isGovernment ? (
          <>
            <section className="space-y-3">
              <div><h2 className="text-lg font-semibold text-slate-900">Monografi dan indikator pertanian</h2><p className="mt-1 text-sm text-slate-600">Hanya ringkasan terverifikasi sesuai izin instansi dan ambang privasi.</p></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anggota aktif</p><SummaryValue availability={summary.members.availability} value={summary.members.verifiedCount} /><p className="mt-2 text-xs text-muted-foreground">Anggota yang aktif dan terverifikasi</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Luas lahan terverifikasi</p><SummaryValue availability={summary.land.availability} value={summary.land.areaHectares} suffix=" ha" /><p className="mt-2 text-xs text-muted-foreground">{summary.land.availability === "available" ? summary.land.verifiedParcels + " bidang lahan" : "Luas lahan yang memenuhi ambang privasi"}</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Komoditas terlapor</p><SummaryValue availability={summary.harvest.availability} value={summary.harvest.availability === "available" ? summary.harvest.items.length : null} /><p className="mt-2 text-xs text-muted-foreground">Kelompok hasil panen yang dapat ditampilkan</p></CardContent></Card>
              </div>
            </section>
            {summary.harvest.availability === "available" && harvestUnits.map((unit) => (
              <AudienceBarChart
                key={unit}
                title={"Hasil panen terverifikasi · " + unit}
                description="Total hasil panen per komoditas. Komoditas dengan satuan berbeda dipisahkan agar tidak dibandingkan secara keliru."
                suffix={" " + unit}
                data={summary.harvest.items.filter((item) => item.unit === unit).map((item) => ({ label: item.commodity, value: item.quantity }))}
              />
            ))}
            <Card>
              <CardHeader><div className="flex items-center gap-2"><FileCheck2 className="size-5 text-emerald-800" /><CardTitle className="text-base">Program dalam lingkup izin</CardTitle></div><CardDescription>Daftar program yang dapat diketahui berdasarkan grant aktif. Ini merupakan daftar program, bukan laporan realisasi.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {summary.programs.length ? summary.programs.map((program) => (
                  <article key={program.id} className="rounded-xl border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Program {program.id} · {program.category}</p><h3 className="mt-1 font-semibold">{program.name}</h3><p className="mt-2 text-sm leading-5 text-muted-foreground">{program.goal}</p><p className="mt-2 text-xs text-muted-foreground">{program.period}</p></article>
                )) : <p className="text-sm text-muted-foreground">Grant saat ini belum mencakup program tertentu.</p>}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground"><Sprout size={17} /><p className="text-xs font-semibold uppercase tracking-wide">Program diizinkan</p></div><p className="mt-3 text-3xl font-semibold tabular-nums">{summary.programs.length}</p><p className="mt-1 text-xs text-muted-foreground">Daftar program dalam lingkup akses</p></CardContent></Card>
              <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground"><FileCheck2 size={17} /><p className="text-xs font-semibold uppercase tracking-wide">Grant aktif</p></div><p className="mt-3 text-3xl font-semibold tabular-nums">{grants.length}</p><p className="mt-1 text-xs text-muted-foreground">Izin yang telah disahkan dan masih berlaku</p></CardContent></Card>
              <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground"><Wallet size={17} /><p className="text-xs font-semibold uppercase tracking-wide">Transparansi hibah</p></div><p className="mt-3 text-base font-semibold">Menunggu integrasi</p><p className="mt-1 text-xs text-muted-foreground">Sumber pagu, realisasi, dan bukti hibah belum terhubung.</p></CardContent></Card>
            </section>
            <Card>
              <CardHeader><CardTitle className="text-base">Portofolio program kemitraan</CardTitle><CardDescription>Program yang dibagikan kepada organisasi Anda. Kemajuan kegiatan dan milestone hanya ditampilkan setelah laporan pelaksanaan terhubung.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {summary.programs.length ? summary.programs.map((program) => (
                  <article key={program.id} className="rounded-xl border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Program {program.id} · {program.category}</p><h3 className="mt-1 font-semibold">{program.name}</h3><p className="mt-2 text-sm leading-5 text-muted-foreground">{program.goal}</p><p className="mt-2 text-xs text-muted-foreground">{program.period}</p><Badge variant="secondary" className="mt-3">Data progres belum terhubung</Badge></article>
                )) : <p className="text-sm text-muted-foreground">Belum ada program yang tercakup dalam grant aktif.</p>}
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-5">
                <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div><h2 className="font-semibold">Laporan dana hibah</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Dashboard belum menampilkan angka pagu, pencairan, maupun realisasi hibah. Modul proyek, milestone, bukti belanja, dan rekonsiliasi dana perlu disiapkan sebagai sumber resmi sebelum grafik keuangan diaktifkan.</p></div>
              </CardContent>
            </Card>
          </>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-800" /><h2 className="text-lg font-semibold text-slate-900">Ruang lingkup akses resmi</h2></div>
          {grants.length ? grants.map((grant) => (
            <Card key={grant.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Grant disahkan</p><h3 className="mt-1 font-semibold">{grant.purpose}</h3></div><Badge variant="outline" className="border-emerald-700/20 text-emerald-800">Aktif</Badge></div>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock size={14} />Berlaku {dateLabel(grant.validFrom)} – {dateLabel(grant.validUntil)}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {grant.scopes.map((scope) => <div key={scope.type + ":" + scope.ref} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="font-medium">{scopeLabels[scope.type] || scope.type}</p><p className="mt-1 text-xs text-muted-foreground">{aggregateLabels[scope.ref] || scope.ref} · {scope.permission === "aggregate" ? "Agregat" : "Baca"}</p></div>)}
                </div>
              </CardContent>
            </Card>
          )) : <p className="rounded-xl border border-dashed bg-white p-5 text-sm text-slate-600">Belum ada izin akses aktif.</p>}
        </section>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-500"><span>© {new Date().getFullYear()} KWT Srikandi Buana</span><span>Informasi hanya untuk tujuan akses yang disahkan.</span><Link href="/privasi" className="underline underline-offset-4">Kebijakan privasi</Link></footer>
      </div>
    </main>
  );
}
