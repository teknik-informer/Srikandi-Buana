import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Informasi dasar keanggotaan, program, data, dan layanan Srikandi Buana.",
};

const FAQ_ITEMS = [
  {
    question: "Apakah mengisi formulir minat berarti sudah menjadi anggota?",
    answer: "Belum. Formulir hanya mencatat minat bergabung. Pengurus perlu meninjau pengajuan, memverifikasi data, dan mencatat keputusan keanggotaan secara terpisah.",
  },
  {
    question: "Apakah anggota otomatis mendapat akun untuk masuk ke aplikasi?",
    answer: "Tidak. Status keanggotaan dan akun login merupakan dua hal berbeda. Pemberian akses dilakukan setelah verifikasi dan penugasan yang sesuai.",
  },
  {
    question: "Bagaimana cara melihat produk yang tersedia?",
    answer: "Halaman produk hanya menampilkan produk yang sudah diaktifkan dan disetujui untuk publikasi. Harga, ketersediaan, dan cara pemesanan perlu dikonfirmasi melalui pengelola usaha.",
  },
  {
    question: "Apakah pembayaran pesanan dapat dilakukan di website?",
    answer: "Belum. Website belum menerima pembayaran otomatis. Pemesanan atau permintaan produk perlu dikonfirmasi oleh pengelola sebelum pembayaran dilakukan melalui instruksi resmi.",
  },
  {
    question: "Apakah ada iuran wajib anggota?",
    answer: "Besaran dan ketentuan iuran belum ditetapkan melalui kebijakan organisasi yang tercatat. Website tidak menerbitkan tagihan atau tunggakan anggota.",
  },
  {
    question: "Mengapa laporan dan kegiatan tertentu tidak terlihat di website?",
    answer: "Data internal tidak otomatis menjadi data publik. Dokumen, kegiatan, foto, informasi anggota, dan kemitraan hanya dapat ditampilkan setelah klasifikasi akses dan persetujuan publikasinya sesuai.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="sb-label mb-2">Bantuan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Pertanyaan yang sering diajukan.</h1>
      <p className="mt-2 text-[13.5px] text-muted">Informasi berdasarkan alur aplikasi yang saat ini tersedia.</p>

      <div className="mt-8 space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="sb-card group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[14px] font-semibold text-ink">
              {item.question}
              <span className="shrink-0 text-muted2 transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 text-[13px] leading-relaxed text-ink2">{item.answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/kontak" className="sb-btn sb-btn-primary">Informasi sekretariat</Link>
        <Link href="/gabung" className="sb-btn sb-btn-outline">Minat bergabung</Link>
      </div>
    </div>
  );
}
