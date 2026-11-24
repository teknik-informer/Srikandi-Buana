import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet, Scale, TrendingDown, TrendingUp } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Keuangan" };

interface ReportSummary {
  account_count: number;
  posted_journal_count: number;
  total_debit: string;
  total_credit: string;
  revenue_total: string;
  expense_total: string;
  surplus: string;
  asset_balance: string;
  liability_balance: string;
  equity_balance: string;
}

interface AccountActivity {
  account_code: string;
  account_name: string;
  normal_balance: "debit" | "credit";
  debit_total: string;
  credit_total: string;
  activity_balance: string;
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function jakartaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams?: Promise<{ start?: string; end?: string }>;
}) {
  const identity = await requireIdentity("finance:read");
  const params = await searchParams;
  const today = jakartaToday();
  const defaultStart = today.slice(0, 7) + "-01";
  const start = validDate(params?.start) ? params.start : defaultStart;
  const end = validDate(params?.end) ? params.end : today;
  const dateRangeValid = start <= end;

  let summary: ReportSummary | null = null;
  let revenues: AccountActivity[] = [];
  let expenses: AccountActivity[] = [];
  let unavailable = false;

  if (dateRangeValid) {
    try {
      const sql = getV9Sql();
      const [summaryResult, detailResult] = await Promise.all([
        sql`
          WITH account_activity AS (
            SELECT
              account.id,
              account.account_type,
              account.normal_balance,
              COALESCE(sum(line.debit) FILTER (
                WHERE journal.id IS NOT NULL
                  AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
              ), 0)::numeric(18,2) AS period_debit,
              COALESCE(sum(line.credit) FILTER (
                WHERE journal.id IS NOT NULL
                  AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
              ), 0)::numeric(18,2) AS period_credit,
              COALESCE(sum(line.debit) FILTER (WHERE journal.id IS NOT NULL), 0)::numeric(18,2) AS closing_debit,
              COALESCE(sum(line.credit) FILTER (WHERE journal.id IS NOT NULL), 0)::numeric(18,2) AS closing_credit
            FROM v9.finance_accounts AS account
            LEFT JOIN v9.finance_journal_lines AS line
              ON line.account_id = account.id
              AND line.organization_id = account.organization_id
            LEFT JOIN v9.finance_journals AS journal
              ON journal.id = line.journal_id
              AND journal.organization_id = line.organization_id
              AND journal.status = 'posted'
              AND journal.journal_date <= ${end}::date
            WHERE account.organization_id = ${identity.organizationId}
              AND account.status = 'active'
            GROUP BY account.id, account.account_type, account.normal_balance
          ),
          normalized AS (
            SELECT *,
              CASE WHEN normal_balance = 'credit'
                THEN period_credit - period_debit
                ELSE period_debit - period_credit
              END AS period_balance,
              CASE WHEN normal_balance = 'credit'
                THEN closing_credit - closing_debit
                ELSE closing_debit - closing_credit
              END AS closing_balance
            FROM account_activity
          )
          SELECT
            count(*)::int AS account_count,
            (
              SELECT count(*)::int
              FROM v9.finance_journals
              WHERE organization_id = ${identity.organizationId}
                AND status = 'posted'
                AND journal_date BETWEEN ${start}::date AND ${end}::date
            ) AS posted_journal_count,
            COALESCE(sum(period_debit), 0)::text AS total_debit,
            COALESCE(sum(period_credit), 0)::text AS total_credit,
            COALESCE(sum(period_balance) FILTER (WHERE account_type = 'pendapatan'), 0)::text AS revenue_total,
            COALESCE(sum(period_balance) FILTER (WHERE account_type = 'beban'), 0)::text AS expense_total,
            (
              COALESCE(sum(period_balance) FILTER (WHERE account_type = 'pendapatan'), 0)
              - COALESCE(sum(period_balance) FILTER (WHERE account_type = 'beban'), 0)
            )::text AS surplus,
            COALESCE(sum(closing_balance) FILTER (WHERE account_type = 'aset'), 0)::text AS asset_balance,
            COALESCE(sum(closing_balance) FILTER (WHERE account_type = 'kewajiban'), 0)::text AS liability_balance,
            COALESCE(sum(closing_balance) FILTER (WHERE account_type = 'ekuitas'), 0)::text AS equity_balance
          FROM normalized
        `,
        sql`
          SELECT
            account.account_code,
            account.account_name,
            account.normal_balance,
            COALESCE(sum(line.debit) FILTER (
              WHERE journal.id IS NOT NULL
                AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
            ), 0)::text AS debit_total,
            COALESCE(sum(line.credit) FILTER (
              WHERE journal.id IS NOT NULL
                AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
            ), 0)::text AS credit_total,
            CASE WHEN account.normal_balance = 'credit'
              THEN COALESCE(sum(line.credit - line.debit) FILTER (
                WHERE journal.id IS NOT NULL
                  AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
              ), 0)
              ELSE COALESCE(sum(line.debit - line.credit) FILTER (
                WHERE journal.id IS NOT NULL
                  AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
              ), 0)
            END::text AS activity_balance
          FROM v9.finance_accounts AS account
          LEFT JOIN v9.finance_journal_lines AS line
            ON line.account_id = account.id
            AND line.organization_id = account.organization_id
          LEFT JOIN v9.finance_journals AS journal
            ON journal.id = line.journal_id
            AND journal.organization_id = line.organization_id
            AND journal.status = 'posted'
            AND journal.journal_date BETWEEN ${start}::date AND ${end}::date
          WHERE account.organization_id = ${identity.organizationId}
            AND account.status = 'active'
            AND account.account_type IN ('pendapatan', 'beban')
          GROUP BY account.id, account.account_code, account.account_name, account.normal_balance
          ORDER BY account.account_code
        `,
      ]);

      summary = rowsFromResult<ReportSummary>(summaryResult)[0] ?? null;
      const rows = rowsFromResult<AccountActivity>(detailResult);
      revenues = rows.filter((row) => {
        const code = row.account_code;
        return code.startsWith("4-");
      });
      expenses = rows.filter((row) => row.account_code.startsWith("5-"));
    } catch (reason) {
      unavailable = true;
      console.warn("[finance-reports] Source unavailable", safeErrorType(reason));
    }
  }

  const hasAccounts = Boolean(summary && summary.account_count > 0);
  const revenueTotal = summary ? Number(summary.revenue_total) : 0;
  const expenseTotal = summary ? Number(summary.expense_total) : 0;
  const surplus = revenueTotal - expenseTotal;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Laporan keuangan"
        description="Ringkasan pendapatan, beban, dan posisi saldo dari jurnal yang sudah terposting. Angka dihitung ulang berdasarkan periode yang dipilih."
        actions={<Badge tone="warning">Draf · perlu pengesahan</Badge>}
      />

      <div className="mb-4">
        <Notice tone="info" title="Dasar laporan">
          Hanya jurnal dengan status <strong>posted</strong> yang dihitung. Draf, jurnal yang menunggu
          pemeriksaan, ditolak, atau dibatalkan tidak masuk ke laporan. Laporan ini adalah bahan kerja
          internal, bukan laporan keuangan resmi yang telah disahkan.
        </Notice>
      </div>

      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label htmlFor="report-start" className="mb-1 block text-[10.5px] font-semibold text-muted">Tanggal awal</label>
            <input id="report-start" name="start" type="date" defaultValue={start} className="sb-input" />
          </div>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="report-end" className="mb-1 block text-[10.5px] font-semibold text-muted">Tanggal akhir</label>
            <input id="report-end" name="end" type="date" defaultValue={end} className="sb-input" />
          </div>
          <button type="submit" className="sb-btn sb-btn-primary !h-10">Terapkan periode</button>
          <Link href="/app/keuangan/laporan" className="sb-btn sb-btn-outline !h-10">Periode berjalan</Link>
        </form>
        <div className="mt-2 text-[10.5px] text-muted2">
          Periode {dateLabel(start)} sampai {dateLabel(end)} · Waktu Asia/Jakarta
        </div>
      </Card>

      {!dateRangeValid ? (
        <div className="mb-4">
          <Notice tone="warning" title="Rentang tanggal tidak valid">
            Tanggal awal tidak boleh melewati tanggal akhir. Silakan pilih ulang periode laporan.
          </Notice>
        </div>
      ) : null}

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Sumber laporan belum dapat dimuat">
            Database keuangan sedang tidak tersedia. Nilai laporan disembunyikan sampai koneksi pulih.
          </Notice>
        </div>
      ) : null}

      {dateRangeValid && !unavailable && summary && summary.account_count === 0 ? (
        <div className="mb-4">
          <Notice tone="warning" title="Bagan akun belum tersedia">
            Belum ada akun aktif pada bagan akun organisasi. Laporan tidak akan menampilkan nilai contoh atau
            membuat saldo dari transaksi yang belum mempunyai akun resmi.
          </Notice>
        </div>
      ) : null}

      {dateRangeValid && !unavailable && summary && hasAccounts ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Pendapatan periode" value={formatIDR(revenueTotal)} note="Akun pendapatan · jurnal posted" tone="success" icon={<TrendingUp size={17} />} />
            <StatCard label="Beban periode" value={formatIDR(expenseTotal)} note="Akun beban · jurnal posted" tone="danger" icon={<TrendingDown size={17} />} />
            <StatCard label="Surplus / defisit" value={formatIDR(surplus)} note="Pendapatan dikurangi beban" tone="info" icon={<Scale size={17} />} />
            <StatCard label="Jurnal terposting" value={summary.posted_journal_count} note="Dalam rentang periode" tone="neutral" icon={<FileSpreadsheet size={17} />} />
          </div>

          <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Pendapatan" subtitle={revenues.length + " akun aktif · mutasi dalam periode"} />
              {revenues.length ? (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[520px]">
                    <thead><tr><th>Kode</th><th>Nama akun</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Bersih</th></tr></thead>
                    <tbody>
                      {revenues.map((row) => (
                        <tr key={row.account_code}>
                          <td className="font-mono text-[10px] text-muted">{row.account_code}</td>
                          <td className="text-ink2">{row.account_name}</td>
                          <td className="num tabular-nums text-muted">{formatIDR(Number(row.debit_total))}</td>
                          <td className="num tabular-nums text-muted">{formatIDR(Number(row.credit_total))}</td>
                          <td className="num font-semibold tabular-nums text-ink">{formatIDR(Number(row.activity_balance))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada akun pendapatan" body="Akun pendapatan aktif akan tampil setelah dicatat pada bagan akun organisasi." /></div>
              )}
              <div className="border-t border-line px-4 py-3 text-right text-[11.5px] font-semibold text-ink">
                Total {formatIDR(revenueTotal)}
              </div>
            </Card>

            <Card>
              <CardHeader title="Beban" subtitle={expenses.length + " akun aktif · mutasi dalam periode"} />
              {expenses.length ? (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[520px]">
                    <thead><tr><th>Kode</th><th>Nama akun</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Bersih</th></tr></thead>
                    <tbody>
                      {expenses.map((row) => (
                        <tr key={row.account_code}>
                          <td className="font-mono text-[10px] text-muted">{row.account_code}</td>
                          <td className="text-ink2">{row.account_name}</td>
                          <td className="num tabular-nums text-muted">{formatIDR(Number(row.debit_total))}</td>
                          <td className="num tabular-nums text-muted">{formatIDR(Number(row.credit_total))}</td>
                          <td className="num font-semibold tabular-nums text-ink">{formatIDR(Number(row.activity_balance))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4"><EmptyState title="Belum ada akun beban" body="Akun beban aktif akan tampil setelah dicatat pada bagan akun organisasi." /></div>
              )}
              <div className="border-t border-line px-4 py-3 text-right text-[11.5px] font-semibold text-ink">
                Total {formatIDR(expenseTotal)}
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">Saldo akun aset</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{formatIDR(Number(summary.asset_balance))}</div>
              <p className="mt-1 text-[10.5px] text-muted2">Saldo normal sampai {dateLabel(end)}</p>
            </Card>
            <Card className="p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">Saldo akun kewajiban & ekuitas</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{formatIDR(Number(summary.liability_balance) + Number(summary.equity_balance))}</div>
              <p className="mt-1 text-[10.5px] text-muted2">Tidak termasuk surplus/defisit yang belum ditutup ke saldo laba</p>
            </Card>
          </div>

          <div className="mt-4">
            <Notice tone="warning" title="Batas laporan ini">
              Saldo aset, kewajiban, dan ekuitas di atas adalah posisi akun buku besar. Kebijakan tutup buku,
              saldo laba, klasifikasi dana terbatas, serta lampiran laporan formal belum diaktifkan sebagai
              proses pelaporan yang disahkan. Gunakan Neraca Saldo sebagai kontrol debit-kredit.
            </Notice>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/keuangan/neraca-saldo" className="sb-btn sb-btn-outline !h-9">
              Neraca saldo <ArrowRight size={13} />
            </Link>
            <Link href="/app/keuangan/buku-besar" className="sb-btn sb-btn-outline !h-9">
              Buku besar <ArrowRight size={13} />
            </Link>
            <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline !h-9">
              Jurnal & posting <ArrowRight size={13} />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
