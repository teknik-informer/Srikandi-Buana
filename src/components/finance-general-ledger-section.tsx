import { BookOpen, Filter, Scale } from "lucide-react";
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

interface AccountOption {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: "debit" | "credit";
}

interface LedgerSummary {
  opening_balance: string;
  period_debit: string;
  period_credit: string;
  closing_balance: string;
}

interface LedgerRow {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  source_reference: string | null;
  line_number: number;
  memo: string | null;
  debit: string;
  credit: string;
  running_balance: string;
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}

function rupiah(value: string | number): string {
  const amount = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export async function FinanceGeneralLedgerSection({
  accountId,
  startDate,
  endDate,
}: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const identity = await requireIdentity("finance:read");
  const start = startDate && validDate(startDate) ? startDate : "";
  const end = endDate && validDate(endDate) ? endDate : "";
  const dateRangeValid = !start || !end || start <= end;
  const sql = getV9Sql();

  const accountResult = await sql`
    SELECT id::text AS id, account_code, account_name, account_type, normal_balance
    FROM v9.finance_accounts
    WHERE organization_id = ${identity.organizationId}
      AND status = 'active'
      AND is_postable = true
    ORDER BY account_code
    LIMIT 500
  `;
  const accounts = rowsFromResult<AccountOption>(accountResult);
  const selected = accounts.find((account) => account.id === accountId) ?? accounts[0];

  if (!selected) {
    return (
      <div className="pb-10">
        <PageHeader eyebrow="Keuangan Native" title="Buku Besar" description="Mutasi dan saldo berjalan setiap akun dari jurnal terposting." />
        <Card className="px-5 py-10">
          <EmptyState title="Belum ada akun aktif" body="Tinjau dan aktifkan bagan akun terlebih dahulu. Draf jurnal tidak memengaruhi buku besar." />
        </Card>
      </div>
    );
  }

  if (!dateRangeValid) {
    return (
      <div className="pb-10">
        <PageHeader eyebrow="Keuangan Native" title="Buku Besar" description="Mutasi dan saldo berjalan setiap akun dari jurnal terposting." />
        <Card className="p-4 text-[12px] text-amber-700">Tanggal awal tidak boleh melewati tanggal akhir.</Card>
      </div>
    );
  }

  const [summaryResult, ledgerResult] = await Promise.all([
    sql`
      WITH opening AS (
        SELECT COALESCE(sum(
          CASE WHEN ${selected.normal_balance} = 'debit'
            THEN line.debit - line.credit
            ELSE line.credit - line.debit
          END
        ),0)::numeric(18,2) AS balance
        FROM v9.finance_journal_lines line
        INNER JOIN v9.finance_journals journal
          ON journal.id = line.journal_id
          AND journal.organization_id = line.organization_id
        WHERE line.organization_id = ${identity.organizationId}
          AND line.account_id = ${selected.id}
          AND journal.status = 'posted'
          AND ${start} <> ''
          AND journal.journal_date < ${start}::date
      ),
      period_lines AS (
        SELECT line.debit, line.credit
        FROM v9.finance_journal_lines line
        INNER JOIN v9.finance_journals journal
          ON journal.id = line.journal_id
          AND journal.organization_id = line.organization_id
        WHERE line.organization_id = ${identity.organizationId}
          AND line.account_id = ${selected.id}
          AND journal.status = 'posted'
          AND (${start} = '' OR journal.journal_date >= ${start}::date)
          AND (${end} = '' OR journal.journal_date <= ${end}::date)
      )
      SELECT
        opening.balance::text AS opening_balance,
        COALESCE(sum(period_lines.debit),0)::text AS period_debit,
        COALESCE(sum(period_lines.credit),0)::text AS period_credit,
        (
          opening.balance + COALESCE(sum(
            CASE WHEN ${selected.normal_balance} = 'debit'
              THEN period_lines.debit - period_lines.credit
              ELSE period_lines.credit - period_lines.debit
            END
          ),0)
        )::text AS closing_balance
      FROM opening
      LEFT JOIN period_lines ON true
      GROUP BY opening.balance
    `,
    sql`
      WITH opening AS (
        SELECT COALESCE(sum(
          CASE WHEN ${selected.normal_balance} = 'debit'
            THEN line.debit - line.credit
            ELSE line.credit - line.debit
          END
        ),0)::numeric(18,2) AS balance
        FROM v9.finance_journal_lines line
        INNER JOIN v9.finance_journals journal
          ON journal.id = line.journal_id
          AND journal.organization_id = line.organization_id
        WHERE line.organization_id = ${identity.organizationId}
          AND line.account_id = ${selected.id}
          AND journal.status = 'posted'
          AND ${start} <> ''
          AND journal.journal_date < ${start}::date
      ),
      period_lines AS (
        SELECT
          journal.id,
          journal.reference_no,
          journal.journal_date,
          journal.description,
          journal.source_reference,
          line.line_number,
          line.memo,
          line.debit,
          line.credit
        FROM v9.finance_journal_lines line
        INNER JOIN v9.finance_journals journal
          ON journal.id = line.journal_id
          AND journal.organization_id = line.organization_id
        WHERE line.organization_id = ${identity.organizationId}
          AND line.account_id = ${selected.id}
          AND journal.status = 'posted'
          AND (${start} = '' OR journal.journal_date >= ${start}::date)
          AND (${end} = '' OR journal.journal_date <= ${end}::date)
      )
      SELECT
        period_lines.id::text AS id,
        period_lines.reference_no,
        period_lines.journal_date::text AS journal_date,
        period_lines.description,
        period_lines.source_reference,
        period_lines.line_number,
        period_lines.memo,
        period_lines.debit::text AS debit,
        period_lines.credit::text AS credit,
        (
          opening.balance +
          sum(
            CASE WHEN ${selected.normal_balance} = 'debit'
              THEN period_lines.debit - period_lines.credit
              ELSE period_lines.credit - period_lines.debit
            END
          ) OVER (
            ORDER BY period_lines.journal_date, period_lines.reference_no, period_lines.line_number
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          )
        )::text AS running_balance
      FROM period_lines
      CROSS JOIN opening
      ORDER BY period_lines.journal_date, period_lines.reference_no, period_lines.line_number
      LIMIT 1000
    `,
  ]);

  const summary = rowsFromResult<LedgerSummary>(summaryResult)[0] ?? {
    opening_balance: "0", period_debit: "0", period_credit: "0", closing_balance: "0",
  };
  const entries = rowsFromResult<LedgerRow>(ledgerResult);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Buku Besar"
        description="Saldo berjalan dihitung dari jurnal berstatus terposting. Draf, jurnal menunggu, dan jurnal ditolak tidak masuk ke laporan."
        actions={<Badge tone="neutral">Baca dari jurnal terposting</Badge>}
      />

      <Card className="mb-5">
        <CardHeader title="Pilih akun dan periode" action={<Filter size={15} className="text-muted" />} />
        <form method="get" className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] sm:items-end">
          <div>
            <label htmlFor="ledger-account" className="mb-1 block text-[11px] font-semibold text-ink2">Akun</label>
            <select id="ledger-account" name="account_id" defaultValue={selected.id} className="sb-input">
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_code} · {account.account_name}</option>)}
            </select>
          </div>
          <div><label htmlFor="ledger-start" className="mb-1 block text-[11px] font-semibold text-ink2">Dari tanggal</label><input id="ledger-start" name="start" type="date" defaultValue={start} className="sb-input" /></div>
          <div><label htmlFor="ledger-end" className="mb-1 block text-[11px] font-semibold text-ink2">Sampai tanggal</label><input id="ledger-end" name="end" type="date" defaultValue={end} className="sb-input" /></div>
          <button type="submit" className="sb-btn sb-btn-primary !h-10 text-[11px]">Terapkan</button>
        </form>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo awal" value={rupiah(summary.opening_balance)} note={start ? `Sebelum ${dateLabel(start)}` : "Akumulasi sebelum periode"} tone="neutral" />
        <StatCard label="Debit periode" value={rupiah(summary.period_debit)} note="Jurnal terposting" tone="info" />
        <StatCard label="Kredit periode" value={rupiah(summary.period_credit)} note="Jurnal terposting" tone="warning" />
        <StatCard label="Saldo akhir" value={rupiah(summary.closing_balance)} note={selected.normal_balance === "debit" ? "Saldo normal debit" : "Saldo normal kredit"} tone="success" />
      </div>

      <Card>
        <CardHeader
          title={`${selected.account_code} · ${selected.account_name}`}
          subtitle={`${selected.account_type.toUpperCase()} · saldo normal ${selected.normal_balance === "debit" ? "debit" : "kredit"} · ${entries.length} baris terpilih`}
          action={<BookOpen size={16} className="text-muted" />}
        />
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="sb-table min-w-[850px]">
              <thead><tr><th>Tanggal</th><th>Nomor jurnal</th><th>Uraian</th><th>Keterangan</th><th className="text-right">Debit</th><th className="text-right">Kredit</th><th className="text-right">Saldo berjalan</th></tr></thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.id}-${entry.line_number}`}>
                    <td className="whitespace-nowrap text-[10.5px] text-muted">{dateLabel(entry.journal_date)}</td>
                    <td className="font-mono text-[10px] text-muted2">{entry.reference_no}</td>
                    <td><div className="max-w-[280px] text-[11px] font-medium text-ink2">{entry.description}</div>{entry.source_reference ? <div className="text-[9.5px] text-muted2">Bukti {entry.source_reference}</div> : null}</td>
                    <td className="max-w-[180px] text-[10.5px] text-muted">{entry.memo ?? "—"}</td>
                    <td className="text-right tabular-nums text-[10.5px]">{Number(entry.debit) ? rupiah(entry.debit) : "—"}</td>
                    <td className="text-right tabular-nums text-[10.5px]">{Number(entry.credit) ? rupiah(entry.credit) : "—"}</td>
                    <td className="text-right tabular-nums text-[10.5px] font-semibold text-ink">{rupiah(entry.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-9"><EmptyState title="Belum ada mutasi pada periode ini" body="Saldo akan muncul setelah jurnal yang menggunakan akun ini disetujui dan diposting." /></div>
        )}
      </Card>
    </div>
  );
}
