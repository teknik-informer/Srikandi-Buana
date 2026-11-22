import type { Metadata } from "next";
import { JOURNALS } from "@/data/finance";
import { ACCOUNT_BY_CODE } from "@/data/coa";
import { formatIDR, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Pembayaran" };

export default function PembayaranPage() {
  const payments = JOURNALS.filter(
    (j) => j.lines.some((l) => l.credit > 0 && ["1-1000", "1-1100"].includes(l.accountCode)),
  );
  const total = payments.filter((j) => j.status === "diposting").reduce((s, j) => s + j.lines.filter((l) => l.credit > 0 && ["1-1000", "1-1100"].includes(l.accountCode)).reduce((x, l) => x + l.credit, 0), 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Pembayaran & pengeluaran"
        description="Pembayaran beban, saprodi, pelatihan, dan pelunasan utang. Nilai tertentu memerlukan persetujuan tambahan sesuai aturan pemisahan tugas."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total pembayaran posted" value={formatIDR(total)} tone="danger" />
        <StatCard label="Jumlah transaksi" value={payments.length} />
        <StatCard label="Menunggu persetujuan" value={JOURNALS.filter((j) => j.status === "menunggu").length} tone="warning" href="/app/pengurus/persetujuan" />
      </div>
      <Card className="mt-4">
        <CardHeader title="Daftar pembayaran" />
        <div className="sb-scroll">
          <table className="sb-table min-w-[760px]">
            <thead><tr><th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Akun beban</th><th className="num">Nilai</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map((j) => {
                const cashLine = j.lines.find((l) => l.credit > 0 && ["1-1000", "1-1100"].includes(l.accountCode));
                const debitLine = j.lines.find((l) => l.debit > 0);
                return (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-muted">{j.number}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                    <td className="font-medium text-ink">{j.description}</td>
                    <td className="text-muted">{debitLine ? `${debitLine.accountCode} ${ACCOUNT_BY_CODE[debitLine.accountCode]?.name}` : "—"}</td>
                    <td className="num font-medium">{formatIDR(cashLine?.credit ?? 0)}</td>
                    <td><StatusBadge status={j.status === "diposting" ? "Diposting" : j.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Pemisahan tugas</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
            Pengaju tidak boleh menjadi penyetuju untuk transaksi melebihi ambang yang ditetapkan.
            Ambang nilai persetujuan <Badge tone="warning">belum ditetapkan</Badge> oleh organisasi —
            konfigurasi tersedia, kebijakan menunggu keputusan resmi.
          </p>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Bukti & lampiran</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
            Setiap pembayaran mensyaratkan bukti yang tersimpan pada Document Store, dengan
            reference ke jurnal. Lampiran tidak dapat diganti setelah periode dikunci.
          </p>
        </Card>
      </div>
    </div>
  );
}
