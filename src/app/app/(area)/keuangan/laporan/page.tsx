import type { Metadata } from "next";
import { incomeStatement, trialBalance, cashPosition } from "@/lib/finance";
import { FUNDS } from "@/data/finance";
import { formatIDR, percent } from "@/lib/format";
import { Badge, Card, CardHeader, Notice, PageHeader, Progress, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Laporan Keuangan" };

export default function LaporanPage() {
  const is = incomeStatement();
  const tb = trialBalance();
  const cash = cashPosition();

  // Balance sheet built from the same posted ledger. The period is still open,
  // so the current surplus is shown on its own line (never rolled into equity
  // silently) and the statement is labelled "sementara" until closing entries.
  const sumType = (t: string) => tb.rows.filter((r) => r.type === t).reduce((s, r) => s + r.balance, 0);
  // Asset accounts carry a debit-normal balance; contra-asset accounts (e.g.
  // accumulated depreciation) have a credit-normal balance and must reduce the
  // asset total rather than add to it.
  const totalAssets = tb.rows
    .filter((r) => r.type === "aset")
    .reduce((s, r) => s + (r.normal === "debit" ? r.balance : -r.balance), 0);
  const totalLiabilities = sumType("kewajiban");
  const totalEquity = sumType("ekuitas");
  const equityWithSurplus = totalEquity + is.surplus;
  const balanceGap = totalAssets - (totalLiabilities + equityWithSurplus);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Laporan keuangan (draf)"
        description="Disusun dari jurnal posted. Format resmi, kebijakan pengakuan, dan penyajian wajib disahkan sebelum digunakan untuk pelaporan formal."
        actions={<Badge tone="warning">Draf — belum disahkan</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pendapatan" value={formatIDR(is.totalRevenue)} tone="success" />
        <StatCard label="Beban" value={formatIDR(is.totalExpense)} tone="danger" />
        <StatCard label="Surplus / (defisit)" value={formatIDR(is.surplus)} note={`${percent(is.surplus, is.totalRevenue)}% dari pendapatan`} tone="info" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Laporan aktivitas (pendapatan & beban)" subtitle="Periode 1–22 November 2026 · demo" />
          <div className="px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sb-success)]">Pendapatan</div>
            <table className="sb-table mt-1">
              <tbody>
                {is.revenue.map((r) => (
                  <tr key={r.code}>
                    <td className="text-[12px]">{r.code}</td>
                    <td className="text-[12.5px] text-ink">{r.name}</td>
                    <td className="num text-[12.5px]">{formatIDR(r.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-paper"><td colSpan={2} className="text-[11.5px] font-bold uppercase text-muted">Jumlah pendapatan</td><td className="num font-semibold text-ink">{formatIDR(is.totalRevenue)}</td></tr>
              </tbody>
            </table>
            <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sb-danger)]">Beban</div>
            <table className="sb-table mt-1">
              <tbody>
                {is.expenses.map((r) => (
                  <tr key={r.code}>
                    <td className="text-[12px]">{r.code}</td>
                    <td className="text-[12.5px] text-ink">{r.name}</td>
                    <td className="num text-[12.5px]">{formatIDR(r.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-paper"><td colSpan={2} className="text-[11.5px] font-bold uppercase text-muted">Jumlah beban</td><td className="num font-semibold text-ink">{formatIDR(is.totalExpense)}</td></tr>
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between rounded-sb-sm border border-primary-200 bg-primary-50 px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-primary-900">Surplus periode</span>
              <span className="font-display text-[19px] font-semibold text-primary-900">{formatIDR(is.surplus)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Posisi keuangan ringkas (neraca)"
              subtitle="Sementara — surplus periode belum ditutup"
              action={<Badge tone={balanceGap === 0 ? "success" : "warning"}>{balanceGap === 0 ? "Seimbang" : "Selisih " + formatIDR(Math.abs(balanceGap))}</Badge>}
            />
            <dl className="divide-y divide-line text-[12.5px]">
              {[
                ["Total aset", formatIDR(totalAssets), false],
                ["Total kewajiban", formatIDR(totalLiabilities), false],
                ["Ekuitas tercatat", formatIDR(totalEquity), false],
                ["Surplus periode (belum ditutup)", formatIDR(is.surplus), false],
                ["Total ekuitas + surplus", formatIDR(equityWithSurplus), true],
                ["Kas & bank (rekonsiliasi terakhir)", formatIDR(cash.totalClosing), false],
              ].map(([k, v, strong]) => (
                <div key={String(k)} className="flex justify-between px-4 py-2.5">
                  <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{k}</dt>
                  <dd className={`tabular-nums ${strong ? "font-semibold text-ink" : "font-medium text-ink"}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              Aset = kewajiban + ekuitas + surplus periode. Neraca resmi memerlukan jurnal penutup
              pada periode yang telah dikunci dan kebijakan penilaian yang disahkan.
            </div>
          </Card>

          <Card>
            <CardHeader title="Laporan dana & pembatasan" subtitle="Ringkasan penggunaan dana hibah" />
            <div className="space-y-3 px-4 py-3">
              {FUNDS.map((f) => (
                <div key={f.code}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="font-medium text-ink">{f.name}</span>
                    <span className="text-muted">{formatIDR(f.used)} / {formatIDR(f.received)}</span>
                  </div>
                  <div className="mt-1"><Progress value={percent(f.used, f.received)} tone="accent" /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Batas penggunaan laporan">
          Ini adalah <strong>laporan demo</strong>. Laporan resmi harus disahkan organisasi dan tenaga
          akuntansi kompeten. Sistem tidak menjanjikan kepatuhan pajak atau format akuntansi tertentu
          sebelum kebijakan ditetapkan (Blueprint §1.1, §33).
        </Notice>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="sb-btn sb-btn-outline" disabled>Ekspor CSV (demo)</button>
          <button type="button" className="sb-btn sb-btn-outline" disabled>Cetak PDF (demo)</button>
          <span className="text-[11px] text-muted2">Ekspor dinonaktifkan pada demo. Produksi: job antrean dengan signed URL &amp; audit unduhan.</span>
        </div>
      </Card>
    </div>
  );
}
