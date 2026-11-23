import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

/**
 * Login is a single screen at every size — no scrollbar, phone or desktop.
 * Branding sits directly on the photograph (transparent lock-up for the dark
 * green bar), the form is compact enough to fit 360×640 once the role picker
 * is behind its own step.
 */
export default async function MasukPage() {
  const identity = await getIdentity();
  if (identity) redirect(identity.home);

  return (
    <div className="relative min-h-dvh bg-[#0b2417] [@media(min-height:520px)]:h-dvh [@media(min-height:520px)]:overflow-hidden">
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

      {/* flex column pinned to the viewport: header row, the panel, the demo line */}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6 [@media(min-height:520px)]:h-full [@media(min-height:520px)]:min-h-0">
        <div className="flex shrink-0 items-center justify-between gap-3">
          {/* Transparent lock-up — the previous white tile read as a sticker
              pasted on the photograph. */}
          <Link
            href="/"
            aria-label="Srikandi Buana — kembali ke website"
            className="inline-flex items-center rounded-md transition hover:opacity-85"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/wordmark-on-dark.png"
              alt="Srikandi Buana"
              width={900}
              height={329}
              className="h-[30px] w-auto sm:h-[36px]"
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <Link
            href="/"
            className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white/85 ring-1 ring-inset ring-white/25 transition hover:bg-white/10 hover:text-white"
          >
            ← <span className="hidden sm:inline">Kembali ke </span>Website
          </Link>
        </div>

        {/* two columns from lg up: the promise on the left, the form on the right */}
        <div className="grid min-h-0 flex-1 items-center gap-8 py-4 lg:grid-cols-[1.05fr_minmax(400px,468px)] lg:gap-14">
          <div className="hidden lg:block">
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

          {/* the form card — compact: 8 role names live behind the picker */}
          <div className="w-full max-w-[480px] justify-self-end rounded-[18px] border border-white/15 bg-white/[0.98] p-4 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.65)] backdrop-blur sm:p-6">
            <div className="sb-label mb-1.5">Masuk ke ekosistem</div>
            <h2 className="font-display text-[23px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
              Selamat datang kembali.
            </h2>
            <p className="mt-1 text-[12.5px] text-muted">
              Masukkan surel akun Anda. Hak akses ditentukan dari penugasan organisasi.
            </p>
            <LoginForm />
            <p className="mt-3 border-t border-line pt-2.5 text-[10.5px] leading-snug text-muted2">
              Sesi menggunakan cookie HttpOnly. Peran dan cakupan akses diperiksa dari penugasan organisasi di server.
            </p>
          </div>
        </div>

        <p className="shrink-0 text-center text-[10.5px] text-white/55">Akses terbatas untuk pengguna yang memiliki akun dan penugasan aktif.</p>
      </div>
    </div>
  );
}
