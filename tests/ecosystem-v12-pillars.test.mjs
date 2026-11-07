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
const permissionBundle = await build({
  entryPoints: ["src/lib/permissions.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const permissionCommonjs = { exports: {} };
vm.runInNewContext(permissionBundle.outputFiles[0].text, {
  module: permissionCommonjs,
  exports: permissionCommonjs.exports,
});
const permissions = permissionCommonjs.exports;
const navigationSource = readFileSync("src/lib/navigation-config.ts", "utf8");
const legacyRouteIds = [...navigationSource.matchAll(/admin\('([^']+)'/g)].map((match) => match[1]);
const dashboardRouteIds = registry.enterpriseDashboards.flatMap((dashboard) =>
  dashboard.features.map((feature) => feature.id),
);

test("each enterprise dashboard has its own stable overview route", () => {
  assert.deepEqual(
    [...registry.enterpriseDashboards].map((dashboard) => dashboard.id),
    ["ecosystem", "management", "administration", "finance", "commerce", "publication", "system"],
  );
  for (const dashboard of registry.enterpriseDashboards) {
    assert.equal(dashboard.href, "/dashboard/" + dashboard.id);
    assert.equal(registry.getEnterpriseDashboardById(dashboard.id)?.id, dashboard.id);
  }
});

test("all legacy dashboard routes are assigned exactly once", () => {
  assert.equal(new Set(legacyRouteIds).size, legacyRouteIds.length);
  assert.equal(new Set(dashboardRouteIds).size, dashboardRouteIds.length);
  assert.deepEqual([...dashboardRouteIds].sort(), ["administration", "commerce", "ecosystem", "finance", "management", "publication", "system"].sort());
  assert.deepEqual([...registry.dashboardSectionIds].sort(), [...legacyRouteIds].sort());
});

test("the seven dashboards retain the requested functional grouping", () => {
  const featureIds = (id) => Array.from(registry.enterpriseDashboards.find((dashboard) => dashboard.id === id).features, (feature) => feature.id);
  assert.deepEqual(featureIds("ecosystem"), ["portal", "notifikasi"]);
  assert.deepEqual(featureIds("management"), ["program", "tindaklanjut", "kegiatan", "kehadiran", "musyawarah", "pengajuan", "enterprise"]);
  assert.deepEqual(featureIds("administration"), ["anggota", "pengurus", "persetujuan", "register", "sumber", "kelembagaan", "transkripsi", "dokumen"]);
  assert.deepEqual(featureIds("finance"), ["kas", "akuntansi", "aset"]);
  assert.deepEqual(featureIds("commerce"), ["penjualan", "lotkopi", "usaha", "kemitraan"]);
  assert.deepEqual(featureIds("publication"), ["publikasi", "galeri", "pesan"]);
  assert.deepEqual(featureIds("system"), ["akun", "akun-saya", "pengaturan", "panduan"]);
});

test("monitoring and reports are standalone shortcuts with role-aware visibility", () => {
  assert.deepEqual(
    Array.from(registry.enterpriseUtilities, (item) => item.id),
    ["monitoring", "laporan"],
  );
  assert.deepEqual(
    Array.from(registry.getVisibleEnterpriseUtilities("admin"), (item) => item.id),
    ["monitoring", "laporan"],
  );
  assert.deepEqual(
    Array.from(registry.getVisibleEnterpriseUtilities("anggota"), (item) => item.id),
    ["monitoring"],
  );
  assert.deepEqual(
    Array.from(registry.getVisibleEnterpriseUtilities("ketua"), (item) => item.id),
    ["monitoring", "laporan"],
  );
  assert.equal(registry.getEnterpriseFeature("monitoring")?.href, "/dashboard/monitoring");
  assert.equal(registry.getEnterpriseFeature("laporan")?.href, "/dashboard/laporan");
  assert.ok(!registry.enterpriseDashboards.find((dashboard) => dashboard.id === "finance").features.some((item) => item.id === "laporan"));
});

test("administrator navigation retains every existing destination", () => {
  const visible = [
    ...registry.getVisibleEnterpriseDashboards("admin").flatMap((dashboard) =>
      [...dashboard.features].map((feature) => feature.id),
    ),
    ...registry.getVisibleEnterpriseUtilities("admin").map((item) => item.id),
  ];
  assert.deepEqual([...visible].sort(), [...legacyRouteIds].sort());
});

test("member navigation does not expose administration-only controls", () => {
  const visibleDashboards = [...registry.getVisibleEnterpriseDashboards("anggota")];
  const visible = visibleDashboards.flatMap((dashboard) =>
    [...dashboard.features].map((feature) => feature.id),
  );
  for (const restricted of ["akun", "pengaturan", "sumber", "pesan", "akuntansi"]) {
    assert.ok(!visible.includes(restricted), `anggota must not see ${restricted}`);
  }
  assert.ok(visible.includes("portal"));
  assert.ok(visible.includes("notifikasi"));
  assert.ok(visible.includes("akun-saya"));
  assert.deepEqual(visibleDashboards.map((dashboard) => dashboard.id), ["ecosystem", "management", "administration", "commerce", "system"]);
});

test("feature lookup is deterministic and unknown routes stay unresolved", () => {
  assert.equal(registry.getEnterpriseDashboard("penjualan")?.id, "commerce");
  assert.equal(registry.getEnterpriseFeature("akuntansi")?.label, "Akuntansi dan Buku Besar");
  assert.equal(registry.getEnterpriseDashboard("route-tidak-terdaftar"), undefined);
  assert.equal(registry.getEnterpriseFeature("route-tidak-terdaftar"), undefined);
  assert.equal(registry.getEnterprisePillar("penjualan")?.id, "commerce");
});

test("the removed seven-dashboard label is not shown in primary navigation", () => {
  const navigation = readFileSync("src/app/_components/dashboard-navigation.tsx", "utf8");
  const management = readFileSync("src/app/_components/management-dashboard.tsx", "utf8");
  assert.doesNotMatch(navigation, /TUJUH DASHBOARD|Tujuh dashboard/i);
  assert.doesNotMatch(management, /Akses tujuh dashboard/i);
  assert.match(navigation, /RUANG KERJA/);
});

test("Pusat Kendali is the authenticated dashboard landing page for every role", () => {
  const workspace = readFileSync("src/app/_components/workspace.tsx", "utf8");
  const memberWorkspace = readFileSync("src/app/_components/access/role-workspace.tsx", "utf8");
  const route = readFileSync("src/app/dashboard/[[...section]]/page.tsx", "utf8");
  assert.ok(workspace.includes('section === "ringkasan" ? "Pusat Kendali"'));
  assert.ok(memberWorkspace.includes('? "Pusat Kendali"'));
  assert.ok(route.includes('section?.[0] || "ringkasan"'));
  assert.ok(route.includes('item?.label || "Pusat Kendali"'));
  assert.ok(route.includes("dashboardRouteIds"));
  assert.ok(route.includes("getEnterpriseDashboardById"));
  assert.ok(route.includes("dashboardSectionIds"));
  assert.match(workspace, /section === "monitoring"/);
  assert.match(memberWorkspace, /section === "monitoring"/);
  assert.match(memberWorkspace, /mode=\{section === "monitoring" \? "monitoring" : "overview"\}/);
  const overview = readFileSync("src/app/_components/enterprise-dashboard-overview.tsx", "utf8");
  assert.ok(overview.includes("dashboard.features.map"));
  assert.ok(overview.includes("feature.href"));
});

test("legacy permission imports remain compatible after identity extraction", () => {
  assert.equal(permissions.roles.admin, "Administrator");
  assert.equal(permissions.canReadSectionForRole("admin", "akun"), true);
  assert.equal(permissions.canReadSectionForRole("anggota", "akun"), false);
  const member = {
    accountId: "member-1",
    userId: "workspace-1",
    email: "member@example.test",
    displayName: "Member",
    fullName: "Member",
    role: "anggota",
    memberId: "member-1",
    position: "",
    programIds: [],
  };
  assert.equal(
    permissions.canReadRecord(member, { id: "member-1", kind: "anggota", data: {} }),
    true,
  );
  assert.equal(
    permissions.canReadRecord(member, { id: "other-member", kind: "anggota", data: {} }),
    false,
  );
});
