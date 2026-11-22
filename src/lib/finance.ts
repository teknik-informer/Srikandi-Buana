/**
 * NATIVE FINANCE ENGINE (demo-grade) — derived, never hand-typed balances.
 * Mirrors the blueprint invariants (§15.5.2 / §16.6):
 *  - every posted journal must balance to zero;
 *  - posted journals are immutable (corrections = reversal);
 *  - reports derive from posted lines only;
 *  - idempotency keys are unique.
 */

import { JOURNALS, BUDGETS } from "@/data/finance";
import { ACCOUNT_BY_CODE, COA } from "@/data/coa";
import type { JournalEntry, JournalLine } from "@/data/types";

export interface AccountBalance {
  code: string;
  name: string;
  type: string;
  normal: "debit" | "kredit";
  debit: number;
  credit: number;
  balance: number;
}

export function journalTotals(j: JournalEntry): { debit: number; credit: number; balanced: boolean } {
  const debit = j.lines.reduce((s, l) => s + l.debit, 0);
  const credit = j.lines.reduce((s, l) => s + l.credit, 0);
  return { debit, credit, balanced: debit === credit && debit > 0 };
}

export function postedJournals(): JournalEntry[] {
  return JOURNALS.filter((j) => j.status === "diposting");
}

export function computeBalances(journals: JournalEntry[] = postedJournals()): AccountBalance[] {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const j of journals) {
    for (const l of j.lines) {
      const cur = map.get(l.accountCode) ?? { debit: 0, credit: 0 };
      cur.debit += l.debit;
      cur.credit += l.credit;
      map.set(l.accountCode, cur);
    }
  }
  return COA.map((a) => {
    const v = map.get(a.code) ?? { debit: 0, credit: 0 };
    const balance = a.normal === "debit" ? v.debit - v.credit : v.credit - v.debit;
    return { code: a.code, name: a.name, type: a.type, normal: a.normal, debit: v.debit, credit: v.credit, balance };
  });
}

export interface TrialBalanceRow extends AccountBalance {
  debitCol: number;
  creditCol: number;
}

export function trialBalance(): { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean } {
  const rows = computeBalances()
    .filter((r) => r.debit !== 0 || r.credit !== 0)
    .map((r) => {
      const net = r.debit - r.credit;
      return {
        ...r,
        debitCol: net > 0 ? net : 0,
        creditCol: net < 0 ? -net : 0,
      };
    });
  const totalDebit = rows.reduce((s, r) => s + r.debitCol, 0);
  const totalCredit = rows.reduce((s, r) => s + r.creditCol, 0);
  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

export interface IncomeStatement {
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpense: number;
  surplus: number;
}

export function incomeStatement(): IncomeStatement {
  const balances = computeBalances();
  const revenue = balances.filter((b) => b.type === "pendapatan" && b.balance !== 0);
  const expenses = balances.filter((b) => b.type === "beban" && b.balance !== 0);
  const totalRevenue = revenue.reduce((s, b) => s + b.balance, 0);
  const totalExpense = expenses.reduce((s, b) => s + b.balance, 0);
  return { revenue, expenses, totalRevenue, totalExpense, surplus: totalRevenue - totalExpense };
}

export interface CashAccountSummary {
  code: string;
  name: string;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
}

export function cashPosition(): { accounts: CashAccountSummary[]; totalClosing: number } {
  const balances = computeBalances();
  const cashCodes = ["1-1000", "1-1100"];
  const openingJournal = JOURNALS.find((j) => j.id === "JRN-0001" && j.status === "diposting");

  const accounts: CashAccountSummary[] = cashCodes.map((code) => {
    const b = balances.find((x) => x.code === code)!;
    let opDebit = 0;
    let opCredit = 0;
    for (const l of openingJournal?.lines ?? []) {
      if (l.accountCode === code) {
        opDebit += l.debit;
        opCredit += l.credit;
      }
    }
    const opening = opDebit - opCredit;
    const inflow = b.debit - opDebit;
    const outflow = b.credit - opCredit;
    return {
      code,
      name: b.name,
      opening,
      inflow,
      outflow,
      closing: opening + inflow - outflow,
    };
  });
  return { accounts, totalClosing: accounts.reduce((s, a) => s + a.closing, 0) };
}

export type PostingResult =
  | { ok: true; journal: JournalEntry }
  | { ok: false; errors: string[] };

export function validateJournal(lines: JournalLine[], opts?: { periodLocked?: boolean; idempotencyKey?: string }): string[] {
  const errors: string[] = [];
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  if (lines.length < 2) errors.push("Jurnal memerlukan minimal dua baris.");
  if (debit !== credit) errors.push(`Jurnal tidak seimbang: debit ${debit} ≠ kredit ${credit}.`);
  if (debit === 0) errors.push("Nilai jurnal tidak boleh nol.");
  for (const l of lines) {
    if (!ACCOUNT_BY_CODE[l.accountCode]) errors.push(`Akun ${l.accountCode} tidak ada di bagan akun.`);
    if (l.debit > 0 && l.credit > 0) errors.push("Satu baris tidak boleh memiliki debit dan kredit sekaligus.");
    if (l.debit < 0 || l.credit < 0) errors.push("Nilai negatif tidak diizinkan; gunakan baris lawan.");
  }
  if (opts?.periodLocked) errors.push("Periode terkunci — posting ditolak. Buka periode melalui proses yang sah.");
  if (opts?.idempotencyKey) {
    const dup = JOURNALS.some((j) => j.idempotencyKey === opts.idempotencyKey && j.status === "diposting");
    if (dup) errors.push("Idempotency key sudah dipakai posting aktif — permintaan duplikat ditolak.");
  }
  return errors;
}

export function journalsForAccount(code: string): JournalEntry[] {
  return postedJournals().filter((j) => j.lines.some((l) => l.accountCode === code));
}

export function programSpend(): { programCode: string; planned: number; actual: number }[] {
  const planned = new Map<string, number>();
  for (const b of BUDGETS) planned.set(b.programCode, (planned.get(b.programCode) ?? 0) + b.planned);
  const actual = new Map<string, number>();
  for (const j of postedJournals()) {
    for (const l of j.lines) {
      if (!l.programCode) continue;
      const acc = ACCOUNT_BY_CODE[l.accountCode];
      if (acc?.type === "beban" || (acc?.type === "aset" && j.source !== "pos")) {
        actual.set(l.programCode, (actual.get(l.programCode) ?? 0) + l.debit - l.credit);
      }
    }
  }
  const codes = new Set([...planned.keys(), ...actual.keys()]);
  return [...codes].map((programCode) => ({
    programCode,
    planned: planned.get(programCode) ?? 0,
    actual: actual.get(programCode) ?? 0,
  }));
}

export function fundUsage(): { code: string; inflow: number; outflow: number }[] {
  const map = new Map<string, { inflow: number; outflow: number }>();
  for (const j of postedJournals()) {
    for (const l of j.lines) {
      if (!l.fundCode) continue;
      const cur = map.get(l.fundCode) ?? { inflow: 0, outflow: 0 };
      const acc = ACCOUNT_BY_CODE[l.accountCode];
      if (acc?.type === "pendapatan") cur.inflow += l.credit;
      if (acc?.type === "beban") cur.outflow += l.debit;
      map.set(l.fundCode, cur);
    }
  }
  return [...map.entries()].map(([code, v]) => ({ code, ...v }));
}
