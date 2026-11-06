import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { databaseUrlForEnvironment } from "../src/features/shared/database-target.mjs";

test("Preview never falls back to the shared Production database URL", () => {
  assert.equal(databaseUrlForEnvironment({
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgres://production",
  }), undefined);
  assert.equal(databaseUrlForEnvironment({
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgres://production",
    PREVIEW_DATABASE_URL: "postgres://staging",
  }), "postgres://staging");
});

test("Production and local development retain the normal database URL", () => {
  assert.equal(databaseUrlForEnvironment({
    VERCEL_ENV: "production",
    DATABASE_URL: "postgres://production",
    PREVIEW_DATABASE_URL: "postgres://staging",
  }), "postgres://production");
  assert.equal(databaseUrlForEnvironment({
    DATABASE_URL: "postgres://local",
  }), "postgres://local");
  assert.equal(databaseUrlForEnvironment({ VERCEL_ENV: "preview" }), undefined);
});

test("runtime and database administration scripts use the same environment guard", () => {
  const runtime = readFileSync("src/lib/runtime.ts", "utf8");
  assert.ok(runtime.includes("databaseUrlForEnvironment(process.env)"));
  for (const path of ["scripts/migrate.mjs", "scripts/create-admin.mjs", "scripts/import-data.mjs"]) {
    const source = readFileSync(path, "utf8");
    assert.ok(source.includes("databaseUrlForEnvironment(process.env)"), path);
    assert.ok(!source.includes("neon(process.env.DATABASE_URL)"), path);
  }
});

test("health and readiness endpoints return minimal non-cacheable status", () => {
  const health = readFileSync("src/app/api/health/route.ts", "utf8");
  const ready = readFileSync("src/app/api/ready/route.ts", "utf8");
  assert.ok(health.includes('status: "ok"'));
  assert.ok(health.includes('"Cache-Control": "no-store"'));
  assert.ok(ready.includes('await env.DB.prepare("SELECT 1 AS ok").first()'));
  assert.ok(ready.includes("status: 503"));
  assert.ok(ready.includes('"Cache-Control": "no-store"'));
  assert.ok(!ready.includes("process.env.DATABASE_URL"));
  assert.ok(!ready.includes("connectionString"));
});
