# Vercel Deployment Risk Audit — Srikandi Buana

**Audit date:** 6 November 2026  
**Project:** `admin-dashboard`  
**Framework:** Next.js  
**Production baseline observed:** `feat/ecosystem-v11-5` / `e605242b299d53814731cbe2ade6beff32934161`

This audit records configuration metadata only. It does not include decrypted environment-variable values, credentials, or connection strings.

## Executive summary

The latest observed Production deployment is READY, but the Vercel project is not yet a safe automated release path for v12. The most important issues are missing Git automation, shared Production/Preview database configuration, environment variables flagged for secret review, and the current Hobby plan's non-commercial restriction.

## Findings

| Severity | Finding | Evidence | Required action |
|---|---|---|---|
| Critical | Preview was configured to receive the same `DATABASE_URL` target as Production | Vercel environment metadata listed `DATABASE_URL` for both Production and Preview; no dedicated `PREVIEW_DATABASE_URL` was present | v12 runtime and database administration scripts now fail closed in Preview unless a dedicated `PREVIEW_DATABASE_URL` is configured. Create a sanitized staging branch before enabling Preview database access. |
| High | Vercel project is not Git-linked | Vercel team context returned no linked projects; current Production deployment source is CLI | Connect the existing project to the GitHub repository in Vercel Project Settings, or establish an explicitly approved Git-linked project. Do not create a duplicate project automatically. |
| High | Several environment variables carry the `readable-secret` security issue | Vercel environment metadata only; no values were retrieved | Review the variable type in Vercel. Store passwords, database URLs and tokens as write-only **Secret** values, not readable Config values. Rotate any credential confirmed to have been exposed. |
| High / policy | Team is on the Hobby plan | Vercel team metadata | Vercel restricts Hobby to personal, non-commercial use. If this deployment is used for business operations, sales, paid work, or financial gain, move it to Pro or Enterprise before relying on it commercially. |
| Medium | Production release is CLI-driven rather than PR-preview-driven | Latest Production deployment reports source `cli`; Git metadata points to the v11.5 baseline | Require a reviewed PR, passing GitHub Actions, Preview verification and explicit production promotion. |
| Medium | No dedicated staging DB target is configured | No `PREVIEW_DATABASE_URL` in the project environment metadata; Neon has multiple historical branches but none was verified as sanitized staging | Select or create a dedicated staging branch, mask personal data, apply migrations there, then add a Preview-only Secret. |

## Verified strengths

- The latest observed Production deployment state is `READY`.
- The deployed application framework is Next.js.
- Vercel reports Node.js `26.x`; GitHub Actions now runs Node.js 26.
- `vercel.json` sets the Next.js framework and a 60-second maximum duration for API route functions. Vercel's current Hobby documentation allows function duration to be configured up to 60 seconds.
- The repository's quality workflow has least-privilege `contents: read` permissions and checkout credentials persistence disabled.
- The v12 branch does not add database migrations or automatically run migrations during a build.

## Implemented in the v12 branch

- Added `src/features/shared/database-target.mjs`.
- Production and local development resolve `DATABASE_URL`.
- Vercel Preview resolves only `PREVIEW_DATABASE_URL`; it never falls back to `DATABASE_URL`.
- If the Preview secret is missing, database-dependent routes return the existing database-unavailable response.
- `scripts/migrate.mjs`, `scripts/create-admin.mjs` and `scripts/import-data.mjs` use the same resolver and fail closed in Preview.
- Added regression tests for Preview isolation.

This guard deliberately leaves the current Preview database unavailable until a dedicated, sanitized staging database is configured. That is safer than allowing test deployments to mutate Production data.

## Vercel owner actions still required

1. Review every environment variable flagged `readable-secret` in Project Settings. Use Secret type for database URLs, passwords and tokens. Do not paste secret values into GitHub, issues, chat, or source files.
2. Confirm whether the application is used commercially. If yes, upgrade the Vercel team from Hobby to Pro or Enterprise.
3. Connect GitHub automation for `teknik-informer/Srikandi-Buana` to the intended Vercel project. Verify the Production Branch explicitly; do not assume it is `main`.
4. Prepare a separate sanitized Neon staging branch. Do not use a historical branch until its data and access have been reviewed.
5. Add `PREVIEW_DATABASE_URL` as a Preview-only Secret after staging is ready. Keep Production `DATABASE_URL` scoped to Production.
6. Verify the Preview deployment, authentication, write operations, migrations and rollback procedure before merging v12.
7. Keep Production aliases on the known-good v11.5 deployment until release approval.

## Official references

- [Vercel Git deployments and Preview environments](https://vercel.com/docs/git)
- [Vercel environment variable Config and Secret types](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types)
- [Vercel Hobby plan restrictions](https://vercel.com/docs/plans/hobby)
- [Vercel fair use and commercial usage](https://vercel.com/docs/limits/fair-use-guidelines)
- [Node.js 26 on Vercel](https://vercel.com/changelog/node-js-26-lts-is-now-generally-available-on-vercel)
