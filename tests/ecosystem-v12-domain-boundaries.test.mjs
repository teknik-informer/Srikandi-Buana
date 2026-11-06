import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";

async function load(entryPoint) {
  const bundle = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
  });
  const commonjs = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module: commonjs,
    exports: commonjs.exports,
  });
  return commonjs.exports;
}

const shared = await load("src/features/shared/validation.mjs");
const commerce = await load("src/features/commerce/validation.mjs");
const finance = await load("src/features/finance/validation.mjs");
const legacy = await load("src/lib/ecosystem/validation.mjs");

test("shared validation keeps safe integer and normalized text contracts", () => {
  assert.equal(shared.moneyInteger(0), true);
  assert.equal(shared.moneyInteger(1.5), false);
  assert.equal(shared.moneyInteger(-1), false);
  assert.equal(shared.moneyInteger(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(shared.textField("  Srikandi  "), "Srikandi");
  assert.equal(shared.textField("   "), null);
});

test("commerce validation owns SKU format rules", () => {
  assert.equal(commerce.skuValid("SKU-2026"), true);
  assert.equal(commerce.skuValid("A1"), true);
  assert.equal(commerce.skuValid("sku-2026"), false);
  assert.equal(commerce.skuValid("A"), false);
  assert.equal(commerce.skuValid("SKU WITH SPACE"), false);
});

test("finance validation owns balanced journal invariants", () => {
  const debit = "00000000-0000-4000-8000-000000000001";
  const credit = "00000000-0000-4000-8000-000000000002";
  assert.equal(finance.balancedLines([
    { accountId: debit, debit: 125000, credit: 0 },
    { accountId: credit, debit: 0, credit: 125000 },
  ]), true);
  assert.equal(finance.balancedLines([
    { accountId: debit, debit: 125000, credit: 0 },
    { accountId: credit, debit: 0, credit: 120000 },
  ]), false);
  assert.equal(finance.balancedLines([]), false);
});

test("legacy validation facade preserves exports and safe path behavior", () => {
  assert.equal(legacy.moneyInteger(500), true);
  assert.equal(legacy.skuValid("KOPI-01"), true);
  assert.equal(legacy.balancedLines([
    { accountId: "00000000-0000-4000-8000-000000000001", debit: 10, credit: 0 },
    { accountId: "00000000-0000-4000-8000-000000000002", debit: 0, credit: 10 },
  ]), true);
  assert.equal(legacy.sameOwner({ userId: "workspace-1" }, "workspace-1"), true);
  assert.equal(legacy.localHref("/dashboard/penjualan"), true);
  assert.equal(legacy.localHref("//example.test"), false);
  assert.equal(legacy.localHref("/dashboard\\admin"), false);
  assert.equal(legacy.localHref("/dashboard/\u0000"), false);
});

test("commerce and finance API handlers import their owning feature contracts", () => {
  const products = readFileSync("src/app/api/ecosystem/products/route.ts", "utf8");
  const orders = readFileSync("src/app/api/ecosystem/orders/route.ts", "utf8");
  const ledger = readFileSync("src/app/api/ecosystem/ledger/route.ts", "utf8");
  assert.ok(products.includes("@/features/commerce/validation.mjs"));
  assert.ok(products.includes("@/features/shared/validation.mjs"));
  assert.ok(orders.includes("@/features/shared/validation.mjs"));
  assert.ok(ledger.includes("@/features/finance/validation.mjs"));
  assert.ok(ledger.includes("@/features/shared/validation.mjs"));
  for (const source of [products, orders, ledger]) {
    assert.ok(!source.includes("@/lib/ecosystem/validation.mjs"));
  }
});
