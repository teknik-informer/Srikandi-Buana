# SRIKANDI BUANA — Native Manager.io-style ERP

Status: architecture and implementation contract for v14. This document does not claim that every listed module is already shipped.

## Product decision

SRIKANDI BUANA will implement the Manager.io operating model natively in its existing Next.js + Neon application. The installed Manager.io desktop application is a workflow and usability reference for the user and development team; it is not a runtime dependency, a separate accounting authority, or a required service for members.

The application remains the single operational workspace. Do not embed Manager.io binaries, scrape its local database, or assume a local desktop API is available. No localhost bridge is required for normal SRIKANDI BUANA operation.

## Existing foundation (verified in the current v14 branch)

- Buku Kas records already post balanced double-entry journals through `src/features/finance/record-posting.ts`.
- A chart of accounts, general journal, ledger listing, reversal workflow, trial balance, income/expense activity, and statement of financial position are already available through `AccountingWorkspace` and `/api/ecosystem/ledger`.
- Sales invoices are issued from completed orders and post receivable/revenue entries through `/api/ecosystem/invoices`.
- Invoice receipts are linked to cash-book receipts and validated against the outstanding balance.
- The member-finance schema exists in migration `010_member_impact_finance.sql`; it models approved policies, member payments, contributions, savings, loans, installments, service engagements, and compensation.
- Asset ownership and custody are integrated with member, task, program, monitoring, and reporting data.

## Navigation and module map

The Finance workspace should become a coherent ERP workspace, not a second disconnected accounting product:

1. **Overview** — cash/bank position, receivables, payables, stock valuation, income/expense, overdue items, pending approvals, and data-quality warnings.
2. **Cash & bank** — existing Buku Kas, bank/cash accounts, transfer between funds, bank statement import, matching, reconciliation, and closing periods.
3. **Sales** — customers, quotations, sales orders, delivery/fulfilment, invoices, receipts, credit notes, and receivables ageing.
4. **Purchases** — suppliers, purchase requests, purchase orders, goods received, supplier bills, supplier payments, and payables ageing.
5. **Inventory** — items, categories, warehouses/locations, stock receipts/issues/transfers/adjustments, stock count, reorder alerts, and valuation.
6. **Accounting** — chart of accounts, journal entries, general ledger, trial balance, profit/loss, balance sheet, cash flow, and audit trail.
7. **Member finance** — dues/contributions, savings, loan applications and schedules, repayments, member payments, and compensation.
8. **Programs & funds** — budgets, approved allocations, commitments, actual spending, evidence, and variance by program/fund.
9. **Assets** — group-owned fixed assets, depreciation policy, custody, maintenance, and movement history; member-owned assets remain separate.
10. **Reports** — period-based reports, filters, printable/exportable documents, and role-scoped reports.
11. **Settings** — fiscal periods, numbering, account mappings, approval limits, document templates, and role permissions.

## Shared data and posting rules

- Existing membership records remain the identity source of truth. Financial subledgers reference member IDs; they must not create duplicate member identities.
- Program, task, asset, order, and member references must use the existing record IDs and organization ownership scope.
- Every posted transaction must have a unique reference, a balanced journal, source linkage, actor, timestamp, and evidence reference where applicable.
- Drafts may be edited. Submitted items are reviewed. Approved items are immutable. Posted items are corrected only by a separately audited reversal/adjustment.
- No financial module may silently write to both legacy cash records and a new independent ledger. One business event produces one posting, guarded by idempotent source references.
- The general ledger is the accounting projection; operational subledgers (invoice, supplier bill, inventory movement, member loan, savings, compensation) remain the source of their domain details.
- Never derive a member's loan eligibility, aid, compensation, or allowance automatically from CV skills, assets, gender, age, or personal profile data.
- Member-owned property is never treated as group inventory or collateral without an explicit, documented, voluntary agreement and approved policy.
- NIK and full bank account numbers must not be copied into ledger descriptions, reports, CSV exports, or general-purpose record JSON.

## Accounting controls

- Use integer IDR amounts for current cash-book flows unless a future approved currency/decimal policy explicitly changes the contract.
- Require at least two journal lines, positive amounts, unique accounts per line, and exact debit/credit equality.
- Keep posted journal lines immutable; reverse or adjust with a new entry.
- Disallow posting into closed fiscal periods once period locking is implemented.
- Reconciliation must match statement lines to existing cash/bank transactions; it must not create duplicate receipts.
- Invoice receipts cannot exceed outstanding balances or predate invoice issue dates.
- Stock valuation method (FIFO, weighted average, or another approved method) must be explicitly configured before inventory accounting is activated.
- Depreciation method, useful life, residual value, loan charges, dues, salaries, honoraria, allowances, and approval thresholds require written group policy. Do not invent defaults.

## Implementation sequence

### Phase A — consolidate the existing finance workspace
- Keep the current Buku Kas → ledger posting flow.
- Make the accounting workspace the central navigation entry for Finance.
- Surface real ledger-derived KPIs and explicit empty/partial-data states.
- Add date/period filters and drill-through from totals to source journals.
- Verify role permissions for admin, chair, treasurer, and member views.

### Phase B — cash/bank operations
- Add organization-owned cash/bank accounts and internal transfer workflow.
- Add bank statement entry/import with duplicate detection, matching, and reconciliation lock. The first shipped workflow records statement lines manually; CSV import remains a follow-up.
- Current reconciliation matches exact signed amounts against existing ledger lines for the selected asset account and period. It never creates duplicate receipts or journals. A period can be locked only when all statement lines are matched and opening balance plus net statement movement equals closing balance.
- Keep bank account identifiers masked and outside ordinary audit text.

### Phase B implementation status
- Cash-fund transfer form is implemented for the three configured cash funds, checks available ledger balance, and posts a balanced journal plus audit event.
- Bank reconciliation schema and API are implemented additively in `migrations/013_bank_reconciliation.sql` and `/api/ecosystem/reconciliation`.
- The finance workspace supports statement-line entry, exact ledger matching, balance arithmetic checks, and period locking. It does not import CSV statements yet, does not auto-match fuzzy references, and does not reconcile historical periods automatically.
- Migration 013 is committed to the feature branch and applied to the sanitized QA branch `srikandi-v12-sanitized-qa-20261106`; tables, unique indexes, and lock triggers were verified. No statement or ledger data was migrated. Production remains untouched.

### Phase C — sales and purchasing
- Extend current order → invoice → receipt flow with quotations, customer/supplier master data, supplier bills, purchase orders, goods receipts, credit notes, and payables.
- Define one posting map per transaction type and test balanced journal/idempotency.

### Phase C implementation status
- Supplier master data, supplier bills, payments, purchase requisitions, approval, Purchase Orders, and goods receipts are implemented in `/api/ecosystem/purchases` and the commerce workspace.
- Purchase requisitions require explicit approval by ketua/admin. The requester cannot approve their own request; the PO creator cannot approve their own PO. Goods receipts support partial delivery, are append-only, and cannot exceed the ordered quantity.
- Supplier invoice three-way matching is implemented in migration `016_purchase_three_way_match.sql`. A new bill must select the same supplier's partially/fully received PO and invoice one or more actual goods-receipt lines. Each invoice line must match the PO unit price, must not predate the receipt, and cannot exceed the quantity received or previously uninvoiced. The invoice header total must equal the sum of matched lines exactly before the payable journal can commit.
- The database locks PO/receipt quantity counters during invoice-line insertion, records append-only match evidence, blocks edits to posted bill source data, and keeps legacy bills explicitly labelled `legacy_unmatched`. Existing bills are not silently given fabricated PO/receipt links.
- Tax, freight, discounts, price variances, and tolerance/exception approvals are not auto-accepted; the current match policy requires exact unit-price and total equality. Any exception process must be explicitly approved before implementation.
- Migration 014, 015, and 016 have been applied only to the sanitized QA branch `srikandi-v12-sanitized-qa-20261106`. No procurement fixtures or transaction data were seeded. Production remains untouched.
- Still not implemented: purchase order print/email, attachments/evidence upload, inventory capitalization/valuation, supplier credit notes, and automated due-date reminders. Purchases currently post to a selected expense account; do not treat a goods receipt as an inventory valuation.

### Phase D — inventory and fixed assets
- Add item master, stock movement ledger, stock count, and valuation only after the valuation method is approved.
- Link purchasing, sales, and production/operations to stock movements.
- Preserve member-owned vs group-owned asset distinctions.

### Phase D implementation status — quantity-only inventory
- A dedicated `/dashboard/inventaris` workspace and `/api/ecosystem/inventory` API provide organization-owned stock item master, warehouse/location master, opening physical counts, reorder thresholds, movement history, stock card, per-location balances, and low-stock warnings.
- Inventory records live in the existing normalized `workspace_v14.inventory_items` and `workspace_v14.stock_movements` domain. A new `workspace_v14.inventory_locations` dimension assigns each new movement to a real active location. This avoids a second inventory table and keeps group-owned assets/equipment and member-owned property distinct from stock items.
- Purchase request lines can be mapped to an existing stock item when a Purchase Order is prepared. Mapping is optional for services/non-stock expenses and requires an exact unit match. The approved PO line retains the inventory item link.
- When a receipt is posted for a mapped PO line, the database trigger creates a positive stock movement against the selected location in the same transaction as the receipt. Receipt client keys and unique source references prevent duplicate stock posting. Partial receipts create partial quantities; over-receipts are rejected.
- Manual stock operations currently include opening physical counts, positive/negative quantity adjustments, operational consumption (out), and returns (in). Database locks on item rows, unit/location checks, append-only movement history, and insufficient-stock controls protect the quantity ledger.
- Migration 017 is applied only to sanitized QA branch `srikandi-v12-sanitized-qa-20261106`. The location table, PO mapping/receipt fields, indexes, and triggers were verified. A rollback-only QA database smoke test exercised opening balance, insufficient-stock rejection, and PO receipt → exactly one location-linked stock movement; all fixture rows were rolled back. No inventory items, locations, opening balances, or movements remain seeded.
- Scope is quantity only. It deliberately does not calculate unit cost, moving average/FIFO/standard cost, inventory value, depreciation, COGS, or general-ledger postings. No purchase invoice is capitalized automatically. The existing supplier bill flow still posts to an expense account; an approved inventory valuation and accounting policy is required before enabling value-based posting.
- Legacy group equipment remains in the asset register and is excluded from consumable/stock listings. Member-owned property remains outside organization inventory. Legacy commerce catalogue stock is not silently imported into the normalized stock ledger; an opening-count and reconciliation review is required before any import.

### Phase E — member financial subledgers
- Activate dues, savings, loans, installments, repayments, and compensation only after policy versions and approval roles are configured.
- Generate payment vouchers and ledger postings from approved transactions.
- Reconcile member subledger balances to control accounts.

### Phase F — financial statements and close
- Add cash flow, receivables/payables ageing, program/fund budget-vs-actual, period close, printable statements, and audit review.
- Reconcile subledgers, stock valuation, fixed assets, and bank statements before declaring reports final.

## Release and data-safety constraints

- Develop on `feat/v14-engaging-productivity` and Preview only.
- Keep production v11.5 and the Production database untouched until the user explicitly approves a release and any required migration.
- Do not migrate legacy cash or member data automatically. First produce a reconciliation report, duplicate report, mapping preview, and reversible migration plan.
- Do not mark a report as final if opening balances, bank reconciliation, inventory valuation, or subledger control-account reconciliation are incomplete.
- Every schema change must be additive and tested on the sanitized QA branch before any request to apply it elsewhere.
- Do not claim authenticated visual QA unless an authenticated browser session is actually available and tested.

## Acceptance criteria for calling the ERP complete

- All listed modules have real persistent records, not demo cards or hard-coded sample figures.
- All transactions have authorization, validation, audit, evidence, and idempotent posting.
- The same member, program, asset, product, supplier, customer, and transaction are not duplicated across modules.
- Reports reconcile to their source ledgers and disclose missing opening balances or unclosed periods.
- CSV/PDF exports are role-scoped and mask sensitive identifiers.
- The full workflow is tested on Preview with a real authorized test account before production release.
