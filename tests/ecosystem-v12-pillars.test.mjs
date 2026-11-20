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

test("pusat aplikasi memakai enam aplikasi kanonis", () => {
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.id), ["platform-core", "organization", "agriculture", "business", "bi-analytics", "public-partnership"]);
  assert.deepEqual(Array.from(registry.enterpriseDashboards, (dashboard) => dashboard.label), ["Platform Core", "Organization Management", "Agriculture Management", "Business & Enterprise", "BI & Analytics", "Public & Partnership"]);
  for (const dashboard of registry.enterpriseDashboards) {
    assert.equal(dashboard.href, "/dashboard/" + dashboard.id);
    assert.equal(registry.getEnterpriseDashboardById(dashboard.id)?.id, dashboard.id);
  }
});

test("seluruh rute fitur lama tetap tersedia tepat satu kali", () => {
  assert.equal(new Set(assigned).size, assigned.length);
  assert.equal(new Set(registry.dashboardSectionIds).size, registry.dashboardSectionIds.length);
  assert.deepEqual([...assigned].sort(), [...expected].filter((id) => id !== "monitoring").sort());
  assert.equal(registry.getEnterpriseFeature("monitoring")?.href, "/dashboard/monitoring");
});

test("fitur enam aplikasi terpetakan ke domain yang benar", () => {
  const ids = (area) => Array.from(registry.enterpriseDashboards.find((dashboard) => dashboard.id === area).features, (feature) => feature.id);
  assert.deepEqual(ids("platform-core"), ["notifikasi", "surat", "kelembagaan", "dokumen", "akun", "akun-saya", "pengaturan", "panduan"]);
  assert.deepEqual(ids("organization"), ["portal", "anggota", "pengurus", "musyawarah", "persetujuan", "program", "kegiatan", "kehadiran", "pengajuan", "enterprise"]);
  assert.deepEqual(ids("agriculture"), ["pertanian", "laporan_program", "tindaklanjut", "lotkopi"]);
  assert.deepEqual(ids("business"), ["usaha", "penjualan", "kas", "akuntansi", "aset", "laporan"]);
  assert.deepEqual(ids("bi-analytics"), ["transkripsi", "register", "sumber"]);
  assert.deepEqual(ids("public-partnership"), ["publikasi", "galeri", "pesan", "kemitraan", "akses-eksternal"]);
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
  assert.match(navigation, /ENAM APLIKASI/);
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
