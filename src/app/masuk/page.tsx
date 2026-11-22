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
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[1fr_1.05fr]">
      {/* branding side */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--sb-primary-900)] p-10 text-primary-50 lg:flex">
        <div className="hero-grain absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          {/* Full-colour lock-up on a white tile: the gold "BUANA" and the
              orange flame are part of the identity, so it is not flattened to
              white on the green panel. */}
          <span className="inline-flex items-center rounded-[10px] bg-white px-3 py-2">
            <Wordmark height={40} />
          </span>
          <h1 className="mt-14 max-w-md font-display text-[38px] leading-[1.1] font-semibold text-white">
            Satu platform, banyak pengalaman aplikasi.
          </h1>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-primary-200/95">
            Pengurus mengelola organisasi, bidang menjalankan pekerjaan, anggota berpartisipasi,
            mitra menerima akses yang dibagikan — semuanya di atas satu sumber data.
          </p>
          <ul className="mt-8 space-y-2.5 text-[12.5px] text-primary-200/90">
            {[
              "Identitas & cakupan akses terpusat",
              "Keuangan native tanpa aplikasi akuntansi eksternal",
              "Studio Pengelola untuk website & aplikasi",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[11.5px] text-primary-300/90">{DEMO_BANNER}</p>
      </aside>

      {/* form side */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden"><Wordmark /></Link>
          <Link href="/" className="ml-auto text-[12px] font-medium text-muted hover:text-ink">← Kembali ke website</Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="sb-label mb-2">Masuk ke ekosistem</div>
          <h2 className="font-display text-[30px] font-semibold text-ink">Selamat datang kembali.</h2>
          <p className="mt-1.5 text-[13px] text-muted">
            Pilih akun demo sesuai peran yang ingin Anda telusuri.
          </p>
          <LoginForm accounts={DEMO_ACCOUNTS.map((a) => ({ key: a.key, email: a.email, label: a.label, description: a.description, scope: a.identity.scope }))} />
          <p className="mt-6 text-[11.5px] leading-relaxed text-muted2">
            Lingkungan demo — sesi disimpan sebagai cookie lokal. Produksi wajib memakai penyedia
            autentikasi terverifikasi dan otorisasi server-side (Blueprint §16.2 &amp; §13).
          </p>
        </div>
      </main>
    </div>
  );
}
