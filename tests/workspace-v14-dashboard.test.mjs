import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const overview = read("src/app/_components/enterprise-dashboard-overview.tsx");
const registry = read("src/features/enterprise/registry.ts");
const monitoring = read("src/lib/enterprise-monitoring.ts");
const help = read("src/app/_components/help-center.tsx");
const route = read("src/app/dashboard/[[...section]]/page.tsx");

test("v14 exposes exactly seven named dashboard domains", () => {
  const ids = [...registry.matchAll(/^\s+id: "(ecosystem|management|administration|finance|commerce|publication|system)",$/gm)].map((m) => m[1]);
  assert.deepEqual(ids, ["ecosystem", "management", "administration", "finance", "commerce", "publication", "system"]);
  assert.match(registry, /id: "monitoring"/);
  assert.match(registry, /id: "laporan"/);
});

test("dashboard summaries use scoped workspace records and have explicit loading/error states", () => {
  assert.match(overview, /useWorkspaceData\(\)/);
  assert.match(overview, /buildEnterpriseMonitoring\(rows, files, user\)/);
  assert.match(overview, /getVisibleEnterpriseUtilities\(user\.role\)/);
  assert.match(overview, /loading \?/);
  assert.match(overview, /error &&/);
  assert.match(overview, /onClick=\{\(\) => void load\(\)\}/);
  assert.match(overview, /!s\.finance \? "—"/);
  assert.match(overview, /s\.finance\.balanceSafe \? rupiah\(s\.finance\.balance\)/);
  assert.doesNotMatch(overview, /Math\.random|faker|mockData|dummyData/i);
});

test("monitoring data is filtered before metrics are calculated and finance is withheld when unavailable", () => {
  assert.match(monitoring, /buildManagementInsights\(input, files, user, now\)/);
  assert.match(monitoring, /const rows = insights\.rows/);
  assert.match(monitoring, /const finance = insights\.cashAvailable/);
  assert.match(monitoring, /: null;/);
  assert.match(monitoring, /canReadSection\(user, "tindaklanjut"\)/);
  assert.match(monitoring, /canReadSection\(user, "anggota"\)/);
});

test("Help Center documents templates but directs data entry to owning modules", () => {
  assert.match(help, /Panduan dan rancangan formulir/);
  assert.match(help, /bukan menu input/);
  assert.match(help, /Menu input pemilik data/);
  assert.match(help, /Buka menu input/);
  assert.match(help, /field_mapping_pending/);
  assert.match(help, /tidak dianggap sudah tersedia atau tersimpan/);
});

test("dashboard routes require an authenticated user and enforce role visibility", () => {
  assert.match(route, /getAuthenticatedUser\(\)/);
  assert.match(route, /getVisibleEnterpriseDashboards\(admin\.role\)/);
  assert.match(route, /canReadSection\(admin, active\)/);
  assert.match(route, /EnterpriseDashboardOverview dashboard=\{visibleDashboard\} user=\{admin\}/);
});
