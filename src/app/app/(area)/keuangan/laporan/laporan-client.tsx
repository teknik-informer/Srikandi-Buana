"use client";

import Link from "next/link";
import { Download, Printer, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Badge, Card, CardHeader, Progress, StatCard } from "@/components/ui";
import { Btn, DemoStateChip, Modal } from "@/components/act";
import { useStore, useFinance } from "@/lib/store";
import { FUNDS } from "@/data/finance";
import { formatIDR, percent } from "@/lib/format";
import { useState } from "react";

export function LaporanClient() {
  const { state } = useStore();
  const { tb, is } = useFinance();
  const [exportOpen, setExportOpen] = useState(false);

  const sumType = (t: string) => tb.rows.filter((r) => r.type === t).reduce((s, r) => s + r.balance, 0);
  const totalAssets = tb.rows.filter((r) => r.type === "aset").reduce((s, r) => s + (r.normal === "debit" ? r.balance : -r.balance), 0);
  const totalLiabilities = sumType("kewajiban");
  const totalEquity = sumType("ekuitas");
  const equityWithSurplus = totalEquity + is.surplus;
  const balanceGap = totalAssets - (totalLiabilities + equityWithSurplus);
  const cash = [...new Set(["1-1000", "1-1100"])].map((code) => {
    let bal = 0;
    for (const j of state.journals) {
      if (j.status !== "diposting") continue;
      for (const l of j.lines) if (l.accountCode === code) bal += l.debit - l.credit;
    }
    return bal;
  });
  const totalCash = cash.reduce((a, b) => a + b, 0);

  /** CSV built from the live ledger — real download, no server job. */
  function downloadCSV() {
    const rows: string[][] = [
      ["Laporan", "Akun", "Nama akun", "Kelompok", "Debit", "Kredit"],
      ...tb.rows.map((r) => [r.type === "pendapatan" || r.type === "beban" ? "Laba rugi" : "Neraca", r.code, r.name, r.type, String(r.debitCol), String(r.creditCol)]),
      ["Total", "", "", "", String(tb.totalDebit), String(tb.totalCredit)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "srikandi-buana-neraca-saldo-2026-11-22.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Keuangan Native</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Laporan keuangan (draf)</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Disusun dari jurnal diposting dan dihitung ulang setiap kali halaman dibuka. Format resmi dan
            kebijakan pengakuan wajib disahkan sebelum dipakai untuk pelaporan formal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip compact />
          <Badge tone="warning">Draf — belum disahkan</Badge>
        </div>
      </header>

      <div className="rounded-sb-sm border border-[var(--sb-info)]/25 bg-[var(--sb-info-bg)] px-3.5 py-2.5 text-[12px] text-[var(--sb-info)]">
        Angka di bawah berasal dari <strong>{state.journals.filter((j) => j.status === "diposting").length} jurnal diposting</strong> —
        termasuk transaksi yang baru Anda buat pada sesi ini.{" "}
        <Link href="/app/keuangan/jurnal" className="font-semibold underline">Kelola jurnal →</Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Pendapatan" value={formatIDR(is.totalRevenue)} tone="success" icon={<TrendingUp size={17} />} />
        <StatCard label="Beban" value={formatIDR(is.totalExpense)} tone="danger" icon={<TrendingDown size={17} />} />
        <StatCard label="Surplus" value={formatIDR(is.surplus)} note={`${percent(is.surplus, is.totalRevenue)}% dari pendapatan`} tone="info" icon={<Wallet size={17} />} />
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Laporan aktivitas" subtitle="Periode 1–22 November 2026 · dihitung dari buku besar" />
          <div className="px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sb-success)]">Pendapatan</div>
            <table className="sb-table mt-1">
              <tbody>
                {is.revenue.map((r) => (
                  <tr key={r.code}>
                    <td className="text-[12px] font-mono text-muted2">{r.code}</td>
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
                    <td className="text-[12px] font-mono text-muted2">{r.code}</td>
                    <td className="text-[12.5px] text-ink">{r.name}</td>
                    <td className="num text-[12.5px]">{formatIDR(r.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-paper"><td colSpan={2} className="text-[11.5px] font-bold uppercase text-muted">Jumlah beban</td><td className="num font-semibold text-ink">{formatIDR(is.totalExpense)}</td></tr>
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between rounded-sb-sm border border-primary-200 bg-primary-50 px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-primary-900">Surplus periode</span>
              <span className="font-display text-[19px] font-semibold text-primary-900 tabular-nums">{formatIDR(is.surplus)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Posisi keuangan ringkas"
              subtitle="Sementara — surplus belum ditutup"
              action={<Badge tone={balanceGap === 0 ? "success" : "warning"}>{balanceGap === 0 ? "Seimbang" : "Selisih " + formatIDR(Math.abs(balanceGap))}</Badge>}
            />
            <dl className="divide-y divide-line text-[12.5px]">
              {[
                ["Total aset", formatIDR(totalAssets), false],
                ["Total kewajiban", formatIDR(totalLiabilities), false],
                ["Ekuitas tercatat", formatIDR(totalEquity), false],
                ["Surplus periode (belum ditutup)", formatIDR(is.surplus), false],
                ["Total ekuitas + surplus", formatIDR(equityWithSurplus), true],
                ["Kas & bank", formatIDR(totalCash), false],
              ].map(([k, v, strong]) => (
                <div key={String(k)} className="flex justify-between px-4 py-2.5">
                  <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{k}</dt>
                  <dd className={`tabular-nums ${strong ? "font-semibold text-ink" : "font-medium text-ink"}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              Aset = kewajiban + ekuitas + surplus periode. Neraca resmi memerlukan jurnal penutup pada periode terkunci.
            </div>
          </Card>

          <Card>
            <CardHeader title="Laporan dana & pembatasan" subtitle="Ringkasan penggunaan dana hibah" />
            <div className="space-y-3 px-4 py-3">
              {FUNDS.map((f) => (
                <div key={f.code}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="font-medium text-ink">{f.name}</span>
                    <span className="text-muted tabular-nums">{formatIDR(f.used)} / {formatIDR(f.received)}</span>
                  </div>
                  <div className="mt-1"><Progress value={percent(f.used, f.received)} tone="accent" /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 rounded-sb-sm border border-[#f0dcae] bg-[var(--sb-warning-bg)] px-3.5 py-3 text-[13px] text-[var(--sb-warning)]">
        <div className="mb-0.5 font-semibold">Batas penggunaan laporan</div>
        Ini adalah <strong>laporan demo</strong>. Laporan resmi harus disahkan organisasi dan tenaga akuntansi kompeten.
        Sistem tidak menjanjikan kepatuhan pajak atau format akuntansi tertentu sebelum kebijakan ditetapkan.
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="outline" icon={<Download size={14} />} onClick={() => setExportOpen(true)}>Ekspor CSV</Btn>
          <Btn variant="outline" icon={<Printer size={14} />} onClick={() => window.print()}>Cetak halaman</Btn>
          <span className="text-[11px] text-muted2">
            CSV memuat seluruh akun bersaldo dan baris total. Cetak memakai dialog cetak peramban.
          </span>
        </div>
      </Card>

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Ekspor neraca saldo"
        description="Berkas CSV dibangun langsung dari buku besar saat ini."
        width={460}
        footer={<><Btn variant="ghost" onClick={() => setExportOpen(false)}>Batal</Btn><Btn variant="primary" onClick={downloadCSV}>Unduh CSV</Btn></>}
      >
        <dl className="grid grid-cols-2 gap-2 rounded-sb-sm bg-paper p-3 text-[12.5px]">
          <dt className="text-muted">Baris akun</dt><dd className="text-right font-semibold text-ink">{tb.rows.length}</dd>
          <dt className="text-muted">Total debit</dt><dd className="text-right font-semibold text-ink tabular-nums">{formatIDR(tb.totalDebit)}</dd>
          <dt className="text-muted">Total kredit</dt><dd className="text-right font-semibold text-ink tabular-nums">{formatIDR(tb.totalCredit)}</dd>
          <dt className="text-muted">Status</dt><dd className="text-right font-semibold text-ink">{tb.balanced ? "Seimbang" : "Tidak seimbang"}</dd>
        </dl>
        <p className="mt-2 text-[11px] text-muted2">
          Pada produksi, ekspor dijalankan sebagai job antrean dengan signed URL dan audit unduhan.
        </p>
      </Modal>
    </div>
  );
}
