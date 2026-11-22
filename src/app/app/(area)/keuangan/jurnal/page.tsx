import type { Metadata } from "next";
import { JOURNALS } from "@/data/finance";
import { ACCOUNT_BY_CODE } from "@/data/coa";
import { journalTotals } from "@/lib/finance";
import { formatIDR, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Jurnal & Posting" };

export default function JurnalPage() {
  const posted = JOURNALS.filter((j) => j.status === "diposting");
  const unbalanced = JOURNALS.filter((j) => !journalTotals(j).balanced);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Jurnal umum & posting"
        description="Setiap posting mencatat header, baris, referensi sumber, dan idempotency key secara atomik. Koreksi dilakukan melalui reversal berpasangan, bukan penghapusan."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Jurnal diposting" value={posted.length} note="Tidak dapat diubah" tone="success" />
        <StatCard label="Menunggu persetujuan" value={JOURNALS.filter((j) => j.status === "menunggu").length} tone="warning" />
        <StatCard label="Jurnal tidak seimbang" value={unbalanced.length} note={unbalanced.length === 0 ? "Semua seimbang ✓" : "Perlu koreksi"} tone={unbalanced.length === 0 ? "success" : "danger"} />
      </div>

      <div className="mt-5 space-y-3">
        {JOURNALS.slice().reverse().map((j) => {
          const t = journalTotals(j);
          return (
            <Card key={j.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-2.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11.5px] font-semibold text-ink2">{j.number}</span>
                    <Badge tone="neutral">{j.source}</Badge>
                    {j.sourceRef ? <span className="font-mono text-[10.5px] text-muted2">ref {j.sourceRef}</span> : null}
                    {j.reversalOf ? <Badge tone="warning">Reversal {j.reversalOf}</Badge> : null}
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-ink">{j.description}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">
                    {formatDateID(j.date)} · dibuat {j.createdBy}{j.approvedBy ? ` · disetujui ${j.approvedBy}` : ""} · key {j.idempotencyKey}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.balanced ? <Badge tone="success">Seimbang</Badge> : <Badge tone="danger">Tidak seimbang</Badge>}
                  <StatusBadge status={j.status === "diposting" ? "Diposting" : j.status === "menunggu" ? "Menunggu" : "Draf"} />
                </div>
              </div>
              <div className="sb-scroll">
                <table className="sb-table min-w-[680px]">
                  <thead><tr><th>Akun</th><th>Memo</th><th>Program / Dana</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                  <tbody>
                    {j.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="font-medium text-ink">
                          <span className="font-mono text-[11px] text-muted">{l.accountCode}</span>{" "}
                          {ACCOUNT_BY_CODE[l.accountCode]?.name ?? "—"}
                        </td>
                        <td className="text-muted">{l.memo ?? "—"}</td>
                        <td className="font-mono text-[10.5px] text-muted2">{[l.programCode, l.fundCode].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="num">{l.debit ? formatIDR(l.debit) : "—"}</td>
                        <td className="num">{l.credit ? formatIDR(l.credit) : "—"}</td>
                      </tr>
                    ))}
                    <tr className="bg-paper">
                      <td colSpan={3} className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">Total</td>
                      <td className="num font-semibold text-ink">{formatIDR(t.debit)}</td>
                      <td className="num font-semibold text-ink">{formatIDR(t.credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Alur posting yang wajib">
          Aplikasi sumber (POS, pengadaan, pelatihan, kontribusi) memanggil domain service Keuangan —
          bukan menulis jurnal langsung. Posting berjalan dalam satu transaksi database dengan
          validasi saldo, referensi sumber unik, dan idempotency key unik.
        </Notice>
      </div>
    </div>
  );
}
