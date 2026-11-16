# SRIKANDI BUANA — Migration Lineage Reconciliation

**Audit date:** 16 November 2026  
**Scope:** Repository migration directories and read-only Neon QA migration ledger  
**Status:** Reconciliation required; execution remains frozen  
**Production:** Not queried or modified

## 1. Executive finding

The QA database has **21 distinct migration ledger entries**. Its history is a composite of two migration families:

- The legacy/platform family through 007_database_integrity_and_audit.sql, including both 005_ecosystem_foundation.sql, 005_external_access.sql, 006_agriculture_domain.sql, and 006_order_receipts_and_journal_corrections.sql.
- The normalized v14/ERP family 008_workspace_v14_core.sql through 019_inventory_document_lifecycle.sql.

The exact 008–019 filenames are present together on both repository branches:
- feat/workspace-v14-nextadmin-architecture
- feat/v14-engaging-productivity

The audited PR #24 branch feat/hrm-smart-attendance-001-2026-11-16-v2 instead contains a different sequence from 008 through 013:
- 008_single_chair_guard.sql
- 009_report_packages.sql
- 010_report_package_source_scope.sql
- 011_verified_email_change.sql
- 012_whatsapp_login_identity.sql
- 013_multi_officer_positions.sql

Those filenames are not in the QA ledger. Conversely, the PR #24 migration directory does not contain the QA's v14 files 008–019.

**Conclusion:** QA is not represented by one current migration directory. It has a composite history, while the PR #24 migration runner sees a different set of files. This is a confirmed migration-lineage divergence. It is not yet proof that every unrecorded PR #24 migration would fail; each migration's DDL effects and preconditions must be checked against the actual QA schema before any execution.

## 2. Evidence collected

### 2.1 QA ledger count

Read-only query on Neon QA branch br-mute-meadow-b4rhx1mn, database neondb:

~~~sql
SELECT
  COUNT(*) AS total_entries,
  COUNT(DISTINCT name) AS distinct_names,
  MIN(applied_at) AS first_applied_at,
  MAX(applied_at) AS last_applied_at
FROM schema_migrations;
~~~

Result: **21 total entries, 21 distinct filenames**. The ledger has no duplicate filename values.

### 2.2 Filename comparison

| QA ledger migration | PR #24 branch | v14 branches |
|---|---|---|
| 001–004 | Same filenames | Same filenames |
| 005 ecosystem foundation | Same filename | Same filename |
| 005 external access | Same filename | Not present in inspected v14 directories |
| 006 agriculture domain | Same filename | Not present in inspected v14 directories |
| 006 order receipts and journal corrections | Same filename | Same filename |
| 007 database integrity and audit | Same filename | Same filename |
| 008 workspace v14 core | Different file: single chair guard | Exact filename present |
| 009 document record lineage | Different file: report packages | Exact filename present |
| 010 member impact finance | Different file: report package source scope | Exact filename present |
| 011 member asset movement history | Different file: verified email change | Exact filename present |
| 012 sales invoices and receipts | Different file: WhatsApp login identity | Exact filename present |
| 013 bank reconciliation | Different file: multi-officer positions | Exact filename present |
| 014 supplier bills | Not present | Exact filename present |
| 015 procurement workflow | Not present | Exact filename present |
| 016 purchase three-way match | Not present | Exact filename present |
| 017 inventory stock ledger | Not present | Exact filename present |
| 018 inventory transfers and stocktakes | Not present | Exact filename present |
| 019 inventory document lifecycle | Not present | Exact filename present |

The v14 filenames were inspected on both feat/workspace-v14-nextadmin-architecture and feat/v14-engaging-productivity. The PR #24 migration files were inspected directly from feat/hrm-smart-attendance-001-2026-11-16-v2.

### 2.3 Runner behavior

The PR #24 branch's scripts/migrate.mjs:
1. Reads every .sql file in migrations/.
2. Sorts filenames lexicographically.
3. Checks schema_migrations for the **complete filename**.
4. Runs every file whose exact filename is not already recorded.
5. Inserts the exact filename after the statements execute in a transaction.

Therefore, the numeric prefix is not a compatibility key. A migration named 008_single_chair_guard.sql is considered unapplied when the ledger contains 008_workspace_v14_core.sql. The same applies to 009–013. The runner will attempt to apply the PR #24 files as new migrations.

The runner also creates schema_migrations if missing. Do not use it as a schema discovery or repair tool on a database with uncertain lineage.

## 3. Operational risk

Running the PR #24 migration runner on the shared QA branch without a migration-by-migration review can:
- Apply a second set of schema changes over an already-evolved v14 schema.
- Encounter missing assumptions, duplicate objects, changed constraints, or incompatible data preconditions.
- Produce a ledger that no longer corresponds cleanly to a reviewed release baseline.
- Make later branch promotion and recovery harder to reason about.

A migration being additive or using IF NOT EXISTS does not by itself prove it is safe. Constraint replacement, index semantics, trigger/function replacement, backfills, and assumptions about existing rows still require review.

## 4. Required reconciliation procedure

### Gate A — Freeze and preserve
- Do not run npm run db:migrate, node scripts/migrate.mjs, or any migration runner on shared QA or Production.
- Preserve the current QA branch and its ledger as evidence.
- Do not edit historical migration files or rewrite ledger rows to make filenames appear aligned.

### Gate B — Build a complete manifest
For every active branch and migration file, record:
- Branch and commit SHA.
- Exact filename and content SHA-256.
- DDL/DML objects created, altered, or dropped.
- Constraints, indexes, triggers, functions, enum/check values and policies changed.
- Preconditions, data assumptions, and whether the migration is reversible.
- Whether the exact file is recorded in the QA ledger.

### Gate C — Compare actual QA schema
- Export table, column, constraint, index, trigger, function and sequence definitions from QA using read-only inspection.
- Compare the actual definitions with the expected result after each candidate migration.
- Check row counts and referential-integrity exceptions only where a migration's preconditions require it; minimize access to personal or financial row data.
- Establish which application commit is compatible with the actual QA schema, rather than selecting a branch by name alone.

### Gate D — Rehearse
- Create a disposable Neon child branch from the current QA state.
- Test a forward-only compatibility plan on that disposable branch.
- Verify migration idempotency where intended, data preservation, API behavior, authorization, and representative UAT.
- Record exact before/after schema diffs and test results.

### Gate E — Promote deliberately
- Only after review, prepare a new forward-only migration with a unique, monotonic version/name in the canonical migration stream.
- Do not rename or rewrite already-applied historical files.
- Require explicit approval before changing shared QA.
- Production remains a separate approval gate and is not authorized by this document.

## 5. Canonicalization decision still required

The repository must choose and document one canonical migration history before more schema work is merged. The choice must be based on:
1. The exact QA schema and ledger.
2. The application commit that consumes those schema objects.
3. Complete DDL comparison of all divergent migration files.
4. A tested forward-only reconciliation plan.

Do not declare either the PR #24 branch or the v14 branches canonical solely because their filenames look newer or because their tables exist in QA.

## 6. Safety record

- Only repository files and branch metadata were read.
- Neon QA inspection used read-only SELECT/schema metadata queries.
- No migration was executed.
- No QA schema or data was changed.
- No Production database was queried or modified.
- No Production secrets, environment variables or deployments were changed.
