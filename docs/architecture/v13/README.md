# SRIKANDI BUANA — Architecture v13

This directory defines the target architecture for the integrated modular platform. It is a forward-looking design record and must not be read as evidence that every module or physical database is already deployed.

## Documents

- [Architecture decision](./ARCHITECTURE_DECISION.md) — platform boundaries, identity, modularity, database-isolation target and access rules.
- [Data ownership matrix](./DATA_OWNERSHIP_MATRIX.md) — current production table locations and proposed domain ownership.
- [Integration catalog](./INTEGRATION_CATALOG.md) — cross-module flows, event contracts and delivery requirements.
- [Migration reconciliation](./MIGRATION_RECONCILIATION.md) — measured difference between the Production migration ledger and the repository.
- [Implementation roadmap](./IMPLEMENTATION_ROADMAP.md) — gated delivery plan from the current platform to the modular target.

## Baseline

The audit was performed against Production deployment commit `811d682a969e6c91a8555ceb7356f5637e804557`, the connected repository branch `integration/phase1-preview-2026-11-16`, and the Neon Production application database `neondb`.

The current application remains a Next.js modular monolith on Neon PostgreSQL. The six workspace cards (HRM, Accounting, CRM, Project Management, POS, and BI & Analitik) are user-experience groupings; they are not evidence of six independent databases or completed end-to-end business workflows.

## Safety

No Production schema, account, business record, connection string or deployment was changed while preparing these documents. The migration reconciliation is a read-only inspection. Physical database separation requires a reviewed data migration, QA rehearsal, explicit Production approval and rollback plan.
