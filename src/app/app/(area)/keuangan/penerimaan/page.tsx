import type { Metadata } from "next";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Penerimaan" };

interface ReceiptSummary {
  transaction_count: number;
  posted_count: number;
  submitted_count: number;
  approved_count: number;
  posted_total: string;
}

interface ReceiptRow {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  source_type: string;
  source_reference: string | null;
  status: "draft" | "submitted" | "approved" | "posted" | "rejected";
  amount: string;
  counterpart_accounts: string | null;
}

const statusLabel: Record<ReceiptRow["status"], string> = {
  draft: "Draf",
  submitted: "Menunggu pemeriksaan",
  approved: "Siap posting",
  posted: "Terposting",
  rejected: "Perlu perbaikan",
};

const statusTone: Record<ReceiptRow["status"], "neutral" | "warning" | "info" | "success" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "info",
  posted: "success",
  rejected: "danger",
};

const sourceLabel: Record<string, string> = {
  manual: "Jurnal umum",
  cash: "Kas",
  bank: "Bank",
  contribution: "Kontribusi",
  grant: "Hibah / program",
  purchase: "Pengadaan",
  sale: "Penjualan",
  adjustment: "Penyesuaian",
  reversal: "Jurnal pembalik",
};

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
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function PenerimaanPage() {
  const identity = await requireIdentity("finance:read");
  let summary: ReceiptSummary | null = null;
  let receipts: ReceiptRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, rowsResult] = await Promise.all([
      sql`
        WITH cash_receipts AS (
          SELECT
            journal.id,
            journal.status,
            COALESCE(sum(line.debit), 0)::numeric(18,2) AS amount
          FROM v9.finance_journals AS journal
          INNER JOIN v9.finance_journal_lines AS line
            ON line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
          WHERE journal.organization_id = ${identity.organizationId}
            AND EXISTS (
              SELECT 1
              FROM v9.finance_cash_accounts AS cash_account
              WHERE cash_account.organization_id = account.organization_id
                AND cash_account.ledger_account_id = account.id
                AND cash_account.status = 'active'
            )
            AND line.debit > 0
          GROUP BY journal.id, journal.status
        )
        SELECT
          count(*)::int AS transaction_count,
          count(*) FILTER (WHERE status = 'posted')::int AS posted_count,
          count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
          count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
          COALESCE(sum(amount) FILTER (WHERE status = 'posted'), 0)::text AS posted_total
        FROM cash_receipts
      `,
      sql`
        SELECT
          journal.id::text AS id,
          journal.reference_no,
          journal.journal_date::text AS journal_date,
          journal.description,
          journal.source_type,
          journal.source_reference,
          journal.status,
          receipt.amount::text AS amount,
          counterpart.accounts AS counterpart_accounts
        FROM v9.finance_journals AS journal
        INNER JOIN LATERAL (
          SELECT COALESCE(sum(line.debit), 0)::numeric(18,2) AS amount
          FROM v9.finance_journal_lines AS line
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
          WHERE line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
            AND EXISTS (
              SELECT 1
              FROM v9.finance_cash_accounts AS cash_account
              WHERE cash_account.organization_id = account.organization_id
                AND cash_account.ledger_account_id = account.id
                AND cash_account.status = 'active'
            )
            AND line.debit > 0
        ) AS receipt ON receipt.amount > 0
        LEFT JOIN LATERAL (
          SELECT string_agg(
            DISTINCT account.account_code || ' · ' || account.account_name,
            ', '
          ) AS accounts
          FROM v9.finance_journal_lines AS line
          INNER JOIN v9.finance_accounts AS account
            ON account.id = line.account_id
            AND account.organization_id = line.organization_id
          WHERE line.journal_id = journal.id
            AND line.organization_id = journal.organization_id
            AND line.credit > 0
        ) AS counterpart ON true
        WHERE journal.organization_id = ${identity.organizationId}
        ORDER BY journal.journal_date DESC, journal.created_at DESC
        LIMIT 100
      `,
    ]);

    summary = rowsFromResult<ReceiptSummary>(summaryResult)[0] ?? null;
    receipts = rowsFromResult<ReceiptRow>(rowsResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[finance-receipts] Source unavailable", safeErrorType(reason));
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Penerimaan"
        description="Daftar jurnal yang mendebit akun kas atau bank organisasi. Nilai penerimaan yang diakui sebagai realisasi hanya berasal dari jurnal terposting."
        actions={<Badge tone="neutral">Baca dari buku jurnal</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Data penerimaan belum dapat dimuat">
            Sumber jurnal keuangan sedang tidak tersedia. Nilai transaksi disembunyikan sampai koneksi
            pulih agar gangguan layanan tidak dianggap sebagai saldo nol.
          </Notice>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Penerimaan terposting" value={rupiah(summary.posted_total)} note="Kas/bank dari jurnal terposting" tone="success" />
            <StatCard label="Jumlah transaksi" value={summary.transaction_count} note="Semua status · maksimal 100 ditampilkan" tone="info" />
            <StatCard label="Sudah terposting" value={summary.posted_count} note="Masuk ke buku besar" tone="success" />
            <StatCard label="Menunggu proses" value={summary.submitted_count + summary.approved_count} note={`${summary.submitted_count} diperiksa · ${summary.approved_count} siap posting`} tone="warning" />
          </div>

          <Card className="mt-4">
            <CardHeader title="Daftar penerimaan" subtitle={`${receipts.length} jurnal terbaru dengan mutasi debit kas/bank`} />
            {receipts.length ? (
              <div className="sb-scroll">
                <table className="sb-table min-w-[900px]">
                  <thead>
                    <tr><th>Nomor / tanggal</th><th>Keterangan</th><th>Sumber</th><th>Akun lawan</th><th className="num">Nilai</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td className="whitespace-nowrap">
                          <div className="font-mono text-[10.5px] text-muted">{receipt.reference_no}</div>
                          <div className="mt-0.5 text-[10px] text-muted2">{dateLabel(receipt.journal_date)}</div>
                        </td>
                        <td className="max-w-[260px]">
                          <div className="font-medium text-ink">{receipt.description}</div>
                          {receipt.source_reference ? <div className="mt-0.5 text-[10px] text-muted2">Referensi {receipt.source_reference}</div> : null}
                        </td>
                        <td className="text-muted">{sourceLabel[receipt.source_type] ?? receipt.source_type}</td>
                        <td className="max-w-[220px] text-muted">{receipt.counterpart_accounts ?? "—"}</td>
                        <td className="num whitespace-nowrap font-medium">{rupiah(receipt.amount)}</td>
                        <td><StatusBadge status={statusLabel[receipt.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10">
                <EmptyState title="Belum ada penerimaan tercatat" body="Jurnal dengan mutasi debit kas/bank akan muncul di sini setelah disimpan. Nilai penerimaan baru masuk ke total setelah jurnal diposting." />
              </div>
            )}
          </Card>

          <div className="mt-4">
            <Notice tone="info" title="Halaman ini merupakan laporan baca-saja">
              Catat transaksi melalui modul Jurnal & Posting. Form penerimaan khusus dan penyimpanan bukti
              penerimaan belum menjadi alur terpisah, sehingga halaman ini tidak membuat transaksi atau
              mengarang nominal penerimaan.
            </Notice>
          </div>
        </>
      ) : null}
    </div>
  );
}
