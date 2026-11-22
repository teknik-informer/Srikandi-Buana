import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity, DEMO_ACCOUNTS } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { Wordmark } from "@/components/brand";
import { DEMO_BANNER } from "@/config/org";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

export default async function MasukPage() {
  const identity = await getIdentity();
  if (identity) redirect(identity.home);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0b2417]">
      {/* ── Background: a real photograph from this organisation's own
             documentation, not an abstract gradient. A deep green scrim keeps
             the form legible at every size. ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-dasbor.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-[68%_40%]"
        decoding="async"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,29,17,0.96)_0%,rgba(8,35,20,0.9)_34%,rgba(9,38,22,0.66)_58%,rgba(10,42,24,0.38)_100%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 py-6 sm:px-6 sm:py-8">
        {/* top row: the one brand mark + the way back to the site */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Srikandi Buana — kembali ke website"
            className="inline-flex items-center rounded-[10px] bg-white px-2.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-white/25 transition hover:bg-[#fbfdf9]"
          >
            <Wordmark height={30} />
          </Link>
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white/85 ring-1 ring-inset ring-white/25 transition hover:bg-white/10 hover:text-white"
          >
            ← Kembali ke website
          </Link>
        </div>

        {/* two columns on desktop: the promise on the left, the form on the right */}
        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.05fr_minmax(420px,480px)] lg:gap-14">
          <div className="hidden max-w-xl lg:block">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#dff0e2] ring-1 ring-inset ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7ddc93]" />
              Ruang kerja internal
            </span>
            <h1 className="mt-5 font-display text-[40px] leading-[1.06] font-extrabold tracking-[-0.03em] text-white xl:text-[46px]">
              Satu platform,
              <br />
              banyak pengalaman aplikasi.
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-[#cfe3d3]">
              Pengurus mengelola organisasi, bidang menjalankan pekerjaan, anggota berpartisipasi,
              mitra menerima akses yang dibagikan — semuanya di atas satu sumber data.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                ["Identitas & cakupan akses terpusat", "Satu akun, kewenangan berbeda per aplikasi."],
                ["Keuangan native", "Tanpa aplikasi akuntansi eksternal; jurnal lewat posting service."],
                ["Studio Pengelola", "Website, form, dashboard, dan workflow dikelola sendiri."],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#7ddc93]/20 text-[#9ae8ac] ring-1 ring-inset ring-[#7ddc93]/30">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2.5 6.2 4.9 8.6 9.5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-white">{t}</span>
                    <span className="block text-[11.5px] leading-snug text-[#a9c9b1]">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* the form card */}
          <div className="w-full rounded-[20px] border border-white/15 bg-white/98 p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.65)] backdrop-blur sm:p-7">
            <div className="sb-label mb-2">Masuk ke ekosistem</div>
            <h2 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">Selamat datang kembali.</h2>
            <p className="mt-1.5 text-[12.5px] text-muted">
              Pilih akun demo sesuai peran yang ingin Anda telusuri.
            </p>
            <LoginForm accounts={DEMO_ACCOUNTS.map((a) => ({ key: a.key, email: a.email, label: a.label, description: a.description, scope: a.identity.scope }))} />
            <p className="mt-5 border-t border-line pt-3.5 text-[11px] leading-relaxed text-muted2">
              Lingkungan demo — sesi disimpan sebagai cookie lokal. Produksi wajib memakai penyedia
              autentikasi terverifikasi dan otorisasi server-side (Blueprint §16.2 &amp; §13).
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/55">{DEMO_BANNER}</p>
      </div>
    </div>
  );
}
