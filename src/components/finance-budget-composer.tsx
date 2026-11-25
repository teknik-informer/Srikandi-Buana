"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  createFinanceBudget,
  updateDraftFinanceBudget,
} from "@/app/actions/finance";

export interface FinanceBudgetAccountOption {
  id: string;
  account_code: string;
  account_name: string;
}

export interface FinanceBudgetDraftLine {
  account_id: string;
  description: string;
  planned_amount: string;
  note: string;
}

export interface FinanceBudgetDraft {
  id: string;
  budget_code: string;
  title: string;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  funding_source: string | null;
  responsible_label: string | null;
  notes: string | null;
  lines: FinanceBudgetDraftLine[];
}

const emptyLine = (): FinanceBudgetDraftLine => ({
  account_id: "",
  description: "",
  planned_amount: "",
  note: "",
});

function currency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function FinanceBudgetComposer({
  accounts,
  initialBudget,
}: {
  accounts: FinanceBudgetAccountOption[];
  initialBudget?: FinanceBudgetDraft;
}) {
  const editing = Boolean(initialBudget);
  const [code, setCode] = useState(initialBudget?.budget_code ?? "");
  const [title, setTitle] = useState(initialBudget?.title ?? "");
  const [fiscalYear, setFiscalYear] = useState(String(initialBudget?.fiscal_year ?? 2026));
  const [periodStart, setPeriodStart] = useState(initialBudget?.period_start ?? "");
  const [periodEnd, setPeriodEnd] = useState(initialBudget?.period_end ?? "");
  const [fundingSource, setFundingSource] = useState(initialBudget?.funding_source ?? "");
  const [responsible, setResponsible] = useState(initialBudget?.responsible_label ?? "");
  const [notes, setNotes] = useState(initialBudget?.notes ?? "");
  const [lines, setLines] = useState<FinanceBudgetDraftLine[]>(
    () => initialBudget?.lines.map((line) => ({ ...line })) ?? [emptyLine()],
  );

  const plannedTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.planned_amount) || 0), 0),
    [lines],
  );

  const linesJson = JSON.stringify(lines.map((line, index) => ({
    line_number: index + 1,
    account_id: line.account_id,
    description: line.description.trim(),
    planned_amount: Number(line.planned_amount) || 0,
    note: line.note.trim() || null,
  })));

  const updateLine = (index: number, patch: Partial<FinanceBudgetDraftLine>) => {
    setLines((current) => current.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line,
    ));
  };

  const addLine = () => {
    if (lines.length < 100) setLines((current) => [...current, emptyLine()]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const valid =
    /^[A-Za-z0-9][A-Za-z0-9._/-]{2,39}$/.test(code.trim()) &&
    title.trim().length >= 3 &&
    Number.isInteger(Number(fiscalYear)) &&
    Number(fiscalYear) >= 2000 && Number(fiscalYear) <= 2100 &&
    Boolean(periodStart && periodEnd && periodStart <= periodEnd) &&
    lines.length > 0 &&
    lines.every((line) =>
      Boolean(line.account_id) &&
      line.description.trim().length >= 2 &&
      Number(line.planned_amount) > 0 &&
      Number.isFinite(Number(line.planned_amount)),
    ) &&
    new Set(lines.map((line) => line.account_id)).size === lines.length;

  const action = editing ? updateDraftFinanceBudget : createFinanceBudget;

  return (
    <form action={action} className="grid gap-4 p-4">
      {initialBudget ? <input type="hidden" name="budget_id" value={initialBudget.id} /> : null}
      <input type="hidden" name="lines_json" value={linesJson} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="budget-code" className="mb-1 block text-[11px] font-semibold text-ink2">Kode anggaran</label>
          <input id="budget-code" name="budget_code" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={40} className="sb-input" placeholder="Mis. RKA-2026-01" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="budget-title" className="mb-1 block text-[11px] font-semibold text-ink2">Nama / tujuan anggaran</label>
          <input id="budget-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={180} className="sb-input" placeholder="Nama kegiatan atau rencana kerja" />
        </div>
        <div>
          <label htmlFor="budget-year" className="mb-1 block text-[11px] font-semibold text-ink2">Tahun anggaran</label>
          <input id="budget-year" name="fiscal_year" type="number" min={2000} max={2100} step={1} value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} required className="sb-input" />
        </div>
        <div>
          <label htmlFor="budget-start" className="mb-1 block text-[11px] font-semibold text-ink2">Mulai periode</label>
          <input id="budget-start" name="period_start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} required className="sb-input" />
        </div>
        <div>
          <label htmlFor="budget-end" className="mb-1 block text-[11px] font-semibold text-ink2">Akhir periode</label>
          <input id="budget-end" name="period_end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} min={periodStart || undefined} required className="sb-input" />
        </div>
        <div>
          <label htmlFor="budget-funding" className="mb-1 block text-[11px] font-semibold text-ink2">Sumber dana</label>
          <input id="budget-funding" name="funding_source" value={fundingSource} onChange={(event) => setFundingSource(event.target.value)} maxLength={160} className="sb-input" placeholder="Iuran, usaha, hibah, swadaya, dll." />
        </div>
        <div>
          <label htmlFor="budget-responsible" className="mb-1 block text-[11px] font-semibold text-ink2">Penanggung jawab</label>
          <input id="budget-responsible" name="responsible_label" value={responsible} onChange={(event) => setResponsible(event.target.value)} maxLength={160} className="sb-input" placeholder="Bidang / pelaksana" />
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <label htmlFor="budget-notes" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan perencanaan</label>
          <textarea id="budget-notes" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={2} className="sb-input !h-auto min-h-[64px] py-2" placeholder="Ruang lingkup, asumsi, atau catatan lain (opsional)" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-3 py-2.5">
          <div>
            <div className="text-[11.5px] font-semibold text-ink">Rincian rencana belanja</div>
            <div className="text-[10px] text-muted">Setiap akun beban hanya boleh dicantumkan satu kali.</div>
          </div>
          <button type="button" onClick={addLine} disabled={lines.length >= 100} className="sb-btn sb-btn-outline !h-8 !px-2.5 text-[10px]">
            <Plus size={13} /> Tambah rincian
          </button>
        </div>
        {accounts.length ? (
          <div className="divide-y divide-line">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(120px,0.75fr)_minmax(0,1fr)_32px] sm:items-end">
                <div className="min-w-0">
                  <label htmlFor={`budget-account-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Akun beban</label>
                  <select id={`budget-account-${index}`} value={line.account_id} onChange={(event) => updateLine(index, { account_id: event.target.value })} required className="sb-input">
                    <option value="">Pilih akun biaya</option>
                    {accounts.filter((account) => account.id === line.account_id || !lines.some((other, otherIndex) => otherIndex !== index && other.account_id === account.id)).map((account) => (
                      <option key={account.id} value={account.id}>{account.account_code} · {account.account_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`budget-line-description-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Uraian rencana</label>
                  <input id={`budget-line-description-${index}`} value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} minLength={2} maxLength={180} required className="sb-input" placeholder="Keperluan / kegiatan" />
                </div>
                <div>
                  <label htmlFor={`budget-line-amount-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Plafon (Rp)</label>
                  <input id={`budget-line-amount-${index}`} type="number" min="0.01" step="0.01" value={line.planned_amount} onChange={(event) => updateLine(index, { planned_amount: event.target.value })} required className="sb-input text-right tabular-nums" placeholder="0" />
                </div>
                <div>
                  <label htmlFor={`budget-line-note-${index}`} className="mb-1 block text-[10px] font-semibold text-muted">Catatan (opsional)</label>
                  <input id={`budget-line-note-${index}`} value={line.note} onChange={(event) => updateLine(index, { note: event.target.value })} maxLength={500} className="sb-input" placeholder="Spesifikasi" />
                </div>
                <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 1} className="sb-btn sb-btn-ghost !h-9 !w-8 !p-0" aria-label={`Hapus rincian ${index + 1}`} title="Hapus rincian">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-[11px] text-muted">Belum ada akun beban aktif. Aktifkan akun biaya pada Bagan Akun sebelum menyusun anggaran.</div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-3 py-3">
          <div className="text-[10.5px] text-muted">Total rencana</div>
          <div className="text-[14px] font-semibold tabular-nums text-ink">{currency(plannedTotal)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[10.5px] leading-relaxed text-muted">
          {editing
            ? "Perubahan hanya dapat disimpan selama anggaran masih berstatus draf."
            : "Anggaran baru tersimpan sebagai draf. Pengajuan untuk persetujuan dilakukan setelah rancangan diperiksa."}
        </p>
        <button type="submit" disabled={!valid || !accounts.length} className="sb-btn sb-btn-primary !h-9 text-[11px]">
          <Save size={13} /> {editing ? "Simpan perubahan draf" : "Simpan draf anggaran"}
        </button>
      </div>
    </form>
  );
}
