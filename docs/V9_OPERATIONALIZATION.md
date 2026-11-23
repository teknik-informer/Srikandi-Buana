# V9.1 operationalization — implementation record

## Source of truth

- Application baseline: Git branch `v9-rebuild` (Arena.ai-generated Srikandi Buana V9.1).
- Working branch: `feat/v9-operational-core`.
- The old production application and its routes are not an implementation baseline for V9.1.
- This branch is additive. Do not merge it into `v9-rebuild` or deploy it to production until review and acceptance.

## Database isolation

- Neon project: `Srikandi Buana Core` (`hidden-surf-18556907`).
- Development branch: `v9-operational-dev` (`br-bitter-sky-a1busxt3`).
- Database: `srikandi`.
- All V9.1 application-owned tables introduced by this work live in schema `v9`.
- Existing `public` schema is left unchanged and is not part of the V9.1 application contract.
- No old production database, domain, user records, or member data were copied.

## Migration 0001

File: `db/migrations/0001_v9_identity_and_membership.sql`

Applied to the isolated Neon development branch and verified. It creates the initial identity and membership foundation:

- organization and organizational-unit registry;
- the four approved field-application records;
- people and user accounts as separate entities;
- organization memberships;
- role assignments scoped to organization, unit, or self;
- hashed-token sessions;
- public membership-interest submissions with consent metadata and review states;
- login rate-limit records;
- append-oriented audit events;
- organization-scoped settings;
- transactional outbox for email and other notifications;
- migration history.

Initial structural seeds are limited to the Srikandi Buana organization, seven organizational units, and four field applications. No administrator, login account, member, financial balance, transaction, KPI, or activity history is seeded.

## Important implementation boundaries

1. A database schema is not yet a working application. Server-side repositories, authorization checks, and screen integration must be implemented before the UI can claim these records are operational.
2. The client reducer and browser `localStorage` remain demo-only until each module is migrated to server persistence.
3. No demo account may be used as a production credential. Initial administrator provisioning must be a deliberate, one-time, secret-protected flow.
4. Every mutation must validate authorization server-side, enforce organization/unit scope, and write an audit event in the same transaction where appropriate.
5. Financial posting, approvals, inventory and POS must remain transactional and idempotent. The finance module will be native to Srikandi Buana; no Manager.io service, embed, API, or dependency is permitted.
6. Public membership-interest data is personal data. Access, purpose limitation, retention, export and deletion processes must be implemented before public production use.
7. Production deployment and domain replacement are blocked until preview, migration rehearsal, automated tests, role-based UAT, responsive testing and rollback readiness are complete.

## Next implementation sequence

1. Add the server-only Neon database client and migration verification.
2. Replace demo cookie authentication with database-backed accounts, hashed sessions, rate limiting and server-side RBAC/ABAC checks.
3. Persist public membership-interest submissions and expose a review queue in the Organization & Membership app.
4. Migrate the remaining apps domain by domain; remove fake metrics and sample records from production-facing calculations.
5. Connect the V9.1 Vercel project to the repository and isolated development database, deploy preview, then run the release gates.
