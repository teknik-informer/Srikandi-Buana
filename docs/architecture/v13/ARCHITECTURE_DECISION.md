# ADR-013 — Integrated Modular Platform Architecture

- **Status:** Accepted as the target architecture; implementation is phased
- **Date:** 17 November 2026
- **Supersedes:** None; extends the v12 modular-monolith baseline
- **Owners:** Platform architecture and Srikandi Buana system administration

## 1. Decision summary

SRIKANDI BUANA will evolve into one Integrated Organization & Business Management Platform:

**ONE PLATFORM · MULTIPLE WORKSPACES · CLEAR DOMAIN OWNERSHIP · CONTROLLED INTEGRATION**

The target application workspaces are:

1. Human Resource Management (HRM)
2. Accounting
3. Customer Relationship Management (CRM)
4. Project Management
5. Point of Sale (POS)

Supporting domains and platform services include Inventory & Procurement, Agriculture, Document Management, Collaboration, Monitoring & Evaluation (MEL), Business Intelligence (BI), Public Website CMS and System Administration.

The user experience remains unified: one application origin, one global identity, consistent navigation and design language, and permission-aware module discovery.

The long-term data target is independent ownership and separately isolatable databases for domains that require it. The current implementation remains a modular monolith on the existing Neon platform until service boundaries, API contracts, data migration and operational controls are proven.

## 2. Verified current baseline

The audit of the connected Production application found:

- Next.js 16.4.5 and React 19.2.6.
- Neon PostgreSQL as the application data platform.
- An application-managed session flow in the current server code.
- A five-workspace registry in `src/features/enterprise/registry.ts`.
- Domain-oriented code areas including `identity`, `enterprise`, `finance`, `commerce` and `workspace-v14`.
- One application database, `neondb`, containing the active `neon_auth`, `public` and `workspace_v14` schemas.
- 9 tables in `neon_auth`, 52 in `public`, and 50 in `workspace_v14` at audit time.
- Existing routes remain under `/dashboard/*`; the proposed `/app/*` route family is not implemented.

The presence of a module registry, route, schema, or table is not proof that its entire business workflow is production-complete.

The current application login implementation reads `public.users` and `public.sessions`. The additional `neon_auth` schema must be treated as a separate identity surface until a documented account-linkage and session strategy proves how the two are related. Do not assume that the presence of Neon Auth tables means the application has migrated to Neon Auth.

## 3. Platform decisions

### 3.1 Unified user experience

- Retain one canonical application origin and one authenticated workspace.
- Preserve the existing route family during migration; do not redirect all users to a new route scheme until equivalent routes and regression tests exist.
- Keep one module registry as the source for workspace labels, descriptions, feature ownership and route metadata.
- A workspace card is a launcher and a user-experience grouping. It is not, by itself, a database, service, authorization or deployment boundary.
- The global shell owns identity context, notification entry points, search entry points, profile, support and module navigation.

### 3.2 Identity and access

- Preserve the currently deployed authentication/session flow for the first implementation stage.
- Establish one stable platform user identifier and one organization/workspace identifier. Keep account identity distinct from organization membership and organizational position.
- Do not migrate to Supabase Auth or another identity provider as part of the database-boundary work. A provider migration requires a separate proof of concept, account mapping, token verification, session revocation, recovery and rollback plan.
- Keep system role, organizational position, module role, granular permission and record scope separate.
- Every read and write remains authorized on the server. Hiding a menu is not authorization.
- The System Administrator sees all five business workspaces as catalog entries and can manage technical configuration. This does not automatically grant operational access to member records, finance operations, partnership records, project execution, sales, publication approval or organizational decisions. Technical settings, source documents and global notifications remain separately permissioned platform utilities.
- Architect Full Access remains confined to the isolated QA Preview path and must not become a Production role shortcut.

### 3.3 Domain modularity

Adopt a modular monolith first:

- One Next.js deployment.
- Domain-owned feature code.
- Domain-owned validation and application services.
- Domain-owned persistence repositories.
- Explicit service contracts between domains.
- Shared platform primitives for session verification, logging, request validation, storage and common UI.

A feature must not import another feature's private repository implementation. It must call a public application-service contract.

Do not create empty parallel implementations or move legacy routes merely to make the directory structure look modular. Move a capability only when its behavior, persistence, authorization, API contracts and tests can move together.

### 3.4 Database isolation target

Use these isolation levels accurately:

| Level | Meaning | What it does not provide |
|---|---|---|
| Schema isolation | Separate PostgreSQL schemas in one database | Independent database credentials, compute or restore boundary |
| Database-name separation | Separate PostgreSQL databases on one Neon branch/project | Full project-level compute, storage and access isolation |
| Dedicated database project/instance | Separate endpoint, credentials, lifecycle and operational boundary | Automatic cross-domain transactions or SSO |

The target for a domain requiring strong physical isolation is a dedicated Neon project or another independently managed PostgreSQL service. A second database name on the existing branch is not equivalent to a fully independent service boundary.

Use a central platform identity and organization registry. Domain databases receive stable references such as `user_id`, `organization_id`, `member_id`, `project_id`, `partner_id` and `product_id`; references are exchanged through authenticated contracts, not name matching.

Initial logical ownership must be established before any physical extraction. The table inventory in [DATA_OWNERSHIP_MATRIX.md](./DATA_OWNERSHIP_MATRIX.md) is a working ownership proposal, not a claim that the current database is already physically partitioned.

### 3.5 Technology adoption

- Keep the current Neon integration and server-side authorization as the implementation baseline.
- Supabase Auth, Supabase Storage and Supabase PostgreSQL are not introduced by this decision. A move to them is a separate vendor and migration decision.
- MUI is a proposed future design-system foundation, not an installed dependency in the audited production repository. Do not replace the current shared UI system until an incremental design-system migration has its own component inventory, accessibility review and visual regression suite.
- Do not introduce Kubernetes, microservices, a message broker or a data warehouse without an operational need and a cost/ownership plan.

## 4. Domain ownership

The target canonical owners are:

| Domain | Canonical responsibility |
|---|---|
| Platform Core | Identity references, organizations, module registry, permissions, feature flags, integration registry and platform audit |
| HRM | Members, officers, organizational assignments, attendance and capacity development |
| Accounting | Chart of Accounts, journal, ledger, bank reconciliation, approved budgets and financial closing |
| CRM | External contacts, organizations, relationships, partnership opportunities and communication history |
| Project Management | Programs, projects, activities, tasks, milestones, deliverables and project progress |
| POS | Sales checkout, receipts, cashier sessions, returns and payment status |
| Inventory & Procurement | Item master, warehouses, stock ledger, stock movements and procurement lifecycle |
| Agriculture | Land plots, crop cycles, cultivation records, harvests and traceability batches |
| Documents & CMS | Document metadata, versions, templates, publication workflow and public content |
| MEL & Analytics | Indicator definitions, observations, evidence references and read-only cross-domain projections |

An owner domain is the single source of truth for its canonical facts. Another domain may store a minimal reference or read projection, but it must not become an independently editable duplicate.

## 5. Cross-domain communication

### While domains share the same application database

- Call application services directly in the modular monolith.
- Keep a business transaction within its owning domain.
- Do not use database triggers as a substitute for domain services.
- Record committed business activity in the owning domain and audit it.

### After a domain moves to a separate database/service

- Use authenticated, versioned API contracts for synchronous validation and commands.
- Use a transactional outbox in the same transaction as the source-domain change when asynchronous delivery is required.
- Use an inbox/deduplication record at the consumer.
- Require event ID, schema version, source module, organization ID, aggregate ID, occurred-at timestamp, correlation ID and idempotency key.
- Retry transient failures and retain failed messages for controlled replay.
- Build reconciliation for operations that span domains.
- Use saga/compensating actions where a workflow needs multiple domain commits. Do not claim cross-database atomic transactions.

See [INTEGRATION_CATALOG.md](./INTEGRATION_CATALOG.md).

## 6. Data safety and financial invariants

- Preserve workspace ownership predicates on all tenant-scoped queries.
- Never trust a client-supplied owner or organization ID as authority.
- No foreign keys can span independent PostgreSQL databases; enforce external references through contracts and reconciliation.
- Posted ledger entries are immutable. Correct them with linked reversing entries and replacement entries.
- A POS transaction must not create duplicate inventory movements or accounting journals if an event is delivered more than once.
- Separate order status, payment status and fulfillment status.
- File downloads re-check authorization at request time.
- Personal data, member documents and photos are not shared with external organizations without a recorded lawful purpose and permission.
- Analytics reads committed and verified source data and reports its freshness; it is not a transaction source of truth.

## 7. Implementation phases

1. **Foundation and reconciliation:** module catalog, database ownership map, migration ledger reconciliation, RBAC invariants, integration contracts and QA environment.
2. **Platform Core and HRM:** central identity references, module registry, account lifecycle, organization membership, member records and attendance.
3. **Accounting:** financial periods, accounts, journals, reversals, budgets and reconciliation.
4. **Project Management and CRM:** programs, work plans, tasks, partner records and partnership lifecycle.
5. **Agriculture and Inventory:** field records, harvest intake, stock movements, procurement and traceability.
6. **POS:** products, checkout, receipts, return/refund and stock/accounting integration.
7. **Documents, MEL and BI:** controlled publication, indicators, evidence and read models.
8. **Physical database extraction:** one domain at a time after migration, security, cost, backup and rollback gates pass.

## 8. Consequences

Positive:
- The existing application remains usable while architecture improves.
- Module and data ownership become explicit.
- Future database extraction is measurable and testable.
- The System Administrator can discover registered modules without acquiring organizational decision rights.

Costs and constraints:
- Some legacy data remains in shared tables until it can be safely extracted.
- Cross-domain integration needs explicit contracts.
- A physical database split adds endpoints, credentials, backups, monitoring, deployment settings and failure modes.
- A central identity provider must be proven against every target database before enabling cross-project client access.
- Production migration remains blocked until the drift recorded in [MIGRATION_RECONCILIATION.md](./MIGRATION_RECONCILIATION.md) has been resolved.

## 9. Rollout and release gates

This ADR is a target design and implementation record. It does not authorize:
- A Production database migration.
- A Production account or role reset.
- A move from Neon to Supabase.
- A migration of the current session provider.
- A destructive table/schema change.
- A Production deployment of this PR.

Those actions require isolated QA verification, a reviewed migration plan, explicit approval and a rollback path.
