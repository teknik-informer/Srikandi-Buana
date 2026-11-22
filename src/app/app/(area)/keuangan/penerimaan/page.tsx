import type { Metadata } from "next";
import { JOURNALS } from "@/data/finance";
import { ACCOUNT_BY_CODE } from "@/data/coa";
import { formatIDR, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Penerimaan" };

export default function PenerimaanPage() {
  const receipts = JOURNALS.filter(
    (j) => j.lines.some((l) => l.debit > 0 && ["1-1000", "1-1100"].includes(l.accountCode)),
  );
  const total = receipts.filter((j) => j.status === "diposting").reduce((s, j) => s + j.lines.filter((l) => ["1-1000", "1-1100"].includes(l.accountCode)).reduce((x, l) => x + l.debit, 0), 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Penerimaan"
        description="Penerimaan kas/bank dari penjualan, kontribusi, hibah, dan pelunasan piutang. Setiap penerimaan menghasilkan jurnal melalui posting service."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total penerimaan posted" value={formatIDR(total)} tone="success" />
        <StatCard label="Jumlah transaksi" value={receipts.length} />
        <StatCard label="Sumber terbesar" value="Hibah" note={formatIDR(15_000_000)} tone="accent" />
      </div>
      <Card className="mt-4">
        <CardHeader title="Daftar penerimaan" subtitle="Dengan referensi sumber dan status posting" />
        <div className="sb-scroll">
          <table className="sb-table min-w-[760px]">
            <thead><tr><th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Akun lawan</th><th className="num">Nilai</th><th>Status</th></tr></thead>
            <tbody>
              {receipts.map((j) => {
                const cashLine = j.lines.find((l) => l.debit > 0 && ["1-1000", "1-1100"].includes(l.accountCode));
                const counter = j.lines.find((l) => l.credit > 0);
                return (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-muted">{j.number}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                    <td className="font-medium text-ink">{j.description}</td>
                    <td className="text-muted">{counter ? `${counter.accountCode} ${ACCOUNT_BY_CODE[counter.accountCode]?.name}` : "—"}</td>
                    <td className="num font-medium">{formatIDR(cashLine?.debit ?? 0)}</td>
                    <td><StatusBadge status={j.status === "diposting" ? "Diposting" : j.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Catat penerimaan baru</Badge>
          <span className="text-[11.5px] text-muted">Formulir input dinonaktifkan pada demo; produksi memakai Form Builder dengan validasi server &amp; lampiran bukti.</span>
        </div>
      </Card>
    </div>
  );
}
