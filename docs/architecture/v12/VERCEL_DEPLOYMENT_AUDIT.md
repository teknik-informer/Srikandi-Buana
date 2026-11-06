# Vercel and Neon deployment risk audit — Srikandi Buana

**Audit date:** 6 November 2026  
**Vercel project:** `admin-dashboard` (`prj_MfuJUUQQo4nlDtgOnUimyulsoPgN`)  
**Production deployment:** `dpl_714n1xsXMuoLxdnCVPKgSuWLYGW6`  
**Production commit:** `15db17e73aa5aa076d53d964fbfd93208895c45d`  
**Framework:** Next.js  
**Production branch:** `feat/ecosystem-v11-5`

This audit uses deployment, project, environment-variable metadata, GitHub, and Neon configuration metadata. It does not retrieve or reproduce decrypted environment-variable values.

## Current production state

- Vercel reports deployment `READY` and confirms the production alias `srikandibuana.vercel.app`.
- The deployment uses commit `15db17e` from `feat/ecosystem-v11-5`, which includes the v11.5 security hotfix.
- The Vercel deployment runs in region `iad1`; the Neon project is in `aws-us-east-2`. Both are in the US East region.
- Vercel reports Node.js `26.x`. The v12 package engine range is `>=22.13.0 <27`.
- Vercel's aggregated runtime error query returned no error clusters for the last 24 hours; the latest 30-minute error-log query returned no records. This does not prove that every page or workflow has been exercised.
- Browser-based smoke tests of the public site and protected dashboard were not completed in this audit because the website could not be fetched by the available browser/search reader. Do not mark browser E2E as passed based on deployment status alone.

## Findings and actions

| Severity | Finding | Current evidence | Required action |
|---|---|---|---|
| Critical if commercial | Vercel team is on Hobby | Team metadata reports `hobby` | If the site advertises or sells products/services, or otherwise supports paid business activity, move to Pro or Enterprise before relying on it commercially. Hobby is for personal, non-commercial use. |
| High | Existing Vercel project is not Git-linked | Git deployment context reports no linked projects for the team | Link the existing project to this repository through Vercel Project Settings. Do not create a duplicate project. Until linked, releases remain manually initiated and PR Preview automation is absent. |
| High | Secret metadata flags | Vercel marks `DATABASE_URL` and several Neon integration variables with `readable-secret`; values were not decrypted | Review their variable types and access. Use write-only Sensitive values where supported; rotate any credential confirmed to have been exposed. |
| Mitigated | Production DB URL was available to Preview | The original `DATABASE_URL` targeted Production and Preview | `DATABASE_URL` has now been scoped to **Production only**. `PREVIEW_DATABASE_URL` is still absent. The v12 resolver uses only `PREVIEW_DATABASE_URL` for Preview and fails closed when it is missing. |
| High | Production Neon branch is unprotected | Default branch `production` currently reports `protected=false` | Enable branch protection. The attempt was blocked by the current Neon plan's protected-branch limit; do not remove protection from another branch to work around this. |
| High | Short database recovery window | Neon project is on `free_v3` with a 6-hour history window | Adopt a paid recovery/backup plan appropriate for business records and document a tested restore procedure. |
| High | QA branch derives from Production | `srikandi-v12-migration-qa-20261106` is a child of the Production branch | No sanitization evidence was found in branch metadata or repository docs. Treat it as containing Production data until masking is explicitly verified. Do not expose it through a public Preview deployment before sanitization and access review. |
| Medium | Cloudinary is not configured in Vercel | No `CLOUDINARY_*` environment variables are present; current file storage code uses Neon `file_objects` | Cloudinary upload is not live. Configure separate Preview and Production credentials and implement signed upload/asset authorization before claiming Cloudinary integration is complete. |
| Medium | No health/readiness API route | No `src/app/api/health/route.ts` or readiness route exists in the v12 tree | Add a minimal health/readiness endpoint and external uptime check; avoid exposing configuration or database error details. |
| Medium | Indonesian user latency | Vercel `iad1` and Neon `aws-us-east-2` are both in US East | For an Indonesian audience, plan a controlled migration to a Singapore-region Neon project and Vercel Functions in `sin1`. This requires backup, data migration, connection-string rotation and rollback planning; do not change region in place during this release. |

## Database migration boundary

- Neon Production branch `production` currently contains the v11 application tables.
- The isolated QA branch `srikandi-v12-migration-qa-20261106` contains the new `commerce_products`, `commerce_orders`, `commerce_stock_history`, `ledger_accounts`, `ledger_entries`, `ledger_lines`, and `ledger_reversals` tables.
- Those v12 tables are absent from the Production branch table inventory. Migrations 005 and 006 have **not** been applied to Production.
- Keep migrations out of Vercel build hooks. Apply them only to the verified QA/staging branch, test rollback/restore, and require separate release approval before Production migration.

## v12 safeguards already in source

- `src/features/shared/database-target.mjs` resolves Preview only from `PREVIEW_DATABASE_URL`; it does not fall back to Production `DATABASE_URL`.
- Runtime and database administration scripts use the same resolver.
- The Preview app returns database-unavailable behavior until a dedicated sanitized staging URL is configured.
- The v12 PR remains separate from Production.

## Remaining release gates

1. Link the existing Vercel project to `teknik-informer/Srikandi-Buana` without creating a duplicate.
2. Review the `readable-secret` flags and rotate credentials if exposure is confirmed.
3. Upgrade Vercel from Hobby if the deployment is used commercially.
4. Upgrade Neon or otherwise obtain production branch protection and an adequate recovery window.
5. Verify sanitization of the v12 QA branch before connecting it to Preview.
6. Configure a separate Preview-only `PREVIEW_DATABASE_URL`.
7. Add Cloudinary configuration and test signed upload/authorization if Cloudinary is a requirement.
8. Run real browser E2E for public pages, login, admin/member authorization, file upload/download, orders, inventory reservation/cancellation, journals and reversal.
9. Test backup restoration and migration rollback.
10. Obtain explicit approval before Production migration or deployment.

## Official references

- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Vercel fair use and commercial use: https://vercel.com/docs/limits/fair-use-guidelines
- Neon branch protection: https://neon.com/blog/restrict-access-to-the-production-branch
- Neon restore history: https://neon.com/blog/practical-guide-to-database-branching
