"use client";

import Link from "next/link";

export default function ApplicationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="sb-shell flex min-h-[70dvh] items-center justify-center py-12 sm:py-16" role="alert" aria-live="assertive">
      <section className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
          Srikandi Buana
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Layanan sedang mengalami gangguan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Halaman belum dapat dimuat. Data yang belum berhasil disimpan tidak akan dianggap
          berhasil. Silakan coba kembali atau masuk melalui halaman utama.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => reset()} className="sb-btn sb-btn-primary">
            Coba lagi
          </button>
          <Link href="/masuk" className="sb-btn sb-btn-outline">
            Halaman masuk
          </Link>
          <Link href="/" className="text-sm font-semibold text-primary-700 hover:underline">
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
