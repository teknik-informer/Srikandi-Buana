import type { Metadata } from "next";
import { PageHeader, Notice } from "@/components/ui";
import { AktivitasTerakhir, BuatCepatPanel } from "./buat-panel";

export const metadata: Metadata = { title: "Buat Cepat" };

/**
 * Halaman ini dulu hanya berisi enam tautan — dan empat di antaranya berujung
 * ke halaman yang bukan formulir, bahkan dua rutenya tidak pernah ada. Sekarang
 * ia benar-benar menulis: formulirnya ada di `/cepat/buat-panel.tsx`.
 *
 * `?buat=<jenis>` membuka formulir tertentu langsung (dipakai tombol Buat di
 * header), jadi orang yang menekan tombol tiba di isian, bukan di daftar lagi.
 */
const JENIS = ["anggota", "lahan", "agenda", "surat", "program", "tugas"] as const;
type Jenis = (typeof JENIS)[number];

export default async function CepatPage({
  searchParams,
}: {
  searchParams: Promise<{ buat?: string }>;
}) {
  const { buat } = await searchParams;
  const awal = JENIS.includes(buat as Jenis) ? (buat as Jenis) : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Aksi cepat"
        title="Buat"
        description="Pilih apa yang mau dicatat. Formulir langsung di sini — setiap isian sah tersimpan ke domain yang memilikinya dan masuk jejak audit."
      />

      <BuatCepatPanel awal={awal} />

      <AktivitasTerakhir />

      <div className="mt-4">
        <Notice tone="info" title="Bukan jalan pintas aturan">
          Formulir di sini memakai aksi yang sama dengan menu asalnya. Tidak ada validasi,
          persetujuan, atau pemisahan tugas yang dilewati — yang lebih cepat hanya jalannya menuju isian.
        </Notice>
      </div>
    </div>
  );
}
