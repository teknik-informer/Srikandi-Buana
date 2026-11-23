import type { Metadata } from "next";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { DocumentTableClient } from "./dokumen-client";

export const metadata: Metadata = { title: "Dokumen & Arsip" };

/**
 * Arsip dokumen Sekretariat — the register is now editable in place.
 * Counts are rendered on the client from the same store the table writes to,
 * so the tiles move the moment a document is added, reclassified or removed.
 */
export default function DokumenPage() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Dokumen & arsip"
        description="Setiap dokumen memiliki klasifikasi akses. Dokumen publik dapat tampil di website setelah disetujui."
      />
      <DocumentTableClient />
      <Card className="mt-4">
        <CardHeader
          title="Aturan arsip"
          subtitle="Kenapa klasifikasi akses tidak bisa diabaikan"
        />
        <ul className="space-y-2 px-4 py-3 text-[12.5px] leading-relaxed text-ink2">
          <li>• Dokumen berstatus <strong>Draf</strong> belum boleh dirujuk pada laporan atau pengumuman.</li>
          <li>• Klasifikasi <strong>Terbatas</strong> membatasi dokumen pada pengurus berwenang; tautan tetap dibuat eksplisit, bukan disembunyikan.</li>
          <li>• Menghapus dokumen pada demo ini menghapus baris dari register lokal; pada produksi, arsip umumnya dipindah ke status <em>Arsip</em>, bukan dihapus.</li>
        </ul>
      </Card>
    </div>
  );
}
