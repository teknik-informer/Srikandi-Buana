"use client";

import { CreditCard, Receipt } from "lucide-react";
import { recordBusinessOrderPayment } from "@/app/actions/business-orders";
import { formatIDR } from "@/lib/format";

export interface BusinessPaymentRegisterOption {
  id: string;
  account_kind: "cash" | "bank" | "e_wallet";
  display_name: string;
  institution_name: string | null;
}

const kindLabel: Record<BusinessPaymentRegisterOption["account_kind"], string> = {
  cash: "Tunai",
  bank: "Transfer bank",
  e_wallet: "Dompet digital",
};

export function BusinessOrderPaymentForm({
  orderId,
  remaining,
  idempotencyKey,
  cashAccounts,
}: {
  orderId: string;
  remaining: number;
  idempotencyKey: string;
  cashAccounts: BusinessPaymentRegisterOption[];
}) {
  if (remaining <= 0) {
    return (
      <div className="rounded-lg border border-line bg-paper px-3 py-2 text-[10.5px] text-muted">
        Nilai pesanan sudah tertutup oleh kuitansi penerimaan yang tercatat.
      </div>
    );
  }

  if (!cashAccounts.length) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-muted">
        Belum ada register kas, bank, atau dompet digital berstatus aktif dan ber-IDR. Bendahara perlu menyiapkan register sebelum penerimaan dicatat.
      </div>
    );
  }

  return (
    <details className="mt-3 rounded-lg border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[10.5px] font-semibold text-ink2">
        <span className="inline-flex items-center gap-2"><Receipt size={13} /> Catat penerimaan pembayaran</span>
        <span className="tabular-nums text-muted">Sisa {formatIDR(remaining)}</span>
      </summary>
      <form action={recordBusinessOrderPayment} className="grid gap-2 border-t border-line bg-paper p-3 sm:grid-cols-2">
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <div className="sm:col-span-2">
          <label htmlFor={`payment-register-${orderId}`} className="mb-1 block text-[10px] font-semibold text-muted">Register penerimaan</label>
          <select id={`payment-register-${orderId}`} name="cash_account_id" required defaultValue="" className="sb-input !h-9 text-[10.5px]">
            <option value="" disabled>Pilih kas / bank / dompet digital</option>
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {kindLabel[account.account_kind]} · {account.display_name}
                {account.institution_name ? ` · ${account.institution_name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`payment-amount-${orderId}`} className="mb-1 block text-[10px] font-semibold text-muted">Jumlah diterima (Rp)</label>
          <input
            id={`payment-amount-${orderId}`}
            name="amount"
            type="number"
            min="0.01"
            max={remaining.toFixed(2)}
            step="0.01"
            required
            className="sb-input !h-9 text-right tabular-nums"
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor={`payment-reference-${orderId}`} className="mb-1 block text-[10px] font-semibold text-muted">Referensi transfer / bukti (opsional)</label>
          <input id={`payment-reference-${orderId}`} name="payment_reference" maxLength={160} className="sb-input !h-9 text-[10.5px]" placeholder="Nomor referensi" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`payment-note-${orderId}`} className="mb-1 block text-[10px] font-semibold text-muted">Catatan penerimaan (opsional)</label>
          <input id={`payment-note-${orderId}`} name="note" maxLength={1000} className="sb-input !h-9 text-[10.5px]" placeholder="Keterangan singkat" />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-xl text-[9.5px] leading-relaxed text-muted2">
            Kuitansi ini mencatat uang yang diterima. Saldo buku besar belum berubah sampai Bendahara menautkan jurnal penjualan yang sudah terposting.
          </p>
          <button type="submit" className="sb-btn sb-btn-primary !h-9 !px-3 text-[10.5px]">
            <CreditCard size={13} /> Simpan kuitansi
          </button>
        </div>
      </form>
    </details>
  );
}
