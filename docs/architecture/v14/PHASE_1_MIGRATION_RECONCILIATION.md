# Phase 1 — Migration Reconciliation and QA Evidence

**Observed:** 16 November 2026  
**Repository baseline:** HRM commit `195b14d965f05c739e8379805144f14a8c93f826`  
**v14 reference:** `b61382813ab1abc3a41d6a0da70d4f417d429886`  
**Neon project:** `holy-night-99324539` (Srikandi Buana)  
**QA branch:** `br-mute-meadow-b4rhx1mn` (`srikandi-v12-sanitized-qa-20261106`)  
**Disposable rehearsal child:** `br-snowy-forest-b46i5pqx` (`phase1-integration-rehearsal-20261116`)

## 1. Safety and scope

All Neon inspection in this report used read-only metadata queries. The disposable child branch was created from the QA branch and reached `ready`. No SQL migration, data backfill, DDL, Production change, or environment-variable change was run.

The child branch is isolated and available for a separately approved migration rehearsal. The migration runner must not be pointed at shared QA or Production until the manifest and execution plan have been reviewed.

## 2. QA migration ledger — observed facts

The live `public.schema_migrations` table contains exactly 21 rows. The names below are copied from the read-only QA ledger, not inferred from repository filenames.

| Applied migration name |
|---|
| `001_initial.sql` |
| `002_roles.sql` |
| `003_message_consent.sql` |
| `004_enterprise_operations.sql` |
| `005_ecosystem_foundation.sql` |
| `005_external_access.sql` |
| `006_agriculture_domain.sql` |
| `006_order_receipts_and_journal_corrections.sql` |
| `007_database_integrity_and_audit.sql` |
| `008_workspace_v14_core.sql` |
| `009_document_record_lineage.sql` |
| `010_member_impact_finance.sql` |
| `011_member_asset_movement_history.sql` |
| `012_sales_invoices_and_receipts.sql` |
| `013_bank_reconciliation.sql` |
| `014_supplier_bills.sql` |
| `015_procurement_workflow.sql` |
| `016_purchase_three_way_match.sql` |
| `017_inventory_stock_ledger.sql` |
| `018_inventory_transfers_stocktakes.sql` |
| `019_inventory_document_lifecycle.sql` |

The ledger is a union of the v14 schema family and the external-access/agriculture migrations. It does not contain the HRM branch filenames `008_single_chair_guard.sql` through `013_multi_officer_positions.sql`, despite read-only physical-schema evidence for several of their final effects.

## 3. Repository migration inventory and immutable Git blob IDs

Git blob IDs below identify the exact file content on the stated reference branch. They are not SHA-256 digests.

### 3.1 Shared v14/HRM migrations

These files have identical Git blob IDs on both inspected branches:

| File | Git blob ID | QA ledger |
|---|---|---|
| `001_initial.sql` | `6fe0abc8e75e9fe96f1229a392d1756680aeda32` | Present |
| `002_roles.sql` | `b325c003b421593738612c59d81a2a1c1924bc2c` | Present |
| `003_message_consent.sql` | `05955cdf078e7fb866424f97bb4c65aa31e9ec28` | Present |
| `004_enterprise_operations.sql` | `87bfffa0bf814ebf5f6aa81f69af0eb529f062f7` | Present |
| `005_ecosystem_foundation.sql` | `a00b154773a3e808a83c0e37cbccdb79c3295540` | Present |
| `006_order_receipts_and_journal_corrections.sql` | `13395c205560d48ca57fdb5f96a77b97c01d3817` | Present |
| `007_database_integrity_and_audit.sql` | `3dc9adc049ec70b36658d18e84722ad8dd0878cd` | Present |

### 3.2 v14 normalized workspace and operations family

Reference: `feat/workspace-v14-nextadmin-architecture`

| File | Git blob ID | QA ledger |
|---|---|---|
| `008_workspace_v14_core.sql` | `f22402f436fd3a7408e4483470841a2e64512e36` | Present |
| `009_document_record_lineage.sql` | `a07a46d9ae1e73ffc9a382d1c2cb8aeaafe32269` | Present |
| `010_member_impact_finance.sql` | `a9cee6e1225db6c1522f841a1f3ad0c06687bbfe` | Present |
| `011_member_asset_movement_history.sql` | `c35e23b5ad60a948ffd8ebaf8b3bbf972fa61464` | Present |
| `012_sales_invoices_and_receipts.sql` | `16320f39040c5a17056746f2f5fa253c8ad9890e` | Present |
| `013_bank_reconciliation.sql` | `0ff2a4b596bf39b989ec329ace5371b1f4527950` | Present |
| `014_supplier_bills.sql` | `8e755ce15fd5bc3eb40d17224cb7ef49f3535e16` | Present |
| `015_procurement_workflow.sql` | `8e0d9eb5a0512683a80cb07426ce186be49eda8d` | Present |
| `016_purchase_three_way_match.sql` | `351af4f7e144065b4df9fda77ff23621eb9a42f6` | Present |
| `017_inventory_stock_ledger.sql` | `e3843c29fe2d1861de5a0f08ab3f341f2c6dda8d` | Present |
| `018_inventory_transfers_stocktakes.sql` | `9d54a8138076fc76d42dd40c4ab5dda7aab4ef01` | Present |
| `019_inventory_document_lifecycle.sql` | `19f230d9d48ed3b5f46bbe624cb9e7376ac587e2` | Present |

### 3.3 HRM branch-specific migration family

Reference: `feat/hrm-smart-attendance-001-2026-11-16-v2`

| File | Git blob ID | QA ledger | Read-only QA evidence |
|---|---|---|---|
| `005_external_access.sql` | `e03986e883b6f9b6f0ce9968c780bcea44440908` | Present | External-access tables exist |
| `006_agriculture_domain.sql` | `3176b0aa9a1cd62afb9edd0ba280067012c78b85` | Present | Agriculture tables exist |
| `008_single_chair_guard.sql` | `94c1130349b6ef1a1a47033c58580662a016c0a1` | Absent | Both single-chair indexes are absent |
| `009_report_packages.sql` | `d3d508360d196aec589ae5bc6f978308c059a16d` | Absent | `report_packages` and `report_package_events` exist |
| `010_report_package_source_scope.sql` | `320b26c71d7223fa0c84882cbe0eb51a06311817` | Absent | `source_scope`, shape constraint and counters exist |
| `011_verified_email_change.sql` | `9fc870ac72a52123809c5fb15078f6d2ab4f0d1f` | Absent | Lowercase email unique index exists |
| `012_whatsapp_login_identity.sql` | `317ddda9e48d11a5a70364cd692adbc7e0ee95e6` | Absent | Phone columns, phone unique index and invitation index exist |
| `013_multi_officer_positions.sql` | `29eecd2fa71068322c94e0a5183a1d0965c88de7` | Absent | Both single-chair indexes are absent |

The HRM-specific migration files are not a second independent sequence that can be appended by numeric prefix. They overlap the v14 history and must be reconciled as a coherent final-state plan.

## 4. Physical schema observations on QA

Read-only metadata confirms:
- Schema `workspace_v14` exists and includes organizations, memberships, member profiles, programmes, activities, attendance, tasks, documents, inventory, finance, procurement, supply traceability, indicators, safeguarding, and audit tables.
- Public finance/commerce objects include ledger accounts, ledger entries/lines, bank reconciliation, suppliers, purchase orders/bills, sales invoices/receipts, stock history and related tables.
- `report_packages`, `report_package_events`, and `report_package_counters` exist.
- `report_packages.source_scope` is JSONB and the `report_packages_source_scope_shape` constraint exists.
- `users` and `account_invitations` contain `login_phone`, `phone_verified_at`, and `phone_verified_by`.
- `users_email_lower_unique`, `users_login_phone_unique`, and `invitations_phone_pending` exist.
- The current `account_invitations_purpose_check` permits `activate`, `reset`, `change_email`, `activate_wa`, and `reset_wa`.
- The two single-chair guard indexes are absent, consistent with the intended multi-officer final state.
- No `attendance_session` record was found in the inspected QA branch; this count is a compatibility check, not a full data audit.

## 5. Correction to the earlier index-collision hypothesis

The exact HRM branch files currently inspected use `CREATE UNIQUE INDEX IF NOT EXISTS` for:
- `users_email_lower_unique` in `011_verified_email_change.sql`.
- `users_login_phone_unique` in `012_whatsapp_login_identity.sql`.

Therefore, a duplicate-index-name failure is **not confirmed for these exact current file contents**. The more material unresolved issue is migration provenance: the QA schema has the final effects, but the ledger does not record these HRM migration filenames.

The migration 011 file also narrows the invitation-purpose CHECK to email purposes; migration 012 restores the WhatsApp purposes. The observed QA CHECK is the final combined state. The two files must be considered together, never replayed selectively.

Migration 008 creates single-chair unique indexes; migration 013 drops them. The current QA state has no such indexes and no duplicate active `ketua` accounts in the read-only check. This supports the intended multi-officer final state, but it does not prove exact historical execution order.

## 6. Reconciliation decision

1. Treat the observed QA schema and the 21-row ledger as separate evidence sources.
2. Do not fabricate ledger rows or rewrite historical names.
3. Do not rerun the HRM migration family on shared QA or Production merely to make the ledger look complete.
4. Use the disposable child branch for any future approved replay experiment; record statement-level outcomes and a before/after schema diff.
5. The application integration branch consumes the already-present v14 schema through a guarded compatibility adapter. If the schema is absent, the adapter returns no normalized statements and legacy records remain operational.
6. A later canonical migration release must be forward-only and include a verified provenance/reconciliation record.

## 7. Application integration included in this branch

The preview integration branch selectively brings in:
- v14 legacy record mapping.
- v14 normalized write adapter.
- v14 finance posting adapter.
- Atomic normalized writes for supported legacy record create/update operations.
- Normalized writes included in protected asset/cash update transactions.
- Legacy attendance register synchronization to the normalized activity-attendance model.

The adapter verifies the required schema and organization mapping before writing. A missing or incompatible schema returns an empty normalized statement list, preserving the legacy write path. This is a compatibility bridge, not a declaration that all legacy data has been migrated or verified.

## 8. Remaining acceptance gates

- Automated CI must pass typecheck, regression, dependency audit and production build.
- Vercel Preview must reach `READY` on the integration branch.
- Authenticated UAT must verify records, attendance, finance, assets, member access, and external access against a disposable/test workspace.
- No Production migration, deployment promotion, or secret change is authorized by this document.
