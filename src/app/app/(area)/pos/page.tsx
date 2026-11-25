import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, ShoppingBag } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
} from "@/components/ui";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { BusinessOrderComposer, type OrderCustomerOption, type OrderProductOption, type OrderWarehouseOption } from "@/components/business-order-composer";
import { BusinessOrderPaymentForm, type BusinessPaymentRegisterOption } from "@/components/business-order-payment-form";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "POS · Pesanan Kasir" };

interface FieldApplicationRow { is_enabled: boolean; }

interface PosOrderRow {
  id: string;
  reference_no: string;
  customer_name_snapshot: string;
  order_date: string;
  status: "draft" | "confirmed" | "processing" | "ready" | "fulfilled" | "cancelled";
  total_amount: string;
  paid_total: string;
  created_at: string;
}

interface PosPaymentRow {
  id: string;
  order_id: string;
  reference_no: string;
  payment_date: string;
  amount: string;
  payment_reference: string | null;
  note: string | null;
  account_kind: "cash" | "bank" | "e_wallet";
  register_name: string;
  linked_journal_reference: string | null;
  created_at: string;
}

const statusLabel: Record<PosOrderRow["status"], string> = {
  draft: "Draf",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  ready: "Siap diserahkan",
  fulfilled: "Terpenuhi",
  cancelled: "Dibatalkan",
};

const statusTone: Record<PosOrderRow["status"], "neutral" | "info" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  confirmed: "info",
  processing: "warning",
  ready: "info",
  fulfilled: "success",
  cancelled: "danger",
};

const resultMessages: Record<string, { tone: "success" | "warning" | "danger"; title: string; body: string }> = {
  "order-created": {
    tone: "success",
    title: "Draf pesanan berhasil disimpan",
    body: "Pesanan tersimpan di register Usaha dengan kanal POS. Ini belum merupakan pembayaran: saldo kas belum berubah, stok belum dicadangkan atau dikurangi, dan jurnal keuangan belum dibuat.",
  },
  "invalid-items": {
    tone: "warning",
    title: "Rincian pesanan perlu diperiksa",
    body: "Pilih pelanggan, produk, dan jumlah yang valid. Setiap produk hanya boleh dicantumkan satu kali dalam satu pesanan.",
  },
  "customer-product-or-warehouse-unavailable": {
    tone: "warning",
    title: "Data pesanan tidak tersedia",
    body: "Pelanggan, produk, gudang, atau aplikasi Usaha belum aktif. Tidak ada draf pesanan yang dibuat.",
  },
  error: {
    tone: "danger",
    title: "Pesanan belum tersimpan",
    body: "Sistem tidak dapat menyimpan pesanan. Periksa koneksi atau hubungi administrator. Jangan mengulang transaksi sebelum memastikan apakah draf sudah tercatat.",
  },
  invalid: {
    tone: "warning",
    title: "Data pesanan tidak valid",
    body: "Periksa kembali pilihan pelanggan, produk, dan gudang.",
  },
  "payment-recorded": {
    tone: "success",
    title: "Kuitansi pembayaran berhasil dicatat",
    body: "Uang diterima tercatat pada register kas/bank. Saldo buku besar belum berubah sampai Bendahara menautkan jurnal penjualan yang sudah terposting.",
  },
  "payment-invalid": {
    tone: "warning",
    title: "Data penerimaan tidak valid",
    body: "Periksa jumlah, register, dan referensi pembayaran.",
  },
  "payment-duplicate": {
    tone: "warning",
    title: "Permintaan penerimaan sudah diproses",
    body: "Form yang sama sudah pernah dikirim. Muat ulang halaman untuk melihat kuitansi yang tercatat.",
  },
  "payment-exceeds-balance": {
    tone: "warning",
    title: "Jumlah pembayaran melebihi sisa pesanan",
    body: "Sistem menolak kelebihan pembayaran. Periksa kembali jumlah yang diterima dan riwayat kuitansi.",
  },
  "payment-register-unavailable": {
    tone: "warning",
    title: "Register penerimaan tidak tersedia",
    body: "Pilih register ber-IDR yang aktif pada Kas & Bank.",
  },
  "payment-order-or-register-unavailable": {
    tone: "warning",
    title: "Penerimaan belum tersimpan",
    body: "Pastikan pesanan sudah terpenuhi, register aktif, dan jumlah belum melebihi sisa pesanan.",
  },
  "payment-blocked": {
    tone: "danger",
    title: "Kuitansi belum dapat disimpan",
    body: "Sumber data menolak penerimaan. Muat ulang halaman dan periksa kembali pesanan.",
  },
};

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function dateTimeLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(date);
}

export default async function PosPage({
  searchParams,
}: {
  searchParams?: Promise<{ result?: string; order_id?: string }>;
}) {
  const identity = await requireIdentity("pos:sell");
  const canViewBusinessWorkspace = can(identity, "field:usaha:read");
  const search = await searchParams;
  let customers: OrderCustomerOption[] = [];
  let products: OrderProductOption[] = [];
  let warehouses: OrderWarehouseOption[] = [];
  let recentOrders: PosOrderRow[] = [];
  let recentPayments: PosPaymentRow[] = [];
  let cashAccounts: BusinessPaymentRegisterOption[] = [];
  let fieldEnabled = false;
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [applicationResult, customerResult, productResult, warehouseResult, orderResult, cashAccountResult, paymentResult] = await Promise.all([
      sql`
        SELECT is_enabled
        FROM v9.field_applications
        WHERE organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
        LIMIT 1
      `,
      sql`
        SELECT id::text AS id, reference_no, customer_name, phone
        FROM v9.business_customers
        WHERE organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status = 'active'
        ORDER BY customer_name
        LIMIT 300
      `,
      sql`
        SELECT
          id::text AS id,
          sku,
          product_name,
          unit_label,
          selling_price::text AS selling_price,
          track_stock,
          product_kind,
          publication_status
        FROM v9.business_products
        WHERE organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status = 'active'
        ORDER BY product_name
        LIMIT 500
      `,
      sql`
        SELECT id::text AS id, warehouse_code, warehouse_name
        FROM v9.business_warehouses
        WHERE organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
          AND status = 'active'
        ORDER BY warehouse_name
        LIMIT 100
      `,
      sql`
        SELECT
          order_row.id::text AS id,
          order_row.reference_no,
          order_row.customer_name_snapshot,
          order_row.order_date::text AS order_date,
          order_row.status,
          order_row.total_amount::text AS total_amount,
          COALESCE(payment_summary.paid_total, 0)::text AS paid_total,
          order_row.created_at::text AS created_at
        FROM v9.business_orders AS order_row
        LEFT JOIN LATERAL (
          SELECT sum(payment.amount)::numeric(18,2) AS paid_total
          FROM v9.business_order_payments AS payment
          WHERE payment.organization_id = order_row.organization_id
            AND payment.order_id = order_row.id
        ) AS payment_summary ON true
        WHERE order_row.organization_id = ${identity.organizationId}
          AND order_row.field_key = 'usaha'
          AND order_row.order_channel = 'pos'
          AND order_row.created_by = ${identity.userId}
        ORDER BY order_row.created_at DESC
        LIMIT 12
      `,
      sql`
        SELECT id::text AS id, account_kind, display_name, institution_name
        FROM v9.finance_cash_accounts
        WHERE organization_id = ${identity.organizationId}
          AND status = 'active'
          AND currency_code = 'IDR'
        ORDER BY CASE account_kind WHEN 'cash' THEN 0 WHEN 'bank' THEN 1 ELSE 2 END, display_name
        LIMIT 100
      `,
      sql`
        SELECT
          payment.id::text AS id,
          payment.order_id::text AS order_id,
          payment.reference_no,
          payment.payment_date::text AS payment_date,
          payment.amount::text AS amount,
          payment.payment_reference,
          payment.note,
          cash_account.account_kind,
          cash_account.display_name AS register_name,
          journal.reference_no AS linked_journal_reference,
          payment.created_at::text AS created_at
        FROM v9.business_order_payments AS payment
        INNER JOIN v9.business_orders AS order_row
          ON order_row.id = payment.order_id
          AND order_row.organization_id = payment.organization_id
          AND order_row.order_channel = 'pos'
          AND order_row.created_by = ${identity.userId}
        INNER JOIN v9.finance_cash_accounts AS cash_account
          ON cash_account.id = payment.cash_account_id
          AND cash_account.organization_id = payment.organization_id
        LEFT JOIN v9.finance_journals AS journal
          ON journal.id = payment.finance_journal_id
          AND journal.organization_id = payment.organization_id
        WHERE payment.organization_id = ${identity.organizationId}
          AND payment.order_id IN (
            SELECT recent.id
            FROM v9.business_orders AS recent
            WHERE recent.organization_id = ${identity.organizationId}
              AND recent.field_key = 'usaha'
              AND recent.order_channel = 'pos'
              AND recent.created_by = ${identity.userId}
            ORDER BY recent.created_at DESC
            LIMIT 12
          )
        ORDER BY payment.created_at DESC
        LIMIT 100
      `,
    ]);

    fieldEnabled = rowsFromResult<FieldApplicationRow>(applicationResult)[0]?.is_enabled ?? false;
    customers = rowsFromResult<OrderCustomerOption>(customerResult);
    products = rowsFromResult<OrderProductOption>(productResult);
    warehouses = rowsFromResult<OrderWarehouseOption>(warehouseResult);
    recentOrders = rowsFromResult<PosOrderRow>(orderResult);
    cashAccounts = rowsFromResult<BusinessPaymentRegisterOption>(cashAccountResult);
    recentPayments = rowsFromResult<PosPaymentRow>(paymentResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pos] Source unavailable", safeErrorType(reason));
  }

  const resultNotice = search?.result ? resultMessages[search.result] : undefined;
  const canCreate = fieldEnabled && customers.length > 0 && products.length > 0 &&
    (products.every((product) => !product.track_stock) || warehouses.length > 0);

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.pos}
        badge={<Badge tone="info">Pesanan POS</Badge>}
        facts={[
          customers.length + " pelanggan aktif",
          products.length + " produk aktif",
          warehouses.length + " gudang aktif",
          recentOrders.length + " pesanan kasir terbaru",
        ]}
        actions={canViewBusinessWorkspace ? [
          { href: "/app/bidang/usaha/data", label: "Katalog Usaha" },
          { href: "/app/bidang/usaha/persediaan", label: "Persediaan" },
        ] : []}
      />

      <div className="mt-4">
        <Notice tone="info" title="Kuitansi pembayaran terpisah dari jurnal penjualan">
          Setelah pesanan terpenuhi, kasir dapat mencatat penerimaan penuh atau cicilan ke register kas/bank aktif.
          Kuitansi tidak mengubah saldo buku besar. Bendahara tetap membuat, memeriksa, dan memposting jurnal penjualan
          sebelum penerimaan diakui pada laporan keuangan.
        </Notice>
      </div>

      {resultNotice ? (
        <div className="mt-3">
          <Notice tone={resultNotice.tone} title={resultNotice.title}>
            {resultNotice.body}

          </Notice>
        </div>
      ) : null}

      {unavailable ? (
        <div className="mt-3">
          <Notice tone="danger" title="Data POS belum dapat dimuat">
            Koneksi ke katalog dan register pesanan sedang tidak tersedia. Form transaksi dinonaktifkan
            agar data kosong akibat gangguan tidak dianggap sebagai katalog yang benar-benar kosong.
          </Notice>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <Card>
          <CardHeader
            title="Buat draf pesanan"
            subtitle="Pilih pelanggan, barang, jumlah, dan gudang pemenuhan bila produk mengelola stok."
            action={<ShoppingBag size={16} className="text-muted2" />}
          />
          {unavailable ? (
            <div className="px-5 py-9">
              <EmptyState title="Form belum tersedia" body="Muat ulang setelah sumber data POS pulih." />
            </div>
          ) : !fieldEnabled ? (
            <div className="px-5 py-9">
              <EmptyState title="Bidang Usaha belum diaktifkan" body="Pengurus organisasi perlu mengaktifkan aplikasi Bidang Usaha sebelum POS dapat mencatat pesanan." />
            </div>
          ) : !customers.length || !products.length ? (
            <div className="px-5 py-9">
              <EmptyState
                title={!customers.length ? "Belum ada pelanggan aktif" : "Belum ada produk aktif"}
                body="Pengurus Bidang Usaha perlu menyiapkan register pelanggan dan katalog produk sebelum kasir dapat membuat pesanan."
              />
            </div>
          ) : !canCreate ? (
            <div className="px-5 py-9">
              <EmptyState title="Gudang aktif belum tersedia" body="Pilih atau aktifkan gudang pada aplikasi Usaha sebelum membuat pesanan barang yang mengelola stok." />
            </div>
          ) : (
            <BusinessOrderComposer
              customers={customers}
              products={products}
              warehouses={warehouses}
              defaultChannel="pos"
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Alur setelah pesanan dibuat" action={<LockKeyhole size={15} className="text-muted2" />} />
            <ol className="space-y-3 px-4 py-4 text-[11.5px]">
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-bold text-ink2">1</span>
                <span><strong className="text-ink">Kasir mencatat draf.</strong><span className="mt-0.5 block text-muted">Harga dan nama produk disalin sebagai snapshot pesanan.</span></span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-bold text-ink2">2</span>
                <span><strong className="text-ink">Bidang Usaha mengonfirmasi.</strong><span className="mt-0.5 block text-muted">Sistem memeriksa saldo stok dan mencadangkan barang secara transaksional.</span></span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-bold text-ink2">3</span>
                <span><strong className="text-ink">Petugas mencatat pemenuhan.</strong><span className="mt-0.5 block text-muted">Mutasi persediaan penjualan dicatat tanpa pengurangan parsial.</span></span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-bold text-ink2">4</span>
                <span><strong className="text-ink">Bendahara mencatat penerimaan.</strong><span className="mt-0.5 block text-muted">Penerimaan kas dan jurnal penjualan tetap menunggu alur pembayaran yang disahkan.</span></span>
              </li>
            </ol>
            <div className="border-t border-line px-4 py-3">
              {canViewBusinessWorkspace ? (
                <Link href="/app/bidang/usaha/pesanan" className="flex items-center justify-between gap-2 text-[11px] font-semibold text-primary-700">
                  Register pesanan Bidang Usaha <ArrowRight size={13} />
                </Link>
              ) : (
                <p className="text-[10.5px] leading-relaxed text-muted2">
                  Akses register lengkap tersedia bagi petugas Bidang Usaha yang berwenang.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Batas kewenangan POS" />
            <div className="space-y-2 px-4 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Akun kasir hanya dapat membuat draf kanal POS dan melihat draf yang dibuat oleh akunnya
                sendiri. Konfirmasi stok, pemenuhan, dan pencatatan keuangan berada pada petugas dengan
                kewenangan masing-masing.
              </p>
              <Badge tone="success">Dibatasi per akun & organisasi</Badge>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Pesanan yang dibuat akun ini"
          subtitle="Hanya pesanan dengan kanal POS yang dibuat oleh akun kasir yang sedang masuk"
          action={<Badge tone="neutral">{recentOrders.length} terbaru</Badge>}
        />
        {recentOrders.length ? (
          <div className="divide-y divide-line">
            {recentOrders.map((order) => (
              <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted2">{order.reference_no}</span>
                    <Badge tone={statusTone[order.status]}>{statusLabel[order.status]}</Badge>
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{order.customer_name_snapshot}</div>
                  <div className="mt-0.5 text-[10px] text-muted2">{dateTimeLabel(order.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-semibold tabular-nums text-ink">{formatIDR(Number(order.total_amount))}</div>
                  <div className="mt-0.5 text-[9.5px] text-muted2">Sudah diterima {formatIDR(Number(order.paid_total))}</div>
                  <div className="text-[9.5px] text-muted2">Sisa {formatIDR(Math.max(0, Number(order.total_amount) - Number(order.paid_total)))}</div>
                </div>
                {order.status === "fulfilled" ? (
                  <div className="mt-3 w-full basis-full">
                    {recentPayments.filter((payment) => payment.order_id === order.id).length ? (
                      <div className="mb-2 rounded-lg border border-line">
                        <div className="border-b border-line px-3 py-2 text-[10px] font-semibold text-ink2">Riwayat kuitansi</div>
                        <div className="divide-y divide-line">
                          {recentPayments.filter((payment) => payment.order_id === order.id).map((payment) => (
                            <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[10px]">
                              <div className="min-w-0">
                                <Link href={`/app/pos/penerimaan/${payment.id}`} className="font-mono font-semibold text-primary-700 hover:underline">{payment.reference_no}</Link>
                                <div className="text-[9px] text-muted2">{dateTimeLabel(payment.created_at)}</div>
                                <div className="text-ink2">{payment.register_name} · {payment.account_kind === "cash" ? "Tunai" : payment.account_kind === "bank" ? "Bank" : "Dompet digital"}</div>
                                {payment.payment_reference ? <div className="text-muted2">Ref. {payment.payment_reference}</div> : null}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold tabular-nums text-ink">{formatIDR(Number(payment.amount))}</div>
                                <Badge tone={payment.linked_journal_reference ? "success" : "warning"}>
                                  {payment.linked_journal_reference ? `Jurnal ${payment.linked_journal_reference}` : "Belum dibukukan"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <BusinessOrderPaymentForm
                      orderId={order.id}
                      remaining={Math.max(0, Number(order.total_amount) - Number(order.paid_total))}
                      cashAccounts={cashAccounts}
                      idempotencyKey={randomUUID()}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-9">
            <EmptyState
              title="Belum ada pesanan POS"
              body="Draf yang dibuat melalui halaman ini akan muncul di sini setelah berhasil disimpan."
              icon={<ClipboardList size={23} />}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
