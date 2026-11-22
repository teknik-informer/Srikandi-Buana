import type { Metadata } from "next";
import { formatIDR, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Kontribusi" };

const CONTRIBUTIONS = [
  { id: "K-2026-11", date: "2026-11-12", amount: 20_000, note: "Kotak kegiatan rapat anggota", method: "Tunai" },
  { id: "K-2026-10", date: "2026-10-14", amount: 20_000, note: "Kotak kegiatan rapat anggota", method: "Tunai" },
  { id: "K-2026-09", date: "2026-09-09", amount: 30_000, note: "Kontribusi sukarela rumah jemur", method: "Tunai" },
  { id: "K-2026-08", date: "2026-08-11", amount: 20_000, note: "Kotak kegiatan rapat anggota", method: "Tunai" },
  { id: "K-2026-07", date: "2026-07-13", amount: 30_000, note: "Kontribusi sukarela pelatihan", method: "Tunai" },
];

export default function KontribusiPage() {
  const total = CONTRIBUTIONS.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Kontribusi saya"
        description="Catatan kontribusi sukarela anggota. Kebijakan iuran wajib belum ditetapkan organisasi."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total tahun ini" value={formatIDR(total)} tone="success" />
        <StatCard label="Jumlah transaksi" value={CONTRIBUTIONS.length} />
        <StatCard label="Status iuran wajib" value="Belum ditetapkan" note="Menunggu keputusan organisasi" tone="warning" />
      </div>
      <Card className="mt-4">
        <CardHeader title="Riwayat kontribusi" subtitle="Tercatat melalui aplikasi Keuangan" />
        <div className="sb-scroll">
          <table className="sb-table min-w-[560px]">
            <thead><tr><th>ID</th><th>Tanggal</th><th>Keterangan</th><th>Metode</th><th className="num">Nilai</th></tr></thead>
            <tbody>
              {CONTRIBUTIONS.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-[11px] text-muted">{c.id}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(c.date, "short")}</td>
                  <td className="font-medium text-ink">{c.note}</td>
                  <td><Badge tone="neutral">{c.method}</Badge></td>
                  <td className="num">{formatIDR(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-4">
        <Notice tone="warning" title="Bukan kewajiban resmi">
          Angka ini adalah data demo. Sistem tidak menetapkan besaran iuran; besaran dan status
          kewajiban ditetapkan oleh organisasi (Blueprint §28).
        </Notice>
      </div>
    </div>
  );
}
