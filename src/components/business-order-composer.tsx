"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createBusinessOrder } from "@/app/actions/business-orders";

export interface OrderCustomerOption {
  id: string;
  reference_no: string;
  customer_name: string;
  phone: string | null;
}

export interface OrderProductOption {
  id: string;
  sku: string;
  product_name: string;
  unit_label: string;
  selling_price: string;
  track_stock: boolean;
  product_kind: "physical" | "service";
  publication_status: "private" | "published" | "hidden";
}

export interface OrderWarehouseOption {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
}

interface DraftLine {
  product_id: string;
  quantity: string;
}

export function BusinessOrderComposer({
  customers,
  products,
  warehouses,
  defaultChannel = "internal",
}: {
  customers: OrderCustomerOption[];
  products: OrderProductOption[];
  warehouses: OrderWarehouseOption[];
  defaultChannel?: "internal" | "whatsapp" | "mitra" | "website" | "pos";
}) {
  const [lines, setLines] = useState<DraftLine[]>([{ product_id: "", quantity: "1" }]);
  const selectedProducts = useMemo(
    () => lines.map((line) => products.find((product) => product.id === line.product_id) ?? null),
    [lines, products],
  );
  const requiresWarehouse = selectedProducts.some((product) => product?.track_stock);
  const itemPayload = JSON.stringify(
    lines
      .filter((line) => line.product_id && Number(line.quantity) > 0)
      .map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity) })),
  );

  const addLine = () => {
    if (lines.length < 20) setLines((current) => [...current, { product_id: "", quantity: "1" }]);
  };

  const removeLine = (index: number) => {
    setLines((current) => current.length > 1 ? current.filter((_, lineIndex) => lineIndex !== index) : current);
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };

  const estimatedTotal = lines.reduce((total, line, index) => {
    const product = selectedProducts[index];
    const quantity = Number(line.quantity);
    return product && Number.isFinite(quantity) && quantity > 0
      ? total + Number(product.selling_price) * quantity
      : total;
  }, 0);

  return (
    <form action={createBusinessOrder} className="grid gap-3 p-4">
      <div>
        <label htmlFor="order-customer" className="mb-1 block text-[11px] font-semibold text-ink2">Pelanggan</label>
        <select id="order-customer" name="customer_id" required defaultValue="" className="sb-input">
          <option value="" disabled>Pilih pelanggan</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.customer_name}{customer.phone ? ` · ${customer.phone}` : ""}
            </option>
          ))}
        </select>
        {!customers.length ? <p className="mt-1 text-[10px] text-muted2">Catat pelanggan terlebih dahulu agar dapat dipilih.</p> : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="order-channel" className="mb-1 block text-[11px] font-semibold text-ink2">Kanal pesanan</label>
          {defaultChannel === "pos" ? (
            <>
              <input type="hidden" name="order_channel" value="pos" />
              <div className="flex h-10 items-center rounded-[8px] border border-line bg-paper px-3 text-[11.5px] font-semibold text-ink2">POS · Kasir</div>
            </>
          ) : (
            <select id="order-channel" name="order_channel" defaultValue={defaultChannel} className="sb-input">
              <option value="internal">Internal / langsung</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="mitra">Mitra</option>
              <option value="website">Website</option>
            </select>
          )}
        </div>
        <div>
          <label htmlFor="order-warehouse" className="mb-1 block text-[11px] font-semibold text-ink2">Gudang pemenuhan</label>
          <select id="order-warehouse" name="warehouse_id" required={requiresWarehouse} defaultValue="" className="sb-input">
            <option value="">Pilih jika barang mengelola stok</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.warehouse_code} · {warehouse.warehouse_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-[10px] border border-line">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
          <div>
            <div className="text-[11px] font-semibold text-ink2">Item pesanan</div>
            <div className="text-[9.5px] text-muted2">Harga diambil dari daftar produk aktif saat pesanan dibuat.</div>
          </div>
          <button type="button" onClick={addLine} disabled={lines.length >= 20 || !products.length} className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[9.5px]">
            <Plus size={12} /> Tambah item
          </button>
        </div>
        <div className="divide-y divide-line">
          {lines.map((line, index) => {
            const product = selectedProducts[index];
            const duplicateIds = new Set(lines.filter((_, lineIndex) => lineIndex !== index).map((other) => other.product_id).filter(Boolean));
            const lineTotal = product ? Number(product.selling_price) * Number(line.quantity || 0) : 0;
            return (
              <div key={index} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_104px_126px_32px] sm:items-end">
                <div className="min-w-0">
                  <label htmlFor={`order-product-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Produk</label>
                  <select
                    id={`order-product-${index}`}
                    value={line.product_id}
                    onChange={(event) => updateLine(index, { product_id: event.target.value })}
                    required
                    className="sb-input"
                  >
                    <option value="">Pilih produk</option>
                    {products.filter((candidate) => !duplicateIds.has(candidate.id)).map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.sku} · {candidate.product_name}
                      </option>
                    ))}
                  </select>
                  {product ? <div className="mt-1 text-[9.5px] text-muted2">{product.unit_label} · {product.track_stock ? "Stok gudang" : product.product_kind === "service" ? "Jasa" : "Tanpa pelacakan stok"} · Rp {Number(product.selling_price).toLocaleString("id-ID")}</div> : null}
                </div>
                <div>
                  <label htmlFor={`order-quantity-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Jumlah</label>
                  <input
                    id={`order-quantity-${index}`}
                    type="number"
                    min="0.001"
                    max="1000000"
                    step="0.001"
                    required
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    className="sb-input"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold text-muted">Subtotal baris</div>
                  <div className="flex h-10 items-center justify-end rounded-[8px] border border-line bg-paper px-2 text-[11px] font-semibold tabular-nums text-ink">
                    Rp {Number.isFinite(lineTotal) ? Math.round(lineTotal).toLocaleString("id-ID") : "0"}
                  </div>
                </div>
                <button type="button" onClick={() => removeLine(index)} disabled={lines.length === 1} aria-label="Hapus item" className="inline-flex size-8 items-center justify-center rounded-[8px] border border-line text-muted hover:bg-paper disabled:opacity-40">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-3 py-3">
          <span className="text-[10.5px] text-muted">Subtotal barang · belum termasuk ongkir</span>
          <span className="text-[13px] font-bold tabular-nums text-primary-800">Rp {Math.round(estimatedTotal).toLocaleString("id-ID")}</span>
        </div>
      </div>
      <input type="hidden" name="items_json" value={itemPayload} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="order-delivery-fee" className="mb-1 block text-[11px] font-semibold text-ink2">Biaya kirim (opsional)</label>
          <input id="order-delivery-fee" name="delivery_fee" type="number" min="0" step="1" defaultValue="0" className="sb-input" />
        </div>
        <div>
          <label htmlFor="order-delivery-note" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan pengiriman</label>
          <input id="order-delivery-note" name="delivery_note" maxLength={1000} className="sb-input" placeholder="Alamat / jadwal penyerahan" />
        </div>
      </div>
      <div>
        <label htmlFor="order-customer-note" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan pelanggan</label>
        <textarea id="order-customer-note" name="customer_note" rows={2} maxLength={3000} className="sb-input !h-auto resize-y py-2" />
      </div>
      <div>
        <label htmlFor="order-internal-note" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan internal</label>
        <textarea id="order-internal-note" name="internal_note" rows={2} maxLength={3000} className="sb-input !h-auto resize-y py-2" />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={!customers.length || !products.length || (requiresWarehouse && !warehouses.length)} className="sb-btn sb-btn-primary">
          Simpan draf pesanan
        </button>
      </div>
    </form>
  );
}
