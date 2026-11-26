import Link from "next/link";
import { ClipboardList, PackageCheck, UsersRound } from "lucide-react";
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
import { can, requireIdentity } from "@/lib/session";
import type { FieldDef } from "@/config/fields";
import {
  advanceBusinessOrder,
  cancelBusinessOrder,
  confirmBusinessOrder,
  createBusinessCustomer,
  fulfillBusinessOrder,
} from "@/app/actions/business-orders";
import { BusinessOrderComposer } from "@/components/business-order-composer";

interface OrderSummary {
  customer_count: number;
  order_count: number;
  draft_count: number;
  reserved_count: number;
  ready_count: number;
  fulfilled_count: number;
  order_value: string;
}

interface CustomerRow {
  id: string;
  reference_no: string;
  customer_type: string;
  customer_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

interface ProductOption {
  id: string;
  sku: string;
  product_name: string;
  unit_label: string;
  selling_price: string;
  track_stock: boolean;
  product_kind: "physical" | "service";
  publication_status: "private" | "published" | "hidden";
}

interface WarehouseOption {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
}

interface OrderRow {
  id: string;
  reference_no: string;
  customer_name_snapshot: string;
  customer_contact_snapshot: string | null;
  customer_phone_snapshot: string | null;
  order_channel: string;
  order_date: string;
  status: "draft" | "confirmed" | "processing" | "ready" | "fulfilled" | "cancelled";
  warehouse_name: string | null;
  subtotal: string;
  delivery_fee: string;
  total_amount: string;
  customer_note: string | null;
  internal_note: string | null;
  delivery_note: string | null;
  item_count: number;
  reserved_line_count: number;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  sku_snapshot: string;
  product_name_snapshot: string;
  unit_snapshot: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  stock_reserved: string;
}

function money(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
    : "—";
}

function number(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(amount)
    : "—";
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

const statusLabel: Record<OrderRow["status"], string> = {
  draft: "Draf",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  ready: "Siap diserahkan",
  fulfilled: "Terpenuhi",
  cancelled: "Dibatalkan",
};

const channelLabel: Record<string, string> = {
  internal: "Internal",
  whatsapp: "WhatsApp",
  mitra: "Mitra",
  website: "Website",
  pos: "POS",
};

function statusTone(status: OrderRow["status"]): "neutral" | "info" | "warning" | "success" | "danger" {
  if (status === "fulfilled") return "success";
  if (status === "ready") return "info";
  if (status === "confirmed" || status === "processing") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function resultNotice(result?: string): { tone: "success" | "warning" | "danger" | "info"; text: string } | null {
  if (!result) return null;
  const messages: Record<string, { tone: "success" | "warning" | "danger" | "info"; text: string }> = {
    "customer-created": { tone: "success", text: "Pelanggan berhasil dicatat." },
    "order-created": { tone: "success", text: "Draf pesanan berhasil dibuat. Periksa rincian sebelum mengonfirmasi." },
    "order-confirmed": { tone: "success", text: "Pesanan dikonfirmasi dan stok yang dikelola sudah dicadangkan." },
    "order-updated": { tone: "success", text: "Status proses pesanan diperbarui." },
    "order-fulfilled": { tone: "success", text: "Pesanan dipenuhi. Stok fisik berkurang dan mutasi penjualan dicatat." },
    "order-cancelled": { tone: "success", text: "Pesanan dibatalkan dan cadangan stok dilepas." },
    "reservation-unavailable": { tone: "warning", text: "Stok tersedia tidak cukup, barang tidak aktif, atau catatan stok untuk gudang belum lengkap. Pesanan tidak dikonfirmasi." },
    "fulfillment-stock-blocked": { tone: "warning", text: "Pemenuhan tidak dapat dilakukan. Periksa cadangan dan saldo stok; tidak ada pemenuhan parsial." },
    "cancellation-stock-blocked": { tone: "warning", text: "Cadangan stok tidak dapat dilepas seluruhnya; pembatalan tidak diterapkan." },
    "transition-blocked": { tone: "warning", text: "Perubahan status tidak sesuai dengan alur pesanan." },
    "customer-product-or-warehouse-unavailable": { tone: "warning", text: "Pelanggan, produk, atau gudang tidak aktif/tidak tersedia." },
    "invalid-items": { tone: "warning", text: "Periksa pilihan produk, jumlah, dan duplikasi item." },
    "invalid": { tone: "warning", text: "Periksa kembali data pesanan." },
    "error": { tone: "danger", text: "Sistem tidak dapat menyimpan perubahan. Periksa koneksi atau hubungi administrator." },
    "field-unavailable": { tone: "warning", text: "Aplikasi Bidang Usaha belum aktif." },
  };
  return messages[result] ?? { tone: "info", text: "Perubahan telah diproses." };
}

export async function FieldBusinessOrdersSection({
  field,
  result,
}: {
  field: FieldDef;
  result?: string;
}) {
  const identity = await requireIdentity("field:usaha:read");
  const canWrite = can(identity, "field:usaha:business:write");
  const sql = getV9Sql();

  const [summaryResult, customerResult, productResult, warehouseResult, orderResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int FROM v9.business_customers customer
          WHERE customer.organization_id = ${identity.organizationId}
            AND customer.field_key = 'usaha' AND customer.status = 'active') AS customer_count,
        (SELECT count(*)::int FROM v9.business_orders order_row
          WHERE order_row.organization_id = ${identity.organizationId}
            AND order_row.field_key = 'usaha') AS order_count,
        (SELECT count(*)::int FROM v9.business_orders order_row
          WHERE order_row.organization_id = ${identity.organizationId}
            AND order_row.field_key = 'usaha' AND order_row.status = 'draft') AS draft_count,
        (SELECT count(*)::int FROM v9.business_orders order_row
          WHERE order_row.organization_id = ${identity.organizationId}
            AND order_row.field_key = 'usaha'
            AND order_row.status IN ('confirmed','processing','ready')) AS reserved_count,
        (SELECT count(*)::int FROM v9.business_orders order_row
          WHERE order_row.organization_id = ${identity.organizationId}
            AND order_row.field_key = 'usaha' AND order_row.status = 'ready') AS ready_count,
        (SELECT count(*)::int FROM v9.business_orders order_row
          WHERE order_row.organization_id = ${identity.organizationId}
            AND order_row.field_key = 'usaha' AND order_row.status = 'fulfilled') AS fulfilled_count,
        (SELECT COALESCE(sum(order_row.total_amount),0)::text
          FROM v9.business_orders order_row
          WHERE order_row.organization_id = ${identity.organizationId}
            AND order_row.field_key = 'usaha'
            AND order_row.status NOT IN ('cancelled','draft')) AS order_value
    `,
    sql`
      SELECT id::text AS id, reference_no, customer_type, customer_name,
        contact_name, phone, email
      FROM v9.business_customers
      WHERE organization_id = ${identity.organizationId}
        AND field_key = 'usaha' AND status = 'active'
      ORDER BY customer_name
      LIMIT 500
    `,
    sql`
      SELECT id::text AS id, sku, product_name, unit_label,
        selling_price::text AS selling_price, track_stock, product_kind, publication_status
      FROM v9.business_products
      WHERE organization_id = ${identity.organizationId}
        AND field_key = 'usaha' AND status = 'active'
      ORDER BY product_name
      LIMIT 500
    `,
    sql`
      SELECT id::text AS id, warehouse_code, warehouse_name
      FROM v9.business_warehouses
      WHERE organization_id = ${identity.organizationId}
        AND field_key = 'usaha' AND status = 'active'
      ORDER BY warehouse_name
      LIMIT 100
    `,
    sql`
      SELECT
        order_row.id::text AS id,
        order_row.reference_no,
        order_row.customer_name_snapshot,
        order_row.customer_contact_snapshot,
        order_row.customer_phone_snapshot,
        order_row.order_channel,
        order_row.order_date::text AS order_date,
        order_row.status,
        warehouse.warehouse_name,
        order_row.subtotal::text AS subtotal,
        order_row.delivery_fee::text AS delivery_fee,
        order_row.total_amount::text AS total_amount,
        order_row.customer_note,
        order_row.internal_note,
        order_row.delivery_note,
        (SELECT count(*)::int FROM v9.business_order_items item
          WHERE item.order_id = order_row.id
            AND item.organization_id = order_row.organization_id) AS item_count,
        (SELECT count(*)::int FROM v9.business_order_items item
          WHERE item.order_id = order_row.id
            AND item.organization_id = order_row.organization_id
            AND item.stock_reserved > 0) AS reserved_line_count
      FROM v9.business_orders AS order_row
      LEFT JOIN v9.business_warehouses AS warehouse
        ON warehouse.id = order_row.warehouse_id
        AND warehouse.organization_id = order_row.organization_id
        AND warehouse.field_key = order_row.field_key
      WHERE order_row.organization_id = ${identity.organizationId}
        AND order_row.field_key = 'usaha'
      ORDER BY order_row.order_date DESC, order_row.created_at DESC
      LIMIT 200
    `,
  ]);

  const summary = rowsFromResult<OrderSummary>(summaryResult)[0] ?? {
    customer_count: 0, order_count: 0, draft_count: 0, reserved_count: 0,
    ready_count: 0, fulfilled_count: 0, order_value: "0",
  };
  const customers = rowsFromResult<CustomerRow>(customerResult);
  const products = rowsFromResult<ProductOption>(productResult);
  const warehouses = rowsFromResult<WarehouseOption>(warehouseResult);
  const orders = rowsFromResult<OrderRow>(orderResult);

  const itemResult = await sql`
    SELECT
      item.id::text AS id,
      item.order_id::text AS order_id,
      item.sku_snapshot,
      item.product_name_snapshot,
      item.unit_snapshot,
      item.quantity::text AS quantity,
      item.unit_price::text AS unit_price,
      item.line_total::text AS line_total,
      item.stock_reserved::text AS stock_reserved
    FROM v9.business_order_items AS item
    INNER JOIN v9.business_orders AS order_row
      ON order_row.id = item.order_id
      AND order_row.organization_id = item.organization_id
      AND order_row.field_key = item.field_key
    WHERE item.organization_id = ${identity.organizationId}
      AND item.field_key = 'usaha'
      AND order_row.id IN (
        SELECT selected.id
        FROM v9.business_orders AS selected
        WHERE selected.organization_id = ${identity.organizationId}
          AND selected.field_key = 'usaha'
        ORDER BY selected.order_date DESC, selected.created_at DESC
        LIMIT 200
      )
    ORDER BY item.created_at, item.product_name_snapshot
    LIMIT 2000
  `;
  const items = rowsFromResult<OrderItemRow>(itemResult);
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const group = itemsByOrder.get(item.order_id) ?? [];
    group.push(item);
    itemsByOrder.set(item.order_id, group);
  }
  const notice = resultNotice(result);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Pelanggan & pesanan"
        description="Catat pelanggan, buat pesanan, cadangkan stok saat konfirmasi, dan catat pemenuhan melalui mutasi persediaan."
        actions={<Link href="/app/bidang/usaha/persediaan" className="sb-btn sb-btn-outline">Gudang & persediaan</Link>}
      />
      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan pesanan">{notice.text}</Notice></div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pelanggan aktif" value={summary.customer_count} note="Register pelanggan" tone="info" />
        <StatCard label="Draf pesanan" value={summary.draft_count} note="Belum dikonfirmasi" tone="neutral" />
        <StatCard label="Dalam proses" value={summary.reserved_count} note="Stok dicadangkan bila dilacak" tone="warning" />
        <StatCard label="Siap diserahkan" value={summary.ready_count} note={`${summary.fulfilled_count} pesanan terpenuhi`} tone="success" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader title="Buat pesanan" subtitle="Harga dan nama barang diambil dari data produk aktif. Pesanan baru disimpan sebagai draf." />
          {canWrite ? (
            <BusinessOrderComposer customers={customers} products={products} warehouses={warehouses} />
          ) : (
            <div className="px-5 py-8"><EmptyState title="Akses baca-saja" body="Peran Anda dapat melihat pesanan, tetapi tidak dapat membuat atau mengubahnya." /></div>
          )}
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader title="Tambah pelanggan" subtitle="Simpan identitas pelanggan agar dapat dipilih pada pesanan berikutnya." />
            <form action={createBusinessCustomer} className="grid gap-3 p-4">
              <div>
                <label htmlFor="customer-name" className="mb-1 block text-[11px] font-semibold text-ink2">Nama pelanggan / lembaga</label>
                <input id="customer-name" name="customer_name" required minLength={2} maxLength={240} className="sb-input" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="customer-type" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis</label>
                  <select id="customer-type" name="customer_type" className="sb-input">
                    <option value="individual">Perorangan</option><option value="business">Usaha</option><option value="cooperative">Koperasi</option><option value="government">Pemerintah</option><option value="ngo">NGO / yayasan</option><option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="customer-contact" className="mb-1 block text-[11px] font-semibold text-ink2">Kontak person</label>
                  <input id="customer-contact" name="contact_name" maxLength={160} className="sb-input" />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div><label htmlFor="customer-phone" className="mb-1 block text-[11px] font-semibold text-ink2">Telepon</label><input id="customer-phone" name="phone" maxLength={60} className="sb-input" /></div>
                <div><label htmlFor="customer-email" className="mb-1 block text-[11px] font-semibold text-ink2">Email</label><input id="customer-email" name="email" type="email" maxLength={254} className="sb-input" /></div>
              </div>
              <div><label htmlFor="customer-address" className="mb-1 block text-[11px] font-semibold text-ink2">Alamat</label><textarea id="customer-address" name="address" rows={2} maxLength={1000} className="sb-input !h-auto resize-y py-2" /></div>
              <div><label htmlFor="customer-notes" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan</label><input id="customer-notes" name="notes" maxLength={3000} className="sb-input" /></div>
              <div className="flex justify-end"><button type="submit" className="sb-btn sb-btn-primary"><UsersRound size={14} /> Simpan pelanggan</button></div>
            </form>
          </Card>
        ) : null}
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Register pesanan"
          subtitle={`${orders.length} pesanan terbaru · nilai pesanan bukan penerimaan kas`}
          action={<Badge tone="neutral">Maksimal 200</Badge>}
        />
        {orders.length ? (
          <div className="divide-y divide-line">
            {orders.map((order) => (
              <article key={order.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted2">{order.reference_no}</span>
                      <Badge tone={statusTone(order.status)}>{statusLabel[order.status]}</Badge>
                      <Badge tone="neutral">{channelLabel[order.order_channel] ?? order.order_channel}</Badge>
                    </div>
                    <h3 className="mt-1 text-[13px] font-semibold text-ink">{order.customer_name_snapshot}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                      <span>{dateLabel(order.order_date)}</span>
                      {order.customer_contact_snapshot ? <span>{order.customer_contact_snapshot}</span> : null}
                      {order.customer_phone_snapshot ? <span>{order.customer_phone_snapshot}</span> : null}
                      {order.warehouse_name ? <span>Gudang: {order.warehouse_name}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold tabular-nums text-primary-800">{money(order.total_amount)}</div>
                    <div className="text-[9.5px] text-muted2">{order.item_count} item · {order.reserved_line_count} item bersaldo dicadangkan</div>
                  </div>
                </div>

                <div className="mt-3 rounded-[9px] border border-line bg-paper px-3 py-2">
                  {(itemsByOrder.get(order.id) ?? []).map((item) => (
                    <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-1 text-[10.5px]">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-ink2">{item.product_name_snapshot}</span>
                        <span className="ml-2 text-muted">{item.sku_snapshot} · {number(item.quantity)} {item.unit_snapshot}</span>
                        {Number(item.stock_reserved) > 0 ? <div className="mt-0.5 text-[9px] text-muted2">Cadangan stok: {number(item.stock_reserved)}</div> : null}
                      </div>
                      <div className="text-right tabular-nums text-ink2">{money(item.line_total)}</div>
                    </div>
                  ))}
                  <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-[10px] text-muted">
                    <span>Subtotal barang {money(order.subtotal)}</span>
                    <span>Biaya kirim {money(order.delivery_fee)}</span>
                  </div>
                </div>

                {order.delivery_note ? <div className="mt-2 text-[10.5px] text-muted">Pengiriman: {order.delivery_note}</div> : null}
                {order.customer_note ? <div className="mt-1 text-[10.5px] text-muted">Catatan pelanggan: {order.customer_note}</div> : null}
                {order.internal_note ? <div className="mt-1 text-[10.5px] text-muted2">Internal: {order.internal_note}</div> : null}

                {canWrite && order.status !== "fulfilled" && order.status !== "cancelled" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {order.status === "draft" ? (
                      <form action={confirmBusinessOrder}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]"><PackageCheck size={13} /> Konfirmasi &amp; cadangkan stok</button>
                      </form>
                    ) : null}
                    {order.status === "confirmed" ? (
                      <form action={advanceBusinessOrder}>
                        <input type="hidden" name="order_id" value={order.id} /><input type="hidden" name="next_status" value="processing" />
                        <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Mulai proses</button>
                      </form>
                    ) : null}
                    {order.status === "processing" ? (
                      <form action={advanceBusinessOrder}>
                        <input type="hidden" name="order_id" value={order.id} /><input type="hidden" name="next_status" value="ready" />
                        <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Tandai siap</button>
                      </form>
                    ) : null}
                    {order.status === "ready" ? (
                      <form action={fulfillBusinessOrder}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]">Penuhi pesanan</button>
                      </form>
                    ) : null}
                    <form action={cancelBusinessOrder} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <input type="hidden" name="order_id" value={order.id} />
                      <input name="reason" maxLength={1000} className="sb-input !h-8 min-w-[150px] flex-1 text-[10px]" placeholder="Alasan pembatalan (opsional)" />
                      <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[9.5px]">Batalkan</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10"><EmptyState title="Belum ada pesanan" body="Catat pelanggan, lalu buat pesanan dengan item dari daftar produk aktif." /></div>
        )}
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Notice tone="info" title="Cadangan dan stok fisik">
          Konfirmasi pesanan mencadangkan stok yang dilacak. Pemenuhan mengurangi stok fisik dan
          menambahkan mutasi penjualan yang tidak dapat diubah; pembatalan melepas cadangan.
        </Notice>
        <Notice tone="info" title="Batas transaksi">
          Status pesanan bukan status pembayaran. Belum ada penerimaan kas, piutang, POS, faktur
          pajak, jurnal pendapatan, atau pengakuan omzet otomatis pada tahap ini.
        </Notice>
      </div>
    </div>
  );
}
