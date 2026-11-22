"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, Wifi, WifiOff, CheckCircle2, ReceiptText, X, RotateCcw } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { Badge, Notice } from "@/components/ui";
import { useStore } from "@/lib/store";

interface ProductLite {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  stock: number;
}

export function PosTerminal() {
  const { state, exec, actor } = useStore();
  const products: ProductLite[] = state.products
    .filter((p) => p.published)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, unit: p.unit, category: p.category, stock: p.stock }));
  const [cart, setCart] = useState<Record<string, number>>({});
  const [online, setOnline] = useState(true);
  const [paid, setPaid] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<{
    number: string;
    total: number;
    paid: number;
    change: number;
    journal: string;
    items: { name: string; qty: number; price: number }[];
  } | null>(null);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const [cat, setCat] = useState<string>("Semua");

  const visible = cat === "Semua" ? products : products.filter((p) => p.category === cat);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const subtotal = lines.reduce((s, [id, q]) => {
    const p = products.find((x) => x.id === id)!;
    return s + p.price * q;
  }, 0);
  const discount = paid !== null && paid >= subtotal ? 0 : 0;
  const total = subtotal - discount;
  const change = paid !== null ? paid - total : 0;

  function add(id: string) {
    const p = products.find((x) => x.id === id)!;
    setCart((c) => {
      const next = (c[id] ?? 0) + 1;
      return next > p.stock ? c : { ...c, [id]: next };
    });
    setReceipt(null);
  }
  function sub(id: string) {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) - 1);
      const copy = { ...c };
      if (next === 0) delete copy[id]; else copy[id] = next;
      return copy;
    });
    setReceipt(null);
  }

  function checkout() {
    if (!lines.length || paid === null || paid < total) return;
    const receiptNo = `POS-2026-11-22-${String(state.seq + 1).slice(-3)}`;
    const r = exec({
      type: "pos.sale",
      items: lines.map(([id, qty]) => ({ id, qty })),
      paid,
      receiptNo,
      actor,
    });
    if (!r.ok) return;
    setReceipt({
      number: receiptNo,
      total,
      paid,
      change,
      journal: r.detail ?? "—",
      items: lines.map(([id, qty]) => {
        const p = products.find((x) => x.id === id)!;
        return { name: p.name, qty, price: p.price };
      }),
    });
    setCart({});
    setPaid(null);
  }

  return (
    <div className="pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="sb-label">POS · Penjualan lapangan</div>
          <h1 className="font-display text-[24px] font-semibold text-ink">Kasir</h1>
          <p className="text-[12px] text-muted">Touch-first, minim langkah. Dampak akuntansi via posting service.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnline((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${online ? "border-[#cfe3cd] bg-[var(--sb-success-bg)] text-[var(--sb-success)]" : "border-[#f0dcae] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]"}`}
            aria-pressed={online}
          >
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? "Tersambung" : "Mode offline (demo)"}
          </button>
          <Badge tone="neutral">Demo — tidak ada pembayaran nyata</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* product grid */}
        <div>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {["Semua", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${cat === c ? "border-primary-600 bg-primary-600 text-white" : "border-line bg-white text-ink2 hover:border-primary-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {visible.map((p) => {
              const out = p.stock === 0;
              const inCart = cart[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p.id)}
                  disabled={out}
                  className={`relative rounded-[12px] border bg-white p-3 text-left transition ${
                    out ? "border-line opacity-45" : "border-line hover:border-primary-400 hover:shadow-md active:scale-[0.99]"
                  }`}
                >
                  {inCart > 0 && (
                    <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10.5px] font-bold text-white">
                      {inCart}
                    </span>
                  )}
                  <div className="text-[12.5px] font-semibold leading-snug text-ink">{p.name}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{p.unit}</div>
                  <div className="mt-2 text-[13px] font-bold text-primary-800">{formatIDR(p.price)}</div>
                  <div className="mt-0.5 text-[10px] text-muted2">{out ? "Stok habis" : `Sisa ${p.stock}`}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* cart */}
        <div className="lg:sticky lg:top-[74px] lg:h-fit">
          <div className="sb-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ink"><ReceiptText size={15} /> Keranjang</div>
              <span className="text-[11px] text-muted">{lines.length} item</span>
            </div>
            <ul className="max-h-[38vh] divide-y divide-line overflow-y-auto">
              {lines.map(([id, qty]) => {
                const p = products.find((x) => x.id === id)!;
                return (
                  <li key={id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-ink">{p.name}</div>
                      <div className="text-[10.5px] text-muted2">{formatIDR(p.price)} × {qty}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => sub(id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink2 hover:border-primary-300" aria-label={`Kurangi ${p.name}`}><Minus size={12} /></button>
                      <span className="w-6 text-center text-[12px] font-semibold tabular-nums">{qty}</span>
                      <button type="button" onClick={() => add(id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink2 hover:border-primary-300" aria-label={`Tambah ${p.name}`}><Plus size={12} /></button>
                      <button type="button" onClick={() => { setCart((c) => { const cp = { ...c }; delete cp[id]; return cp; }); }} className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-[var(--sb-danger)] hover:bg-[var(--sb-danger-bg)]" aria-label={`Hapus ${p.name}`}><Trash2 size={12} /></button>
                    </div>
                  </li>
                );
              })}
              {lines.length === 0 && (
                <li className="px-4 py-8 text-center text-[12px] text-muted">Keranjang kosong. Ketuk produk untuk menambahkan.</li>
              )}
            </ul>

            <div className="border-t border-line px-4 py-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold text-ink">{formatIDR(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[16px]">
                <span className="font-bold text-ink">Total</span>
                <span className="font-display font-bold text-primary-800">{formatIDR(total)}</span>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold text-ink2">Uang diterima</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(subtotal > 0
                    ? [subtotal, Math.ceil(subtotal / 10_000) * 10_000, Math.ceil(subtotal / 50_000) * 50_000]
                    : [20_000, 50_000, 100_000]
                  ).map((amount, i) => (
                    <button key={i} type="button" onClick={() => setPaid(amount)} className={`rounded-md border px-1 py-1.5 text-[10.5px] font-semibold ${paid === amount ? "border-primary-600 bg-primary-50 text-primary-800" : "border-line text-ink2 hover:border-primary-300"}`}>
                      {formatIDR(amount)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={paid ?? ""}
                  onChange={(e) => setPaid(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Atau ketik nominal"
                  className="sb-input mt-1.5 !py-2 text-[12px]"
                  aria-label="Uang diterima"
                />
                {paid !== null && paid >= total && total > 0 && (
                  <div className="mt-1.5 flex justify-between text-[11.5px]">
                    <span className="text-muted">Kembalian</span>
                    <span className="font-semibold text-[var(--sb-success)]">{formatIDR(change)}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={checkout}
                disabled={!lines.length || paid === null || paid < total}
                title={
                  !lines.length
                    ? "Nonaktif — keranjang masih kosong."
                    : paid === null
                      ? "Nonaktif — isi uang diterima lebih dulu."
                      : paid < total
                        ? `Nonaktif — uang kurang ${formatIDR(total - paid)}.`
                        : "Posting transaksi ke jurnal lewat posting service."
                }
                className="sb-btn sb-btn-primary mt-3 w-full !py-3 text-[14px]"
              >
                Bayar &amp; posting
              </button>
              <p className="mt-1.5 text-center text-[10px] text-muted2">
                {!lines.length
                  ? "Nonaktif — keranjang masih kosong."
                  : paid === null
                    ? "Nonaktif — isi uang diterima lebih dulu."
                    : paid < total
                      ? `Nonaktif — uang diterima kurang ${formatIDR(total - paid)}.`
                      : "Tanpa akses ke jurnal langsung — Finance posting service yang mencatat."}
              </p>
            </div>
          </div>

          {receipt && (
            <div className="sb-card mt-3 border-primary-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--sb-success)]">
                  <CheckCircle2 size={16} /> Transaksi demo berhasil
                </div>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  aria-label="Tutup struk"
                  className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface2"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-2 rounded-sb-sm border border-dashed border-line bg-paper px-3 py-2.5">
                <div className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Struk demo</div>
                <div className="mt-1 text-center font-mono text-[10.5px] text-muted2">{receipt.number}</div>
                <ul className="mt-2 space-y-1 border-t border-line pt-2 text-[11.5px]">
                  {receipt.items.map((it) => (
                    <li key={it.name} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate text-ink2">{it.qty}× {it.name}</span>
                      <span className="shrink-0 tabular-nums text-ink2">{formatIDR(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-2 space-y-1 border-t border-line pt-2 text-[11.5px]">
                  <div className="flex justify-between"><dt className="font-semibold text-ink">Total</dt><dd className="font-semibold tabular-nums text-ink">{formatIDR(receipt.total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Diterima</dt><dd className="tabular-nums text-ink2">{formatIDR(receipt.paid)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Kembalian</dt><dd className="tabular-nums text-ink2">{formatIDR(receipt.change)}</dd></div>
                </dl>
              </div>
              <dl className="mt-2 space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Jurnal diposting</dt>
                  <dd className="font-mono font-semibold text-[var(--sb-success)]">{receipt.journal}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => { setReceipt(null); setCart({}); setPaid(null); }}
                className="sb-btn sb-btn-outline mt-3 w-full !py-2 text-[12px]"
              >
                <RotateCcw size={13} /> Transaksi baru
              </button>
              <div className="mt-2">
                <Notice tone="success">
                  Stok sudah berkurang dan jurnal {receipt.journal} masuk ke buku besar. Buka Keuangan → Jurnal
                  untuk melihatnya; surplus di dasbor Pengurus ikut berubah.
                </Notice>
              </div>
              <a href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline mt-2 w-full !py-2 text-[12px]">
                Lihat jurnal di Keuangan
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
