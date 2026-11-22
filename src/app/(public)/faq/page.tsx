import Link from "next/link";
import type { Metadata } from "next";
import { FAQS } from "@/data/content";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Pertanyaan yang sering diajukan tentang keanggotaan, produk, laporan, dan kemitraan Srikandi Buana.",
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="sb-label mb-2">Bantuan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-primary-950 sm:text-[40px]">Pertanyaan yang sering diajukan.</h1>
      <p className="mt-2 text-[13.5px] text-muted">Jika jawaban belum membantu, hubungi kami melalui halaman kontak.</p>

      <div className="mt-8 space-y-3">
        {FAQS.map((f, i) => (
          <details key={i} className="sb-card group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[14px] font-semibold text-ink">
              {f.q}
              <span className="shrink-0 text-muted2 transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 text-[13px] leading-relaxed text-ink2">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/kontak" className="sb-btn sb-btn-primary">Hubungi kami</Link>
        <Link href="/gabung" className="sb-btn sb-btn-outline">Minat bergabung</Link>
      </div>
    </div>
  );
}
