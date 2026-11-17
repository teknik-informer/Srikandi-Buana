# Production Migration Reconciliation

## Status

<badge>Blocking gate for database migration</badge>

This is a read-only audit of the Production database migration ledger and the repository migration directory. It is not a migration plan approval.

## Audit result — 17 November 2026

The Production application database `neondb` contains 21 rows in `public.schema_migrations`.

The connected repository branch `integration/phase1-preview-2026-11-16` contains 15 SQL files in `migrations/`.

| Comparison | Count |
|---|---:|
| Present in both repository and Production ledger | 9 |
| Repository SQL not recorded in Production | 6 |
| Production ledger entries with no matching repository SQL | 12 |
| **Production ledger entries** | **21** |
| **Repository SQL files** | **15** |

### Present in both

- `001_initial.sql`
- `002_roles.sql`
- `003_message_consent.sql`
- `004_enterprise_operations.sql`
- `005_ecosystem_foundation.sql`
- `005_external_access.sql`
- `006_agriculture_domain.sql`
- `006_order_receipts_and_journal_corrections.sql`
- `007_database_integrity_and_audit.sql`

### Present in the repository but not recorded in Production

- `008_single_chair_guard.sql`
- `009_report_packages.sql`
- `010_report_package_source_scope.sql`
- `011_verified_email_change.sql`
- `012_whatsapp_login_identity.sql`
- `013_multi_officer_positions.sql`

These are pending from the ledger's perspective. Their safety and intended deployment order must be reviewed; their presence in Git is not approval to run them.

### Recorded in Production but absent from the repository

- `008_workspace_v14_core.sql`
- `009_document_record_lineage.sql`
- `010_member_impact_finance.sql`
- `011_member_asset_movement_history.sql`
- `012_sales_invoices_and_receipts.sql`
- `013_bank_reconciliation.sql`
- `014_supplier_bills.sql`
- `015_procurement_workflow.sql`
- `016_purchase_three_way_match.sql`
- `017_inventory_stock_ledger.sql`
- `018_inventory_transfers_stocktakes.sql`
- `019_inventory_document_lifecycle.sql`

The source SQL for these database-only entries has now been restored to the v13 repository from the historical `feat/workspace-v14-nextadmin-architecture` source branch. The repository contains the 21 files matching the Production ledger, plus six previously pending v12 migrations and the new v13 migration 020. This filename reconciliation does not authorize running the pending migrations on Production.

## Reconciliation update — 17 November 2026, Preview QA

- Recovered the 12 workspace v14 source SQL files from the historical source branch and restored their original filenames.
- Patched `011_verified_email_change.sql` so it preserves the existing `activate_wa` and `reset_wa` invitation purpose values introduced by migration 012.
- Rehearsed the pending migrations and `020_platform_module_access.sql` on sanitized Neon QA branches only.
- QA now contains the four persistent platform access tables and 13 seeded module registry entries; the production database remains unchanged.
- The Preview Vercel environment uses the sanitized QA branch `br-mute-meadow-b4rhx1mn`. The rehearsal branch `br-snowy-forest-b46i5pqx` is a separate child used for migration verification.
- No Production migration, account edit or Production deployment was performed by this reconciliation.

## Why this blocks Production migration

The existing migration runner applies every repository SQL file whose filename is not present in `schema_migrations`. If the database contains migration entries whose source files are missing from the repository, the runner cannot prove the complete migration lineage before attempting later changes.

Applying pending files on top of an untracked schema history can cause duplicate objects, conflicting constraints, missing assumptions or a schema that cannot be reproduced from Git.

## Safeguards introduced in this implementation

- Added `npm run db:migration-audit` — read-only comparison of repository filenames with `public.schema_migrations`.
- Added a reusable migration-name comparison helper and automated tests.
- Updated `scripts/migrate.mjs` to compare the database ledger before applying any new SQL.
- The migration runner now fails closed when database-only entries exist. It reports the missing filenames and executes no new migration.
- The audit script does not create the migration table and does not change data or schema.

The fail-closed guard prevents applying further SQL when the ledger cannot be reproduced from the repository. Filename reconciliation is now restored for the 21 Production entries. The six previously pending migrations and 020 still require a separate review and explicit Production approval.

## Required reconciliation steps

1. Retrieve the missing workspace v14 SQL files from the original authoritative change history, backup or migration artifact archive.
2. Verify each recovered file against the current Production schema and the expected order.
3. Review repository-only migration files and identify whether each should remain pending, be superseded or be replaced by a reconciled migration.
4. Create a single ordered migration manifest with immutable filenames and checksums.
5. Rehearse the full lineage against an isolated Neon QA branch, not Production.
6. Compare table definitions, indexes, constraints, functions, triggers, row counts and critical invariants.
7. Run the application regression suite against the QA branch and verify rollback/recovery.
8. Obtain separate explicit Production migration approval before running any Production migration.

Do not rename a ledger entry just to make two filename lists match. Do not delete migration ledger rows. Do not fabricate historical timestamps or claim a reconstructed SQL file is the original source.

## Commands

Read-only audit:

```bash
npm run db:migration-audit
```

Migration runner (guarded; not authorized for Production by this document):

```bash
npm run db:migrate
```

Production migration remains blocked until the database-only history is reconciled and the QA rehearsal has passed.
