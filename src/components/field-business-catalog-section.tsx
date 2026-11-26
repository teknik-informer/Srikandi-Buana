import Link from "next/link";
import { Package, Warehouse, Boxes, Plus } from "lucide-react";
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
  createBusinessProduct,
  createBusinessWarehouse,
  recordBusinessInventoryMovement,
  updateBusinessProduct,
  updateBusinessProductPublication,
  updateBusinessProductStatus,
  updateBusinessWarehouseStatus,
} from "@/app/actions/business-catalog";

interface CatalogSummary {
  product_count: number;
  active_count: number;
  published_count: number;
  draft_count: number;
  category_count: number;
  warehouse_count: number;
  sku_with_stock_count: number;
  movement_count: number;
  total_on_hand: string;
  total_reserved: string;
}

interface ProductRow {
  id: string;
  reference_no: string;
  sku: string;
  slug: string;
  product_name: string;
  category_label: string | null;
  product_kind: "physical" | "service";
  unit_label: string;
  selling_price: string;
  cost_estimate: string | null;
  description: string | null;
  producer_label: string | null;
  status: "draft" | "active" | "inactive" | "archived";
  publication_status: "private" | "published" | "hidden";
  track_stock: boolean;
  total_on_hand: string;
  total_reserved: string;
}

interface WarehouseRow {
  id: string;
  reference_no: string;
  warehouse_code: string;
  warehouse_name: string;
  location_note: string | null;
  responsible_label: string | null;
  status: "active" | "inactive" | "archived";
  product_count: number;
}

interface StockRow {
  product_id: string;
  warehouse_id: string;
  product_name: string;
  sku: string;
  warehouse_name: string;
  on_hand: string;
  reserved: string;
  available: string;
  unit_label: string;
}

interface MovementRow {
  id: string;
  reference_no: string;
  product_name: string;
  sku: string;
  warehouse_name: string;
  movement_type: "receipt" | "adjustment_in" | "adjustment_out" | "return_in";
  quantity: string;
  on_hand_before: string;
  on_hand_delta: string;
  on_hand_after: string;
  source_reference: string | null;
  note: string | null;
  created_at: string;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function numberLabel(value: string | number, digits = 3): string {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(number)
    : "—";
}

function rupiah(value: string | null): string {
  if (value === null || value === "") return "Belum dihitung";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
    : "—";
}

const movementLabel: Record<MovementRow["movement_type"], string> = {
  receipt: "Penerimaan",
  adjustment_in: "Penyesuaian masuk",
  adjustment_out: "Penyesuaian keluar",
  return_in: "Retur masuk",
};

function resultNotice(result?: string, mode: "katalog" | "persediaan" = "katalog"): { tone: "success" | "warning" | "danger" | "info"; text: string } | null {
  const messages: Record<string, { tone: "success" | "warning" | "danger" | "info"; text: string }> = {
    "product-created": { tone: "success", text: "Produk berhasil dibuat sebagai draf internal." },
    "product-updated": { tone: "success", text: "Informasi produk berhasil diperbarui." },
    "product-status-updated": { tone: "success", text: "Status produk berhasil diperbarui." },
    "product-publication-updated": { tone: "success", text: "Status publikasi produk berhasil diperbarui." },
    "product-stale": { tone: "warning", text: "Produk sudah berubah atau tidak lagi tersedia." },
    "product-not-ready": { tone: "warning", text: "Produk belum aktif atau harga jualnya belum diisi sehingga belum dapat dipublikasikan." },
    "product-stock-or-status-blocked": { tone: "warning", text: "Produk masih memiliki stok atau reservasi. Kosongkan stok terlebih dahulu sebelum mengarsipkannya." },
    "duplicate-sku": { tone: "warning", text: "SKU sudah dipakai produk lain." },
    "duplicate-slug": { tone: "warning", text: "Alamat produk sudah dipakai produk lain." },
    "warehouse-created": { tone: "success", text: "Gudang berhasil ditambahkan." },
    "warehouse-updated": { tone: "success", text: "Status gudang berhasil diperbarui." },
    "warehouse-stock-or-status-blocked": { tone: "warning", text: "Gudang masih memiliki stok atau reservasi. Kosongkan saldo sebelum mengarsipkannya." },
    "duplicate-warehouse-code": { tone: "warning", text: "Kode gudang sudah digunakan." },
    "stock-movement-recorded": { tone: "success", text: "Mutasi persediaan berhasil dicatat dan saldo gudang diperbarui." },
    "stock-insufficient-or-unavailable": { tone: "warning", text: "Produk/gudang tidak aktif, atau stok tersedia tidak cukup setelah memperhitungkan jumlah yang dicadangkan." },
    "invalid": { tone: "warning", text: "Periksa kembali data yang diisi. Ada nilai yang belum valid." },
    "error": { tone: "danger", text: "Sistem tidak dapat menyimpan perubahan. Periksa koneksi atau hubungi administrator." },
    "field-unavailable": { tone: "warning", text: "Aplikasi bidang Usaha belum aktif untuk organisasi ini." },
  };
  return messages[result ?? ""] ?? (result ? { tone: "info", text: "Perubahan telah diproses." } : null);
}

export async function FieldBusinessCatalogSection({
  field,
  mode,
  result,
}: {
  field: FieldDef;
  mode: "katalog" | "persediaan";
  result?: string;
}) {
  const identity = await requireIdentity("field:usaha:read");
  const canWrite = can(identity, "field:usaha:business:write");
  const canApprove = can(identity, "organization:team:approve");
  const canSeeCost = canWrite || canApprove;
  const sql = getV9Sql();

  const [summaryResult, productResult, warehouseResult, stockResult, movementResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int FROM v9.business_products product
          WHERE product.organization_id = ${identity.organizationId} AND product.field_key = 'usaha'
            AND product.status <> 'archived') AS product_count,
        (SELECT count(*)::int FROM v9.business_products product
          WHERE product.organization_id = ${identity.organizationId} AND product.field_key = 'usaha'
            AND product.status = 'active') AS active_count,
        (SELECT count(*)::int FROM v9.business_products product
          WHERE product.organization_id = ${identity.organizationId} AND product.field_key = 'usaha'
            AND product.status = 'active' AND product.publication_status = 'published') AS published_count,
        (SELECT count(*)::int FROM v9.business_products product
          WHERE product.organization_id = ${identity.organizationId} AND product.field_key = 'usaha'
            AND product.status = 'draft') AS draft_count,
        (SELECT count(DISTINCT category_label)::int FROM v9.business_products product
          WHERE product.organization_id = ${identity.organizationId} AND product.field_key = 'usaha'
            AND product.status <> 'archived' AND category_label IS NOT NULL) AS category_count,
        (SELECT count(*)::int FROM v9.business_warehouses warehouse
          WHERE warehouse.organization_id = ${identity.organizationId} AND warehouse.field_key = 'usaha'
            AND warehouse.status = 'active') AS warehouse_count,
        (SELECT count(DISTINCT stock.product_id)::int FROM v9.business_product_stock stock
          WHERE stock.organization_id = ${identity.organizationId} AND stock.field_key = 'usaha'
            AND stock.on_hand > 0) AS sku_with_stock_count,
        (SELECT count(*)::int FROM v9.business_inventory_movements movement
          WHERE movement.organization_id = ${identity.organizationId} AND movement.field_key = 'usaha'
            AND movement.created_at >= date_trunc('month', current_date)) AS movement_count,
        (SELECT COALESCE(sum(stock.on_hand),0)::text FROM v9.business_product_stock stock
          WHERE stock.organization_id = ${identity.organizationId} AND stock.field_key = 'usaha') AS total_on_hand,
        (SELECT COALESCE(sum(stock.reserved),0)::text FROM v9.business_product_stock stock
          WHERE stock.organization_id = ${identity.organizationId} AND stock.field_key = 'usaha') AS total_reserved
    `,
    sql`
      SELECT
        product.id::text AS id, product.reference_no, product.sku, product.slug,
        product.product_name, product.category_label, product.product_kind,
        product.unit_label, product.selling_price::text AS selling_price,
        product.cost_estimate::text AS cost_estimate, product.description,
        product.producer_label, product.status, product.publication_status, product.track_stock,
        COALESCE(stock.total_on_hand,0)::text AS total_on_hand,
        COALESCE(stock.total_reserved,0)::text AS total_reserved
      FROM v9.business_products AS product
      LEFT JOIN LATERAL (
        SELECT sum(balance.on_hand) AS total_on_hand, sum(balance.reserved) AS total_reserved
        FROM v9.business_product_stock AS balance
        WHERE balance.product_id = product.id
          AND balance.organization_id = product.organization_id
          AND balance.field_key = product.field_key
      ) AS stock ON true
      WHERE product.organization_id = ${identity.organizationId}
        AND product.field_key = 'usaha'
      ORDER BY CASE product.status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 WHEN 'inactive' THEN 3 ELSE 4 END,
        product.product_name
      LIMIT 500
    `,
    sql`
      SELECT
        warehouse.id::text AS id, warehouse.reference_no, warehouse.warehouse_code,
        warehouse.warehouse_name, warehouse.location_note, warehouse.responsible_label,
        warehouse.status,
        (SELECT count(DISTINCT stock.product_id)::int FROM v9.business_product_stock stock
          WHERE stock.warehouse_id = warehouse.id AND stock.organization_id = warehouse.organization_id
            AND (stock.on_hand > 0 OR stock.reserved > 0)) AS product_count
      FROM v9.business_warehouses AS warehouse
      WHERE warehouse.organization_id = ${identity.organizationId}
        AND warehouse.field_key = 'usaha'
      ORDER BY CASE warehouse.status WHEN 'active' THEN 1 WHEN 'inactive' THEN 2 ELSE 3 END,
        warehouse.warehouse_name
      LIMIT 100
    `,
    sql`
      SELECT
        stock.product_id::text AS product_id,
        stock.warehouse_id::text AS warehouse_id,
        product.product_name,
        product.sku,
        warehouse.warehouse_name,
        stock.on_hand::text AS on_hand,
        stock.reserved::text AS reserved,
        (stock.on_hand - stock.reserved)::text AS available,
        product.unit_label
      FROM v9.business_product_stock AS stock
      INNER JOIN v9.business_products AS product
        ON product.id = stock.product_id
        AND product.organization_id = stock.organization_id
        AND product.field_key = stock.field_key
      INNER JOIN v9.business_warehouses AS warehouse
        ON warehouse.id = stock.warehouse_id
        AND warehouse.organization_id = stock.organization_id
        AND warehouse.field_key = stock.field_key
      WHERE stock.organization_id = ${identity.organizationId}
        AND stock.field_key = 'usaha'
      ORDER BY product.product_name, warehouse.warehouse_name
      LIMIT 500
    `,
    sql`
      SELECT
        movement.id::text AS id, movement.reference_no,
        product.product_name, product.sku, warehouse.warehouse_name,
        movement.movement_type, movement.quantity::text AS quantity,
        movement.on_hand_before::text AS on_hand_before,
        movement.on_hand_delta::text AS on_hand_delta,
        movement.on_hand_after::text AS on_hand_after,
        movement.source_reference, movement.note, movement.created_at::text AS created_at
      FROM v9.business_inventory_movements AS movement
      INNER JOIN v9.business_products AS product
        ON product.id = movement.product_id
        AND product.organization_id = movement.organization_id
        AND product.field_key = movement.field_key
      INNER JOIN v9.business_warehouses AS warehouse
        ON warehouse.id = movement.warehouse_id
        AND warehouse.organization_id = movement.organization_id
        AND warehouse.field_key = movement.field_key
      WHERE movement.organization_id = ${identity.organizationId}
        AND movement.field_key = 'usaha'
      ORDER BY movement.created_at DESC
      LIMIT 100
    `,
  ]);

  const summary = rowsFromResult<CatalogSummary>(summaryResult)[0] ?? {
    product_count: 0, active_count: 0, published_count: 0, draft_count: 0,
    category_count: 0, warehouse_count: 0, sku_with_stock_count: 0,
    movement_count: 0, total_on_hand: "0", total_reserved: "0",
  };
  const products = rowsFromResult<ProductRow>(productResult);
  const warehouses = rowsFromResult<WarehouseRow>(warehouseResult);
  const stockRows = rowsFromResult<StockRow>(stockResult);
  const movements = rowsFromResult<MovementRow>(movementResult);
  const notice = resultNotice(result, mode);
  const stockProducts = products.filter((product) => product.status === "active" && product.product_kind === "physical" && product.track_stock);
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "active");

  if (mode === "katalog") {
    return (
      <div className="pb-10">
        <PageHeader
          eyebrow={field.name}
          title="Produk"
          description="Kelola identitas produk, produsen, satuan, harga jual, HPP internal, dan status publikasi. Produk hanya tampil di website setelah disetujui."
          actions={<Link href="/app/bidang/usaha/persediaan" className="sb-btn sb-btn-outline"><Warehouse size={14} /> Gudang & persediaan</Link>}
        />
        {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan produk">{notice.text}</Notice></div> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Produk tercatat" value={summary.product_count} note={`${summary.active_count} aktif`} tone="info" />
          <StatCard label="Tayang di website" value={summary.published_count} note="Produk aktif yang disetujui" tone="success" />
          <StatCard label="Draf produk" value={summary.draft_count} note="Belum aktif untuk penjualan" tone="warning" />
          <StatCard label="Kategori" value={summary.category_count} note="Kategori dengan data produk" tone="neutral" />
        </div>

        {canWrite ? (
          <Card className="mt-5">
            <CardHeader title="Tambah produk" subtitle="Produk baru disimpan sebagai draf privat. Publikasi harus melalui persetujuan pengurus." />
            <form action={createBusinessProduct} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <div><label htmlFor="new-product-sku" className="mb-1 block text-[11px] font-semibold text-ink2">SKU / kode produk</label><input id="new-product-sku" name="sku" required minLength={2} maxLength={80} className="sb-input" placeholder="Mis. KOPI-250" /></div>
              <div className="sm:col-span-2"><label htmlFor="new-product-name" className="mb-1 block text-[11px] font-semibold text-ink2">Nama produk</label><input id="new-product-name" name="product_name" required minLength={2} maxLength={240} className="sb-input" placeholder="Nama produk yang tercatat" /></div>
              <div><label htmlFor="new-product-slug" className="mb-1 block text-[11px] font-semibold text-ink2">Slug publik (opsional)</label><input id="new-product-slug" name="slug" maxLength={180} className="sb-input" placeholder="Dibuat dari nama jika kosong" /></div>
              <div><label htmlFor="new-product-category" className="mb-1 block text-[11px] font-semibold text-ink2">Kategori</label><input id="new-product-category" name="category_label" maxLength={120} className="sb-input" placeholder="Kopi / olahan pangan" /></div>
              <div><label htmlFor="new-product-kind" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis</label><select id="new-product-kind" name="product_kind" className="sb-input"><option value="physical">Barang fisik</option><option value="service">Jasa</option></select></div>
              <div><label htmlFor="new-product-unit" className="mb-1 block text-[11px] font-semibold text-ink2">Satuan / kemasan</label><input id="new-product-unit" name="unit_label" required maxLength={80} className="sb-input" placeholder="250 gram / botol / paket" /></div>
              <div><label htmlFor="new-product-price" className="mb-1 block text-[11px] font-semibold text-ink2">Harga jual (Rp)</label><input id="new-product-price" name="selling_price" type="number" required min="0" step="1" className="sb-input" /></div>
              <div><label htmlFor="new-product-cost" className="mb-1 block text-[11px] font-semibold text-ink2">HPP / estimasi biaya (internal)</label><input id="new-product-cost" name="cost_estimate" type="number" min="0" step="1" className="sb-input" /></div>
              <div><label htmlFor="new-product-producer" className="mb-1 block text-[11px] font-semibold text-ink2">Produsen / pelaku usaha</label><input id="new-product-producer" name="producer_label" maxLength={160} className="sb-input" /></div>
              <div className="flex items-center gap-2 rounded-[9px] border border-line px-3 py-2"><input id="new-product-track" name="track_stock" type="checkbox" defaultChecked className="size-4 accent-primary-700" /><label htmlFor="new-product-track" className="text-[11px] text-ink2">Kelola stok gudang</label></div>
              <div className="sm:col-span-2 xl:col-span-3"><label htmlFor="new-product-description" className="mb-1 block text-[11px] font-semibold text-ink2">Deskripsi produk</label><textarea id="new-product-description" name="description" rows={2} maxLength={5000} className="sb-input !h-auto resize-y py-2" /></div>
              <div className="flex justify-end sm:col-span-2 xl:col-span-3"><button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Simpan draf produk</button></div>
            </form>
          </Card>
        ) : null}

        <Card className="mt-5">
          <CardHeader title="Register produk" subtitle={`${products.length} catatan · HPP hanya untuk akses internal`} />
          {products.length ? (
            <div className="divide-y divide-line">
              {products.map((product) => (
                <article key={product.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9.5px] text-muted2">{product.reference_no} · {product.sku}</span>
                        <Badge tone={product.status === "active" ? "success" : product.status === "archived" ? "neutral" : "warning"}>{product.status === "active" ? "Aktif" : product.status === "archived" ? "Arsip" : product.status === "inactive" ? "Nonaktif" : "Draf"}</Badge>
                        <Badge tone={product.publication_status === "published" ? "success" : "neutral"}>{product.publication_status === "published" ? "Publik" : product.publication_status === "hidden" ? "Disembunyikan" : "Privat"}</Badge>
                      </div>
                      <h3 className="mt-1 text-[13px] font-semibold text-ink">{product.product_name}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        <span>{product.category_label ?? "Tanpa kategori"}</span><span>{product.unit_label}</span><span>{product.producer_label ?? "Produsen belum dicatat"}</span><span>{product.product_kind === "physical" ? "Barang fisik" : "Jasa"}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px]">
                        <span className="font-semibold text-primary-800">Jual {rupiah(product.selling_price)}</span>
                        {canSeeCost ? <span className="text-muted">HPP {rupiah(product.cost_estimate)}</span> : null}
                        {product.track_stock ? <span className="text-muted">Stok {numberLabel(product.total_on_hand)} · dicadangkan {numberLabel(product.total_reserved)}</span> : <span className="text-muted">Tanpa pelacakan stok</span>}
                      </div>
                      {product.description ? <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{product.description}</p> : null}
                      {product.publication_status === "published" ? <Link href={`/produk/${product.slug}`} className="mt-2 inline-block text-[10.5px] font-semibold text-primary-700 underline">Lihat halaman publik</Link> : null}
                    </div>
                  </div>
                  {canWrite && product.status !== "archived" ? (
                    <div className="mt-3 grid gap-3 border-t border-line pt-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <form action={updateBusinessProduct} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <input type="hidden" name="product_id" value={product.id} />
                        <div><label className="mb-1 block text-[10px] text-muted" htmlFor={`category-${product.id}`}>Kategori</label><input id={`category-${product.id}`} name="category_label" defaultValue={product.category_label ?? ""} maxLength={120} className="sb-input !h-8 text-[10px]" /></div>
                        <div><label className="mb-1 block text-[10px] text-muted" htmlFor={`unit-${product.id}`}>Satuan</label><input id={`unit-${product.id}`} name="unit_label" required defaultValue={product.unit_label} maxLength={80} className="sb-input !h-8 text-[10px]" /></div>
                        <div><label className="mb-1 block text-[10px] text-muted" htmlFor={`price-${product.id}`}>Harga jual</label><input id={`price-${product.id}`} name="selling_price" type="number" required min="0" step="1" defaultValue={product.selling_price} className="sb-input !h-8 text-[10px]" /></div>
                        <div><label className="mb-1 block text-[10px] text-muted" htmlFor={`cost-${product.id}`}>HPP / biaya</label><input id={`cost-${product.id}`} name="cost_estimate" type="number" min="0" step="1" defaultValue={product.cost_estimate ?? ""} className="sb-input !h-8 text-[10px]" /></div>
                        <div><label className="mb-1 block text-[10px] text-muted" htmlFor={`producer-${product.id}`}>Produsen</label><input id={`producer-${product.id}`} name="producer_label" defaultValue={product.producer_label ?? ""} maxLength={160} className="sb-input !h-8 text-[10px]" /></div>
                        <div className="sm:col-span-2"><label className="mb-1 block text-[10px] text-muted" htmlFor={`desc-${product.id}`}>Deskripsi</label><input id={`desc-${product.id}`} name="description" defaultValue={product.description ?? ""} maxLength={5000} className="sb-input !h-8 text-[10px]" /></div>
                        <div className="flex items-end"><button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[9.5px]">Simpan perubahan</button></div>
                      </form>
                      <div className="flex flex-wrap items-end gap-2">
                        {product.status === "draft" ? (
                          <form action={updateBusinessProductStatus}>
                            <input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="status" value="active" />
                            <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[9.5px]">Aktifkan</button>
                          </form>
                        ) : product.status === "active" ? (
                          <form action={updateBusinessProductPublication}>
                            <input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="publication_status" value={product.publication_status === "published" ? "hidden" : "published"} />
                            <button type="submit" disabled={!canApprove || Number(product.selling_price) <= 0} className="sb-btn sb-btn-outline !h-8 !px-3 text-[9.5px]">
                              {product.publication_status === "published" ? "Sembunyikan" : canApprove ? "Terbitkan" : "Butuh persetujuan"}
                            </button>
                          </form>
                        ) : (
                          <form action={updateBusinessProductStatus}>
                            <input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="status" value="active" />
                            <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[9.5px]">Aktifkan kembali</button>
                          </form>
                        )}
                        <form action={updateBusinessProductStatus}>
                          <input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="status" value="archived" />
                          <button type="submit" disabled={!canApprove || Number(product.total_on_hand) > 0 || Number(product.total_reserved) > 0} className="sb-btn sb-btn-outline !h-8 !px-3 text-[9.5px]">Arsipkan</button>
                        </form>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10"><EmptyState title="Belum ada produk" body="Daftarkan produk yang benar-benar diproduksi atau dipasarkan oleh anggota. Produk baru akan tetap privat sampai diaktifkan dan disetujui untuk publikasi." /></div>
          )}
        </Card>
        <div className="mt-4"><Notice tone="info" title="Harga dan publikasi">Harga pokok / estimasi biaya hanya terlihat untuk pengelola internal. Produk hanya muncul pada website jika aktif, memiliki harga jual di atas nol, dan publikasinya disetujui pengurus.</Notice></div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Gudang & persediaan"
        description="Kelola lokasi penyimpanan, saldo fisik, stok dicadangkan, dan riwayat mutasi. Setiap perubahan saldo dibuat sebagai mutasi permanen."
        actions={<Link href="/app/bidang/usaha/katalog" className="sb-btn sb-btn-outline"><Package size={14} /> Daftar produk</Link>}
      />
      {notice ? <div className="mb-4"><Notice tone={notice.tone} title="Pembaruan persediaan">{notice.text}</Notice></div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gudang aktif" value={summary.warehouse_count} note="Lokasi yang menerima mutasi" tone="info" />
        <StatCard label="SKU bersaldo" value={summary.sku_with_stock_count} note="Produk dengan stok di atas nol" tone="success" />
        <StatCard label="Saldo fisik" value={numberLabel(summary.total_on_hand)} note="Akumulasi seluruh satuan stok" tone="neutral" />
        <StatCard label="Dicadangkan" value={numberLabel(summary.total_reserved)} note="Tidak dapat dikeluarkan sebagai stok bebas" tone="warning" />
      </div>

      {canWrite ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Tambah gudang" subtitle="Buat lokasi penyimpanan sebelum menerima stok." />
            <form action={createBusinessWarehouse} className="grid gap-3 p-4 sm:grid-cols-2">
              <div><label htmlFor="warehouse-code" className="mb-1 block text-[11px] font-semibold text-ink2">Kode gudang</label><input id="warehouse-code" name="warehouse_code" required minLength={2} maxLength={60} className="sb-input" placeholder="GDG-UTAMA" /></div>
              <div><label htmlFor="warehouse-name" className="mb-1 block text-[11px] font-semibold text-ink2">Nama gudang</label><input id="warehouse-name" name="warehouse_name" required minLength={2} maxLength={180} className="sb-input" /></div>
              <div><label htmlFor="warehouse-location" className="mb-1 block text-[11px] font-semibold text-ink2">Lokasi</label><input id="warehouse-location" name="location_note" maxLength={1000} className="sb-input" /></div>
              <div><label htmlFor="warehouse-responsible" className="mb-1 block text-[11px] font-semibold text-ink2">Penanggung jawab</label><input id="warehouse-responsible" name="responsible_label" maxLength={160} className="sb-input" /></div>
              <div className="flex justify-end sm:col-span-2"><button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Simpan gudang</button></div>
            </form>
          </Card>
          <Card>
            <CardHeader title="Catat mutasi stok" subtitle="Pilih produk dan gudang aktif. Stok tidak dapat dikurangi di bawah jumlah yang dicadangkan." />
            <form action={recordBusinessInventoryMovement} className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="movement-product" className="mb-1 block text-[11px] font-semibold text-ink2">Produk</label><select id="movement-product" name="product_id" required defaultValue="" className="sb-input"><option value="" disabled>Pilih produk</option>{stockProducts.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.product_name} ({product.unit_label})</option>)}</select></div>
              <div><label htmlFor="movement-warehouse" className="mb-1 block text-[11px] font-semibold text-ink2">Gudang</label><select id="movement-warehouse" name="warehouse_id" required defaultValue="" className="sb-input"><option value="" disabled>Pilih gudang</option>{activeWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.warehouse_code} · {warehouse.warehouse_name}</option>)}</select></div>
              <div><label htmlFor="movement-type" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis mutasi</label><select id="movement-type" name="movement_type" className="sb-input"><option value="receipt">Penerimaan</option><option value="adjustment_in">Penyesuaian masuk</option><option value="adjustment_out">Penyesuaian keluar</option><option value="return_in">Retur masuk</option></select></div>
              <div><label htmlFor="movement-quantity" className="mb-1 block text-[11px] font-semibold text-ink2">Jumlah</label><input id="movement-quantity" name="quantity" required type="number" min="0.001" max="1000000000" step="0.001" className="sb-input" /></div>
              <div><label htmlFor="movement-source" className="mb-1 block text-[11px] font-semibold text-ink2">Referensi dokumen</label><input id="movement-source" name="source_reference" maxLength={120} className="sb-input" placeholder="Nota / bukti penerimaan" /></div>
              <div className="sm:col-span-2"><label htmlFor="movement-note" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan</label><textarea id="movement-note" name="note" rows={2} maxLength={3000} className="sb-input !h-auto resize-y py-2" /></div>
              <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={!stockProducts.length || !activeWarehouses.length} className="sb-btn sb-btn-primary"><Boxes size={14} /> Catat mutasi stok</button></div>
            </form>
          </Card>
        </div>
      ) : null}

      <Card className="mt-5">
        <CardHeader title="Daftar gudang" subtitle={`${warehouses.length} lokasi penyimpanan`} />
        {warehouses.length ? (
          <div className="divide-y divide-line">
            {warehouses.map((warehouse) => (
              <article key={warehouse.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9.5px] text-muted2">{warehouse.reference_no} · {warehouse.warehouse_code}</span><Badge tone={warehouse.status === "active" ? "success" : "neutral"}>{warehouse.status === "active" ? "Aktif" : warehouse.status === "inactive" ? "Nonaktif" : "Arsip"}</Badge></div>
                  <div className="mt-1 text-[12.5px] font-semibold text-ink">{warehouse.warehouse_name}</div>
                  <div className="mt-1 text-[10.5px] text-muted">{warehouse.location_note ?? "Lokasi belum dicatat"} · {warehouse.responsible_label ?? "Penanggung jawab belum ditetapkan"} · {warehouse.product_count} SKU bersaldo</div>
                </div>
                {canWrite && warehouse.status !== "archived" ? (
                  <form action={updateBusinessWarehouseStatus} className="flex items-center gap-2">
                    <input type="hidden" name="warehouse_id" value={warehouse.id} />
                    <select name="status" defaultValue={warehouse.status} className="sb-input !h-8 w-[130px] text-[10px]" aria-label={`Status ${warehouse.warehouse_name}`}>
                      <option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="archived">Arsip</option>
                    </select>
                    <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8"><EmptyState title="Belum ada gudang" body="Buat lokasi penyimpanan sebelum mencatat saldo dan pergerakan stok." /></div>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Saldo stok per gudang" subtitle={`${stockRows.length} pasangan produk dan lokasi · saldo fisik dan cadangan dipisahkan`} />
        {stockRows.length ? (
          <div className="divide-y divide-line">
            {stockRows.map((stock) => (
              <article key={`${stock.product_id}-${stock.warehouse_id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-ink">{stock.product_name}</div><div className="mt-1 text-[10px] text-muted">{stock.sku} · {stock.warehouse_name}</div></div>
                <div className="grid grid-cols-3 gap-4 text-right text-[10.5px]">
                  <div><div className="text-muted2">Fisik</div><div className="font-semibold tabular-nums text-ink">{numberLabel(stock.on_hand)} {stock.unit_label}</div></div>
                  <div><div className="text-muted2">Cadangan</div><div className="font-semibold tabular-nums text-muted">{numberLabel(stock.reserved)}</div></div>
                  <div><div className="text-muted2">Tersedia</div><div className="font-semibold tabular-nums text-primary-800">{numberLabel(stock.available)}</div></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8"><EmptyState title="Belum ada saldo stok" body="Saldo akan tercatat ketika penerimaan atau penyesuaian stok pertama dibuat." /></div>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Riwayat mutasi persediaan" subtitle={`${movements.length} mutasi terbaru · catatan tidak dapat diubah atau dihapus`} />
        {movements.length ? (
          <div className="divide-y divide-line">
            {movements.map((movement) => (
              <article key={movement.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9px] text-muted2">{movement.reference_no}</span><Badge tone={movement.movement_type === "adjustment_out" ? "warning" : "success"}>{movementLabel[movement.movement_type]}</Badge></div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{movement.product_name}</div>
                  <div className="mt-1 text-[10px] text-muted">{movement.sku} · {movement.warehouse_name} · {dateLabel(movement.created_at)}</div>
                  {movement.source_reference ? <div className="mt-1 text-[10px] text-muted2">Referensi: {movement.source_reference}</div> : null}
                  {movement.note ? <div className="mt-1 text-[10.5px] text-muted">{movement.note}</div> : null}
                </div>
                <div className="text-right">
                  <div className={Number(movement.on_hand_delta) < 0 ? "text-[13px] font-bold tabular-nums text-ink" : "text-[13px] font-bold tabular-nums text-primary-800"}>
                    {Number(movement.on_hand_delta) > 0 ? "+" : ""}{numberLabel(movement.on_hand_delta)}
                  </div>
                  <div className="mt-1 text-[9.5px] text-muted2">{numberLabel(movement.on_hand_before)} → {numberLabel(movement.on_hand_after)}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8"><EmptyState title="Belum ada mutasi" body="Setiap penerimaan, penyesuaian, dan retur akan membentuk catatan baru yang permanen." /></div>
        )}
      </Card>

      <div className="mt-5"><Notice tone="info" title="Koreksi saldo">Mutasi persediaan bersifat append-only. Kesalahan tidak diperbaiki dengan mengedit atau menghapus riwayat; catat mutasi koreksi sesuai bukti fisik dan berita acara. Stok tidak otomatis mengubah kas, penjualan, atau jurnal keuangan.</Notice></div>
    </div>
  );
}
