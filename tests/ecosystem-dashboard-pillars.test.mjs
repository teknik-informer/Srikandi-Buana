import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Pusat Kendali exposes role-aware launch cards for the seven enterprise dashboards", () => {
  const source = readFileSync("src/app/_components/management-dashboard.tsx", "utf8");
  assert.ok(source.includes("getVisibleEnterpriseDashboards(user.role)"));
  assert.ok(source.includes('aria-labelledby="workspace-dashboards-title"'));
  assert.ok(source.includes("dashboard.features.length"));
  assert.ok(source.includes("dashboard.href"));
  assert.ok(source.includes("dashboard.features.slice(0, 4)"));
  assert.ok(source.includes("2xl:grid-cols-4"));
});
