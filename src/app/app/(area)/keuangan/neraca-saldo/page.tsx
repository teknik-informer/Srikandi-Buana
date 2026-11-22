import type { Metadata } from "next";
import { trialBalance } from "@/lib/finance";
import { ACCOUNT_TYPE_LABEL } from "@/data/coa";
import { formatIDR, formatNumber } from "@/lib/format";
import { Card, CardHeader, Notice, PageHeader, StatCard, Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Neraca Saldo" };

const TYPE_ORDER = ["aset", "kewajiban", "ekuitas", "pendapatan", "beban"];

export default function NeracaSaldoPage() {
  const tb = trialBalance();
  const groups = TYPE_ORDER.map((t) => ({
    type: t,
    rows: tb.rows.filter((r) => r.type === t),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Neraca saldo"
        description="Dihitung ulang langsung dari jurnal posted — bukan angka yang diketik. Kolom debit dan kredit harus sama; jika tidak, sistem menandai tidak seimbang dan memblokir pelaporan."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total debit" value={formatIDR(tb.totalDebit)} tone="info" />
        <StatCard label="Total kredit" value={formatIDR(tb.totalCredit)} tone="info" />
        <StatCard label="Status keseimbangan" value={tb.balanced ? "Seimbang" : "Tidak seimbang"} note={tb.balanced ? "Selisih 0" : "Periksa jurnal"} tone={tb.balanced ? "success" : "danger"} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Neraca saldo per 22 November 2026"
          subtitle={`${tb.rows.length} akun bersaldo · hanya jurnal berstatus posted`}
          action={<Badge tone={tb.balanced ? "success" : "danger"}>{tb.balanced ? "Balanced" : "Unbalanced"}</Badge>}
        />
        <div className="sb-scroll">
          <table className="sb-table min-w-[640px]">
            <thead>
              <tr><th>Akun</th><th>Nama</th><th>Kelompok</th><th className="num">Debit</th><th className="num">Kredit</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <>
                  <tr key={g.type} className="bg-paper">
                    <td colSpan={5} className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                      {ACCOUNT_TYPE_LABEL[g.type]}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.code}>
                      <td className="font-mono text-[11.5px] text-muted">{r.code}</td>
                      <td className="font-medium text-ink">{r.name}</td>
                      <td className="text-muted">{ACCOUNT_TYPE_LABEL[r.type]}</td>
                      <td className="num">{r.debitCol ? formatNumber(r.debitCol) : "—"}</td>
                      <td className="num">{r.creditCol ? formatNumber(r.creditCol) : "—"}</td>
                    </tr>
                  ))}
                </>
              ))}
              <tr className="border-t-2 border-line-strong bg-primary-50">
                <td colSpan={3} className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary-900">Jumlah</td>
                <td className="num font-bold text-primary-900">{formatNumber(tb.totalDebit)}</td>
                <td className="num font-bold text-primary-900">{formatNumber(tb.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4">
        <Notice tone="info" title="Bukti keseimbangan dihitung, bukan disimpan">
          Halaman ini memanggil fungsi yang sama dengan mesin posting. Bila sebuah jurnal tidak
          seimbang, angka total akan langsung berbeda dan status berubah menjadi “Tidak seimbang”.
        </Notice>
      </div>
    </div>
  );
}
