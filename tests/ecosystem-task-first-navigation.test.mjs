import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("dashboard navigation has one clearly labeled global menu search", () => {
  const navigation = read("src/app/_components/dashboard-navigation.tsx");
  const shell = read("src/app/_components/workspace-shell.tsx");
  const sidebar = navigation.slice(
    navigation.indexOf("export default function DashboardNavigation"),
    navigation.indexOf("export function DashboardMegaMenu"),
  );

  assert.doesNotMatch(sidebar, /dashboard-menu-search|dashboard-nav-search/);
  assert.match(sidebar, /getVisibleEnterpriseDashboards\(user\.role\)/);
  assert.match(sidebar, /getVisibleEnterpriseUtilities\(user\.role\)/);
  assert.match(navigation, /navigationMatches\(feature, query\)/);
  assert.match(navigation, /dashboard-app-menu-label[^>]*>Cari menu/);
  assert.match(navigation, /<kbd>⌘ K<\/kbd>/);
  assert.match(shell, /<DashboardMegaMenu section=\{section\} user=\{user\} \/>/);
  const css = read("src/app/globals.css");
  assert.ok(css.includes(".workspace-header .dashboard-app-menu-label,.workspace-header .dashboard-app-menu kbd{display:none}"));
  assert.ok(css.includes("@media(pointer:coarse){.workspace-header .dashboard-app-menu{min-width:44px;min-height:44px}}"));
  assert.doesNotMatch(shell, /<DashboardMegaMenu[^>]*compact/);
});

test("early-stage setup steps use actual accessible records and never imply formal verification", () => {
  const management = read("src/app/_components/management-audience-dashboard.tsx");
  const operatingModel = read("docs/RANCANGAN_OPERASIONAL_AWAL_KWT_SRIKANDI_BUANA.md");

  assert.match(management, /const foundationSteps = \[/);
  assert.match(management, /canReadSection\(user, "pengurus"\)/);
  assert.match(management, /membersAccess \?/);
  assert.match(management, /programAccess \?/);
  assert.match(management, /insights\.rows\.some\(\(row\) => row\.kind === "kegiatan"\)/);
  assert.match(management, /Status tercatat tidak otomatis berarti data telah diverifikasi atau disahkan/);
  assert.match(management, /Belum ada catatan · Mulai di sini/);
  assert.match(operatingModel, /RANCANGAN KERJA — belum disahkan oleh kelompok/);
  assert.match(operatingModel, /Administrator teknis bukan pengganti keputusan/);
});

test("management landing page surfaces role-scoped priorities before analytics", () => {
  const management = read("src/app/_components/management-audience-dashboard.tsx");
  const priority = management.indexOf("Prioritas pekerjaan");
  const analytics = management.indexOf('aria-label="Analisis organisasi"');

  assert.ok(priority >= 0, "Management dashboard must have a priority-work section");
  assert.ok(analytics >= 0, "Management dashboard must retain organizational analytics");
  assert.ok(priority < analytics, "Actionable priorities must appear before analytics");
  assert.match(management, /recordHref\(issue\.row\)/);
  assert.match(management, /quickLinks\.map/);
});

console.log("Task-first navigation checks passed.");
