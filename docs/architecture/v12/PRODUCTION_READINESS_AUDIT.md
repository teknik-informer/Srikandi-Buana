# SRIKANDI BUANA v12 — Production Readiness Audit

**Audit date:** 6 November 2026  
**Production baseline:** v11.5 security hotfix, commit `15db17e73aa5aa076d53d964fbfd93208895c45d`  
**v12 working branch:** `feat/enterprise-v12-foundation`  
**Scope:** public website, authentication, dashboard authorization, API, media, commerce, accounting, Vercel and Neon.

This is a source/configuration audit. It is not a claim that browser-based end-to-end testing has passed.

## Verified strengths

### Public website and SEO

- Public routes use Next.js App Router and server-rendered content.
- `robots.ts` excludes dashboard, API, login, activation and logout routes.
- `sitemap.ts` includes configured public pages, programs and published news.
- Public content and site settings use parameterized Neon queries.
- The v12 branch memoizes public-content and site-settings reads per server render to avoid duplicate queries from the public layout and page.
- Public routes currently opt into dynamic rendering; cross-request caching/ISR is not enabled because content invalidation needs a deliberate policy.

### Authentication and session

- Login enforces same-origin POST requests.
- Login attempts are rate-limited to five attempts per 15 minutes using an IP/email fingerprint.
- Session tokens are generated from cryptographic random bytes; only their SHA-256 digest is stored in the database.
- The session cookie uses the `__Host-` prefix, HttpOnly, SameSite=Lax and Secure in Production.
- Session expiry is eight hours by default or 30 days when the user chooses remember-me.
- Redirect targets are restricted to safe same-site paths.
- Dashboard pages independently validate the session in the database; the Proxy cookie check is only an early redirect, not the authorization boundary.

### Dashboard and API authorization

- Dashboard routes check the authenticated principal and role-level section policy on the server.
- API handlers use the shared authentication/owner guard.
- Mutating API routes check same-origin requests.
- Tenant-owned reads and writes use owner predicates; record access is filtered by role and program assignment.
- File downloads are private, owner-scoped, and excluded after soft deletion.

### Media upload

- Multipart bodies are streamed with a hard request limit.
- Individual uploaded files are limited to 3 MB.
- File extensions and file signatures are checked; uploaded images are sanitized.
- File download responses use private/no-store caching, nosniff and a restrictive content security policy.
- Deletion is soft-delete and checks known record/settings references.

### Commerce and stock

- Order creation uses an atomic SQL statement to reserve stock and create the order together.
- Orders have a client request idempotency key.
- Order cancellation changes status and restores reserved stock in one SQL statement, only once.
- Stock updates are captured by a database trigger in `commerce_stock_history`.

### Accounting

- The API validates balanced debit/credit lines before posting.
- Journal creation and reversal use database batch transactions.
- Reversals are recorded in `ledger_reversals` and duplicate reversals are rejected.

## Gaps to close before Production v12

| Severity | Gap | Why it matters | Required completion |
|---|---|---|---|
| High | Journal balance is enforced in application code only | Direct SQL or a future handler could insert a journal whose total debit differs from total credit | Add a deferred database constraint trigger that validates every posted entry at transaction commit. |
| High | Journal immutability is not enforced by database triggers | The API has no edit/delete route, but privileged SQL can still alter posted entries/lines | Add database-level protection against UPDATE/DELETE; require reversal entries for corrections. |
| High | Order status changes have no dedicated event history | The status endpoint notifies users but does not persist a complete transition audit | Add an append-only order event/status history table and write each transition atomically. |
| High | Payment is not implemented | The order route explicitly creates a submitted order for manual processing; there is no payment status or gateway confirmation | Keep the product described as manual order intake until payment, settlement and refund workflows are built and tested. |
| Medium | Product changes are not consistently audited | Product PATCH updates price/content without an audit row | Add product change audit records with actor, before/after fields and timestamp. |
| Medium | Some tenant foreign keys are not composite | Buyer/actor references are single-column user FKs rather than enforcing the same workspace at the database boundary | Add composite workspace-scoped FKs after verifying the existing users unique constraints and legacy rows. |
| Medium | Global Content Security Policy is absent | X-Frame-Options, nosniff, Referrer-Policy and HSTS are configured, but a site-wide CSP is not | Inventory script/style/image origins, then deploy CSP in report-only mode before enforcing. |
| Medium | Public content remains dynamic | Public layout and page read from Neon on each request; the request cache only avoids duplicate reads within one render | Measure TTFB and add tagged revalidation/ISR for public content after all admin writes invalidate the relevant tags. |
| Medium | Cloudinary is not connected | No `CLOUDINARY_*` environment variables are configured; current upload path uses Neon-backed object storage | Add separate signed Cloudinary configuration for Preview and Production if Cloudinary remains a requirement. |
| Medium | Browser E2E is not complete | CI currently runs dependency audits, source/regression tests, typecheck and build, but not a full browser test against real auth and a sanitized DB | Add Playwright coverage for public routes, login, role restrictions, uploads, orders, stock restoration, journals and reversal. |

## Health and response security added in v12 branch

- `GET /api/health` is a minimal liveness endpoint and reveals no environment or database details.
- `GET /api/ready` checks `SELECT 1` against the configured database and returns only a generic 503 when unavailable.
- Both endpoints set `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Global response headers include HSTS, nosniff, Referrer-Policy and X-Frame-Options.
- These changes exist on the v12 branch only; they are not part of the deployed v11.5 Production build.

## Database migration boundary

- Neon Production branch `production` contains the current v11.5 schema.
- The isolated branch `srikandi-v12-migration-qa-20261106` contains the v12 commerce and ledger tables created by migrations 005 and 006.
- Those v12 tables are absent from the Production branch table inventory. Production migrations have not been applied.
- The QA branch was created from the Production branch. No data-masking evidence was found; treat it as containing Production data until masking is explicitly verified.
- The migration runner fails closed in Preview when `PREVIEW_DATABASE_URL` is missing and does not fall back to Production `DATABASE_URL`.

## Release gates

1. Keep PR #1 in Draft until the application gaps above are resolved or explicitly accepted.
2. Complete Playwright/browser E2E against a sanitized staging database.
3. Verify database migration and rollback on an isolated branch.
4. Test backup restoration; current Neon Free plan has a six-hour history window and does not permit protecting the Production branch under the present plan.
5. Review Vercel environment-variable `readable-secret` flags; do not paste decrypted values into logs or chat.
6. Upgrade Vercel to Pro/Enterprise if the deployment is used to advertise or sell products/services.
7. Link the existing Vercel project to GitHub to enable automatic Preview and CI/CD; do not create a duplicate project.
8. Decide whether to migrate Vercel Functions and Neon to Singapore for Indonesian users. This requires a planned data migration and rollback; it is not an in-place region change.
9. Obtain explicit release approval before applying migrations 005/006 or deploying v12 to Production.
