# Data Ownership Matrix — Architecture v13

## Purpose and interpretation

This matrix identifies the current production table locations and proposes the canonical domain that should own each business fact. It is a domain-boundary design, not proof that tables are already separated into independent databases.

Audit basis: Neon Production application database `neondb`, read-only catalog inspection on 17 November 2026.

## Current database shape

| Schema | Tables | Current role |
|---|---:|---|
| `neon_auth` | 9 | Neon-managed identity tables |
| `public` | 52 | Existing application identity, records, commerce, finance, external access and shared services |
| `workspace_v14` | 50 | Newer domain-oriented organization, activity, inventory, finance, agriculture and MEL tables |
| **Total** | **111** | One application database, not 111 independent objects/services |

The application database `neondb` is still one PostgreSQL database. Schema boundaries are logical boundaries only.

## Ownership matrix

| Target owner | Current tables/schemas observed | Canonical responsibility | Boundary and extraction notes |
|---|---|---|---|
| Platform Core / Identity | `public.users`, `public.sessions`, `public.account_invitations`, `public.role_grants`, `public.login_attempts`, `public.access_audit`, `public.settings`, `public.schema_migrations`; Neon-managed `neon_auth.*` | Account identity, session lifecycle, organization context, module registry, roles, grants and platform configuration | Two identity-related table sets exist. Map account IDs and session ownership before any identity-provider migration. Do not expose database credentials to the browser. |
| HRM / Organization | `public.records` for legacy kinds such as anggota, pengurus, musyawarah and persetujuan; `workspace_v14.member_profiles`, `organization_memberships`, `organization_units`, `member_service_engagements`, `activity_attendance` | Member profile, organizational membership, officers, assignments, attendance and development | `public.records` is polymorphic. Classify by `kind`, workspace owner and current service usage before splitting. Preserve source IDs and legacy mappings. |
| Accounting | `public.ledger_accounts`, `ledger_entries`, `ledger_lines`, `ledger_reversals`, `finance_bank_reconciliations`, `finance_bank_statement_lines`; `workspace_v14.funds`, `budget_allocations`, `member_contributions`, `member_payments`, `member_savings_accounts`, `member_savings_transactions`, `member_loans`, `member_loan_payments`, `member_loan_installments` | Organization ledger, approved budgets, bank reconciliation and separately governed member-finance records | Do not conflate member savings/loans with organization cashbook or general ledger. Posted ledger entries require immutable history and reversal semantics. |
| CRM / External Relationships | `workspace_v14.partner_organizations`, `partner_interactions`; `public.external_organizations`, `external_access_grants`, `external_access_grant_scopes`, `external_access_invitations`, `external_access_audit`, `external_portal_accounts`, `external_portal_sessions` | External contacts and organizations, partnerships, communication and scoped partner access | Public external-access tables include security-sensitive grants and sessions. Separate relationship data from authorization grants. |
| Project Management | `workspace_v14.programmes`, `programme_enrolments`, `activities`, `tasks`; selected evidence/document references | Program and project plans, activities, assignments, milestones and progress | Project progress is not a financial ledger. Budget commitments and actuals remain owned by Accounting; Project stores approved references and project-level rollups. |
| POS / Commerce | `public.commerce_products`, `commerce_orders`, `commerce_order_events`, `commerce_sales_invoices`, `commerce_sales_invoice_receipts`, `commerce_suppliers`, `commerce_purchase_orders`, `commerce_purchase_order_lines`, `commerce_goods_receipts`, `commerce_goods_receipt_lines`, `commerce_purchase_bills`, `commerce_purchase_bill_lines`, `commerce_purchase_bill_payments` | Product selling, checkout, invoices, sales receipts, returns and order lifecycle | Supplier procurement and goods receipt may be owned by Procurement/Inventory rather than POS after extraction. Keep order, payment and fulfillment states distinct. |
| Inventory & Procurement | `workspace_v14.inventory_items`, `inventory_locations`, `inventory_stocktakes`, `inventory_stocktake_lines`, `inventory_transfers`, `inventory_transfer_lines`, `procurement_requests`; `public.stock_movements`, `commerce_stock_history` | Item master, stock ledger, warehouses, transfers, stocktakes and procurement | Commerce stock history and workspace inventory tables require a single canonical stock ledger. Do not dual-write stock from POS and Inventory. |
| Agriculture | `public.agriculture_commodities`, `farm_parcels`, `crop_cycles`, `harvest_records`, `agriculture_audit`, `quality_observations`, `supply_lots`, `supply_lot_events`, `supply_lot_transformations`, `supply_lot_transformation_lines`; `workspace_v14.farm_plots` | Land/plot, crop cycle, cultivation log, harvest, quality observation and traceability | Keep harvest facts in Agriculture; Inventory owns warehouse receipt and stock. Lot and transformation identifiers must remain stable across the handoff. |
| Documents & CMS | `public.files`, `public.file_objects`; `workspace_v14.documents` | Document metadata, versions, file references, templates, approval and publication metadata | File bytes and metadata are different concerns. Download endpoints must re-check the user's current access; public publication requires explicit status and consent where personal imagery is involved. |
| MEL / Analytics | `workspace_v14.impact_indicators`, `indicator_observations`, `evidence_links`, `quality_observations`; activity/project measures | Indicator definitions, baseline/target/actual, evidence and outcome reporting | No dedicated analytics database was observed. These source indicators remain owned by MEL; cross-domain BI should use read projections, not direct joins on every dashboard request. |

## Shared and ambiguous structures

### Polymorphic legacy records

`public.records` carries multiple record kinds. Before extraction, produce a complete inventory of distinct `kind` values, row counts per kind and workspace owner, foreign references, file links and active API consumers. Do not move the whole table into HRM or another single domain.

### Duplicate-looking organization and identity data

The catalog includes `public.organizations` and `workspace_v14.organizations`, and both `public.users/sessions` and `neon_auth.user/session` surfaces. Their rows and semantics must be mapped before choosing a canonical owner. A matching table name does not establish identical meaning.

### Cross-domain budget and document references

A project may hold a planned budget and document reference, but the approved budget and posted spend belong to Accounting. A project can reference a document, but the document/file service owns document metadata and access policy.

## Required extraction record for every table

Before moving a table, record:

1. Current schema and table.
2. Canonical owner domain.
3. Row count and workspace/organization distribution.
4. Primary key and all foreign-key references.
5. Read/write API consumers and server actions.
6. Role and record-scope authorization rules.
7. File/evidence dependencies.
8. Migration source and applied ledger entry.
9. Backfill and dual-read/dual-write plan, if applicable.
10. Reconciliation query and rollback trigger.

No table is extracted solely because its name looks like a module. Ownership is decided from write paths, business invariants and observed data.
