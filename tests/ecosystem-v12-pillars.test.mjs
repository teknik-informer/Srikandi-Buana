import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";

const bundle = await build({
  entryPoints: ["src/features/enterprise/registry.ts"],
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
const registry = commonjs.exports;
const navigationSource = readFileSync("src/lib/navigation-config.ts", "utf8");
const legacyRouteIds = [...navigationSource.matchAll(/admin\('([^']+)'/g)].map((match) => match[1]);
const pillarRouteIds = registry.enterprisePillars.flatMap((pillar) =>
  pillar.features.map((feature) => feature.id),
);

test("v12 defines exactly five dashboard pillars", () => {
  assert.deepEqual(
    [...registry.enterprisePillars].map((pillar) => pillar.id),
    ["ecosystem", "management", "administration", "commerce", "public-support"],
  );
});

test("all legacy dashboard routes are assigned exactly once", () => {
  assert.equal(new Set(legacyRouteIds).size, legacyRouteIds.length);
  assert.equal(new Set(pillarRouteIds).size, pillarRouteIds.length);
  assert.deepEqual([...pillarRouteIds].sort(), [...legacyRouteIds].sort());
  assert.deepEqual([...registry.dashboardSectionIds].sort(), [...legacyRouteIds].sort());
});

test("administrator navigation retains every existing destination", () => {
  const visible = [...registry.getVisibleEnterprisePillars("admin")]
    .flatMap((pillar) => [...pillar.features].map((feature) => feature.id));
  assert.deepEqual([...visible].sort(), [...legacyRouteIds].sort());
});

test("member navigation does not expose administration-only controls", () => {
  const visible = [...registry.getVisibleEnterprisePillars("anggota")]
    .flatMap((pillar) => [...pillar.features].map((feature) => feature.id));
  for (const restricted of ["akun", "pengaturan", "sumber", "pesan", "akuntansi"]) {
    assert.ok(!visible.includes(restricted), `anggota must not see ${restricted}`);
  }
  assert.ok(visible.includes("portal"));
  assert.ok(visible.includes("akun-saya"));
});

test("feature lookup is deterministic and unknown routes stay unresolved", () => {
  assert.equal(registry.getEnterprisePillar("penjualan")?.id, "commerce");
  assert.equal(registry.getEnterpriseFeature("akuntansi")?.label, "Akuntansi dan Buku Besar");
  assert.equal(registry.getEnterprisePillar("route-tidak-terdaftar"), undefined);
  assert.equal(registry.getEnterpriseFeature("route-tidak-terdaftar"), undefined);
});
