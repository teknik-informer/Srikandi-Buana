# SRIKANDI BUANA — Quality Gates and User Acceptance Testing

## 1. CI quality gates

Run for every pull request:
1. Dependency/security checks and secret scanning.
2. TypeScript typecheck.
3. ESLint.
4. Unit and domain validation tests.
5. Integration tests against isolated fixtures/database.
6. Server authorization and RBAC negative tests.
7. Database constraint and migration tests.
8. Idempotency/concurrency tests for critical writes.
9. Regression tests for existing route and workflow compatibility.
10. Next.js production build.
11. Link/navigation and terminology checks.
12. Responsive/accessibility smoke checks.

CI success proves only the checks actually executed. It does not replace authenticated browser UAT, production data verification or restore testing.

## 2. UAT roles

Prepare synthetic or explicitly authorized QA accounts for:
- Ketua.
- Sekretaris.
- Bendahara.
- Koordinator with at least two distinct program scopes.
- Anggota.
- Administrator Sistem/Arsitek.
- External government/NGO viewer.

Do not invent real people, use a shared account or grant QA privileges to Production identities without explicit approval.

## 3. Cross-application acceptance journeys

### Identity and module access
- Login, logout, expiry, password recovery and session revocation.
- Multiple individual accounts may hold the same organizational position/access profile where authorized.
- Direct URL and API calls are denied without module permission.
- Access changes invalidate old sessions as designed.

### HRM
- Register and verify a person/member.
- Distinguish member, employee and volunteer relationships.
- Assign positions and programs.
- Schedule session, open, check in manually/QR, prevent duplicate attendance, close session.
- Submit and review correction with audit.
- Export only permitted scope.

### CRM and Projects
- Create contact/organization and interaction history.
- Create lead/opportunity and move through permitted stages.
- Register a project from an approved partnership.
- Assign team, task, milestone and budget reference.
- Submit evidence and indicator results.
- Generate report package; reject stale or incomplete source snapshots.

### Accounting
- Create balanced journal, post under permission.
- Reject unbalanced journal at database boundary.
- Prevent edit/delete of posted journal.
- Reverse original entry exactly once.
- Close accounting period and reject unauthorized backdated posting.
- Reconcile bank/cash and verify report totals.

### POS
- Create sale once under duplicate/retry conditions.
- Verify stock movement and journal reference.
- Reject negative stock and unauthorized price override.
- Return/refund with original sale reference and approval.
- Reconcile shift closing and payment totals.

### Platform and external access
- Module activation and configuration audited.
- Grant purpose, scope, validity, expiry and revocation enforced.
- File/export access rechecks permission at request time.
- Technical administrator cannot approve organizational/financial transactions or inspect Production business data.

## 4. Release gate

A release is blocked by:
- Any cross-workspace data leakage.
- Any authorization bypass or privilege escalation.
- Duplicate financial posting, stock movement or refund.
- Unbalanced posted journal.
- Mutable posted ledger/audit history.
- Unrecoverable migration or failed backup restore rehearsal.
- Critical privacy/security issue.
- Broken essential workflow or misleading UI state.

## 5. Evidence record

For each UAT case record:
- Test ID and requirement.
- Environment and commit/deployment ID.
- Role and synthetic account identifier (never password/token).
- Preconditions and fixture references.
- Steps and expected result.
- Actual result and screenshots/log references with sensitive data masked.
- Pass/fail, defect ID, retest evidence and tester/date.
