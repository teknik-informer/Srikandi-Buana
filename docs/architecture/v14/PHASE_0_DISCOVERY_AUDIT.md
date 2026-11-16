# SRIKANDI BUANA — Phase 0 Discovery & System Audit

**Audit date:** 16 November 2026  
**Repository:** `teknik-informer/Srikandi-Buana`  
**Audited code reference:** PR #24 head `195b14d965f05c739e8379805144f14a8c93f826`  
**Audit branch:** `docs/master-blueprint-phase0-architecture-2026-11-16`  
**Status:** Source-level discovery baseline; not a production-readiness certification.

## 1. Executive result

The repository is an existing Next.js application with a substantial operational foundation. It is not a greenfield project and must not be replaced with a new application. The approved direction is to evolve it incrementally into the five-application Integrated Business & Organization Platform.

Verified repository stack from `package.json`:
- Next.js 16.4.5, React 19.2.6, TypeScript 5.9.3.
- Neon serverless PostgreSQL and Drizzle ORM 0.45.2.
- Tailwind CSS 4 and the installed shadcn/Radix/Base UI component ecosystem.
- React Hook Form and Zod.
- Recharts.
- Nodemailer 10.5.0.
- Node engine range `>=22.13.0 <27`.

MUI is not installed. Supabase is not the active database or authentication source. Do not add either as a replacement without an approved architecture decision and migration plan.

## 2. Repository and release baseline

- Default branch: `main`.
- PR #17 governance/RBAC: open, Draft, unmerged.
- PR #21 navigation/public UX: open, Draft, unmerged; based on PR #17.
- PR #22 architect identity console: open, Draft, unmerged; based on PR #17.
- PR #24 HRM Smart Attendance: open, Draft, unmerged; based on PR #22.
- This audit branch is based on PR #24 head and its documentation PR must target that same branch. It is therefore dependent on the existing PR chain.
- Production changes, merges and Production migrations are outside this Phase 0 task.

## 3. Verified capabilities already present

### Platform and identity
- Next.js App Router and a unified application deployment.
- Server-side authentication/session checks and role policy.
- Workspace owner and account identity are separate concepts.
- Account invitation, email change and WhatsApp login flows are represented in PR #22.
- Preview-only architect full-access capability is branch/environment constrained; Production technical admin remains separate from organizational business authority.
- Notifications, external access grants, audit facilities, report packages and public content routes exist in the codebase.

### Existing domain capabilities
- Commerce product catalog, stock and order records.
- Finance ledger tables and journal validation/reversal logic.
- Agriculture commodities, farm parcels, crop cycles and harvest records.
- External organizations, external portal accounts and scoped access grants.
- Report package snapshots, source manifests, scope and approval lifecycle.
- HRM Smart Attendance initial increment, using the existing owner-scoped `records` persistence adapter.

### Public website
Existing public route families include profile, programs, impact-related content, products, partnerships, news/activity, contact, privacy/data-rights, public documents and support pages. Route existence does not prove that all content or workflows are complete or approved for publication.

## 4. Material gaps and risks

1. **Migration filename collisions:** there are two `005_*.sql` files and two `006_*.sql` files. The migration runner sorts filenames lexicographically and records the complete filename in `schema_migrations`. This is not an immediate proof of failed migrations, but it is an auditability and sequencing hazard. Do not rename or reorder historical migrations in place.
2. **Migration history divergence:** the Smart Attendance design note explicitly says the repository migration history and live Neon migration ledger have divergent histories/names. Do not run the feature branch migration runner against QA or Production until reconciled.
3. **HRM persistence is transitional:** attendance kinds currently live in the generic `records` table behind a dedicated API boundary. This is not a normalized HRM domain schema.
4. **Accounting is partial:** ledger tables and balanced journal logic exist, but earlier ecosystem documentation states cashbook reconciliation, full financial statements and tax invoice workflows are incomplete. Do not claim complete statutory accounting.
5. **Commerce is not full POS:** catalog/order/stock foundations exist; payment gateway, settlement/refund and cashier-shift workflows are not evidenced as complete.
6. **CRM and Projects are not yet complete standalone applications:** partnership, external access, programs and operational records exist, but full CRM pipeline and project portfolio/M&E workflows require explicit completion evidence.
7. **Five-app navigation is not yet the authoritative current navigation model:** v12 documentation describes five legacy dashboard pillars (Ecosystem, Management, Administration, E-Commerce, Public & Support). The target blueprint defines HRM, Accounting, CRM, Projects and POS. Route mapping and migration must be incremental.
8. **Browser UAT remains distinct from CI:** successful static/regression/build checks do not prove authenticated browser workflows.
9. **Role test accounts:** prior PR notes say QA does not yet have verified accounts for all organizational roles. Do not fabricate organizational identities or grant Production data access to technical administrators.

## 5. Existing architecture decisions retained

- Modular monolith, one Next.js deployment, one primary Neon PostgreSQL platform.
- Feature/domain boundaries in code; dashboard groupings are not automatically database or authorization boundaries.
- Server-side authorization and workspace scoping.
- Immutable posted ledger/audit history with reversals/correcting events.
- Direct in-process application services initially; transactional outbox only when reliable asynchronous delivery is required.
- Preview must use the dedicated QA database variable and must never fall back to Production database credentials.

## 6. Phase 0 exit criteria

- [x] Repository, stack and active PR dependency chain inspected.
- [x] Existing domain and route inventory inspected.
- [x] Migration filename collision identified.
- [x] HRM attendance persistence limitation identified.
- [x] Existing architecture and role policy documents inspected.
- [ ] Migration ledger reconciled against QA branch without touching Production.
- [ ] Authenticated browser UAT across representative roles.
- [ ] Runtime deployment/environment audit revalidated against current Vercel settings.
- [ ] Business owners approve domain workflows and financial accounting policies.

## 7. Safety boundary

This document is based on source inspection and repository metadata. No database was queried or modified as part of this commit. No Production environment variable, deployment, migration, user record or operational data was changed.
