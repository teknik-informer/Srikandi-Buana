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
const expected = [...legacyRouteIds.filter((id) => id !== "laporan"), "laporan", "monitoring", "analytics"];

test("dashboard utama menyediakan enam aplikasi operasional terintegrasi", () => {
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.id), ["hrm", "accounting", "crm", "projects", "pos", "analytics"]);
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.label), ["HRM · SDM & Keanggotaan", "Accounting · Keuangan", "CRM · Relasi & Kemitraan", "Project Management · Program", "POS · Penjualan", "BI & Analitik"]);
  for (const dashboard of registry.enterpriseDashboards) {
    assert.equal(dashboard.href, "/dashboard/" + dashboard.id);
    assert.equal(registry.getEnterpriseDashboardById(dashboard.id)?.id, dashboard.id);
  }
});

test("seluruh rute fitur lama dan BI tetap tersedia tepat satu kali", () => {
  assert.equal(new Set(assigned).size, assigned.length);
  assert.equal(new Set(registry.dashboardSectionIds).size, registry.dashboardSectionIds.length);
  assert.deepEqual([...assigned].sort(), [...expected].filter((id) => id !== "monitoring").sort());
  assert.equal(registry.getEnterpriseFeature("monitoring")?.href, "/dashboard/monitoring");
});

test("enam aplikasi memiliki pemetaan modul operasional yang jelas", () => {
  const ids = (app) => Array.from(registry.enterpriseDashboards.find((dashboard) => dashboard.id === app).features, (feature) => feature.id);
  assert.ok(ids("hrm").includes("anggota") && ids("hrm").includes("presensi"));
  assert.ok(ids("accounting").includes("kas") && ids("accounting").includes("akuntansi"));
  assert.ok(ids("crm").includes("kemitraan") && ids("crm").includes("pesan"));
  assert.ok(ids("projects").includes("program") && ids("projects").includes("tindaklanjut"));
  assert.ok(ids("pos").includes("penjualan") && ids("pos").includes("lotkopi"));
  assert.ok(ids("analytics").includes("analytics"));
});

test("pembatasan akses per peran tetap diterapkan", () => {
  const visible = (role) => registry.getVisibleEnterpriseDashboards(role).flatMap((dashboard) => dashboard.features.map((feature) => feature.id));
  const admin = visible("admin");
  assert.deepEqual([...admin].sort(), ["akun", "akun-saya", "notifikasi", "panduan", "pengaturan", "sumber"].sort());
  const member = visible("anggota");
  for (const restricted of ["akun", "pengaturan", "sumber", "pesan", "akuntansi"]) assert.ok(!member.includes(restricted));
  assert.ok(member.includes("portal"));
  assert.ok(member.includes("akun-saya"));
  assert.equal(permissions.canReadSectionForRole("admin", "akun"), true);
  assert.equal(permissions.canReadSectionForRole("anggota", "akun"), false);
  assert.equal(permissions.canReadSectionForRole("anggota", "laporan"), false);
  assert.equal(permissions.canReadSectionForRole("sekretaris", "laporan"), true);
  assert.equal(permissions.canReadSectionForRole("bendahara", "laporan"), true);
  for (const role of ["ketua", "sekretaris", "bendahara", "koordinator"]) assert.equal(permissions.canReadSectionForRole(role, "analytics"), true);
  assert.equal(permissions.canReadSectionForRole("admin", "analytics"), false);
  assert.equal(permissions.canReadSectionForRole("anggota", "analytics"), false);
});

test("katalog System Administrator menampilkan lima modul tanpa memberi izin operasional baru", () => {
  const catalog = registry.getVisibleEnterpriseDashboards("admin", false, true);
  assert.deepEqual(Array.from(catalog, (dashboard) => dashboard.id), ["hrm", "accounting", "crm", "projects", "pos", "analytics"]);
  assert.deepEqual(
    Array.from(catalog.filter((dashboard) => dashboard.catalogOnly), (dashboard) => dashboard.id),
    ["hrm", "accounting", "crm", "projects", "pos", "analytics"],
    "All five business workspaces remain catalog entries for the technical administrator",
  );
  assert.deepEqual(
    Array.from(registry.getVisibleEnterpriseDashboards("admin"), (dashboard) => dashboard.id),
    ["hrm", "crm", "projects"],
    "Default navigation remains restricted to assigned features",
  );
  assert.equal(permissions.canReadSectionForRole("admin", "kas"), false);
  assert.equal(permissions.canReadSectionForRole("admin", "penjualan"), false);
});

test("halaman Pusat Aplikasi membedakan modul terdaftar dan akses operasional", () => {
  const hub = readFileSync("src/app/_components/application-hub.tsx", "utf8");
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  assert.match(hub, /dashboard\.catalogOnly/);
  assert.match(hub, /6 aplikasi terdaftar/);
  assert.match(route, /getVisibleEnterpriseDashboards\(admin\.role, isArchitectFullAccess\(admin\), admin\.role === "admin"\)/);
  assert.match(route, /visibleDashboard\?\.catalogOnly/);
  assert.match(route, /BusinessIntelligenceWorkspace/);
  assert.match(route, /tidak otomatis memberikan kewenangan/);
});

test("menu navigasi memakai label formal dan ringkas", () => {
  const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
  const overview = readFileSync("src/app/_components/enterprise-dashboard-overview.tsx", "utf8");
  assert.match(navigation, /MENU UTAMA/);
  assert.match(navigation, /Cari halaman/);
  assert.match(navigation, /getVisibleEnterpriseDashboards\(user\.role, architectFullAccess\)/);
  assert.match(overview, /ACCOUNTING & FINANCE/);
  assert.match(overview, /HUMAN RESOURCE MANAGEMENT/);
  assert.match(overview, /CUSTOMER RELATIONSHIP MANAGEMENT/);
  assert.match(overview, /PROJECT MANAGEMENT/);
  assert.match(overview, /POINT OF SALE/);
  assert.match(overview, /BUSINESS INTELLIGENCE & ANALYTICS/);
  assert.doesNotMatch(overview, /LANGKAH 0/);
});

test("halaman dashboard mempertahankan pemeriksaan akses dan rute fitur", () => {
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  assert.ok(route.includes("dashboardRouteIds"));
  assert.ok(route.includes("getEnterpriseDashboardById"));
  assert.ok(route.includes("dashboardSectionIds"));
  assert.ok(route.includes("canReadSection"));
});
