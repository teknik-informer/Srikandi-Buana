# SRIKANDI BUANA — Implementation Roadmap

**Planning baseline:** 16 November 2026  
**Delivery style:** incremental vertical slices; no big-bang rewrite.

## Phase 0 — Discovery and architecture baseline
**Deliverables:** repository audit, system architecture, ownership matrix, RBAC target, integration workflows, migration risk register, roadmap and quality gates.

Exit only after QA migration ledger reconciliation, current deployment configuration review and authenticated UAT plan are complete.

## Phase 1 — Platform foundation
- Stabilize unified identity and workspace membership.
- Formalize position, access profile and module grant as separate concepts.
- Complete Platform Control Center boundaries and auditable account lifecycle.
- Consolidate navigation registry and module switcher.
- Define shared documents, notifications, audit, approval and integration contracts.
- Map public routes to verified publication workflows.
- Do not grant technical administrators Production operational data access.

## Phase 2 — HRM
Vertical slices:
1. People identity reference and relationship types (member, employee, volunteer, officer).
2. Member directory and verification.
3. Organization structure, positions and assignments.
4. Attendance normalized schema, QR renderer/scanner and GPS consent UI.
5. Training, skills and documents.
6. HRM approvals and analytics.

First reconcile migration history. Migrate attendance from generic records only after parity, backup, QA rehearsal, row-count/hash validation and rollback plan.

## Phase 3 — CRM and Project Management
CRM:
- Contact/organization registry with relationship types.
- Customer, supplier, donor, buyer and partner profiles.
- Leads/opportunities/pipeline, meeting history and follow-up.
- Proposals and agreement lifecycle.

Projects:
- Program/project registry, plans, task board, timeline/calendar.
- Team assignments, milestones, risks, deliverables and evidence.
- Budget references, procurement tracking and grant restrictions.
- Indicators, monitoring/evaluation and report package integration.

## Phase 4 — Accounting
- Approved chart of accounts and accounting basis/configuration.
- Accounting periods, journal posting, immutable ledger and reversal.
- Cash/bank and reconciliation.
- Receivables/payables, budget controls and restricted funds.
- Project accounting and financial statements.
- Native PDF/XLSX exports with privacy and approval controls.

No statutory report or tax automation until the entity classification, accounting policy and current regulations are confirmed by a qualified responsible person.

## Phase 5 — POS
- Product catalog, variants, price and barcode.
- Stock ledger, locations and purchasing/receiving.
- Cashier interface, sales, payments and receipts.
- Returns/refunds and shift opening/closing.
- Accounting integration and reconciliation.
- Offline queue only if field/business conditions justify it.

## Phase 6 — Advanced integration
- Agriculture plot-to-harvest-to-batch traceability.
- Chain-of-custody and evidence.
- External partner/donor reporting.
- API connectors, event processing, automation and analytics.
- English localization and multi-currency only when operationally required.

## Phase 7 — Production hardening
- Security/privacy review and threat model.
- Performance/accessibility and responsive testing.
- Authenticated UAT for every role and application.
- Backup restore rehearsal and disaster recovery evidence.
- Migration forward/rollback or recovery plan.
- Production deployment approval and post-release monitoring.

## Prioritization rule

Prioritize by operational value, data integrity risk, security impact, dependency and implementation cost. A module is not complete because its menu, dashboard cards or CRUD screens exist. It is complete only when its business lifecycle, permissions, audit, data integrity, exports and tests work end-to-end.
