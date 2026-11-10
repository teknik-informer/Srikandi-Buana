import test from "node:test";
import assert from "node:assert/strict";
import { calculateFinanceStatements } from "../src/features/finance/statements.mjs";

test("financial statements derive natural balances by account category", () => {
  const result = calculateFinanceStatements([
    { id:"cash", code:"110001", name:"Kas", category:"asset", debit:1_000_000, credit:200_000 },
    { id:"receivable", code:"120001", name:"Piutang anggota", category:"asset", debit:500_000, credit:100_000 },
    { id:"savings", code:"210001", name:"Simpanan anggota", category:"liability", debit:0, credit:300_000 },
    { id:"capital", code:"310001", name:"Modal kelompok", category:"equity", debit:0, credit:400_000 },
    { id:"income", code:"410003", name:"Pendapatan usaha", category:"revenue", debit:0, credit:250_000 },
    { id:"expense", code:"510003", name:"Beban usaha", category:"expense", debit:150_000, credit:0 },
  ]);

  assert.equal(result.totals.asset, 1_200_000);
  assert.equal(result.totals.liability, 300_000);
  assert.equal(result.totals.equity, 400_000);
  assert.equal(result.totals.revenue, 250_000);
  assert.equal(result.totals.expense, 150_000);
  assert.equal(result.surplus, 100_000);
  assert.equal(result.equityIncludingSurplus, 500_000);
  assert.equal(result.difference, 400_000);
  assert.equal(result.isBalanced, false);
});

test("a balanced ledger produces a balanced statement and keeps member savings as liabilities", () => {
  const result = calculateFinanceStatements([
    { id:"cash", code:"110001", name:"Kas organisasi", category:"asset", debit:1_000_000, credit:0 },
    { id:"savings", code:"210001", name:"Simpanan anggota", category:"liability", debit:0, credit:400_000 },
    { id:"capital", code:"310001", name:"Modal kelompok", category:"equity", debit:0, credit:500_000 },
    { id:"income", code:"410001", name:"Pendapatan organisasi", category:"revenue", debit:0, credit:200_000 },
    { id:"expense", code:"510001", name:"Beban organisasi", category:"expense", debit:100_000, credit:0 },
  ]);

  assert.equal(result.surplus, 100_000);
  assert.equal(result.equityIncludingSurplus, 600_000);
  assert.equal(result.difference, 0);
  assert.equal(result.isBalanced, true);
  assert.equal(result.accounts.liability[0].balance, 400_000);
});

test("contra balances remain visible with signed natural balances and malformed rows are ignored", () => {
  const result = calculateFinanceStatements([
    { id:"cash", code:"110001", name:"Kas", category:"asset", debit:0, credit:50 },
    { id:"savings", code:"210001", name:"Simpanan", category:"liability", debit:25, credit:0 },
    { id:"invalid", code:"x", name:"Invalid", category:"asset", debit:"not-number", credit:0 },
    { id:"other", code:"z", name:"Unknown", category:"unknown", debit:90, credit:0 },
  ]);

  assert.equal(result.accounts.asset[0].balance, -50);
  assert.equal(result.accounts.liability[0].balance, -25);
  assert.equal(result.accounts.asset.length, 1);
  assert.equal(result.accounts.liability.length, 1);
});
