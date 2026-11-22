import type { Metadata } from "next";
import { BANK_STATEMENT, JOURNALS } from "@/data/finance";
import { cashPosition } from "@/lib/finance";
import { formatIDR, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Kas & Bank" };

export default function KasBankPage() {
  const cash = cashPosition();
  const unmatched = BANK_STATEMENT.filter((b) => b.status !== "cocok");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Kas & bank"
        description="Saldo kas dan bank diturunkan dari buku besar. Rekonsiliasi membandingkan mutasi bank dengan jurnal, dan menampilkan exception alih-alih mengubah saldo diam-diam."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {cash.accounts.map((a) => (
          <StatCard key={a.code} label={a.name} value={formatIDR(a.closing)} note={`Masuk ${formatIDR(a.inflow)} · keluar ${formatIDR(a.outflow)}`} tone={a.code === "1-1000" ? "success" : "info"} />
        ))}
        <StatCard label="Exception rekonsiliasi" value={unmatched.length} note="Perlu tindak lanjut bendahara" tone={unmatched.length ? "warning" : "success"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Rekonsiliasi bank — November 2026" subtitle="Rekening BRI organisasi (demo)" action={<Badge tone="warning">{unmatched.length} belum cocok</Badge>} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[680px]">
              <thead><tr><th>Tanggal</th><th>Keterangan mutasi</th><th className="num">Masuk</th><th className="num">Keluar</th><th>Jurnal</th><th>Status</th></tr></thead>
              <tbody>
                {BANK_STATEMENT.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap text-muted">{formatDateID(b.date, "short")}</td>
                    <td className="font-medium text-ink">{b.description}</td>
                    <td className="num">{b.debit ? formatIDR(b.debit) : "—"}</td>
                    <td className="num">{b.credit ? formatIDR(b.credit) : "—"}</td>
                    <td className="font-mono text-[11px] text-muted">{b.matchedJournalId ?? "—"}</td>
                    <td><StatusBadge status={b.status === "cocok" ? "Cocok" : b.status === "selisih" ? "Selisih" : "Belum"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Status “selisih” pada TRF mitra: bank mencatat masuk Rp 4.200.000, jurnal tercatat sebagai
            piutang (INV-2026-0031). Perlu konfirmasi pelunasan — sistem tidak mengubah saldo otomatis.
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Posisi per akun" />
            <div className="divide-y divide-line">
              {cash.accounts.map((a) => (
                <div key={a.code} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12.5px] font-semibold text-ink">{a.name}</div>
                    <span className="font-mono text-[10.5px] text-muted2">{a.code}</span>
                  </div>
                  <dl className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                    <div><dt className="text-muted2">Awal</dt><dd className="font-medium text-ink2">{formatIDR(a.opening)}</dd></div>
                    <div><dt className="text-muted2">Masuk</dt><dd className="font-medium text-[var(--sb-success)]">{formatIDR(a.inflow)}</dd></div>
                    <div><dt className="text-muted2">Keluar</dt><dd className="font-medium text-[var(--sb-danger)]">{formatIDR(a.outflow)}</dd></div>
                  </dl>
                  <div className="mt-1.5 border-t border-dashed border-line pt-1.5 text-[12px]">
                    Saldo akhir: <span className="font-semibold text-primary-800">{formatIDR(a.closing)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Antrean tindak lanjut" />
            <ul className="divide-y divide-line">
              {unmatched.map((b) => (
                <li key={b.id} className="px-4 py-2.5">
                  <div className="text-[12px] font-medium text-ink">{b.description}</div>
                  <div className="text-[10.5px] text-muted2">{formatDateID(b.date, "short")} · {b.debit ? `masuk ${formatIDR(b.debit)}` : `keluar ${formatIDR(b.credit)}`}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Notice tone="info" title="Kontrol">
            Rekonsiliasi menghasilkan exception, bukan penyesuaian otomatis. Penyesuaian dibuat
            sebagai jurnal koreksi yang tercatat dan memerlukan persetujuan.
          </Notice>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Jurnal yang menyentuh kas/bank" subtitle="Penelusuran dari mutasi ke jurnal sumber" />
        <div className="sb-scroll">
          <table className="sb-table min-w-[600px]">
            <thead><tr><th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Sumber</th></tr></thead>
            <tbody>
              {JOURNALS.filter((j) => j.status === "diposting" && j.lines.some((l) => l.accountCode.startsWith("1-10") || l.accountCode === "1-1100")).slice(-6).map((j) => (
                <tr key={j.id}>
                  <td className="font-mono text-[11px] text-muted">{j.number}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                  <td className="font-medium text-ink">{j.description}</td>
                  <td><Badge tone="neutral">{j.source}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
