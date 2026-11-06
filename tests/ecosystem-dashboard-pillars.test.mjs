import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("management overview exposes role-aware quick links for enterprise pillars", () => {
  const source = readFileSync("src/app/_components/management-dashboard.tsx", "utf8");
  assert.ok(source.includes("getVisibleEnterprisePillars(user.role)"));
  assert.ok(source.includes('aria-labelledby="workspace-pillars-title"'));
  assert.ok(source.includes("pillar.features.length"));
  assert.ok(source.includes("pillar.features[0].href"));
  assert.ok(source.includes("2xl:grid-cols-5"));
});
