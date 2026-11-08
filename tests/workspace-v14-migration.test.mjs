import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("v14 database migration is additive and preserves every legacy source", () => {
  const sql = read("migrations/008_workspace_v14_core.sql");
  assert.ok(sql.includes("CREATE SCHEMA IF NOT EXISTS workspace_v14"));
  assert.ok(sql.includes("workspace_v14.organization_memberships"));
  assert.ok(sql.includes("workspace_v14.partner_organizations"));
  assert.ok(sql.includes("workspace_v14.programmes"));
  assert.ok(sql.includes("workspace_v14.activities"));
  assert.ok(sql.includes("workspace_v14.activity_attendance"));
  assert.ok(sql.includes("workspace_v14.tasks"));
  assert.ok(sql.includes("workspace_v14.documents"));
  assert.ok(sql.includes("workspace_v14.supply_lot_transformations"));
  assert.ok(sql.includes("workspace_v14.market_quotes"));
  assert.ok(sql.includes("workspace_v14.impact_indicators"));
  assert.ok(sql.includes("workspace_v14.safeguarding_cases"));
  assert.ok(sql.includes("workspace_v14.legacy_record_map"));
  assert.ok(sql.includes("'pending_transform'"));
  assert.ok(sql.includes("md5(r.data)"));
  assert.ok(!/\bDROP\s+(TABLE|SCHEMA|COLUMN)\b/i.test(sql));
  assert.ok(!/\bTRUNCATE\b/i.test(sql));
  assert.ok(!/\bDELETE\s+FROM\s+public\.(users|records|files)\b/i.test(sql));
});

test("v14 QA rehearsal report records the non-destructive boundary", () => {
  const report = read("docs/architecture/v14/QA_MIGRATION_REHEARSAL.md");
  assert.ok(report.includes("br-raspy-water-b4fhxzr9"));
  assert.ok(report.includes("br-mute-meadow-b4rhx1mn"));
  assert.ok(report.includes("No SQL migration was run against Production"));
  assert.ok(report.includes("pending_transform"));
  assert.ok(report.includes("Do not drop or truncate legacy tables"));
});
