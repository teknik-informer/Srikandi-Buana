import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";

const bundle = await build({ entryPoints: ["src/features/enterprise/registry.ts"], bundle: true, write: false, platform: "node", format: "cjs" });
const commonjs = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module: commonjs, exports: commonjs.exports });
const registry = commonjs.exports;
const permissionBundle = await build({ entryPoints: ["src/lib/permissions.ts"], bundle: true, write: false, platform: "node", format: "cjs" });
const permissionCommonjs = { exports: {} };
vm.runInNewContext(permissionBundle.outputFiles[0].text, { module: permissionCommonjs, exports: permissionCommonjs.exports });
const permissions = permissionCommonjs.exports;
const navigationSource = readFileSync("src/lib/navigation-config.ts", "utf8");
const legacyRouteIds = [...navigationSource.matchAll(/admin\('([^']+)'/g)].map((match) => match[1]);
const assigned = registry.enterpriseDashboards.flatMap((dashboard) => dashboard.features.map((feature) => feature.id));
const expected = [...legacyRouteIds.filter((id) => id !== "laporan"), "laporan", "monitoring"];

test("dashboard utama disederhanakan menjadi empat area kerja", () => {
  assert.deepEqual(registry.enterpriseDashboards.map((dashboard) => dashboard.id), ["ecosystem", "publication", "finance", "system"]);
  assert.deepEqual(registry.enterpriseDashboards.map((dashboard) => dashboard.label), ["Organisasi", "Publikasi", "Pelaporan", "Administrasi"]);
  for (const dashboard of registry.enterpriseDashboards) {
    assert.equal(dashboard.href, "/dashboard/" + dashboard.id);
    assert.equal(registry.getEnterpriseDashboardById(dashboard.id)?.id, dashboard.id);
  }
});

test("seluruh rute fitur lama tetap tersedia tepat satu kali", () => {
  assert.equal(new Set(assigned).size, assigned.length);
  assert.equal(new Set(registry.dashboardSectionIds).size, registry.dashboardSectionIds.length);
  assert.deepEqual([...assigned].sort(), [...expected].filter((id) => id !== "monitoring").sort());
  assert.ok(registry.getEnterpriseFeature("monitoring") === undefined);
});

test("publikasi dan pelaporan memiliki akses yang jelas", () => {
  const ids = (area) => registry.enterpriseDashboards.find((dashboard) => dashboard.id === area).features.map((feature) => feature.id);
  assert.deepEqual(ids("publication"), ["publikasi", "galeri", "pesan"]);
  assert.deepEqual(ids("finance"), ["kas", "laporan", "akuntansi", "aset", "penjualan", "lotkopi", "usaha", "kemitraan"]);
  assert.ok(ids("ecosystem").includes("laporan_program"));
  assert.ok(ids("system").includes("panduan"));
});

test("pembatasan akses per peran tetap diterapkan", () => {
  const visible = (role) => registry.getVisibleEnterpriseDashboards(role).flatMap((dashboard) => dashboard.features.map((feature) => feature.id));
  const admin = visible("admin");
  assert.deepEqual([...admin].sort(), [...assigned].sort());
  const member = visible("anggota");
  for (const restricted of ["akun", "pengaturan", "sumber", "pesan", "akuntansi"]) assert.ok(!member.includes(restricted));
  assert.ok(member.includes("portal"));
  assert.ok(member.includes("akun-saya"));
  assert.equal(permissions.canReadSectionForRole("admin", "akun"), true);
  assert.equal(permissions.canReadSectionForRole("anggota", "akun"), false);
  assert.equal(permissions.canReadSectionForRole("anggota", "laporan"), true);
});

test("menu navigasi memakai label formal dan ringkas", () => {
  const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
  const overview = readFileSync("src/app/_components/enterprise-dashboard-overview.tsx", "utf8");
  assert.match(navigation, /MENU UTAMA/);
  assert.match(navigation, /Cari halaman/);
  assert.match(overview, /PELAPORAN/);
  assert.doesNotMatch(overview, /LANGKAH 0/);
});

test("halaman dashboard mempertahankan pemeriksaan akses dan rute fitur", () => {
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  assert.ok(route.includes("dashboardRouteIds"));
  assert.ok(route.includes("getEnterpriseDashboardById"));
  assert.ok(route.includes("dashboardSectionIds"));
  assert.ok(route.includes("canReadSection"));
});
