import type { Metadata } from "next";
import Link from "next/link";
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
import { can, requireIdentity } from "@/lib/session";
import { linkBusinessOrderPaymentJournal } from "@/app/actions/finance";

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

interface SaleJournalOption {
  id: string;
  reference_no: string;
}

interface UnlinkedPaymentRow {
  id: string;
  reference_no: string;
  payment_date: string;
  amount: string;
  payment_reference: string | null;
  note: string | null;
  order_reference: string;
  customer_name: string;
  register_name: string;
  account_kind: "cash" | "bank" | "e_wallet";
  received_by_name: string;
  journal_options: string;
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

const paymentResultMessages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "payment-linked": { tone: "success", text: "Kuitansi berhasil ditautkan ke jurnal penjualan yang sudah terposting dan cocok." },
  "payment-link-invalid": { tone: "warning", text: "Pilih kuitansi dan jurnal yang valid." },
  "payment-link-mismatch": { tone: "warning", text: "Jurnal tidak cocok. Pastikan sumber Penjualan, referensi kuitansi, jumlah debit kas/bank, dan nilai kredit sama." },
  "payment-link-stale": { tone: "warning", text: "Kuitansi sudah ditautkan atau jurnal tidak lagi memenuhi syarat. Muat ulang halaman." },
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

export default async function PenerimaanPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("finance:read");
  const canLinkPayment = can(identity, "finance:journal:write");
  const params = searchParams ? await searchParams : {};
  const paymentNotice = params.result ? paymentResultMessages[params.result] : undefined;
  let summary: ReceiptSummary | null = null;
  let receipts: ReceiptRow[] = [];
  let unlinkedPayments: UnlinkedPaymentRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [summaryResult, rowsResult, paymentResult] = await Promise.all([
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
                AND cash_account.status IN ('active', 'inactive')
            )
            AND line.debit > 0
            AND EXISTS (
              SELECT 1
              FROM v9.finance_journal_lines AS counterpart_line
              WHERE counterpart_line.organization_id = journal.organization_id
                AND counterpart_line.journal_id = journal.id
                AND counterpart_line.credit > 0
                AND NOT EXISTS (
                  SELECT 1
                  FROM v9.finance_cash_accounts AS counterpart_register
                  WHERE counterpart_register.organization_id = counterpart_line.organization_id
                    AND counterpart_register.ledger_account_id = counterpart_line.account_id
                )
            )
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
                AND cash_account.status IN ('active', 'inactive')
            )
            AND line.debit > 0
            AND EXISTS (
              SELECT 1
              FROM v9.finance_journal_lines AS counterpart_line
              WHERE counterpart_line.organization_id = journal.organization_id
                AND counterpart_line.journal_id = journal.id
                AND counterpart_line.credit > 0
                AND NOT EXISTS (
                  SELECT 1
                  FROM v9.finance_cash_accounts AS counterpart_register
                  WHERE counterpart_register.organization_id = counterpart_line.organization_id
                    AND counterpart_register.ledger_account_id = counterpart_line.account_id
                )
            )
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
            AND NOT EXISTS (
              SELECT 1
              FROM v9.finance_cash_accounts AS counterpart_register
              WHERE counterpart_register.organization_id = account.organization_id
                AND counterpart_register.ledger_account_id = account.id
            )
        ) AS counterpart ON true
        WHERE journal.organization_id = ${identity.organizationId}
        ORDER BY journal.journal_date DESC, journal.created_at DESC
        LIMIT 100
      `,
      sql`
        SELECT
          payment.id::text AS id,
          payment.reference_no,
          payment.payment_date::text AS payment_date,
          payment.amount::text AS amount,
          payment.payment_reference,
          payment.note,
          order_row.reference_no AS order_reference,
          order_row.customer_name_snapshot AS customer_name,
          cash_account.display_name AS register_name,
          cash_account.account_kind,
          COALESCE(person.full_name, received_account.email) AS received_by_name,
          COALESCE((
            SELECT json_agg(jsonb_build_object(
              'id', journal.id::text,
              'reference_no', journal.reference_no
            ) ORDER BY journal.created_at DESC)
            FROM v9.finance_journals AS journal
            WHERE journal.organization_id = payment.organization_id
              AND journal.source_type = 'sale'
              AND journal.source_reference = payment.reference_no
              AND journal.status = 'posted'
              AND journal.total_debit = payment.amount
              AND journal.total_credit = payment.amount
              AND (
                SELECT COALESCE(sum(line.debit), 0)::numeric(18,2)
                FROM v9.finance_journal_lines AS line
                WHERE line.organization_id = payment.organization_id
                  AND line.journal_id = journal.id
                  AND line.account_id = cash_account.ledger_account_id
              ) = payment.amount
              AND (
                SELECT COALESCE(sum(line.debit), 0)::numeric(18,2)
                FROM v9.finance_journal_lines AS line
                WHERE line.organization_id = payment.organization_id
                  AND line.journal_id = journal.id
                  AND EXISTS (
                    SELECT 1
                    FROM v9.finance_cash_accounts AS register
                    WHERE register.organization_id = line.organization_id
                      AND register.ledger_account_id = line.account_id
                  )
              ) = payment.amount
              AND (
                SELECT COALESCE(sum(line.credit), 0)::numeric(18,2)
                FROM v9.finance_journal_lines AS line
                WHERE line.organization_id = payment.organization_id
                  AND line.journal_id = journal.id
                  AND EXISTS (
                    SELECT 1
                    FROM v9.finance_cash_accounts AS register
                    WHERE register.organization_id = line.organization_id
                      AND register.ledger_account_id = line.account_id
                  )
              ) = 0
              AND (
                SELECT COALESCE(sum(line.credit), 0)::numeric(18,2)
                FROM v9.finance_journal_lines AS line
                WHERE line.organization_id = payment.organization_id
                  AND line.journal_id = journal.id
                  AND NOT EXISTS (
                    SELECT 1
                    FROM v9.finance_cash_accounts AS register
                    WHERE register.organization_id = line.organization_id
                      AND register.ledger_account_id = line.account_id
                  )
              ) = payment.amount
          ), '[]'::json)::text AS journal_options
        FROM v9.business_order_payments AS payment
        INNER JOIN v9.business_orders AS order_row
          ON order_row.id = payment.order_id
          AND order_row.organization_id = payment.organization_id
          AND order_row.field_key = payment.field_key
        INNER JOIN v9.finance_cash_accounts AS cash_account
          ON cash_account.id = payment.cash_account_id
          AND cash_account.organization_id = payment.organization_id
        INNER JOIN v9.user_accounts AS received_account
          ON received_account.id = payment.received_by
        LEFT JOIN v9.people AS person
          ON person.id = received_account.person_id
        WHERE payment.organization_id = ${identity.organizationId}
          AND payment.finance_journal_id IS NULL
        ORDER BY payment.payment_date DESC, payment.created_at DESC
        LIMIT 100
      `,
    ]);

    summary = rowsFromResult<ReceiptSummary>(summaryResult)[0] ?? null;
    receipts = rowsFromResult<ReceiptRow>(rowsResult);
    unlinkedPayments = rowsFromResult<UnlinkedPaymentRow>(paymentResult);
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

      {paymentNotice ? (
        <div className="mb-4">
          <Notice tone={paymentNotice.tone} title="Penautan kuitansi POS">{paymentNotice.text}</Notice>
        </div>
      ) : null}

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
            <CardHeader
              title="Kuitansi POS belum dibukukan"
              subtitle={`${unlinkedPayments.length} kuitansi menunggu penautan ke jurnal · belum masuk total penerimaan buku besar`}
              action={<Badge tone={unlinkedPayments.length ? "warning" : "success"}>{unlinkedPayments.length} belum ditautkan</Badge>}
            />
            {unlinkedPayments.length ? (
              <div className="divide-y divide-line">
                {unlinkedPayments.map((payment) => {
                  let options: SaleJournalOption[] = [];
                  try {
                    const parsed: unknown = JSON.parse(payment.journal_options);
                    if (Array.isArray(parsed)) {
                      options = parsed.filter((item): item is SaleJournalOption =>
                        !!item && typeof item === "object" &&
                        typeof (item as SaleJournalOption).id === "string" &&
                        typeof (item as SaleJournalOption).reference_no === "string"
                      );
                    }
                  } catch {
                    options = [];
                  }
                  return (
                    <article key={payment.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-muted2">{payment.reference_no}</span>
                          <Badge tone="warning">Belum dibukukan</Badge>
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-ink">{payment.order_reference} · {payment.customer_name}</div>
                        <div className="mt-0.5 text-[10.5px] text-muted2">
                          {dateLabel(payment.payment_date)} · {payment.register_name} · {payment.account_kind === "cash" ? "Tunai" : payment.account_kind === "bank" ? "Bank" : "Dompet digital"}
                        </div>
                        <div className="mt-1 text-[10px] text-muted2">Diterima oleh {payment.received_by_name}</div>
                        {payment.payment_reference ? <div className="mt-1 text-[10px] text-muted2">Referensi pembayaran: {payment.payment_reference}</div> : null}
                        {payment.note ? <div className="mt-1 text-[10.5px] text-muted">Catatan: {payment.note}</div> : null}
                        <div className="mt-2 text-[13px] font-semibold tabular-nums text-ink">{rupiah(payment.amount)}</div>
                      </div>
                      <div className="rounded-lg border border-line bg-paper p-3">
                        {canLinkPayment ? options.length ? (
                          <form action={linkBusinessOrderPaymentJournal} className="space-y-2">
                            <input type="hidden" name="payment_id" value={payment.id} />
                            <label htmlFor={`payment-journal-${payment.id}`} className="block text-[10px] font-semibold text-muted">
                              Jurnal Penjualan terposting yang cocok
                            </label>
                            <select id={`payment-journal-${payment.id}`} name="journal_id" required defaultValue="" className="sb-input !h-9 text-[10.5px]">
                              <option value="" disabled>Pilih nomor jurnal</option>
                              {options.map((option) => <option key={option.id} value={option.id}>{option.reference_no}</option>)}
                            </select>
                            <button type="submit" className="sb-btn sb-btn-primary !h-8 w-full text-[10px]">Tautkan jurnal terposting</button>
                            <p className="text-[9.5px] leading-relaxed text-muted2">Database akan memeriksa sumber Penjualan, referensi kuitansi, nilai, dan register kas/bank sebelum menautkan.</p>
                          </form>
                        ) : (
                          <div className="text-[10.5px] leading-relaxed text-muted">
                            Belum ditemukan jurnal Penjualan yang sudah terposting dengan referensi kuitansi ini. Buat jurnal melalui Jurnal & Posting menggunakan sumber <strong>Penjualan</strong> dan referensi kuitansi persis seperti nomor di atas.
                            <Link href="/app/keuangan/jurnal" className="mt-2 inline-flex font-semibold text-primary-700">Buka Jurnal & Posting</Link>
                          </div>
                        ) : (
                          <p className="text-[10.5px] leading-relaxed text-muted">Akses penautan jurnal memerlukan hak tulis Jurnal & Posting pada modul Keuangan.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState title="Tidak ada kuitansi POS yang belum dibukukan" body="Kuitansi yang belum ditautkan ke jurnal akan muncul di sini. Nilainya tidak dicampur ke total penerimaan terposting." />
              </div>
            )}
          </Card>

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
            <Notice tone="info" title="Pemisahan kuitansi dan buku besar">
              Kuitansi POS membuktikan uang diterima dan disimpan di register penerimaan. Kuitansi belum
              menjadi jurnal atau saldo buku besar sampai Bendahara menautkannya ke jurnal Penjualan yang
              telah terposting. Nilai pada ringkasan penerimaan hanya berasal dari jurnal terposting.
            </Notice>
          </div>
        </>
      ) : null}
    </div>
  );
}
