# SRIKANDI BUANA v12 — Migration and Release Plan

## Baseline

- Repository: `teknik-informer/Srikandi-Buana`
- Source branch: `feat/ecosystem-v11-5`
- Baseline commit: `e605242b299d53814731cbe2ade6beff32934161`
- Production Vercel deployment was reported READY for this commit.
- v11.5 remains a beta foundation: payment gateway, public checkout, complete accounting reconciliation, real database migration rehearsal and browser E2E are not yet proven.

The v12 foundation branch must remain isolated from `main` and Production until all release gates pass.

## Migration principles

1. No big-bang rewrite and no deletion of existing routes or data.
2. Prefer additive, backward-compatible SQL migrations.
3. Use expand → backfill → verify → switch reads/writes → contract. The contract phase requires a separate reviewed release.
4. Keep migration IDs immutable and execute them only through the existing migration runner.
5. Never run migration tests against Production. Use a dedicated Neon staging branch/database with masked or synthetic data.
6. Take and verify a recoverable backup before any data migration.
7. Do not merge a schema migration until both forward behavior and a practical recovery plan are documented.

## Work phases

### Phase 1 — Architecture foundation (this branch)

- Introduce the five-pillar feature registry.
- Centralize role-level route visibility while preserving existing record-level checks.
- Preserve all legacy route IDs and public navigation.
- Add automated tests for pillar coverage, unique route assignment and role-aware navigation.
- Add architecture, migration and release documentation.
- Keep the existing SQL schema unchanged.

### Phase 2 — Identity and access extraction

- Document account, workspace owner, member and role relationships.
- Define explicit permissions by resource and action (read, create, update, delete, approve, export, publish).
- Preserve program-level scoping and member self-access.
- Add negative tests for cross-workspace reads, guessed record IDs, file URLs and role escalation.
- Do not change password/session format without a migration and rollback plan.

### Phase 3 — Domain service extraction

Recommended order:
1. Organization and membership.
2. Operations, approvals and document registry.
3. Commerce catalog, stock reservation and order lifecycle.
4. Finance ledger and cashbook reconciliation.
5. Public content and support.
6. Administration and audit reporting.

Extract one bounded context at a time. Keep old route handlers as thin adapters until the new application service passes parity tests.

### Phase 4 — Commerce completion

Before public checkout or payment activation:
- Separate order, payment and fulfillment state machines.
- Add idempotency keys for order creation and provider callbacks.
- Verify provider webhook signatures server-side.
- Make payment transitions monotonic and auditable.
- Define refund, cancellation, stock release and reconciliation behavior.
- Add address, shipping quote, tracking and customer notification contracts.
- Never treat a submitted order as a payment receipt.

### Phase 5 — Finance completion

- Map every legacy cashbook category and transaction to an approved chart of accounts.
- Reconcile opening balances and historical totals before enabling combined reports.
- Add accounting periods, posting locks, reversal references and audit trails.
- Produce trial balance, balance sheet, income statement and cash-flow reports only after reconciliation and accounting review.
- Preserve original source transactions; never silently overwrite historical amounts.

### Phase 6 — Production hardening

- Add browser E2E for the critical journeys.
- Verify accessibility with keyboard and screen-reader checks.
- Measure Core Web Vitals from real deployments.
- Add structured server logs, correlation IDs and actionable error alerts.
- Verify backups and restore procedure.
- Run dependency, secret and security scans.
- Validate Production and Preview environment isolation.

## Deployment controls

- GitHub Actions is the quality gate.
- Vercel Preview is the deployment gate for branch changes.
- Production aliases must not move automatically as part of this branch.
- Database migrations must not run as a side effect of a normal build.
- Promote only after an approved PR, passing checks, staging migration rehearsal and human acceptance.

## Runtime alignment finding

The inspected Vercel project reports Node.js `26.x`. The v12 foundation now aligns GitHub Actions to Node.js `26` and bounds the package engine range to `>=22.13.0 <27` to avoid silently accepting the next major. Keep this alignment under review when the next Node major becomes supported. This change does not modify the Vercel Production runtime setting.

## Rollback

- Application rollback: redeploy the last known-good production commit/alias.
- Data rollback: prefer forward-fix migrations. Restore from a verified backup only when the incident plan requires it and data loss has been explicitly assessed.
- Never assume a code rollback reverses a database migration.
- Record the migration ID, commit SHA, deployment ID, operator and verification result for every production change.
