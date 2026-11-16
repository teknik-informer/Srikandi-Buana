# SRIKANDI BUANA — Integrated Business & Organization Platform

**Architecture target:** One domain · One identity · Five applications · Shared platform services  
**Architecture style:** Modular monolith first  
**Status:** Target architecture and implementation contract; incremental adoption required.

## 1. Product structure

SRIKANDI BUANA has three coordinated surfaces:

1. **Public Website** — verified public identity, organization profile, programs, impact, products, traceability, partnerships, governance, transparency, publications and contact.
2. **Application Portal** — authenticated entry point and module switcher for the five operational applications.
3. **Platform Control Center** — technical configuration and platform governance, separate from organizational decision authority.

The five applications are distinct product workspaces, not five independent websites:

| Application | Primary responsibility | Domain owner |
|---|---|---|
| HRM | People, membership, workforce, positions, attendance, learning | HRM domain |
| Accounting | Chart of accounts, journals, ledger, cash, budgets, financial statements | Accounting domain |
| CRM | Contacts, customers, suppliers, buyers, donors and partnerships | CRM domain |
| Project Management | Program/project portfolio, plans, tasks, milestones, budgets, M&E | Projects domain |
| POS | Product sales, cashier, stock movement, orders, payments and closing | POS domain |

A user sees only applications and actions authorized for their identity, organization membership, module grant and record scope.

## 2. Platform foundation

Shared capabilities:
- Identity and session lifecycle.
- Organization/workspace registry and membership.
- Role/permission evaluation and module grants.
- Navigation registry and user preferences.
- Notification delivery and inbox.
- Document metadata, private file storage adapter and signed access.
- Approval orchestration (domain-specific decision rules remain in each domain).
- Append-only audit events and security events.
- Integration registry, idempotency and transactional outbox.
- Reporting read models with source lineage and data classification.
- Health checks, observability, backup and recovery procedures.

The Platform Control Center may administer technical configuration, identity lifecycle and integration settings when authorized. It does not acquire the right to approve organizational decisions, post journals, authorize refunds or rewrite audit records.

## 3. Deployment and data architecture

Initial topology:
- One Next.js App Router deployment on the existing Vercel project.
- One primary managed PostgreSQL platform (Neon).
- One codebase with domain-owned feature packages and application services.
- Private object storage adapter for private documents; public assets remain explicitly published.
- Background work may initially use controlled scheduled/worker mechanisms only when a real workflow requires it.

Logical PostgreSQL schema targets:

`core`, `hrm`, `accounting`, `crm`, `projects`, `pos`, `audit`, `integration`.

These are target logical boundaries, not a mandate to create every schema immediately. First inventory the actual tables, ownership, constraints and migration ledger. Keep existing tables and routes working during expand-and-migrate phases.

## 4. Domain boundary rules

- Each domain owns its write model, validation, state transitions and repository queries.
- Another domain must not directly update a domain-owned table.
- Cross-domain actions use application service contracts or documented APIs.
- Cross-domain reporting uses approved read models/projections, not arbitrary table joins from UI code.
- Every tenant-owned query is scoped using the authenticated workspace; client-supplied owner IDs are never authoritative.
- Domain events are emitted only after a successful commit. Use an outbox in the same transaction when asynchronous delivery is required.
- Consumers must be idempotent and record attempts, failures and replay state.
- Avoid database triggers as a replacement for business workflow logic. Retain existing database integrity triggers until a tested replacement exists.

## 5. Identity and authorization model

Keep distinct:
- Person: real-world individual.
- Account: login identity and security lifecycle.
- Organization/workspace membership: relationship to the organization.
- Position/assignment: organizational office or operational assignment.
- Access profile/role: permission bundle.
- Module grant: application-level access.
- Scope: program, project, record, location or time boundary.

One position may be held by more than one person when the organization's governing documents permit it. Each person uses an individual account, session and audit identity. Holding a position does not automatically grant every permission associated with another position.

Authorization decision must consider account status, workspace membership, module grant, permission, record scope and relevant workflow state. Enforce on the server for pages, APIs, exports, files and background jobs.

## 6. Financial and commerce invariants

- Accounting is the authoritative financial journal and ledger.
- Every posted journal balances; posted entries and lines are immutable.
- Corrections use linked reversal/adjustment entries.
- POS records the sale and operational payment/fulfillment state; it does not independently create an authoritative financial ledger.
- Inventory movements are owned by the inventory/stock domain (initially POS domain if no separate inventory application exists).
- Sale, stock deduction and accounting posting must be linked by stable source references and idempotency keys.
- A submitted order is not a payment confirmation.
- Payment provider credentials and sensitive payment data remain outside application storage; provider webhooks require signature verification and idempotent processing.
- Revenue and cost-of-goods journals must follow the approved accounting policy and inventory valuation method. The example cash sale journal is not a complete posting specification.

## 7. Public/private data boundary

Public content is a curated projection, never a direct view of operational tables. Publishing requires authorization, explicit status and relevant consent/legal basis. Never expose member contact details, private contracts, full ledgers, raw donor data or sensitive beneficiary information by default.

## 8. Technology decisions

Retain the installed stack: Next.js, React, TypeScript, Neon PostgreSQL, Drizzle, Tailwind/shadcn, Zod, React Hook Form, Recharts and Nodemailer. Reassess only when a documented capability gap justifies a change.

MUI is an optional future design-system decision, not an automatic requirement. Supabase must not become a competing source of truth alongside Neon. Do not replace the existing authentication/session model without a security review, migration plan and rollback strategy.

## 9. Architecture decision records required

Create an ADR before:
- Introducing a new database/schema boundary that changes ownership.
- Adding a queue, event broker or separate service.
- Replacing authentication, ORM or database provider.
- Introducing MUI or a second component system.
- Changing the migration runner or renaming historical migrations.
- Enabling payment provider, tax calculation or statutory financial reports.
- Enabling multi-organization tenancy beyond the currently verified workspace model.
