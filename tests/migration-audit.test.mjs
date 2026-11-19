import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareMigrationNames } from "../src/features/shared/migration-audit.mjs";

test("migration audit distinguishes shared, pending and database-only entries", () => {
  const result = compareMigrationNames(
    ["001_initial.sql", "002_roles.sql", "003_new.sql"],
    ["001_initial.sql", "002_roles.sql", "008_missing-source.sql"],
  );
  assert.deepEqual(result.common, ["001_initial.sql", "002_roles.sql"]);
  assert.deepEqual(result.repositoryOnly, ["003_new.sql"]);
  assert.deepEqual(result.databaseOnly, ["008_missing-source.sql"]);
});

test("migration audit is read-only and the runner stops on database-only drift", () => {
  const audit = readFileSync("scripts/audit-migrations.mjs", "utf8");
  const runner = readFileSync("scripts/migrate.mjs", "utf8");
  assert.match(audit, /SELECT name FROM public\.schema_migrations/);
  assert.doesNotMatch(audit, /\b(?:CREATE|INSERT|UPDATE|DELETE|ALTER|DROP)\s+(?:TABLE|INTO|SET|FROM|COLUMN|SCHEMA)\b/i);
  assert.match(runner, /MIGRATION_TARGET/);
  assert.match(runner, /PRODUCTION_MIGRATION_APPROVAL/);
  assert.match(runner, /PRODUCTION_MIGRATION_FILES/);
  assert.match(runner, /comparison\.databaseOnly\.length/);
  assert.match(runner, /Migrasi dihentikan/);
  assert.match(runner, /tidak ada migrasi baru yang dijalankan/);
});
