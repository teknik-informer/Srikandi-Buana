# v14 — Protected Database Rebuild and Migration Strategy

## 1. Current database audit (2026-11-08)

Project: Neon project `holy-night-99324539`, PostgreSQL 18, database `neondb`.

The production, QA and rehearsal branches expose the same core application table family. Production and the rehearsal branch returned the same aggregate counts during this audit:

| Table group | Production | Rehearsal |
|---|---:|---:|
| users | 2 | 2 |
| records | 4 | 4 |
| file_objects | 1 | 1 |
| sessions | 6 | 6 |
| operational_requests | 0 | 0 |
| operational_events | 0 | 0 |
| commerce_products | 0 | 0 |
| commerce_orders | 0 | 0 |
| ledger_entries | 0 | 0 |
| messages | 0 | 0 |

The four records in the production/rehearsal copy are one each of `anggota`, `kelembagaan`, `program` and `register`. The sanitized QA branch returned one user, one record and five sessions. These are aggregate counts only; no personal field values were read for this inventory.

The current production/rehearsal migration ledger contains migrations 001–007:

- 001_initial.sql
- 002_roles.sql
- 003_message_consent.sql
- 004_enterprise_operations.sql
- 005_ecosystem_foundation.sql
- 006_order_receipts_and_journal_corrections.sql
- 007_database_integrity_and_audit.sql

The legacy application still relies heavily on `records(owner, kind, data JSON-text, created, updated)`, plus commerce, finance, user/session, notification and file tables. This is a compatibility layer, not the desired long-term domain model.

## 2. Backup and branch constraints

- A manual Production snapshot already exists: `snap-spring-moon-b4psj4ky`, created 2026-11-07 00:10:16 UTC, named `SRIKANDI-BUANA-PRODUCTION-PRE-V12-2026-11-07`.
- Neon rejected creation of another snapshot because the project's snapshot limit is reached. Do not delete the existing snapshot to make room.
- A Production safety-copy branch exists: `br-proud-mountain-b4iil876`. Neon reports its branch metadata, but no compute endpoint is available to query its schema; treat it as a preserved branch, not as a verified live rollback test.
- The migration rehearsal branch `br-raspy-water-b4fhxzr9` was queried successfully and matched Production's aggregate counts above.
- Neon branch capacity is 10/10. Do not delete any branch merely to free a slot. Resolve each branch's owner, parent, data age and retention need before proposing cleanup.
- Production remains the live data source. Do not use Production for initial schema experiments or data transformation.

## 3. Target v14 data architecture

Use a normalized, organization-scoped domain model behind a repository layer. Preserve the legacy schema during transition.

Core domain families:

1. **Identity and tenancy** — organizations, organization hierarchy, user memberships, role grants, programme/site scopes and expiry.
2. **People and CRM** — member/person/party profiles, partner organizations, contact points, relationship history, interactions and follow-ups.
3. **Programmes and MEAL** — programme definitions, approved versions, programme membership, beneficiary enrolment, activity, output/outcome indicators, baseline/target/actual evidence.
4. **Work management** — tasks, task assignments, status events, calendar events, meetings, minutes, attendance and field visits.
5. **Documents and evidence** — private file metadata, document register, source/version, evidence links, consent scope, retention and audit history.
6. **Supply chain and commerce** — products, product forms, inventory locations, stock movements, lots, lot transformations, intake, quality observations, orders and fulfilment.
7. **Finance and procurement** — funds, budgets, chart of accounts, journals, journal lines, grant restrictions, purchase requests, approvals and reconciliation.
8. **Communication and safeguarding** — inbox messages, notifications, grievances and restricted case access.
9. **Platform and audit** — user settings, feature flags, integration state, idempotency keys, immutable security and business audit events.

Every tenant-owned row must include a stable organization scope. Personal data, financial records, safeguarding cases and partner-restricted data require separate access policies. A platform administrator must not inherit unrestricted visibility into all tenant business data.

## 4. Migration approach

### Phase A — Contract and baseline

- Freeze the v14 target schema and map every legacy field and record kind to a new domain.
- Capture a new Production restore point when the provider allows it. Until then, retain the existing snapshot and the rehearsal/safety branches; do not claim a current point-in-time backup is available.
- Record per-table row counts, record-kind counts, primary/foreign key relationships, index definitions and file metadata totals.
- Verify access to the backup branches and confirm their restore path before any Production cutover.
- Do not migrate private file bytes into public storage.

### Phase B — QA rehearsal

- Apply additive v14 schema changes to the designated rehearsal/QA database only.
- Backfill organization identity, memberships, records and file metadata with stable source IDs.
- Validate record counts by source and destination, deduplication, owner scope, null/zero semantics, consent and evidence lineage.
- Run authorization tests for every role and tenant boundary.
- Rehearse rollback and re-run all v11.5/v12 compatibility tests.
- Keep all old tables intact during this phase.

### Phase C — Application dual-read / controlled write

- Use a versioned repository interface to read the canonical v14 tables, with an explicit fallback for legacy records.
- Write only to the canonical owning domain once a migration is verified; use idempotency keys and audit events.
- Run consistency checks between legacy and v14 records. Do not silently write two independent copies without a reconciliation rule.
- Switch one domain at a time: identity/organization, members, activities/tasks, documents, partners, supply chain, finance.

### Phase D — Production cutover

A separate go/no-go review is required. Before it:
- A fresh backup/restore point is verified.
- QA migration and application tests pass.
- Data reconciliation has zero unexplained loss or duplicates.
- Role and tenant-isolation tests pass.
- Rollback is rehearsed and the rollback owner is known.
- A cutover window and read-only/freeze strategy are documented.

The Production change is a separate operation. This architecture work does not authorise dropping, truncating or overwriting existing Production tables.

### Phase E — Legacy retirement

Old schemas become read-only and archived only after:
- Every old record has a mapped destination or a documented exclusion.
- No supported route/API depends on the old representation.
- Historical audit and evidence are preserved.
- A retention period and export are agreed.
- The user approves the exact retirement list.

## 5. Explicit non-goals

- No immediate deletion or truncation of current data.
- No re-running migrations 005–007.
- No invented seed members, funds, partners, orders, programme targets, indicators or certification records.
- No switch of Production environment variables to a new schema before reconciliation.
- No removal of old Neon branches before their contents and retention purpose are verified.
