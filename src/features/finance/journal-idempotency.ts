import type { NeonDatabase } from "@/lib/runtime";

type JournalLine = {
  accountId: string;
  debit: number;
  credit: number;
};

type JournalRequestDatabase = Pick<NeonDatabase, "prepare">;

export class JournalRequestConflictError extends Error {
  readonly status = 409;

  constructor() {
    super("Referensi permintaan ini sudah dipakai oleh jurnal dengan isi berbeda. Muat ulang jurnal sebelum membuat pencatatan baru.");
    this.name = "JournalRequestConflictError";
  }
}

/**
 * Looks up a previously committed journal by its caller-supplied idempotency
 * reference. A repeated request is reusable only when its header and every
 * debit/credit line exactly match the committed journal.
 */
export async function findExistingJournalRequest(
  db: JournalRequestDatabase,
  input: {
    owner: string;
    reference: string;
    postedDate: string;
    memo: string;
    lines: JournalLine[];
  },
): Promise<string | null> {
  const existing = await db.prepare(
    "SELECT id,posted_date,memo FROM ledger_entries WHERE owner=? AND reference=?",
  ).bind(input.owner, input.reference).first();

  if (!existing) return null;

  const rows = await db.prepare(
    "SELECT l.account_id,l.debit,l.credit FROM ledger_lines l " +
    "JOIN ledger_accounts a ON a.id=l.account_id AND a.owner=l.owner " +
    "WHERE l.owner=? AND l.entry_id=? AND a.owner=?",
  ).bind(input.owner, String(existing.id), input.owner).all();

  const normalize = (line: { accountId: string; debit: number; credit: number }) =>
    line.accountId + "\u0000" + Number(line.debit) + "\u0000" + Number(line.credit);
  const expected = input.lines.map(normalize).sort();
  const actual = rows.results.map((row) => normalize({
    accountId: String(row.account_id),
    debit: Number(row.debit),
    credit: Number(row.credit),
  })).sort();

  const sameHeader =
    String(existing.posted_date).slice(0, 10) === input.postedDate &&
    String(existing.memo) === input.memo;
  const sameLines =
    actual.length === expected.length &&
    actual.every((line, index) => line === expected[index]);

  if (!sameHeader || !sameLines) throw new JournalRequestConflictError();
  return String(existing.id);
}
