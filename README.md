# SRIKANDI BUANA — Enterprise Workspace v14.0.0-beta.1

**Status:** Preview / beta staging. This branch is not production-ready and must not be promoted until CI, browser QA, staging migration, permission and data-integrity checks pass.

SRIKANDI BUANA is an internal, non-commercial organizational workspace. The seven dashboard domains organize access to existing operational modules; the dashboard summaries are computed from records visible to the signed-in user. Production currently remains on the separately deployed v11.5 release.

**Dokumen aktif v14:** [Arsitektur v14](docs/ARSITEKTUR_v14.md) · [Pengalaman produk v14](docs/architecture/v14/PRODUCT_EXPERIENCE.md) · [Gerbang rilis v14](docs/RELEASE_v14.md). Dokumen v11.5 yang masih berada di repositori adalah referensi historis untuk baseline lama.

## v14 workspace structure

1. Ekosistem — member portal and notifications.
2. Manajemen — programs, activities, meetings, tasks and follow-up.
3. Administrasi — membership, governance, correspondence, registers and archives.
4. Keuangan — cash records, ledger and organizational assets.
5. Usaha & Rantai Pasok — products, orders, coffee lots, business plans and partnerships.
6. Publikasi & Komunikasi — content, gallery and inbound messages.
7. Sistem — accounts, permissions, profile and website configuration.

The Help Center is the documentation home for role-based instructions, template designs, field descriptions and planned modules. It does not replace operational forms. Users create and edit records only in the owning module, preserving source-of-truth, permissions and audit history. Templates whose field mapping is incomplete are explicitly identified as not ready; a guide must never imply that unmapped fields are stored.

## Operational dashboard behavior

- Each dashboard reads the workspace data service and computes role-scoped summaries.
- A restricted domain is shown as unavailable, not as a zero balance or fabricated count.
- A finance balance is displayed only when the source marks the calculation safe.
- Priorities link back to the owning record/module; mutations remain in source workflows.
- Loading and fetch failures are visible, with a retry action.
- API and record-level authorization remain the security boundary; hiding a navigation item is not authorization.

## Local quality gates

Use Node.js 22.13+ and an isolated staging database. Never run migrations against production while validating this beta.

```bash
npm ci
npm run test:ecosystem
npm run test:navigation:compat
npm run test:terminology
npm run test:integration:staging
npm run typecheck
npm run lint
npm test
npm run build
```

The integration/migration tests must use a disposable or dedicated staging Neon database. Back up staging first and verify its connection target before running `npm run db:migrate`. Do not commit `.env.local`, database URLs, credentials, private member data or uploaded documents.

## Release gates

- [ ] CI green on the exact release commit.
- [ ] All seven dashboard routes render and respect role permissions.
- [ ] Every navigation destination resolves; no duplicate or dead menu items.
- [ ] Operational forms save to their owning module and show validation, loading and error states.
- [ ] Help Center template descriptions match actual field mappings and destinations.
- [ ] Monitoring and reports use source records and consistent date/status semantics.
- [ ] Staging migration, backup, rollback plan and data-integrity checks pass.
- [ ] Browser QA on desktop, tablet and mobile, including keyboard and screen-reader checks.
- [ ] Security review of API authorization, file access, exports and audit history.
- [ ] Explicit release approval before any production promotion.

## Deployment policy

Deploy this branch to Vercel Preview only. Do not change the production alias or production database from this branch. Promotion requires a reviewed release commit, a green CI run for that exact commit, successful staging verification and explicit authorization.
