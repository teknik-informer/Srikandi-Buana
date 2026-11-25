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

export const metadata: Metadata = { title: "Pembayaran" };

interface PaymentSummary {
  transaction_count: number;
  posted_count: number;
  submitted_count: number;
  approved_count: number;
  posted_total: string;
}

interface PaymentRow {
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

const statusLabel: Record<PaymentRow["status"], string> = {
  draft: "Draf",
  submitted: "Menunggu pemeriksaan",
  approved: "Siap posting",
  posted: "Terposting",
  rejected: "Perlu perbaikan",
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

export default async function PembayaranPage() {
  const identity = await requireIdentity("finance:read");
  let summary: PaymentSummary | null = null;
  let payments: PaymentRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, rowsResult] = await Promise.all([
      sql`
        WITH cash_payments AS (
          SELECT
            journal.id,
            journal.status,
            COALESCE(sum(line.credit), 0)::numeric(18,2) AS amount
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
                AND cash_account.status IN ('active', 'inactive')
            )
            AND line.credit > 0
          GROUP BY journal.id, journal.status
        )
        SELECT
          count(*)::int AS transaction_count,
          count(*) FILTER (WHERE status = 'posted')::int AS posted_count,
          count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
          count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
          COALESCE(sum(amount) FILTER (WHERE status = 'posted'), 0)::text AS posted_total
        FROM cash_payments
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
          payment.amount::text AS amount,
          counterpart.accounts AS counterpart_accounts
        FROM v9.finance_journals AS journal
        INNER JOIN LATERAL (
          SELECT COALESCE(sum(line.credit), 0)::numeric(18,2) AS amount
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
                AND cash_account.status IN ('active', 'inactive')
            )
            AND line.credit > 0
        ) AS payment ON payment.amount > 0
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
            AND line.debit > 0
        ) AS counterpart ON true
        WHERE journal.organization_id = ${identity.organizationId}
        ORDER BY journal.journal_date DESC, journal.created_at DESC
        LIMIT 100
      `,
    ]);

    summary = rowsFromResult<PaymentSummary>(summaryResult)[0] ?? null;
    payments = rowsFromResult<PaymentRow>(rowsResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[finance-payments] Source unavailable", safeErrorType(reason));
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Pembayaran & pengeluaran"
        description="Daftar jurnal yang mengkredit akun kas atau bank organisasi. Realisasi pengeluaran hanya dihitung dari jurnal yang telah disetujui dan diposting."
        actions={<Badge tone="neutral">Baca dari buku jurnal</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Data pembayaran belum dapat dimuat">
            Sumber jurnal keuangan sedang tidak tersedia. Nilai transaksi disembunyikan sampai koneksi
            pulih agar gangguan layanan tidak dianggap sebagai pengeluaran nol.
          </Notice>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Pembayaran terposting" value={rupiah(summary.posted_total)} note="Kas/bank dari jurnal terposting" tone="danger" />
            <StatCard label="Jumlah transaksi" value={summary.transaction_count} note="Semua status · maksimal 100 ditampilkan" tone="info" />
            <StatCard label="Sudah terposting" value={summary.posted_count} note="Mengurangi saldo kas/bank" tone="success" />
            <StatCard label="Menunggu proses" value={summary.submitted_count + summary.approved_count} note={`${summary.submitted_count} diperiksa · ${summary.approved_count} siap posting`} tone="warning" />
          </div>

          <Card className="mt-4">
            <CardHeader title="Daftar pembayaran" subtitle={`${payments.length} jurnal terbaru dengan mutasi kredit kas/bank`} />
            {payments.length ? (
              <div className="sb-scroll">
                <table className="sb-table min-w-[900px]">
                  <thead>
                    <tr><th>Nomor / tanggal</th><th>Keterangan</th><th>Sumber</th><th>Akun lawan</th><th className="num">Nilai</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="whitespace-nowrap">
                          <div className="font-mono text-[10.5px] text-muted">{payment.reference_no}</div>
                          <div className="mt-0.5 text-[10px] text-muted2">{dateLabel(payment.journal_date)}</div>
                        </td>
                        <td className="max-w-[260px]">
                          <div className="font-medium text-ink">{payment.description}</div>
                          {payment.source_reference ? <div className="mt-0.5 text-[10px] text-muted2">Referensi {payment.source_reference}</div> : null}
                        </td>
                        <td className="text-muted">{sourceLabel[payment.source_type] ?? payment.source_type}</td>
                        <td className="max-w-[220px] text-muted">{payment.counterpart_accounts ?? "—"}</td>
                        <td className="num whitespace-nowrap font-medium">{rupiah(payment.amount)}</td>
                        <td><StatusBadge status={statusLabel[payment.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10">
                <EmptyState title="Belum ada pembayaran tercatat" body="Jurnal dengan mutasi kredit kas/bank akan muncul di sini setelah disimpan. Nilai pembayaran baru mengurangi saldo setelah jurnal diposting." />
              </div>
            )}
          </Card>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Pemisahan tugas</div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
                Pengaju tidak boleh menjadi penyetuju jurnalnya sendiri. Ambang persetujuan tambahan
                berdasarkan nilai transaksi masih menunggu keputusan resmi organisasi.
              </p>
            </Card>
            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Bukti & lampiran</div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
                Halaman ini membaca jurnal terposting. Alur pembayaran khusus dan relasi lampiran bukti
                belum menjadi modul transaksi tersendiri pada integrasi saat ini.
              </p>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
