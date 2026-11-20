import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";

const bundle = await build({ entryPoints: ["src/features/enterprise/registry.ts"], bundle: true, write: false, platform: "node", format: "cjs" });
const commonjs = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module: commonjs, exports: commonjs.exports });
const registry = commonjs.exports;
const appBundle = await build({
  stdin: {
    contents: "export { platformApplications } from './src/features/platform/application-registry'; export { enterpriseDashboards } from './src/features/enterprise/registry';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const appCommonjs = { exports: {} };
vm.runInNewContext(appBundle.outputFiles[0].text, { module: appCommonjs, exports: appCommonjs.exports });
const { platformApplications, enterpriseDashboards } = appCommonjs.exports;
const permissionBundle = await build({ entryPoints: ["src/lib/permissions.ts"], bundle: true, write: false, platform: "node", format: "cjs" });
const permissionCommonjs = { exports: {} };
vm.runInNewContext(permissionBundle.outputFiles[0].text, { module: permissionCommonjs, exports: permissionCommonjs.exports });
const permissions = permissionCommonjs.exports;
const navigationSource = readFileSync("src/lib/navigation-config.ts", "utf8");
const legacyRouteIds = [...navigationSource.matchAll(/admin\('([^']+)'/g)].map((match) => match[1]);
const assigned = registry.enterpriseDashboards.flatMap((dashboard) => dashboard.features.map((feature) => feature.id));
const expected = [...legacyRouteIds.filter((id) => id !== "laporan"), "laporan", "monitoring"];

test("registry dashboard mempertahankan empat ruang produksi yang otoritatif", () => {
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.id), ["ecosystem", "publication", "finance", "system"]);
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.label), ["Organisasi", "Publikasi", "Pelaporan", "Administrasi"]);
  for (const dashboard of registry.enterpriseDashboards) {
    assert.equal(registry.getEnterpriseDashboardById(dashboard.id)?.id, dashboard.id);
    assert.ok(dashboard.href.startsWith("/dashboard/"));
  }
});


test("seluruh rute fitur lama tetap tersedia tepat satu kali", () => {
  assert.equal(new Set(assigned).size, assigned.length);
  assert.equal(new Set(registry.dashboardSectionIds).size, registry.dashboardSectionIds.length);
  assert.deepEqual([...assigned].sort(), [...expected].filter((id) => id !== "monitoring").sort());
  assert.equal(registry.getEnterpriseFeature("monitoring")?.href, "/dashboard/monitoring");
});

test("enam pintasan benar-benar menyelesaikan fitur dan rute registry produksi", () => {
  assert.equal(platformApplications.length, 6);
  for (const application of platformApplications) {
    const dashboard = enterpriseDashboards.find((item) => item.id === application.dashboardId);
    assert.ok(dashboard, application.id + " must reference an existing production dashboard");
    const feature = dashboard.features.find((item) => item.id === application.featureId);
    assert.ok(feature, application.id + " must reference an existing production feature");
    assert.equal(application.route, feature.href, application.id + " legacy route must remain aligned");
  }
});

test("enam pintasan aplikasi dipetakan ke fitur pada empat dashboard produksi", () => {
  const source = readFileSync("src/features/platform/application-registry.ts", "utf8");
  for (const id of ["platform-core", "organization", "agriculture", "business", "bi-analytics", "public-partnership"]) {
    assert.ok(source.includes('id: "' + id + '"'));
  }
  for (const dashboardId of ["system", "ecosystem", "finance", "publication"]) {
    assert.ok(source.includes('dashboardId: "' + dashboardId + '"'));
  }
  for (const featureId of ["pengaturan", "portal", "pertanian", "usaha", "laporan", "publikasi"]) {
    assert.ok(source.includes('featureId: "' + featureId + '"'));
  }
  assert.match(source, /route: "\/dashboard\/pengaturan"/);
  assert.match(source, /route: "\/dashboard\/pertanian"/);
  const hub = readFileSync("src/app/_components/application-hub.tsx", "utf8");
  assert.match(hub, /dashboard\?\.features\.find\(\(item\) => item\.id === application\.featureId\)/);
  assert.match(hub, /href=\{feature\.href\}/, "Shortcut links must use the authoritative registered feature route");
  assert.doesNotMatch(hub, /href=\{application\.route\}/, "Shortcut links must not drift from the production feature registry");
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
  assert.match(navigation, /RUANG KERJA/);
  assert.match(navigation, /Cari halaman/);
  assert.match(overview, /FINANCE & REPORTING/);
  assert.doesNotMatch(overview, /LANGKAH 0/);
});

test("halaman dashboard mempertahankan pemeriksaan akses dan rute fitur", () => {
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  assert.ok(route.includes("dashboardRouteIds"));
  assert.ok(route.includes("getEnterpriseDashboardById"));
  assert.ok(route.includes("dashboardSectionIds"));
  assert.ok(route.includes("canReadSection"));
});
