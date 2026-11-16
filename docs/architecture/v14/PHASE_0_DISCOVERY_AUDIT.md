# SRIKANDI BUANA — Phase 0 Discovery & System Audit

**Audit date:** 16 November 2026  
**Repository:** `teknik-informer/Srikandi-Buana`  
**Audited code reference:** PR #24 head `195b14d965f05c739e8379805144f14a8c93f826`  
**Audit branch:** `docs/master-blueprint-phase0-architecture-2026-11-16`  
**Status:** Source-level discovery baseline; not a production-readiness certification.

## 1. Executive result

The repository is an existing Next.js application with a substantial operational foundation. It is not a greenfield project and must not be replaced with a new application. The approved direction is to evolve it incrementally into the five-application Integrated Business & Organization Platform.

Verified repository stack from `package.json`:
- Next.js 16.4.5, React 19.2.6, TypeScript 5.9.3.
- Neon serverless PostgreSQL and Drizzle ORM 0.45.2.
- Tailwind CSS 4 and the installed shadcn/Radix/Base UI component ecosystem.
- React Hook Form and Zod.
- Recharts.
- Nodemailer 10.5.0.
- Node engine range `>=22.13.0 <27`.

MUI is not installed. Supabase is not the active database or authentication source. Do not add either as a replacement without an approved architecture decision and migration plan.

## 2. Repository and release baseline

- Default branch: `main`.
- PR #17 governance/RBAC: open, Draft, unmerged.
- PR #21 navigation/public UX: open, Draft, unmerged; based on PR #17.
- PR #22 architect identity console: open, Draft, unmerged; based on PR #17.
- PR #24 HRM Smart Attendance: open, Draft, unmerged; based on PR #22.
- This audit branch is based on PR #24 head and its documentation PR must target that same branch. It is therefore dependent on the existing PR chain.
- Production changes, merges and Production migrations are outside this Phase 0 task.

## 3. Verified capabilities already present

### Platform and identity
- Next.js App Router and a unified application deployment.
- Server-side authentication/session checks and role policy.
- Workspace owner and account identity are separate concepts.
- Account invitation, email change and WhatsApp login flows are represented in PR #22.
- Preview-only architect full-access capability is branch/environment constrained; Production technical admin remains separate from organizational business authority.
- Notifications, external access grants, audit facilities, report packages and public content routes exist in the codebase.

### Existing domain capabilities
- Commerce product catalog, stock and order records.
- Finance ledger tables and journal validation/reversal logic.
- Agriculture commodities, farm parcels, crop cycles and harvest records.
- External organizations, external portal accounts and scoped access grants.
- Report package snapshots, source manifests, scope and approval lifecycle.
- HRM Smart Attendance initial increment, using the existing owner-scoped `records` persistence adapter.

### Public website
Existing public route families include profile, programs, impact-related content, products, partnerships, news/activity, contact, privacy/data-rights, public documents and support pages. Route existence does not prove that all content or workflows are complete or approved for publication.

## 4. Material gaps and risks

1. **Migration filename collisions:** there are two `005_*.sql` files and two `006_*.sql` files. The migration runner sorts filenames lexicographically and records the complete filename in `schema_migrations`. This is not an immediate proof of failed migrations, but it is an auditability and sequencing hazard. Do not rename or reorder historical migrations in place.
2. **Migration history divergence — confirmed by read-only QA inspection:** the repository branch contains migration files `008_single_chair_guard.sql` through `013_multi_officer_positions.sql`, while the Neon QA branch `srikandi-v12-sanitized-qa` (`br-mute-meadow-b4rhx1mn`) records a different lineage from `008_workspace_v14_core.sql` through `019_inventory_document_lifecycle.sql`. The QA ledger also records the two 005 and two 006 files by full filename. The migration runner sorts repository filenames lexicographically and applies every filename not present in `schema_migrations`; therefore running it against this QA branch could attempt to apply a second, incompatible lineage. **Do not run the current branch migration runner against QA or Production.** First produce a mapping of each migration's schema effects, verify actual QA schema objects and determine a safe forward-only reconciliation strategy.
3. **HRM persistence is transitional:** attendance kinds currently live in the generic `records` table behind a dedicated API boundary. This is not a normalized HRM domain schema.
4. **Accounting is partial:** ledger tables and balanced journal logic exist, but earlier ecosystem documentation states cashbook reconciliation, full financial statements and tax invoice workflows are incomplete. Do not claim complete statutory accounting.
5. **Commerce is not full POS:** catalog/order/stock foundations exist; payment gateway, settlement/refund and cashier-shift workflows are not evidenced as complete.
6. **CRM and Projects are not yet complete standalone applications:** partnership, external access, programs and operational records exist, but full CRM pipeline and project portfolio/M&E workflows require explicit completion evidence.
7. **Five-app navigation is not yet the authoritative current navigation model:** v12 documentation describes five legacy dashboard pillars (Ecosystem, Management, Administration, E-Commerce, Public & Support). The target blueprint defines HRM, Accounting, CRM, Projects and POS. Route mapping and migration must be incremental.
8. **Browser UAT remains distinct from CI:** successful static/regression/build checks do not prove authenticated browser workflows.
9. **Role test accounts:** prior PR notes say QA does not yet have verified accounts for all organizational roles. Do not fabricate organizational identities or grant Production data access to technical administrators.

## 5. Existing architecture decisions retained

- Modular monolith, one Next.js deployment, one primary Neon PostgreSQL platform.
- Feature/domain boundaries in code; dashboard groupings are not automatically database or authorization boundaries.
- Server-side authorization and workspace scoping.
- Immutable posted ledger/audit history with reversals/correcting events.
- Direct in-process application services initially; transactional outbox only when reliable asynchronous delivery is required.
- Preview must use the dedicated QA database variable and must never fall back to Production database credentials.


## 5. QA migration-ledger evidence (read-only)

The following query was executed only against the Neon QA branch `br-mute-meadow-b4rhx1mn`, database `neondb`, using a read-only SELECT. No Production branch was queried.

```sql
SELECT name, applied_at
FROM schema_migrations
ORDER BY name;
```

The QA ledger returned these 21 entries:

| QA ledger filename | Present in audited PR #24 repository migration directory? |
|---|---|
| `001_initial.sql` | Yes |
| `002_roles.sql` | Yes |
| `003_message_consent.sql` | Yes |
| `004_enterprise_operations.sql` | Yes |
| `005_ecosystem_foundation.sql` | Yes |
| `005_external_access.sql` | Yes |
| `006_agriculture_domain.sql` | Yes |
| `006_order_receipts_and_journal_corrections.sql` | Yes |
| `007_database_integrity_and_audit.sql` | Yes |
| `008_workspace_v14_core.sql` | No — repository branch instead has `008_single_chair_guard.sql` |
| `009_document_record_lineage.sql` | No — repository branch instead has `009_report_packages.sql` |
| `010_member_impact_finance.sql` | No — repository branch instead has `010_report_package_source_scope.sql` |
| `011_member_asset_movement_history.sql` | No — repository branch instead has `011_verified_email_change.sql` |
| `012_sales_invoices_and_receipts.sql` | No — repository branch instead has `012_whatsapp_login_identity.sql` |
| `013_bank_reconciliation.sql` | No — repository branch instead has `013_multi_officer_positions.sql` |
| `014_supplier_bills.sql` | No |
| `015_procurement_workflow.sql` | No |
| `016_purchase_three_way_match.sql` | No |
| `017_inventory_stock_ledger.sql` | No |
| `018_inventory_transfers_stocktakes.sql` | No |
| `019_inventory_document_lifecycle.sql` | No |

**Critical interpretation:** the database's migration ledger is not aligned with the migration directory of the audited feature branch. This is a confirmed QA migration-lineage divergence, not merely duplicate numbering. Repository inspection found that the exact QA 008_workspace_v14_core.sql through 019_inventory_document_lifecycle.sql family exists on feat/workspace-v14-nextadmin-architecture and feat/v14-engaging-productivity, while PR #24 carries a different 008–013 sequence. QA therefore has a composite migration history; no single inspected branch directory matches the entire 21-file ledger. This confirms divergence, but does not prove every unrecorded migration would fail; DDL effects and preconditions still require review. The repository migration runner checks the complete filename, not just a numeric prefix. Consequently, it may attempt to execute branch migrations that are not recorded in the QA ledger even when similarly numbered but semantically different migrations have already run.

Required next actions:
1. Freeze migration execution on this branch until reconciliation is complete.
2. Export a migration manifest from every active branch and compare each SQL file's effects against actual QA schema objects.
3. Identify which code branch is compatible with the current QA schema.
4. Prepare a forward-only compatibility migration only after schema diff, data checks and rollback/recovery review.
5. Test on a disposable Neon child branch before applying any change to the shared QA branch.
6. Keep Production untouched; no Production ledger or data has been inspected or changed in this audit.



## 6. QA schema inventory evidence (read-only)

A second read-only query inspected table names in the Neon QA branch's non-system schemas. It revealed that the shared QA database contains a substantial normalized `workspace_v14` schema in addition to the legacy `public` schema.

Observed `workspace_v14` table families include:
- Organization and identity scope: `organizations`, `organization_memberships`, `organization_units`, `role_grants`, `sites`.
- People and participation: `member_profiles`, `programme_enrolments`, `member_service_engagements`, `safeguarding_cases`.
- Programs and delivery: `programmes`, `activities`, `tasks`, `activity_attendance`.
- Finance and funding: `funds`, `budget_allocations`, `member_contributions`, `member_payments`, `member_savings_accounts`, `member_savings_transactions`, `member_loans`, `member_loan_installments`, `member_loan_payments`, `member_financial_policies`, `member_compensation_items`.
- Inventory and procurement: `inventory_items`, `inventory_locations`, `stock_movements`, `procurement_requests`, `inventory_transfers`, `inventory_stocktakes` and their line tables.
- CRM/partnership: `partner_organizations`, `partner_interactions`, `market_quotes`.
- Monitoring and evidence: `impact_indicators`, `indicator_observations`, `quality_observations`, `evidence_links`, `documents`.
- Traceability: `farm_plots`, `supply_lots`, `supply_lot_events`, `supply_lot_transformations`, `supply_lot_transformation_lines`.
- Audit and migration: `audit_events`, `legacy_record_map`.

The QA database also contains public-schema commerce/finance structures such as `commerce_products`, `commerce_orders`, `commerce_stock_history`, `ledger_accounts`, `ledger_entries`, `ledger_lines`, `finance_bank_reconciliations`, `commerce_purchase_orders` and `commerce_sales_invoices`.

**Interpretation:** these table names and metadata prove that schema structures exist in this QA branch. They do not prove that the current PR #24 code branch uses these tables, that APIs and UI are connected, that data is populated correctly, or that the workflows pass UAT. The table inventory query did not read personal or transaction row data.

This finding changes the discovery conclusion: CRM, Projects, Accounting, Inventory/POS and Traceability have more normalized schema foundations in QA than the current PR #24 repository branch alone suggests. The primary gap is now **lineage reconciliation and code/schema compatibility verification**, not simply creating those domains from scratch.


## 7. Phase 0 exit criteria

- [x] Repository, stack and active PR dependency chain inspected.
- [x] Existing domain and route inventory inspected.
- [x] Migration filename collision identified.
- [x] HRM attendance persistence limitation identified.
- [x] Existing architecture and role policy documents inspected.
- [ ] Migration ledger reconciled against QA branch without touching Production.
- [ ] Authenticated browser UAT across representative roles.
- [ ] Runtime deployment/environment audit revalidated against current Vercel settings.
- [ ] Business owners approve domain workflows and financial accounting policies.

## 8. Safety boundary

This document is based on source inspection, repository metadata and one read-only query to the named Neon QA branch. No database schema or data was modified. No Production database was queried; no Production environment variable, deployment, migration, user record or operational data was changed.
