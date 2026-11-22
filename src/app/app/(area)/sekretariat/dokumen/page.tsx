import type { Metadata } from "next";
import { DOCUMENTS } from "@/data/organization";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Dokumen & Arsip" };

export default function DokumenPage() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Dokumen & arsip"
        description="Setiap dokumen memiliki klasifikasi akses. Dokumen publik dapat tampil di website setelah disetujui."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total dokumen" value={DOCUMENTS.length} />
        <StatCard label="Publik" value={DOCUMENTS.filter((d) => d.visibility === "publik").length} tone="success" />
        <StatCard label="Internal & terbatas" value={DOCUMENTS.filter((d) => d.visibility !== "publik").length} tone="warning" />
      </div>
      <Card className="mt-4">
        <CardHeader title="Arsip dokumen" subtitle="Versi dan riwayat perubahan tersimpan per dokumen" />
        <div className="sb-scroll">
          <table className="sb-table min-w-[780px]">
            <thead><tr><th>Nomor</th><th>Judul</th><th>Kategori</th><th>Tanggal</th><th>Pemilik</th><th>Akses</th><th>Status</th></tr></thead>
            <tbody>
              {DOCUMENTS.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{d.number}</td>
                  <td className="font-medium text-ink">{d.title}</td>
                  <td>{d.category}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(d.date, "short")}</td>
                  <td className="text-muted">{d.owner}</td>
                  <td><Badge tone={d.visibility === "publik" ? "success" : d.visibility === "internal" ? "info" : "warning"}>{d.visibility}</Badge></td>
                  <td><Badge tone={d.status === "final" ? "neutral" : "warning"}>{d.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-4">
        <Notice tone="warning" title="Batas akses">
          Dokumen internal dan terbatas tidak pernah muncul di website publik. Membuka akses adalah
          keputusan pengurus, bukan tindakan teknis sepihak.
        </Notice>
      </div>
    </div>
  );
}
