import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("src/app/api/ecosystem/purchases/route.ts", "utf8");
const migration = readFileSync("migrations/014_supplier_bills.sql", "utf8");
const ui = readFileSync("src/app/_components/ecosystem-workspace.tsx", "utf8");

test("supplier and payable API is role restricted and organization scoped", () => {
  assert.match(api, /canRead\(c\.user\.role\)/);
  assert.match(api, /canWrite\(c\.user\.role\)/);
  assert.match(api, /WHERE owner=\?/);
  assert.match(api, /WHERE id=\? AND owner=\?/);
  assert.match(api, /commerce_suppliers/);
  assert.match(api, /commerce_purchase_bills/);
});

test("supplier bills post a balanced expense and trade payable journal", () => {
  assert.match(api, /category='expense'/);
  assert.match(api, /code==='210003'/);
  assert.match(api, /Tagihan pemasok/);
  assert.match(api, /ledger_lines/);
  assert.match(api, /Tagihan pemasok dibukukan/);
});

test("supplier payments reduce payables and credit only active organization cash accounts", () => {
  assert.match(api, /category='asset'/);
  assert.match(api, /Pembayaran utang/);
  assert.match(api, /commerce_purchase_bill_payments/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /next_paid > bill.total_amount/);
  assert.match(migration, /paid_total=next_paid/);
  assert.match(migration, /UNIQUE\(owner,client_request_id\)/);
});

test("supplier bill payments have a database-enforced overpayment guard and status projection", () => {
  assert.match(migration, /srikandi_supplier_bill_payment_apply/);
  assert.match(migration, /partially_paid/);
  assert.match(migration, /'paid'/);
});

test("purchases workspace includes supplier, bill and payment flows", () => {
  assert.match(ui, /Pembelian & Utang Usaha/);
  assert.match(ui, /Data Pemasok/);
  assert.match(ui, /Catat Tagihan Pemasok/);
  assert.match(ui, /Posting pembayaran utang/);
});
