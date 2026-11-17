import { neon } from "@neondatabase/serverless";
import { readdir } from "node:fs/promises";
import { databaseUrlForEnvironment } from "../src/features/shared/database-target.mjs";
import { compareMigrationNames } from "../src/features/shared/migration-audit.mjs";

const databaseUrl = databaseUrlForEnvironment(process.env);
if (!databaseUrl) {
  throw new Error(process.env.VERCEL_ENV === "preview"
    ? "Preview memerlukan PREVIEW_DATABASE_URL khusus staging. Audit tidak dijalankan."
    : "Isi DATABASE_URL pada environment yang memang dituju untuk audit.");
}

const sql = neon(databaseUrl);
const repositoryNames = (await readdir(new URL("../migrations/", import.meta.url)))
  .filter((name) => name.endsWith(".sql"))
  .sort();

const ledgerCheck = await sql.query("SELECT to_regclass('public.schema_migrations') AS table_name");
if (!ledgerCheck[0]?.table_name) {
  console.error("Migration ledger public.schema_migrations belum tersedia. Audit berhenti tanpa membuat tabel.");
  process.exitCode = 2;
} else {
  const appliedRows = await sql.query("SELECT name FROM public.schema_migrations ORDER BY name");
  const appliedNames = appliedRows.map((row) => String(row.name));
  const comparison = compareMigrationNames(repositoryNames, appliedNames);

  console.log("Migration ledger audit (read-only)");
  console.log("SQL files in repository:", repositoryNames.length);
  console.log("Entries in database ledger:", appliedNames.length);
  console.log("Shared entries:", comparison.common.length);
  console.log("Pending repository files:", comparison.repositoryOnly.length);
  console.log("Database-only entries:", comparison.databaseOnly.length);

  if (comparison.repositoryOnly.length) {
    console.log("\nRepository files not recorded in database:");
    for (const name of comparison.repositoryOnly) console.log("  +", name);
  }
  if (comparison.databaseOnly.length) {
    console.error("\nDatabase entries without matching repository SQL:");
    for (const name of comparison.databaseOnly) console.error("  !", name);
    console.error("\nSTOP: reconcile the missing migration sources before running db:migrate.");
    process.exitCode = 2;
  } else {
    console.log("\nNo database-only migration drift detected. Pending migrations still require QA and approval before Production.");
  }
}
