import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeHppCostRows, calculateHpp, calculateActualMargin } from "../src/features/finance/hpp-calculation.mjs";

test("HPP calculator totals flexible production and procurement cost rows", () => {
  const production = normalizeHppCostRows([
    { component: "Benih", quantity: 2, unit: "pak", unitPrice: 15000 },
    { component: "Tenaga kerja", quantity: 3.5, unit: "HOK", unitPrice: 80000 },
  ]);
  assert.equal(production.totalCost, 310000);
  assert.deepEqual(production.items.map(row => row.subtotal), [30000, 280000]);

  const procurement = normalizeHppCostRows([
    { component: "Pembelian hasil", quantity: 25, unit: "kg", unitPrice: 12000 },
    { component: "Transportasi", quantity: 1, unit: "rit", unitPrice: 75000 },
    { component: "Bongkar muat", quantity: 2, unit: "orang", unitPrice: 25000 },
  ]);
  assert.equal(procurement.totalCost, 425000);
});

test("HPP per unit and selling price use gross-margin formula, not markup", () => {
  const result = calculateHpp({ totalCost: 1000000, outputQuantity: 80, targetMargin: 20 });
  assert.equal(result.unitCost, 12500);
  assert.equal(result.suggestedPrice, 15625);
  assert.equal(calculateActualMargin(12500, 15625), 20);
  assert.equal(calculateActualMargin(12500, 15000), 16.666666666666664);
});

test("HPP calculator rejects empty, excessive, negative, and inconsistent inputs", () => {
  assert.throws(() => normalizeHppCostRows([]), /1–20/);
  assert.throws(() => normalizeHppCostRows(Array.from({ length: 21 }, (_, i) => ({
    component: "Biaya " + i, quantity: 1, unit: "unit", unitPrice: 1,
  }))), /1–20/);
  assert.throws(() => normalizeHppCostRows([{ component: "Biaya", quantity: -1, unit: "kg", unitPrice: 100 }]), /volume/);
  assert.throws(() => normalizeHppCostRows([{ component: "Biaya", quantity: 1, unit: "kg", unitPrice: 1.5 }]), /volume/);
  assert.throws(() => calculateHpp({ totalCost: 1000, outputQuantity: 0, targetMargin: 20 }), /hasil akhir/);
  assert.throws(() => calculateHpp({ totalCost: 1000, outputQuantity: 1, targetMargin: 91 }), /margin/);
  assert.equal(calculateActualMargin(1000, 0), null);
});

test("HPP workspace is wired to records, server validation, finance permissions, and navigation", () => {
  const read = path => readFileSync(path, "utf8");
  const page = read("src/app/dashboard/[[...section]]/page.tsx");
  const nav = read("src/lib/navigation-config.ts");
  const policy = read("src/features/identity/access-policy.ts");
  const api = read("src/app/api/records/route.ts");
  const module = read("src/lib/srikandi.ts");
  const ui = read("src/app/_components/hpp-workspace.tsx");
  assert.match(page, /HppWorkspace/);
  assert.match(page, /active === "hpp"/);
  assert.match(nav, /admin\('hpp','Kalkulator HPP'/);
  assert.match(policy, /hpp: "accounting"/);
  assert.match(policy, /financeWrite = \["kas", "aset", "hpp"\]/);
  assert.match(api, /normalizeHppCostRows/);
  assert.match(api, /calculateHpp/);
  assert.match(module, /hpp:\{title:"Kalkulator HPP"/);
  assert.match(ui, /fetch\("\/api\/records"/);
  assert.match(ui, /Simpan perhitungan/);
  assert.match(ui, /Riwayat perhitungan/);
  assert.match(ui, /Penerimaan hasil/);
});
