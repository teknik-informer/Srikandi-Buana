import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { PrintPageButton } from "@/components/print-page-button";
import { can, requireIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Kuitansi Pembayaran POS" };

interface ReceiptDetail {
  organization_name: string;
  organization_address: string | null;
  receipt_id: string;
  receipt_no: string;
  payment_date: string;
  amount: string;
  payment_reference: string | null;
  note: string | null;
  received_by: string;
  register_name: string;
  account_kind: "cash" | "bank" | "e_wallet";
  institution_name: string | null;
  order_reference: string;
  order_date: string;
  customer_name: string;
  customer_contact: string | null;
  customer_phone: string | null;
  total_amount: string;
  linked_journal_reference: string | null;
  linked_at: string | null;
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

const paymentMethodLabel: Record<ReceiptDetail["account_kind"], string> = {
  cash: "Tunai",
  bank: "Transfer bank",
  e_wallet: "Dompet digital",
};

export default async function PosPaymentReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const identity = await requireIdentity();
  const canSeeAllReceipts = can(identity, "finance:read") || can(identity, "field:usaha:business:write");
  if (!canSeeAllReceipts && !can(identity, "pos:sell")) redirect("/app");

  const { paymentId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) notFound();

  let receipt: ReceiptDetail | undefined;
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        organization.short_name AS organization_name,
        organization.address AS organization_address,
        payment.id::text AS receipt_id,
        payment.reference_no AS receipt_no,
        payment.payment_date::text AS payment_date,
        payment.amount::text AS amount,
        payment.payment_reference,
        payment.note,
        COALESCE(person.full_name, receiver.email) AS received_by,
        cash_account.display_name AS register_name,
        cash_account.account_kind,
        cash_account.institution_name,
        order_row.reference_no AS order_reference,
        order_row.order_date::text AS order_date,
        order_row.customer_name_snapshot AS customer_name,
        order_row.customer_contact_snapshot AS customer_contact,
        order_row.customer_phone_snapshot AS customer_phone,
        order_row.total_amount::text AS total_amount,
        journal.reference_no AS linked_journal_reference,
        payment.linked_at::text AS linked_at
      FROM v9.business_order_payments AS payment
      INNER JOIN v9.organizations AS organization
        ON organization.id = payment.organization_id
      INNER JOIN v9.business_orders AS order_row
        ON order_row.id = payment.order_id
        AND order_row.organization_id = payment.organization_id
        AND order_row.order_channel = 'pos'
      INNER JOIN v9.finance_cash_accounts AS cash_account
        ON cash_account.id = payment.cash_account_id
        AND cash_account.organization_id = payment.organization_id
      INNER JOIN v9.user_accounts AS receiver
        ON receiver.id = payment.received_by
      LEFT JOIN v9.people AS person
        ON person.id = receiver.person_id
      LEFT JOIN v9.finance_journals AS journal
        ON journal.id = payment.finance_journal_id
        AND journal.organization_id = payment.organization_id
      WHERE payment.id = ${paymentId}::uuid
        AND payment.organization_id = ${identity.organizationId}
        AND (
          ${canSeeAllReceipts} = true
          OR payment.received_by = ${identity.userId}
        )
      LIMIT 1
    `;
    receipt = rowsFromResult<ReceiptDetail>(result)[0];
  } catch (reason) {
    unavailable = true;
    console.warn("[pos-payment-receipt] Source unavailable", safeErrorType(reason));
  }

  if (!receipt && !unavailable) notFound();

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/app/pos" className="sb-btn sb-btn-ghost !h-9">
          <ArrowLeft size={14} /> Kembali ke POS
        </Link>
        {receipt ? <PrintPageButton /> : null}
      </div>

      {unavailable ? (
        <Notice tone="warning" title="Kuitansi belum dapat dimuat">
          Sumber penerimaan sedang tidak tersedia. Rincian kuitansi ditahan sampai koneksi pulih.
        </Notice>
      ) : receipt ? (
        <>
          <Card className="overflow-hidden">
            <div className="border-b border-line px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted2">Bukti penerimaan pembayaran</div>
                  <h1 className="mt-2 text-xl font-bold tracking-tight text-ink">{receipt.organization_name}</h1>
                  {receipt.organization_address ? <p className="mt-1 max-w-md text-[10.5px] leading-relaxed text-muted">{receipt.organization_address}</p> : null}
                </div>
                <div className="rounded-lg border border-line bg-paper px-3 py-2 text-right">
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Nomor kuitansi</div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-ink">{receipt.receipt_no}</div>
                  <div className="mt-1 text-[10px] text-muted2">{dateLabel(receipt.payment_date)}</div>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Telah diterima dari</div>
                  <div className="mt-1 text-[14px] font-semibold text-ink">{receipt.customer_name}</div>
                  {receipt.customer_contact ? <div className="mt-0.5 text-[10.5px] text-muted">{receipt.customer_contact}</div> : null}
                  {receipt.customer_phone ? <div className="mt-0.5 text-[10.5px] text-muted">{receipt.customer_phone}</div> : null}
                </div>
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Untuk pesanan</div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-ink">{receipt.order_reference}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted">Tanggal pesanan {dateLabel(receipt.order_date)}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted">Nilai pesanan {formatIDR(Number(receipt.total_amount))}</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-line bg-paper p-4 sm:p-5">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Jumlah yang diterima</div>
                <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ink">{formatIDR(Number(receipt.amount))}</div>
                <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Metode penerimaan</div>
                    <div className="mt-1 text-[11px] font-semibold text-ink2">{paymentMethodLabel[receipt.account_kind]}</div>
                    <div className="text-[10px] text-muted">{receipt.register_name}{receipt.institution_name ? ` · ${receipt.institution_name}` : ""}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Referensi pembayaran</div>
                    <div className="mt-1 text-[11px] font-semibold text-ink2">{receipt.payment_reference || "Tidak dicantumkan"}</div>
                  </div>
                </div>
                {receipt.note ? <div className="mt-3 border-t border-line pt-3"><div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Catatan</div><p className="mt-1 whitespace-pre-wrap text-[10.5px] text-ink2">{receipt.note}</p></div> : null}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Diterima oleh</div>
                  <div className="mt-1 text-[11px] font-semibold text-ink2">{receipt.received_by}</div>
                </div>
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted2">Status pembukuan</div>
                  {receipt.linked_journal_reference ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-success-700">
                      <CheckCircle2 size={13} /> Terhubung ke jurnal {receipt.linked_journal_reference}
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-warning-700">
                      <Clock3 size={13} /> Belum ditautkan ke jurnal
                    </div>
                  )}
                  {receipt.linked_at ? <div className="mt-1 text-[9.5px] text-muted2">Ditautkan {dateTimeLabel(receipt.linked_at)}</div> : null}
                </div>
              </div>
            </div>

            <div className="border-t border-line px-6 py-4 sm:px-8">
              <div className="flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                <ReceiptText size={14} className="mt-0.5 shrink-0" />
                <p>
                  Kuitansi ini merupakan bukti penerimaan internal atas pesanan POS. Kuitansi bukan faktur pajak
                  dan tidak dengan sendirinya mengubah saldo buku besar. Pengakuan pada laporan keuangan mengikuti
                  jurnal penjualan yang telah diperiksa dan diposting oleh Bendahara.
                </p>
              </div>
            </div>
          </Card>
          <p className="no-print mt-3 text-center text-[9.5px] text-muted2">Gunakan fitur cetak browser untuk menyimpan atau mencetak bukti penerimaan ini.</p>
        </>
      ) : null}
    </div>
  );
}
