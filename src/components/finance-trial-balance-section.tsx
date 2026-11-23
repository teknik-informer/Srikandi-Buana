import { Scale } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

type AccountType = "aset" | "kewajiban" | "ekuitas" | "pendapatan" | "beban";

interface TrialBalanceRow {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: "debit" | "credit";
  debit_total: string;
  credit_total: string;
  debit_balance: string;
  credit_balance: string;
}

function rupiah(value: string | number): string {
  const amount = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export async function FinanceTrialBalanceSection({ asOf }: { asOf?: string }) {
  const identity = await requireIdentity("finance:read");
  const sql = getV9Sql();
  const todayResult = await sql`
    SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS report_date
  `;
  const today = rowsFromResult<{ report_date: string }>(todayResult)[0]?.report_date;
  const reportDate = asOf && validDate(asOf) ? asOf : today ?? new Date().toISOString().slice(0,10);

  const result = await sql`
    WITH posted_totals AS (
      SELECT
        line.account_id,
        sum(line.debit)::numeric(18,2) AS debit_total,
        sum(line.credit)::numeric(18,2) AS credit_total
      FROM v9.finance_journal_lines AS line
      INNER JOIN v9.finance_journals AS journal
        ON journal.id = line.journal_id
        AND journal.organization_id = line.organization_id
      WHERE line.organization_id = ${identity.organizationId}
        AND journal.status = 'posted'
        AND journal.journal_date <= ${reportDate}::date
      GROUP BY line.account_id
    )
    SELECT
      account.id::text AS id,
      account.account_code,
      account.account_name,
      account.account_type,
      account.normal_balance,
      COALESCE(posted_totals.debit_total,0)::text AS debit_total,
      COALESCE(posted_totals.credit_total,0)::text AS credit_total,
      GREATEST(COALESCE(posted_totals.debit_total,0)-COALESCE(posted_totals.credit_total,0),0)::text AS debit_balance,
      GREATEST(COALESCE(posted_totals.credit_total,0)-COALESCE(posted_totals.debit_total,0),0)::text AS credit_balance
    FROM v9.finance_accounts AS account
    LEFT JOIN posted_totals ON posted_totals.account_id = account.id
    WHERE account.organization_id = ${identity.organizationId}
      AND account.status = 'active'
      AND account.is_postable = true
    ORDER BY account.account_code
    LIMIT 500
  `;

  const rows = rowsFromResult<TrialBalanceRow>(result);
  const totalDebitMovement = rows.reduce((sum,row)=>sum+Number(row.debit_total),0);
  const totalCreditMovement = rows.reduce((sum,row)=>sum+Number(row.credit_total),0);
  const totalDebitBalance = rows.reduce((sum,row)=>sum+Number(row.debit_balance),0);
  const totalCreditBalance = rows.reduce((sum,row)=>sum+Number(row.credit_balance),0);
  const balanced = Math.round(totalDebitBalance*100) === Math.round(totalCreditBalance*100);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Neraca saldo"
        description="Saldo per akun sampai tanggal laporan, hanya dari jurnal yang telah disetujui dan diposting."
        actions={<Badge tone={balanced ? "success" : "warning"}>{balanced ? "Seimbang" : "Perlu pemeriksaan"}</Badge>}
      />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <div className="min-w-[180px]">
          <label htmlFor="trial-as-of" className="mb-1 block text-[11px] font-semibold text-ink2">Posisi per tanggal</label>
          <input id="trial-as-of" name="as_of" type="date" defaultValue={reportDate} className="sb-input" />
        </div>
        <button type="submit" className="sb-btn sb-btn-primary !h-10 text-[11px]">Tampilkan laporan</button>
        <span className="text-[10px] text-muted2">Jurnal draf/menunggu/ditolak tidak dihitung.</span>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pergerakan debit" value={rupiah(totalDebitMovement)} note="Akumulasi jurnal terposting" tone="info" />
        <StatCard label="Total pergerakan kredit" value={rupiah(totalCreditMovement)} note="Akumulasi jurnal terposting" tone="info" />
        <StatCard label="Saldo debit" value={rupiah(totalDebitBalance)} note="Posisi saldo per akun" tone="success" />
        <StatCard label="Saldo kredit" value={rupiah(totalCreditBalance)} note="Posisi saldo per akun" tone="warning" />
      </div>

      <Card className="mt-5">
        <CardHeader title="Neraca saldo per akun" subtitle={`Posisi per ${new Intl.DateTimeFormat("id-ID",{dateStyle:"long",timeZone:"UTC"}).format(new Date(`${reportDate}T00:00:00Z`))} · ${rows.length} akun aktif`} action={<Scale size={16} className="text-muted" />} />
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="sb-table min-w-[780px]">
              <thead><tr><th>Kode</th><th>Nama akun</th><th>Tipe</th><th className="text-right">Total debit</th><th className="text-right">Total kredit</th><th className="text-right">Saldo debit</th><th className="text-right">Saldo kredit</th></tr></thead>
              <tbody>
                {rows.map((row)=>(
                  <tr key={row.id}>
                    <td className="font-mono text-[10.5px] text-muted2">{row.account_code}</td>
                    <td className="text-[11px] font-medium text-ink2">{row.account_name}</td>
                    <td className="text-[10px] text-muted">{row.account_type}</td>
                    <td className="text-right tabular-nums text-[10px]">{Number(row.debit_total)?rupiah(row.debit_total):"—"}</td>
                    <td className="text-right tabular-nums text-[10px]">{Number(row.credit_total)?rupiah(row.credit_total):"—"}</td>
                    <td className="text-right tabular-nums text-[10px]">{Number(row.debit_balance)?rupiah(row.debit_balance):"—"}</td>
                    <td className="text-right tabular-nums text-[10px]">{Number(row.credit_balance)?rupiah(row.credit_balance):"—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-paper font-semibold">
                  <td colSpan={3}>Total</td>
                  <td className="text-right tabular-nums text-[10.5px]">{rupiah(totalDebitMovement)}</td>
                  <td className="text-right tabular-nums text-[10.5px]">{rupiah(totalCreditMovement)}</td>
                  <td className="text-right tabular-nums text-[10.5px]">{rupiah(totalDebitBalance)}</td>
                  <td className="text-right tabular-nums text-[10.5px]">{rupiah(totalCreditBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="px-5 py-9"><EmptyState title="Belum ada akun aktif" body="Aktifkan akun COA terlebih dahulu sebelum menyusun neraca saldo." /></div>
        )}
      </Card>

      <div className="mt-4 rounded-lg border border-line bg-paper p-3 text-[10.5px] leading-relaxed text-muted">
        Neraca saldo hanya menunjukkan saldo akun berdasarkan jurnal yang terposting. Laporan ini
        belum mencakup penyesuaian akhir periode, penyusutan otomatis, pajak, atau rekonsiliasi bank.
      </div>
    </div>
  );
}
