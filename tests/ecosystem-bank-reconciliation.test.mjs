import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("src/app/api/ecosystem/reconciliation/route.ts", "utf8");
const migration = readFileSync("migrations/013_bank_reconciliation.sql", "utf8");
const ui = readFileSync("src/app/_components/ecosystem-workspace.tsx", "utf8");

test("bank reconciliation is organization-scoped and role-restricted", () => {
  assert.match(api, /canRead\(c\.user\.role\)/);
  assert.match(api, /canWrite\(c\.user\.role\)/);
  assert.match(api, /WHERE r\.owner=\?/);
  assert.match(api, /WHERE id=\? AND owner=\?/);
  assert.match(api, /category='asset'/);
});

test("statement rows match only exact signed amounts on the selected ledger account and period", () => {
  assert.match(api, /l\.account_id=\?/);
  assert.match(api, /e\.posted_date BETWEEN \? AND \?/);
  assert.match(api, /Number\(line\.signed_amount\)!==Number\(ledger\.signed_amount\)/);
  assert.match(api, /matched_ledger_line_id/);
  assert.match(migration, /finance_bank_statement_lines_unique_match/);
  assert.match(migration, /finance_bank_reconciliations_unique_period/);
  assert.match(migration, /finance_bank_statement_lines_unique_reference/);
});

test("reconciled periods and statement lines are locked and cannot be deleted", () => {
  assert.match(migration, /A reconciled bank period is locked/);
  assert.match(migration, /Statement lines in a reconciled period are locked/);
  assert.match(migration, /Bank reconciliation records cannot be deleted/);
  assert.match(api, /status='reconciled'/);
});

test("finalization requires all statement lines matched and bank balance arithmetic to agree", () => {
  assert.match(api, /COUNT\(matched_ledger_line_id\)/);
  assert.match(api, /Saldo akhir tidak sama dengan saldo awal ditambah seluruh mutasi rekening/);
  assert.match(api, /Masih ada mutasi rekening yang belum dipasangkan/);
});

test("finance workspace provides statement entry, matching, and locked reconciliation flow", () => {
  assert.match(ui, /Rekonsiliasi Kas & Bank/);
  assert.match(ui, /Tambah mutasi/);
  assert.match(ui, /Cocokkan/);
  assert.match(ui, /Selesaikan & kunci rekonsiliasi/);
});
