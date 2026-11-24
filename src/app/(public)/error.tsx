"use client";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="sb-shell py-12 sm:py-16" role="alert" aria-live="assertive">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
          Srikandi Buana
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Halaman belum dapat ditampilkan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Terjadi gangguan saat memuat halaman ini. Silakan coba kembali. Jika
          kendala berlanjut, hubungi Sekretariat Srikandi Buana.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => reset()} className="sb-btn sb-btn-primary">
            Coba lagi
          </button>
          <a href="/kontak?tujuan=informasi" className="sb-btn sb-btn-outline">
            Hubungi Sekretariat
          </a>
          <a href="/" className="text-sm font-semibold text-primary-700 hover:underline">
            Kembali ke beranda
          </a>
        </div>
      </div>
    </section>
  );
}
