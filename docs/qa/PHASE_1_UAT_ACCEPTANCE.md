# Phase 1 — UAT Acceptance Checklist

**Target branch:** `integration/phase1-preview-2026-11-16`  
**Preview commit baseline:** `a5ecb669bf661e9263b0f6177c1d59f8f25e2659`  
**Environment:** Vercel Preview + isolated Neon QA/child branch  
**Status:** Automated CI passed; authenticated manual UAT remains pending.

## 1. UAT safety rules

- Use only designated test accounts and synthetic test data.
- Do not enter real member identity documents, personal phone numbers, bank credentials, or confidential partner records.
- Do not run test transactions against Production or shared organizational cash records.
- Do not send real invitations, WhatsApp messages, email notifications, or external partner reports unless separately approved.
- Record the test account role, route, expected result, actual result, and evidence for every case.
- Clean up test records only after confirming they are synthetic and are not referenced by another test.

## 2. Environment and release gates

| Gate | Acceptance criterion | Evidence | Status |
|---|---|---|---|
| GitHub quality workflow | Dependency gates, terminology, architecture, access, agriculture, integration security, typecheck, regression, and build all pass | Workflow run 44144837438, commit `a5ecb669bf661e9263b0f6177c1d59f8f25e2659` | PASS |
| Vercel Preview | Deployment for the integration commit is READY | `dpl_T68oPjWDnqURgzku1N3dEo6YGvCY`; https://admin-dashboard-3de74a1mo-teknik-informer.vercel.app | PASS |
| Preview access | Public page and sign-in page respond; unauthenticated protected dashboard routes resolve to sign-in | HTTP 200 public page and sign-in; dashboard, module center, HRM, Agriculture, Accounting, BI, CRM all resolve to sign-in when unauthenticated | PASS (unauthenticated only) |
| Database isolation | Preview is configured for the sanitized QA database, separate from the default Production branch | Preview-only PREVIEW_DATABASE_URL configuration; Neon QA branch br-mute-meadow-b4rhx1mn is non-default and ready. No runtime write test performed. | CONFIGURED; write verification pending |
| Authenticated UAT | All role and workflow cases below pass | Completed test record | PENDING |
| Production readiness | No open critical/high defects; migration, backup, secrets, and release approvals complete | Release review | NOT APPROVED |
| Production schema parity | Platform module registry/access schema exists before deploying code that depends on it | Read-only Neon Production query: migration `020_platform_module_access.sql` absent; `platform_modules`, `workspace_module_settings`, `platform_module_access_grants`, and `platform_module_access_audit` absent | BLOCKED |

## 3. Public website and authentication

### Current Preview evidence — 18 November 2026

- Public home page: HTTP 200; public organization content rendered; no server-error marker in the returned HTML.
- Sign-in page: HTTP 200; sign-in form rendered.
- Protected dashboard routes checked while signed out: `/dashboard`, `/dashboard/module-center`, `/dashboard/hrm`, `/dashboard/pertanian`, `/dashboard/accounting`, `/dashboard/analytics`, and `/dashboard/crm`. Each resolved to the sign-in page, consistent with the authentication guard.
- Deployment runtime error/fatal log query for the new Preview deployment returned no matching entries.
- These checks do not prove a successful sign-in, role-specific rendering, CRUD persistence, or API authorization. Those remain authenticated UAT items.

| ID | Test | Expected result |
|---|---|---|
| PUB-01 | Open the public home page while signed out | Public content loads without exposing private workspace data |
| PUB-02 | Navigate public information, documents, FAQ, and gallery pages | Links resolve; unpublished/private records are not exposed |
| AUTH-01 | Sign in with an authorized test account | Session is established and user lands on an allowed workspace |
| AUTH-02 | Sign out and revisit a protected route | Session ends; protected content is not available |
| AUTH-03 | Open a protected API without a session | API rejects the request without disclosing private data |
| AUTH-04 | Attempt access with a role lacking permission | Server rejects the operation; hiding a button alone is not accepted as authorization |

## 4. HRM — membership and attendance

Relevant built routes include `/app/hrm/attendance` and `/app/member/attendance`.

| ID | Test | Expected result |
|---|---|---|
| HRM-01 | Open the HRM attendance workspace as an authorized officer | Only permitted attendance sessions and controls are shown |
| HRM-02 | Create or select a test activity and attendance register | Activity and register are linked to the same organization |
| HRM-03 | Mark a member present, partially present, excused, and absent | Each status is saved and displayed consistently |
| HRM-04 | Add an external participant | Name, organization, role, attendance, and consent are preserved |
| HRM-05 | Save an attendance record with no external-participant payload | Existing external rows are not accidentally deleted |
| HRM-06 | Review the normalized attendance projection | Matching activity-attendance rows are linked to the same activity and organization |
| HRM-07 | Attempt member access to another member's private information | Access is limited to the member's permitted scope |

## 5. Accounting — cash book and general ledger

Relevant built route: `/dashboard/akuntansi`; API: `/api/ecosystem/ledger`.

| ID | Test | Expected result |
|---|---|---|
| ACC-01 | Open accounting as Ketua, Sekretaris, and Bendahara | Read access follows the configured role policy |
| ACC-02 | Initialize the standard chart of accounts as Bendahara | Missing standard accounts are added without overwriting configured accounts |
| ACC-03 | Record a cash receipt with an active counter-account | Cash record and balanced journal are committed together |
| ACC-04 | Record a cash payment with an active counter-account | Debit and credit are balanced and linked to the source cash record |
| ACC-05 | Submit an inactive, foreign-organization, or invalid counter-account | Request is rejected |
| ACC-06 | Retry the same source transaction | No duplicate journal is created |
| ACC-07 | Attempt to edit a posted financial transaction | Original posting remains immutable; correction uses the approved adjustment path |
| ACC-08 | Export the journal CSV | Export is scoped to the current organization and contains only authorized ledger data |
| ACC-09 | Attempt journal write as a non-Bendahara role | Server returns an authorization failure |

## 6. CRM — partner and relationship records

| ID | Test | Expected result |
|---|---|---|
| CRM-01 | Create a synthetic partner interaction | Interaction is saved with date, channel, summary, owner, and next action |
| CRM-02 | Update the next action and review date | Changes persist and remain associated with the same partner |
| CRM-03 | View the partner relationship as a restricted role | Only authorized fields and records are visible |
| CRM-04 | Create an interaction without required fields | Validation explains the missing information; no partial record is created |

## 7. Project Management — programmes, activities, tasks

| ID | Test | Expected result |
|---|---|---|
| PM-01 | Create a synthetic programme | Programme is organization-scoped and has a clear lifecycle status |
| PM-02 | Create an activity linked to the programme | Activity is linked correctly and appears in the relevant workspace |
| PM-03 | Create and assign a task with a due date | Task, owner, priority, and due date persist |
| PM-04 | Mark a task complete without required result/evidence | Completion is rejected or remains pending according to the configured workflow |
| PM-05 | Submit completion evidence for review | Verification state is auditable and cannot be self-approved by an unauthorized role |

## 8. POS — products, orders, and stock

Relevant built routes include `/dashboard/penjualan`; APIs include `/api/ecosystem/products`, `/api/ecosystem/orders`, and `/api/ecosystem/stock-history`.

| ID | Test | Expected result |
|---|---|---|
| POS-01 | Create or view a synthetic product | Product is scoped to the organization and has a valid price/unit |
| POS-02 | Create a test order | Order lines, quantities, and totals are consistent |
| POS-03 | Change order status through an allowed transition | Status history is preserved and invalid transitions are rejected |
| POS-04 | Complete a stock-affecting transaction | Stock history records the movement exactly once |
| POS-05 | Retry a stock-affecting request | No duplicate stock movement is created |
| POS-06 | Attempt to access another organization's order/product | Request is rejected |

## 9. Cross-application and security checks

| ID | Test | Expected result |
|---|---|---|
| XAPP-01 | Create an HRM member record and inspect permitted CRM/PM references | Cross-module references use stable organization-scoped identifiers |
| XAPP-02 | Post a cash transaction related to a programme or sale | Financial source reference is traceable without duplicating the source record |
| XAPP-03 | Review audit history after create/update/delete/post actions | Actor, action, timestamp, and target are available |
| XAPP-04 | Attempt ID substitution across organizations | Tenant boundary is enforced server-side |
| XAPP-05 | Use browser back/cache after logout | Private data is not exposed from a stale session |
| XAPP-06 | Test narrow mobile viewport and keyboard navigation | Core forms and actions remain usable and accessible |

## 10. Defect severity and sign-off

- **Critical:** authentication bypass, cross-organization data exposure, financial imbalance, duplicate posting, or destructive data loss. Blocks release.
- **High:** core workflow cannot be completed, unauthorized mutation, or incorrect financial/attendance state. Blocks release.
- **Medium:** significant usability or reporting defect with a safe workaround. Must have an owner and target fix.
- **Low:** cosmetic issue or minor copy/layout defect.

A test is accepted only when its expected result is observed in the Preview environment and supported by evidence. Automated CI and a READY deployment do not replace authenticated UAT.

## 11. Release decision

The integration is **not production-approved** until authenticated UAT is complete, the migration plan is separately reviewed and rehearsed on the disposable child branch, backup/restore is verified, and the release owner explicitly approves production deployment. The current Production branch has not applied migration 020 and does not contain the four platform module registry/access tables; do not deploy this release to Production until migration 020 is separately reviewed, rehearsed, approved, and applied through the controlled migration process.
