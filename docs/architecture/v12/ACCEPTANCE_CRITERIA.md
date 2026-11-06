# SRIKANDI BUANA v12 — Acceptance and Release Gates

## Architecture foundation acceptance

- [ ] Exactly five dashboard pillars are defined.
- [ ] Every existing dashboard route is assigned to exactly one pillar.
- [ ] Existing route IDs, URLs, public menus and persisted record kinds remain unchanged.
- [ ] Menu visibility is derived from the same role-level policy as the server route guard.
- [ ] Record-level and workspace-level authorization remain enforced by server handlers.
- [ ] No feature registry entry is treated as proof that an unfinished workflow is complete.
- [ ] Automated regression tests cover route coverage, uniqueness and role visibility.

## Security acceptance

- [ ] Unauthenticated requests cannot access protected dashboard data or APIs.
- [ ] A user cannot read or mutate another workspace's records by changing IDs or request fields.
- [ ] Member self-service exposes only approved fields.
- [ ] Program-scoped roles cannot access records outside assigned programs.
- [ ] File downloads re-check the current user's authorization and owner scope.
- [ ] Write endpoints enforce same-origin protection, schema validation, rate limits and idempotency where needed.
- [ ] Sensitive configuration and personal records are absent from Git history and public assets.
- [ ] Authorization tests include both allowed and denied cases.

## Database and business acceptance

- [ ] Every migration has a unique immutable ID and is tested on isolated staging.
- [ ] A verified backup and restore procedure exists before data migration.
- [ ] Workspace ownership is included in relevant unique constraints and query predicates.
- [ ] Concurrent stock reservations cannot oversell inventory.
- [ ] Order, payment and fulfillment statuses are distinct.
- [ ] Ledger postings balance debit and credit and are immutable after posting.
- [ ] Cashbook-to-ledger reconciliation is reviewed before consolidated financial reporting.
- [ ] Audit history is retained for stock, approvals, documents and financial corrections.

## User experience and accessibility

- [ ] The five-pillar navigation works on mobile and desktop without duplicate destinations.
- [ ] Keyboard users can reach, open, search and close all navigation controls.
- [ ] Focus is visible and restored after dialogs close.
- [ ] Forms have programmatic labels, useful errors and clear pending/success states.
- [ ] Text and controls meet WCAG 2.2 AA contrast requirements.
- [ ] Layout remains usable at narrow viewport widths and browser zoom.
- [ ] Loading, empty, error, forbidden and offline states are designed intentionally.

## Vercel environment isolation

- [ ] Preview runtime never falls back to `DATABASE_URL`.
- [ ] Preview database access stays disabled until a dedicated sanitized `PREVIEW_DATABASE_URL` is configured.
- [ ] Production uses only the Production `DATABASE_URL`.
- [ ] Migration, admin bootstrap and data import scripts use the same environment-specific database resolver.
- [ ] Preview credentials and data are separate from Production; no production member data is copied into Preview without an approved masking plan.

## Quality and performance

- [ ] `npm ci` succeeds from a clean environment.
- [ ] `npm run test:navigation:compat` passes.
- [ ] `npm run test:terminology` passes.
- [ ] `npm run test:ecosystem` passes, including v12 pillar tests.
- [ ] `npm run test:integration:staging` passes against isolated fixtures.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Browser E2E passes for login, member access, approval, commerce and finance.
- [ ] Core Web Vitals target at the 75th percentile: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

## Release decision

A READY deployment alone is not sufficient. Production promotion requires all applicable gates above, a reviewed migration plan, successful Preview verification, environment isolation, backup evidence and explicit release approval. Payment and statutory accounting claims must remain disabled until their domain-specific acceptance criteria are met.
