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
const expected = [...legacyRouteIds.filter((id) => id !== "laporan" && id !== "pengaturan"), "laporan", "monitoring", "analytics"];

test("dashboard utama menyediakan enam aplikasi operasional terintegrasi", () => {
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.id), ["hrm", "accounting", "crm", "projects", "pos", "analytics"]);
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.label), ["HRM · SDM & Keanggotaan", "Accounting · Keuangan", "CRM · Relasi & Kemitraan", "Project Management · Program", "POS · Penjualan", "BI & Analitik"]);
  for (const dashboard of registry.enterpriseDashboards) {
    assert.equal(dashboard.href, "/dashboard/" + dashboard.id);
    assert.equal(registry.getEnterpriseDashboardById(dashboard.id)?.id, dashboard.id);
  }
});

test("seluruh rute fitur lama dan BI tetap tersedia tepat satu kali, sementara pengaturan situs tidak menjadi modul sidebar", () => {
  assert.ok(legacyRouteIds.includes("pengaturan"), "the legacy site settings route identifier remains registered");
  assert.ok(!assigned.includes("pengaturan"), "site settings is excluded from visible operational navigation");
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
  assert.ok(admin.includes("akuntansi") && admin.includes("kas") && admin.includes("penjualan") && admin.includes("analytics"));
  assert.ok(admin.includes("akun") && admin.includes("sumber"));
  assert.ok(!admin.includes("pengaturan"), "Pengaturan Website is not a navigation feature");
  const member = visible("anggota");
  for (const restricted of ["akun", "pengaturan", "sumber", "pesan", "akuntansi"]) assert.ok(!member.includes(restricted));
  assert.ok(member.includes("portal"));
  assert.ok(member.includes("akun-saya"));
  assert.equal(permissions.canReadSectionForRole("admin", "akun"), true);
  assert.equal(permissions.canReadSectionForRole("admin", "pengaturan"), true, "Hiding the site settings menu does not revoke the administrator route permission");
  assert.equal(permissions.canReadSectionForRole("anggota", "akun"), false);
  assert.equal(permissions.canReadSectionForRole("anggota", "laporan"), false);
  assert.equal(permissions.canReadSectionForRole("sekretaris", "laporan"), true);
  assert.equal(permissions.canReadSectionForRole("bendahara", "laporan"), true);
  for (const role of ["ketua", "sekretaris", "bendahara", "koordinator"]) {
    assert.equal(permissions.canReadSectionForRole(role, "analytics"), true);
    assert.ok(registry.getVisibleEnterpriseDashboards(role).some((dashboard) => dashboard.id === "analytics"));
  }
  assert.ok(registry.getVisibleEnterpriseDashboards("admin").some((dashboard) => dashboard.id === "analytics"));
  assert.ok(!registry.getVisibleEnterpriseDashboards("anggota").some((dashboard) => dashboard.id === "analytics"));
  assert.equal(permissions.canReadSectionForRole("admin", "analytics"), true);
  assert.equal(permissions.canReadSectionForRole("anggota", "analytics"), false);
});

test("System Administrator memiliki enam aplikasi dengan izin operasional penuh", () => {
  const catalog = registry.getVisibleEnterpriseDashboards("admin", true, false);
  assert.deepEqual(Array.from(catalog, (dashboard) => dashboard.id), ["hrm", "accounting", "crm", "projects", "pos", "analytics"]);
  assert.deepEqual(
    Array.from(catalog.filter((dashboard) => !dashboard.catalogOnly && dashboard.features.length > 0), (dashboard) => dashboard.id),
    ["hrm", "accounting", "crm", "projects", "pos", "analytics"],
    "All six business workspaces are operationally available to the System Administrator",
  );
  assert.deepEqual(
    Array.from(registry.getVisibleEnterpriseDashboards("admin"), (dashboard) => dashboard.id),
    ["hrm", "accounting", "crm", "projects", "pos", "analytics"],
    "System Administrator navigation includes all six applications",
  );
  assert.equal(permissions.canReadSectionForRole("admin", "kas"), true);
  assert.equal(permissions.canReadSectionForRole("admin", "penjualan"), true);
});

test("Pusat Aplikasi menampilkan aplikasi; pengaturan teknis tetap berada pada akses sistem", () => {
  const hub = readFileSync("src/app/_components/application-hub.tsx", "utf8");
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  assert.match(hub, /Pilih aplikasi untuk melanjutkan pekerjaan/);
  assert.doesNotMatch(hub, /presentation\.modules|modules:\s*"/);
  assert.doesNotMatch(hub, /Katalog aplikasi|aplikasi terdaftar/);
  assert.match(route, /getVisibleEnterpriseDashboardsForUser\(admin, isArchitectFullAccess\(admin\), admin\.role === "admin"\)/);
  assert.match(route, /visibleDashboard\?\.catalogOnly/);
  assert.match(route, /active === "module-center" && admin\.role === "admin"/);
  assert.match(route, /BusinessIntelligenceWorkspace/);
  assert.match(route, /Tetapkan izin fitur dan ruang lingkup organisasi/);
  const qaCenter = readFileSync("src/app/_components/architect-qa-test-center.tsx", "utf8");
  assert.match(qaCenter, /Administrator Sistem memiliki akses penuh pada keenam aplikasi di Preview maupun Production/);
  assert.match(qaCenter, /Administrator Sistem memiliki Full Access lintas lingkungan/);
  assert.match(qaCenter, /Laboratorium dan alat QA tetap dibatasi pada Preview yang diizinkan/);
  assert.doesNotMatch(qaCenter, /akses operasional tetap ditolak|tidak berlaku pada Production/);
  const qaGate = readFileSync("src/features/shared/qa-preview.mjs", "utf8");
  assert.match(qaGate, /QA-only tools are available only/);
});

test("menu navigasi memakai label formal dan ringkas serta pencarian header versi lama", () => {
  const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
  const overview = readFileSync("src/app/_components/enterprise-dashboard-overview.tsx", "utf8");
  assert.match(navigation, /APLIKASI TERPADU/);
  assert.doesNotMatch(navigation, /RUANG KERJA OPERASIONAL/);
  assert.match(navigation, /modulesByApplication/);
  assert.doesNotMatch(navigation, /MODUL DALAM APLIKASI/);
  assert.doesNotMatch(navigation, /dashboard-menu-query/);
  assert.match(navigation, /aria-label="Cari fitur aplikasi"/);
  assert.match(navigation, /placeholder="Cari publikasi, laporan, anggota/);
  const shell = readFileSync("src/app/_components/workspace-shell.tsx", "utf8");
  assert.match(shell, /DashboardMegaMenu section=/);
  assert.doesNotMatch(shell, /Cari halaman atau modul/);
  assert.match(navigation, /<span>Pengaturan<\/span>/);
  assert.doesNotMatch(navigation, /LogoutButton/);
  assert.doesNotMatch(navigation, /Pengaturan Website/);
  assert.match(navigation, /getVisibleEnterpriseDashboardsForUser\(user, fullAccess, includeCatalog\)/);
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
