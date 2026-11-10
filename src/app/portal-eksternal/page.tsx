import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarClock, FileCheck2, LogOut, ShieldCheck } from "lucide-react";
import { getAuthenticatedExternalUser } from "@/lib/external-auth";
import { activeExternalGrants } from "@/lib/external-access-policy";
import { getExternalAgricultureSummary } from "@/lib/external-agriculture-summary";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Portal Instansi & Mitra | Srikandi Buana",
  robots: { index: false, follow: false },
};

const dateLabel = (value: string) => new Date(value).toLocaleDateString("id-ID", {
  day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
});
const scopeLabel: Record<string, string> = {
  project: "Proyek",
  program: "Program",
  region: "Wilayah",
  aggregate: "Ringkasan agregat",
};
const aggregateLabel: Record<string, string> = {
  members: "Data anggota (agregat)",
  land: "Luas lahan (agregat)",
  harvest: "Hasil panen (agregat)",
  aid: "Bantuan (agregat)",
  project_progress: "Kemajuan proyek (agregat)",
  project_finance: "Keuangan proyek (agregat)",
};

export default async function ExternalPortalPage() {
  const user = await getAuthenticatedExternalUser();
  if (!user) redirect("/masuk");
  const grants = activeExternalGrants(user.grants);
  const agriculture = await getExternalAgricultureSummary(user);
  const typeLabel = user.organizationType === "government" ? "Instansi Pemerintah" : user.organizationType === "ngo" ? "NGO / Lembaga Swadaya" : "Mitra";
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,101,52,0.09),_transparent_36%),linear-gradient(180deg,#f8faf8,#f2f5f2)] px-4 py-8 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-900/10 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-800 text-white"><Building2 size={22}/></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Srikandi Buana</p><p className="text-sm text-slate-500">Portal Instansi & Mitra</p></div>
          </div>
          <Link href="/keluar" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut size={16}/> Keluar</Link>
        </header>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">{typeLabel}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Selamat datang, {user.fullName}.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Ruang ini menampilkan izin akses yang disahkan untuk organisasi Anda. Data program, penerima, dan laporan hanya akan tersedia sesuai lingkup dan status izin tersebut.</p>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organisasi</p><p className="mt-2 text-lg font-semibold text-slate-900">{user.organizationName}</p><p className="mt-1 text-xs text-emerald-800">Terverifikasi</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Akun</p><p className="mt-2 text-lg font-semibold text-slate-900">{user.email}</p><p className="mt-1 text-xs text-slate-500">Akun eksternal aktif</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Izin aktif</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{grants.length}</p><p className="mt-1 text-xs text-slate-500">Dibatasi oleh proyek, program, atau ringkasan</p></div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><div className="flex items-center gap-2"><ShieldCheck className="text-emerald-800" size={20}/><h2 className="text-lg font-semibold text-slate-900">Ringkasan pertanian terverifikasi</h2></div><p className="mt-1 text-sm text-slate-600">Angka bersumber dari catatan internal yang telah diverifikasi. Ringkasan dengan jumlah kontributor terlalu kecil disamarkan untuk melindungi privasi anggota.</p></div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Hanya data agregat</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {agriculture.members.availability !== "not_granted" && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anggota aktif</p>
              {agriculture.members.availability === "available" ? <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{agriculture.members.verifiedCount}</p> : <p className="mt-2 text-sm font-medium text-slate-600">{agriculture.members.availability === "suppressed" ? "Disamarkan demi privasi" : agriculture.members.availability === "empty" ? "Belum ada data terverifikasi" : "Ringkasan belum tersedia"}</p>}
              <p className="mt-1 text-xs text-slate-500">Anggota aktif dengan data terverifikasi</p>
            </article>}
            {agriculture.land.availability !== "not_granted" && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lahan terverifikasi</p>
              {agriculture.land.availability === "available" ? <><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{agriculture.land.areaHectares} ha</p><p className="mt-1 text-xs text-slate-500">{agriculture.land.verifiedParcels} bidang lahan · luas dibulatkan 0,1 ha</p></> : <p className="mt-2 text-sm font-medium text-slate-600">{agriculture.land.availability === "suppressed" ? "Disamarkan demi privasi" : agriculture.land.availability === "empty" ? "Belum ada data terverifikasi" : "Ringkasan belum tersedia"}</p>}
            </article>}
            {agriculture.harvest.availability !== "not_granted" && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hasil panen terverifikasi</p>
              {agriculture.harvest.availability === "available" ? <div className="mt-2 space-y-2">{agriculture.harvest.items.map((item) => <div key={item.commodity+item.unit} className="flex items-baseline justify-between gap-2"><span className="text-sm font-medium text-slate-700">{item.commodity}</span><strong className="text-sm tabular-nums text-slate-900">{new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(item.quantity)} {item.unit}</strong></div>)}</div> : <p className="mt-2 text-sm font-medium text-slate-600">{agriculture.harvest.availability === "suppressed" ? "Disamarkan demi privasi" : agriculture.harvest.availability === "empty" ? "Belum ada data terverifikasi" : "Ringkasan belum tersedia"}</p>}
              <p className="mt-1 text-xs text-slate-500">Dikelompokkan per komoditas dan satuan dasar</p>
            </article>}
          </div>
          {agriculture.programs.length > 0 && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Program dalam lingkup izin</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{agriculture.programs.map((program) => <div key={program.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-emerald-800">Program {program.id} · {program.category}</p><h4 className="mt-1 font-semibold text-slate-900">{program.name}</h4><p className="mt-1 text-sm leading-5 text-slate-600">{program.goal}</p><p className="mt-2 text-xs text-slate-500">{program.period}</p></div>)}</div>
          </div>}
          {agriculture.members.availability === "not_granted" && agriculture.land.availability === "not_granted" && agriculture.harvest.availability === "not_granted" && agriculture.programs.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Grant saat ini belum mencakup ringkasan anggota, lahan, panen, atau program.</p>}
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-800" size={20}/><h2 className="text-lg font-semibold text-slate-900">Ruang lingkup akses</h2></div>
          {grants.length ? <div className="mt-4 grid gap-4">
            {grants.map((grant) => <article key={grant.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Grant disahkan</p><h3 className="mt-1 text-base font-semibold text-slate-900">{grant.purpose}</h3></div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Aktif</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CalendarClock size={15}/> Berlaku {dateLabel(grant.validFrom)} – {dateLabel(grant.validUntil)}</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {grant.scopes.map((scope) => <div key={scope.type+":"+scope.ref} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <FileCheck2 className="mt-0.5 shrink-0 text-emerald-800" size={16}/>
                  <span><strong className="font-semibold text-slate-800">{scopeLabel[scope.type] || scope.type}</strong><span className="block break-all text-xs text-slate-500">{aggregateLabel[scope.ref] || scope.ref}</span></span>
                </div>)}
              </div>
            </article>)}
          </div> : <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Belum ada izin akses aktif.</strong><p className="mt-1">Akses organisasi saat ini belum memiliki grant yang berlaku. Hubungi pengelola Srikandi Buana untuk memeriksa masa berlaku atau penugasan Anda. Data organisasi tidak ditampilkan sampai izin aktif diberikan.</p></div>}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Perlindungan data</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Izin ini tidak memberikan akses otomatis ke NIK, alamat pribadi, rekening, data anggota individual, atau jurnal akuntansi mentah. Jangan membagikan tautan dokumen atau informasi yang Anda peroleh di luar tujuan pemberian akses.</p>
        </section>
        <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-500"><span>© {new Date().getFullYear()} KWT Srikandi Buana</span><Link href="/privasi" className="underline underline-offset-4">Kebijakan privasi</Link></footer>
      </div>
    </main>
  );
}
