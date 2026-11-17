# Architecture v13 Implementation Roadmap

## Working principle

Deliver working, testable capabilities in the existing application. Do not replace a working module with a visual placeholder and do not equate a route or dashboard card with a completed workflow.

## Phase 0 — Audit and reconciliation

**Scope**
- Repository, dependency, route and API inventory.
- Identity and role-policy audit.
- Current schema and table ownership inventory.
- Production migration ledger reconciliation.
- Domain dependency and integration map.

**Deliverables**
- ADR-013.
- Data ownership matrix.
- Integration catalog.
- Migration audit command and fail-closed runner.
- Regression tests for module catalog and migration comparison.

**Exit criteria**
- Every Production table has an identified owner or an explicitly unresolved owner.
- Every migration ledger entry has recoverable source SQL or an approved reconciliation record.
- QA environment is isolated from Production.
- No Production data/schema writes occur during audit.

## Phase 1 — Platform Core

**Scope**
- Canonical organization and account identifiers.
- Module registry and lifecycle metadata.
- Role, permission and scope administration.
- Module visibility and module-level access.
- Central navigation, notifications and platform audit.
- System Administrator catalog-only visibility for registered modules.
- BI & Analitik as a role-scoped read-only workspace.

**Rules**
- A catalog entry is not an access grant.
- System Administrator technical configuration is distinct from organizational record access and approval authority.
- Architect Full Access stays in isolated QA Preview.

**Exit criteria**
- All six application modules appear in the System Administrator's module catalog.
- Modules without operational grants open an informational, non-data landing page.
- Unauthorized API and record access remains denied.
- Existing member, secretary, treasurer, coordinator and chair access remains unchanged.

## Phase 2 — HRM

**Scope**
- Member and officer records.
- Organizational positions and assignments.
- Attendance and training.
- Account-to-member linkage.
- Membership state and access lifecycle.

**Exit criteria**
- One canonical member identifier.
- Duplicate-person handling and source lineage documented.
- Member-facing data and private member documents are scoped.
- Attendance corrections and verification are auditable.

## Phase 3 — Accounting

**Scope**
- Chart of Accounts.
- Cashbook and journals.
- Double-entry posting.
- Budget approval and realization.
- Bank reconciliation.
- Reversals and period closing.

**Exit criteria**
- Every posted journal balances.
- Posted entries are immutable.
- Reversal is linked to the original entry.
- POS and Project cannot write directly to the ledger.
- Trial balance and reconciliation tests pass.

## Phase 4 — Project Management and CRM

**Scope**
- Program/project portfolio.
- Tasks, milestones and assignments.
- Monitoring, evidence and delivery.
- Partner organizations, opportunities and communication history.

**Exit criteria**
- Program and partner canonical owners are clear.
- Approved opportunity-to-project conversion is traceable.
- Project budget references match Accounting-approved values.
- External partner access is scoped and revocable.

## Phase 5 — Agriculture and Inventory

**Scope**
- Land/plot, crop cycle, cultivation and harvest.
- Inventory item master, warehouse, receipt and movement.
- Procurement, transfer, stocktake and traceability.

**Exit criteria**
- A harvest record and a stock receipt are distinct source facts.
- Each stock movement has one canonical ledger entry.
- Duplicate receipts and stock decrements are blocked.
- Supply lot lineage reconciles from field harvest to warehouse batch.

## Phase 6 — POS

**Scope**
- Product catalog.
- Sales terminal, checkout, receipts and payments.
- Returns, refunds and cashier closing.
- Inventory and Accounting handoff.

**Exit criteria**
- Order, payment and fulfillment status are distinct.
- Sale completion is idempotent.
- One sale cannot post duplicate inventory movement or journal.
- Refund/reversal has an auditable source reference.

## Phase 7 — BI & Analitik, Documents, MEL and public CMS

**Scope**
- Document versioning and approval.
- Controlled public publishing.
- Indicators, evidence, outcomes and reporting.
- Read-only analytical projections and data freshness.
- Role-scoped KPI summaries, six-month record trends, domain distribution and quality indicators.

**Exit criteria**
- Private documents remain private.
- Public content requires approval and recorded publication permission.
- Every indicator has a definition, unit, period, target, source and verification status.
- BI reports do not expose member-level identity or financial records outside the current role policy.
- Every BI metric shows its permitted source scope and freshness; coordinator metrics are restricted to assigned programmes.

## Phase 8 — Physical database isolation

Extract one domain at a time only when:
- The data owner and schema inventory are complete.
- API/event contract is versioned and tested.
- Stable cross-domain IDs exist.
- Migration SQL and rollback have been rehearsed.
- Independent backup, restore, retention, monitoring and secret ownership are ready.
- Failure and reconciliation behavior are documented.
- Costs and operational support are accepted.

The order of extraction is chosen by risk and business value, not by the number of module cards. Keep Platform Core and HRM identity linkage stable first; evaluate Accounting as a high-integrity, tightly controlled domain before commerce domains.

## Release checklist

- [ ] TypeScript passes.
- [ ] Full regression suite passes.
- [ ] Module visibility tests pass for all six roles.
- [ ] Unauthorized data access remains denied.
- [ ] API owner/scope predicates are verified.
- [ ] Migration audit matches the intended environment.
- [ ] QA migration and restore rehearsal pass.
- [ ] No fake Production data or demo transactions.
- [ ] Preview deployment is verified.
- [ ] Production release and database migration receive separate approval.
