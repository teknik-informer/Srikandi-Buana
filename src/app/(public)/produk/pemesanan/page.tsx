import Link from "next/link";
import type { Metadata } from "next";
import { ORG } from "@/config/org";
import { Card, CardHeader, Notice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Informasi Pemesanan",
  description: "Cara memesan produk anggota Srikandi Buana, pengiriman, dan pembayaran melalui kanal resmi.",
};

const STEPS = [
  { n: "01", t: "Pilih produk", d: "Buka katalog publik dan catat nama serta kemasan produk yang diinginkan." },
  { n: "02", t: "Hubungi kanal resmi", d: `Kirim pesan ke ${ORG.email} atau WhatsApp resmi organisasi. Sebutkan jumlah dan alamat kirim.` },
  { n: "03", t: "Konfirmasi ketersediaan", d: "Bidang Usaha & Kemitraan mengonfirmasi ketersediaan dan total biaya, termasuk pengiriman." },
  { n: "04", t: "Pembayaran & pengiriman", d: "Pembayaran hanya melalui rekening resmi organisasi. Bukti pembayaran disimpan oleh sekretariat." },
];

export default function PemesananPage() {
  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Informasi pemesanan</div>
      <h1 className="font-display text-[34px] font-semibold leading-tight text-ink sm:text-[40px]">Pesan langsung, tanpa perantara.</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink2">
        Tidak ada checkout otomatis di situs ini. Pemesanan berjalan melalui kanal resmi organisasi
        dan dikonfirmasi oleh Bidang Usaha &amp; Kemitraan.
      </p>

      <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Card key={s.n} className="p-5">
            <div className="font-display text-[13px] font-bold tracking-[0.1em] text-accent-600">{s.n}</div>
            <div className="mt-1 text-[15px] font-semibold text-ink">{s.t}</div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{s.d}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <Notice tone="warning" title="Lindungi diri dari penipuan">
          Organisasi tidak pernah meminta pembayaran melalui rekening pribadi. Rekening resmi hanya
          yang tercantum pada dokumen resmi dan dikonfirmasi sekretariat.
        </Notice>
        <Notice tone="info" title="Kebijakan harga, stok, retur, dan metode pembayaran">
          Kebijakan resmi belum ditetapkan pada dokumen organisasi (§28). Pemesanan berjalan dengan
          konfirmasi manual sampai kebijakan ditetapkan melalui keputusan organisasi.
        </Notice>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/produk" className="sb-btn sb-btn-primary">Kembali ke katalog</Link>
        <Link href="/kontak" className="sb-btn sb-btn-outline">Hubungi kami</Link>
      </div>
    </div>
  );
}
