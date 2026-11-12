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
  assert.match(navigation, /Cari menu<kbd>⌘ K<\/kbd>/);
  assert.match(shell, /<DashboardMegaMenu section=\{section\} user=\{user\} \/>/);
  assert.doesNotMatch(shell, /<DashboardMegaMenu[^>]*compact/);
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
