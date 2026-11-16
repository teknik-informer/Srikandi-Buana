# Phase 1 — Controlled Integration Baseline

**Date:** 16 November 2026  
**Status:** Baseline established; integration and database changes are not yet authorized.

## 1. Purpose

Establish a reproducible, non-production integration starting point for the SRIKANDI BUANA modular platform. This branch is documentation-only. It does not merge application code, rewrite migration history, or modify any database.

## 2. Repository and branch references

| Reference | Commit | Role |
|---|---|---|
| `feat/hrm-smart-attendance-001-2026-11-16-v2` | `195b14d965f05c739e8379805144f14a8c93f826` | HRM attendance feature baseline / integration base |
| `feat/workspace-v14-nextadmin-architecture` | `b61382813ab1abc3a41d6a0da70d4f417d429886` | v14 normalized workspace and records sync baseline |
| `feat/v14-engaging-productivity` | `923bc30a016996d98ea8ad6dd8ffb57655358adb` | Additional v14 branch requiring migration provenance review |
| `docs/master-blueprint-phase0-architecture-2026-11-16` | `0f2d116739ddf10593b90d73104eb8c18506b612` | Phase 0 architecture and audit documents |

PR #24 is open Draft and targets `feat/architect-identity-console-2026-11-15`. PR #25 is open Draft and documents Phase 0 on top of the PR #24 branch. Neither PR is merged.

## 3. Confirmed code divergence

GitHub compare reports the HRM baseline and v14 workspace branch are **diverged**, not a simple fast-forward:

- Comparing HRM base to v14: v14 is 728 commits ahead and 628 behind; 186 changed files are reported.
- The reverse comparison reports 628 ahead and 728 behind; 184 changed files are reported.

The v14 branch contains:
- `src/features/workspace-v14/legacy-mapping.mjs`
- `src/features/workspace-v14/legacy-mapping.d.mts`
- `src/lib/workspace-v14-sync.ts`
- A records API path that invokes normalized v14 synchronization.

The HRM branch contains:
- `src/app/api/hrm/attendance/route.ts`
- `src/app/_components/hrm-attendance-workspace.tsx`
- `scripts/verify-smart-attendance.mjs`
- Agriculture API/UI additions.

The HRM branch's attendance persistence is currently a compatibility implementation using owner-scoped `records`; it is not the final normalized HRM schema. The two branches are complementary, but they cannot safely be combined by assuming either branch contains the other.

## 4. Migration lineage inventory

### v14 branch

The inspected v14 migration directory contains:
- 001_initial.sql
- 002_roles.sql
- 003_message_consent.sql
- 004_enterprise_operations.sql
- 005_ecosystem_foundation.sql
- 006_order_receipts_and_journal_corrections.sql
- 007_database_integrity_and_audit.sql
- 008_workspace_v14_core.sql
- 009_document_record_lineage.sql
- 010_member_impact_finance.sql
- 011_member_asset_movement_history.sql
- 012_sales_invoices_and_receipts.sql
- 013_bank_reconciliation.sql
- 014_supplier_bills.sql
- 015_procurement_workflow.sql
- 016_purchase_three_way_match.sql
- 017_inventory_stock_ledger.sql
- 018_inventory_transfers_stocktakes.sql
- 019_inventory_document_lifecycle.sql

### HRM PR #24 branch

The inspected HRM migration directory contains:
- 001_initial.sql
- 002_roles.sql
- 003_message_consent.sql
- 004_enterprise_operations.sql
- 005_ecosystem_foundation.sql
- 005_external_access.sql
- 006_agriculture_domain.sql
- 006_order_receipts_and_journal_corrections.sql
- 007_database_integrity_and_audit.sql
- 008_single_chair_guard.sql
- 009_report_packages.sql
- 010_report_package_source_scope.sql
- 011_verified_email_change.sql
- 012_whatsapp_login_identity.sql
- 013_multi_officer_positions.sql

These are two distinct migration filename families. Numeric prefixes are not globally unique and must not be treated as a reliable chronological ordering across branches.

## 5. QA database risk evidence

Phase 0 read-only inspection recorded:
- 21 distinct migration ledger entries in Neon QA branch `br-mute-meadow-b4rhx1mn`.
- QA has objects corresponding to effects from both migration families.
- QA contains `users_email_lower_unique` and `users_login_phone_unique`.
- PR #24 migration 011 and 012 attempt to create those indexes without `IF NOT EXISTS`, creating a confirmed duplicate-object collision if the runner reaches those statements.
- The complete QA ledger and physical schema are not represented by one inspected branch migration directory.

This is sufficient to prohibit an unreviewed migration run. It is not sufficient to infer the exact order or provenance of every applied DDL statement.

## 6. Non-negotiable safety gates

Until the migration manifest and disposable-branch rehearsal are reviewed:
1. Do not run `npm run db:migrate`, `node scripts/migrate.mjs`, or any migration runner against shared QA or Production.
2. Do not insert, rename, delete, or rewrite migration ledger rows to make branch histories appear aligned.
3. Do not edit historical migration files to retrofit idempotency.
4. Do not backfill, drop, rename, or alter shared QA/Production data or schema.
5. Do not merge PR #24 or PR #25 as a substitute for the integration work.
6. Do not change Production secrets, Vercel configuration, domains, or deployment aliases.

## 7. Required next work

### Workstream A — Complete migration manifest
For every migration file on the relevant branches, collect:
- Branch, commit SHA, path, and SHA-256 content hash.
- Every CREATE/ALTER/DROP statement and affected object.
- Constraints, indexes, triggers, functions, enums/check values and policies.
- Preconditions, data assumptions, lock/availability impact, and reversibility.
- Whether the exact file is recorded in the QA migration ledger.

Then compare expected object definitions with read-only QA metadata. Minimize access to personal and financial row data.

### Workstream B — Selective application-code integration
Create an integration candidate from the HRM baseline and selectively bring in the v14 normalized write adapter and its required mapping modules. Preserve HRM attendance and agriculture API behavior. Inspect every overlapping records API change and preserve same-transaction audit and normalized writes. Do not merge all 186 changed files blindly.

### Workstream C — Verification
Add regression coverage for:
- Legacy records behavior and v14 normalized synchronization.
- Attendance create/check-in/duplicate prevention/correction/export and role scope.
- Agriculture endpoints and existing external-access behavior.
- Tenant/workspace isolation, audit atomicity, and finance posting idempotency.
- Existing navigation, identity, and project regressions.

### Workstream D — Database rehearsal
Only after the manifest is complete, create a disposable Neon child branch from the observed QA state. Test a forward-only compatibility migration there, compare before/after schema definitions, validate row preservation and API behavior, and document recovery steps. Shared QA and Production require separate explicit approval gates.

## 8. Acceptance criteria

Phase 1 integration is not complete until:
- One reviewed application commit contains both the required v14 sync path and HRM attendance/agriculture behavior.
- The complete migration manifest explains the QA ledger and actual schema without rewriting historical provenance.
- Automated regression tests pass on the integration candidate.
- Disposable Neon child-branch rehearsal succeeds with recorded schema and data-integrity evidence.
- A reviewable PR describes exact scope, test results, residual risks, and the next approval gate.

**Current result:** integration baseline branch created from the HRM commit. This document is the only intended change in this baseline branch. No code merge, SQL migration, database mutation, or Production operation has been performed.
