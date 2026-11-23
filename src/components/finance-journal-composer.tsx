"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  createFinanceJournalDraft,
  updateDraftFinanceJournal,
} from "@/app/actions/finance";

export interface FinanceAccountOption {
  id: string;
  account_code: string;
  account_name: string;
}

export interface FinanceJournalDraftLine {
  account_id: string;
  debit: string;
  credit: string;
  memo: string | null;
}

export interface FinanceJournalDraft {
  id: string;
  journal_date: string;
  description: string;
  source_type: string;
  source_reference: string | null;
  lines: FinanceJournalDraftLine[];
}

interface DraftLine {
  account_id: string;
  debit: string;
  credit: string;
  memo: string;
}

const emptyLine = (): DraftLine => ({
  account_id: "",
  debit: "",
  credit: "",
  memo: "",
});

function currency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function FinanceJournalComposer({
  accounts,
  initialJournal,
}: {
  accounts: FinanceAccountOption[];
  initialJournal?: FinanceJournalDraft;
}) {
  const [lines, setLines] = useState<DraftLine[]>(() =>
    initialJournal?.lines.map((line) => ({
      account_id: line.account_id,
      debit: Number(line.debit) > 0 ? line.debit : "",
      credit: Number(line.credit) > 0 ? line.credit : "",
      memo: line.memo ?? "",
    })) ?? [emptyLine(), emptyLine()],
  );
  const [description, setDescription] = useState(initialJournal?.description ?? "");
  const [journalDate, setJournalDate] = useState(initialJournal?.journal_date ?? "");
  const [sourceType, setSourceType] = useState(initialJournal?.source_type ?? "manual");
  const [sourceReference, setSourceReference] = useState(initialJournal?.source_reference ?? "");
  const editing = Boolean(initialJournal);
  const formAction = editing ? updateDraftFinanceJournal : createFinanceJournalDraft;

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return {
      debit,
      credit,
      difference: debit - credit,
      balanced: Math.round(debit * 100) === Math.round(credit * 100) && debit > 0,
    };
  }, [lines]);

  const validLines = useMemo(() => lines.every((line) => {
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    return Boolean(line.account_id) &&
      ((debit > 0 && credit === 0) || (credit > 0 && debit === 0)) &&
      (line.memo?.length ?? 0) <= 500;
  }), [lines]);

  const payload = JSON.stringify(lines.map((line, index) => ({
    line_number: index + 1,
    account_id: line.account_id,
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0,
    memo: line.memo.trim() || null,
  })));

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line,
    ));
  };

  const addLine = () => {
    if (lines.length < 100) setLines((current) => [...current, emptyLine()]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  if (!accounts.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-paper p-4 text-[11.5px] text-muted">
        Belum ada akun aktif. Bagan akun harus ditinjau dan diaktifkan terlebih dahulu sebelum
        jurnal dapat dibuat. <a href="/app/keuangan/bagan-akun" className="font-semibold text-primary-700 hover:underline">Buka bagan akun</a>.
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 p-4">
      {initialJournal ? <input type="hidden" name="journal_id" value={initialJournal.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="journal-date" className="mb-1 block text-[11px] font-semibold text-ink2">Tanggal jurnal</label>
          <input
            id="journal-date"
            name="journal_date"
            type="date"
            required
            value={journalDate}
            onChange={(event) => setJournalDate(event.target.value)}
            className="sb-input"
          />
        </div>
        <div>
          <label htmlFor="journal-source" className="mb-1 block text-[11px] font-semibold text-ink2">Sumber pencatatan</label>
          <select id="journal-source" name="source_type" value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="sb-input">
            <option value="manual">Jurnal umum</option>
            <option value="cash">Kas</option>
            <option value="bank">Bank</option>
            <option value="contribution">Kontribusi</option>
            <option value="grant">Hibah / dana program</option>
            <option value="purchase">Pengadaan</option>
            <option value="sale">Penjualan</option>
            <option value="adjustment">Penyesuaian</option>
            <option value="reversal">Jurnal pembalik</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="journal-description" className="mb-1 block text-[11px] font-semibold text-ink2">Uraian transaksi</label>
        <input
          id="journal-description"
          name="description"
          required
          minLength={3}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="sb-input"
          placeholder="Jelaskan transaksi sesuai bukti"
        />
      </div>
      <div>
        <label htmlFor="journal-reference" className="mb-1 block text-[11px] font-semibold text-ink2">Nomor bukti / referensi (opsional)</label>
        <input
          id="journal-reference"
          name="source_reference"
          maxLength={160}
          value={sourceReference}
          onChange={(event) => setSourceReference(event.target.value)}
          className="sb-input"
          placeholder="Nomor kuitansi, rekening koran, atau bukti"
        />
      </div>

      <input type="hidden" name="lines_json" value={payload} />

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-3 py-2.5">
          <div>
            <div className="text-[11.5px] font-semibold text-ink">Baris jurnal</div>
            <div className="text-[10px] text-muted">Setiap baris hanya boleh memiliki nilai debit atau kredit.</div>
          </div>
          <button type="button" onClick={addLine} disabled={lines.length >= 100} className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]">
            <Plus size={13} /> Tambah baris
          </button>
        </div>
        <div className="divide-y divide-line">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(100px,0.65fr)_minmax(100px,0.65fr)_minmax(0,1fr)_32px] sm:items-end">
              <div className="min-w-0">
                <label htmlFor={`journal-account-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Akun</label>
                <select
                  id={`journal-account-${index}`}
                  required
                  value={line.account_id}
                  onChange={(event) => updateLine(index, { account_id: event.target.value })}
                  className="sb-input"
                >
                  <option value="">Pilih akun aktif</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.account_code} · {account.account_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`journal-debit-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Debit (Rp)</label>
                <input
                  id={`journal-debit-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.debit}
                  onChange={(event) => updateLine(index, { debit: event.target.value, credit: event.target.value ? "0" : line.credit })}
                  className="sb-input text-right tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor={`journal-credit-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Kredit (Rp)</label>
                <input
                  id={`journal-credit-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.credit}
                  onChange={(event) => updateLine(index, { credit: event.target.value, debit: event.target.value ? "0" : line.debit })}
                  className="sb-input text-right tabular-nums"
                  placeholder="0"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor={`journal-memo-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Keterangan baris</label>
                <input
                  id={`journal-memo-${index}`}
                  value={line.memo}
                  onChange={(event) => updateLine(index, { memo: event.target.value })}
                  maxLength={500}
                  className="sb-input"
                  placeholder="Opsional"
                />
              </div>
              <button
                type="button"
                onClick={() => removeLine(index)}
                disabled={lines.length <= 2}
                className="sb-btn sb-btn-ghost !h-9 !w-8 !p-0"
                aria-label={`Hapus baris ${index + 1}`}
                title="Hapus baris"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t border-line bg-paper p-3 sm:grid-cols-3">
          <div><div className="text-[10px] text-muted">Total debit</div><div className="text-[13px] font-semibold tabular-nums text-ink">{currency(totals.debit)}</div></div>
          <div><div className="text-[10px] text-muted">Total kredit</div><div className="text-[13px] font-semibold tabular-nums text-ink">{currency(totals.credit)}</div></div>
          <div>
            <div className="text-[10px] text-muted">Selisih debit-kredit</div>
            <div className={`text-[13px] font-semibold tabular-nums ${totals.balanced ? "text-primary-800" : "text-amber-700"}`}>{currency(totals.difference)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[10.5px] leading-relaxed text-muted">
          {editing
            ? "Perubahan akan mengganti seluruh baris jurnal draf ini dalam satu transaksi."
            : "Simpan sebagai draf terlebih dahulu. Jurnal hanya dapat diajukan untuk pemeriksaan bila total debit sama dengan total kredit dan semua akun masih aktif."}
        </p>
        <button
          type="submit"
          disabled={!journalDate || description.trim().length < 3 || !validLines}
          className="sb-btn sb-btn-primary !h-9 text-[11px]"
        >
          <Save size={13} /> {editing ? "Simpan perubahan draf" : "Simpan jurnal draf"}
        </button>
      </div>
    </form>
  );
}
