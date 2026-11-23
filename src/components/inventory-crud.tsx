"use client";

import { useStore } from "@/lib/store";
import { DataTable, rupiah, type Column, type FormField } from "@/components/data-table";
import { Badge } from "@/components/ui";
import type { InventoryItem } from "@/data/types";
import { formatIDR } from "@/lib/format";

/**
 * Barang & persediaan — the working CRUD screen of the Usaha app.
 * Every verb goes through the store reducer, so the audit trail records who
 * changed what and the change is visible in the other apps immediately.
 */
export function InventoryCrud() {
  const { state, exec, actor } = useStore();

  const columns: Column<InventoryItem>[] = [
    { key: "id", label: "Kode", width: "104px", render: (r) => <span className="font-mono text-[11.5px] text-muted">{r.id}</span> },
    { key: "name", label: "Barang", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "category", label: "Kategori" },
    { key: "stock", label: "Stok", numeric: true, render: (r) => (
      <span className={r.stock <= r.minStock ? "font-semibold text-[var(--sb-danger)]" : "font-semibold text-ink"}>
        {r.stock} <span className="font-normal text-muted2">{r.unit}</span>
      </span>
    ) },
    { key: "minStock", label: "Minimum", numeric: true },
    { key: "costPrice", label: "Harga pokok", numeric: true, render: (r) => formatIDR(r.costPrice) },
    { key: "sellPrice", label: "Harga jual", numeric: true, render: (r) => (r.sellPrice ? formatIDR(r.sellPrice) : <span className="text-muted2">—</span>) },
    { key: "location", label: "Lokasi" },
    { key: "updatedAt", label: "Diperbarui", render: (r) => <span className="text-muted">{r.updatedAt}</span> },
    { key: "status", label: "Status", render: (r) =>
      r.stock <= r.minStock
        ? <Badge tone="danger">Perlu restock</Badge>
        : r.stock <= r.minStock * 1.5
          ? <Badge tone="warning">Menipis</Badge>
          : <Badge tone="success">Aman</Badge> },
  ];

  const fields: FormField<InventoryItem>[] = [
    { key: "id", label: "Kode barang", type: "text", placeholder: "otomatis bila kosong", hint: "Kode dipakai lintas aplikasi; tidak dapat diubah setelah tersimpan." },
    { key: "name", label: "Nama barang", type: "text", required: true },
    { key: "category", label: "Kategori", type: "select", required: true, options: [
      { value: "Kopi", label: "Kopi" },
      { value: "Madu", label: "Madu" },
      { value: "Beras", label: "Beras" },
      { value: "Olahan Pangan", label: "Olahan Pangan" },
      { value: "Kemasan", label: "Kemasan" },
    ] },
    { key: "unit", label: "Satuan", type: "text", required: true, placeholder: "bungkus / botol / pak" },
    { key: "stock", label: "Stok gudang", type: "number", required: true, min: 0 },
    { key: "minStock", label: "Stok minimum", type: "number", required: true, min: 0, hint: "Ambang peringatan restock." },
    { key: "costPrice", label: "Harga pokok", type: "money", required: true, min: 0 },
    { key: "sellPrice", label: "Harga jual", type: "money", min: 0, hint: "0 untuk barang yang tidak dijual (kemasan)." },
    { key: "location", label: "Lokasi simpan", type: "text" },
    { key: "supplier", label: "Pemasok", type: "text" },
    { key: "updatedAt", label: "Diperbarui", hidden: true },
  ];

  const validate = (d: InventoryItem): string | null => {
    if (!d.name?.trim()) return "Nama barang wajib diisi.";
    if (!d.category) return "Pilih kategori barang.";
    if (!d.unit?.trim()) return "Satuan wajib diisi (mis. bungkus).";
    if (!Number.isFinite(d.stock) || d.stock < 0) return "Stok harus angka nol atau lebih.";
    if (!Number.isFinite(d.minStock) || d.minStock < 0) return "Stok minimum harus angka nol atau lebih.";
    if (!Number.isFinite(d.costPrice) || d.costPrice < 0) return "Harga pokok harus angka nol atau lebih.";
    if (Number.isFinite(d.sellPrice) && d.sellPrice > 0 && d.sellPrice < d.costPrice)
      return `Harga jual (${rupiah(d.sellPrice)}) lebih rendah dari harga pokok (${rupiah(d.costPrice)}) — perbaiki agar margin tidak negatif.`;
    const dup = state.inventories.some((i) => i.name.trim().toLowerCase() === d.name.trim().toLowerCase() && i.id !== d.id);
    if (dup) return "Barang dengan nama ini sudah ada. Ubah baris yang ada alih-alih menambah duplikat.";
    return null;
  };

  return (
    <DataTable<InventoryItem>
      rows={state.inventories}
      columns={columns}
      fields={fields}
      getId={(r) => r.id}
      noun="barang"
      makeEmpty={() => ({
        id: "", name: "", category: "", unit: "", stock: 0, minStock: 0,
        costPrice: 0, sellPrice: 0, location: "", supplier: "", updatedAt: "",
      })}
      validate={validate}
      initialSort="id"
      onCreate={async (draft) => {
        const r = exec({
          type: "inventory.create",
          item: {
            id: draft.id?.trim() || undefined,
            name: draft.name.trim(), category: draft.category, unit: draft.unit.trim(),
            stock: draft.stock, minStock: draft.minStock, costPrice: draft.costPrice,
            sellPrice: draft.sellPrice, location: draft.location, supplier: draft.supplier,
          },
          actor,
        });
        return r.ok;
      }}
      onUpdate={async (row, draft) => {
        const r = exec({
          type: "inventory.update",
          id: row.id,
          patch: {
            name: draft.name.trim(), category: draft.category, unit: draft.unit.trim(),
            stock: draft.stock, minStock: draft.minStock, costPrice: draft.costPrice,
            sellPrice: draft.sellPrice, location: draft.location, supplier: draft.supplier,
          },
          actor,
        });
        return r.ok;
      }}
      onDelete={async (row) => {
        const r = exec({ type: "inventory.delete", id: row.id, actor });
        return r.ok;
      }}
      detail={(r) => (
        <div className="rounded-sb-sm border border-line bg-paper px-3 py-2 text-[11.5px] leading-relaxed text-muted">
          Nilai persediaan baris ini: <strong className="text-ink">{rupiah(r.stock * r.costPrice)}</strong>.
          {" "}Margin kotor per unit:{" "}
          <strong className="text-ink">{r.sellPrice ? rupiah(r.sellPrice - r.costPrice) : "—"}</strong>.
          {" "}Barang di bawah stok minimum ditandai <em>Perlu restock</em>.
        </div>
      )}
    />
  );
}
