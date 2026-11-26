import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

test("Ledger endpoint reuses an identical journal request and rejects a changed payload", () => {
  const api = read("src/app/api/ecosystem/ledger/route.ts");
  const helper = read("src/features/finance/journal-idempotency.ts");
  const migration = read("migrations/005_ecosystem_foundation.sql");

  assert(api.includes("findExistingJournalRequest(c.db"));
  assert(api.includes("reused:true"));
  assert(api.includes("JournalRequestConflictError"));
  assert(api.includes("if(requestReference){"));
  assert(api.includes("await c.db.batch(statements)"));
  assert(api.includes("if(existingId)return json({ok:true,id:existingId,reused:true})"));
  assert(api.includes("reference=requestReference||id"));
  assert(helper.includes("WHERE owner=? AND reference=?"));
  assert(helper.includes("String(existing.memo) === input.memo"));
  assert(helper.includes("line.accountId") && helper.includes("Number(line.debit)") && helper.includes("Number(line.credit)"));
  assert(helper.includes("throw new JournalRequestConflictError()"));
  assert(migration.includes("UNIQUE(owner,reference)"));
});

test("Accounting UI holds its journal reference until a confirmed successful response", () => {
  const ui = read("src/app/_components/ecosystem-workspace.tsx");
  const accounting = ui.slice(ui.indexOf("export function AccountingWorkspace"));
  assert(accounting.includes("const journalRequestId=useRef<string|null>(null)"));
  assert(accounting.includes("sessionStorage.getItem(journalRequestStorageKey)"));
  assert(accounting.includes("sessionStorage.setItem(journalRequestStorageKey,journalRequestId.current)"));
  assert(accounting.includes("reference:'UI-'+journalRequestId.current"));
  assert(accounting.includes("await api('ledger',payload);if(isJournal){journalRequestId.current=null"));
  assert(accounting.includes("sessionStorage.removeItem(journalRequestStorageKey)"));
  assert(accounting.includes("Pencatatan belum dapat dipastikan"));
  assert(!accounting.includes("reference:crypto.randomUUID()"));
});

test("Ledger immutability and database-enforced balancing remain in place", () => {
  const migration = read("migrations/007_database_integrity_and_audit.sql");
  assert(migration.includes("srikandi_ledger_entries_immutable"));
  assert(migration.includes("srikandi_ledger_lines_immutable"));
  assert(migration.includes("srikandi_ledger_reversals_immutable"));
  assert(migration.includes("line_count < 2 OR debit_total <= 0 OR debit_total <> credit_total"));
});
