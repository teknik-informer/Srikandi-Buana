/**
 * ACCOUNT BALANCES — one helper shared by the two ledger views that Blueprint
 * §9.4.1 lists but the demo did not yet expose (Iuran & Kontribusi, Piutang &
 * Utang).
 *
 * Everything here is *derived*: a balance is the sum of posted journal lines
 * for an account code. Nothing is stored twice, and nothing is estimated — if
 * the ledger says zero, the page says zero.
 */

import type { JournalEntry } from "@/data/types";

export interface AccountBalance {
  code: string;
  name: string;
  /** Signed in the account's natural direction: credit-normal → credit − debit. */
  balance: number;
  debit: number;
  credit: number;
  entries: { id: string; number: string; date: string; description: string; amount: number; line: number }[];
}

export function balancesFor(
  journals: JournalEntry[],
  accounts: { code: string; name: string }[],
): AccountBalance[] {
  const posted = journals.filter((j) => j.status === "diposting");
  return accounts.map(({ code, name }) => {
    let debit = 0;
    let credit = 0;
    const entries: AccountBalance["entries"] = [];
    for (const j of posted) {
      for (const l of j.lines) {
        if (l.accountCode !== code) continue;
        debit += l.debit;
        credit += l.credit;
        entries.push({
          id: j.id,
          number: j.number,
          date: j.date,
          description: j.description,
          amount: l.debit - l.credit, // liability/equity reverse in the view
          line: l.debit > 0 ? l.debit : l.credit,
        });
      }
    }
    return { code, name, balance: credit - debit, debit, credit, entries };
  });
}

/** True when at least one posted journal touches any of these codes. */
export function hasActivity(balances: AccountBalance[]) {
  return balances.some((b) => b.entries.length > 0);
}
