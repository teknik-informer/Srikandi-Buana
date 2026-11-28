# V9 Tenant Isolation — QA Inventory and Policy Matrix

Status: **QA implementation / evidence in progress**  
Scope: Issue #90. This document is not a Production release approval.  
Source baseline: `feat/v9.2-production-integration` commit `2b94f281ae834d23a8f618c28d002bcc5b65e0ea`; QA implementation is isolated on `feat/issue-90-tenant-rls-qa-20261128`.

## 1. QA environment and principal evidence

| Check | Observed QA evidence | Status |
|---|---|---|
| Neon project | `holy-night-99324539` | Verified |
| QA database branch | `phase1-integration-rehearsal-20261116` / `br-snowy-forest-b46i5pqx` | Verified |
| Parent chain | `srikandi-v12-sanitized-qa` → `srikandi-v12-migration-qa` → production parent | Verified; QA branch is sanitized |
| DB engine | PostgreSQL `18.7` | Verified; does **not** satisfy the PostgreSQL 16 acceptance gate yet |
| V9 tables | 63 | Verified |
| Table owner | `neondb_owner` on all 63 tables | Verified |
| Runtime candidate | `v9_app` | Verified by a direct login to the QA endpoint |
| `v9_app` attributes | `SUPERUSER=false`, `BYPASSRLS=false`, `CREATEROLE=false`, `CREATEDB=false`, `LOGIN=true` | Verified |
| `v9_app` existing table grants | SELECT/INSERT/UPDATE/DELETE on 63/63 before RLS | Verified; RLS is the missing database enforcement layer |
| Existing RLS before migration | 0/63 enabled; 0/63 forced; 0 tables with policies | Verified |
| Vercel Preview variable | `V9_DATABASE_URL`, target `preview`, branch `feat/issue-90-tenant-rls-qa-20261128`; created from Neon connection string for `v9_app` on the QA branch | Metadata verified; runtime probe still required |
| Production | No SQL write, role/owner change, RLS change, environment change or deployment performed by this QA work | Verified by operation scope |

The actual connection string, password, hostname, session token, account email and password hashes are deliberately excluded from this document and CI logs.

## 2. Database object inventory

Read-only catalog inspection of the QA branch returned:

| Object | Count | Notes |
|---|---:|---|
| Tables in schema `v9` | 63 | Full inventory below |
| Foreign-key constraints | 244 | Read from `pg_constraint` |
| Views | 0 | No V9 views found |
| Sequences | 21 | Reference-number generation; `v9_app` has USAGE/SELECT, not UPDATE |
| Trigger functions | 21 | Existing domain integrity and immutability functions; SECURITY INVOKER |
| Non-internal triggers | 22 | Finance, field program/workplan, payment receipt, inventory movement, community moderation and document generation |
| Existing RLS policies before migration | 0 | Migration adds policies; post-migration verification is a hard gate |

### 63-table policy inventory

| Table | Domain / parent | Scope and database policy intent | Write boundary |
|---|---|---|---|
| `organizations` | Organization | Current authenticated organization; active organization during login; only the active Srikandi public organization projection | No application write policy |
| `organization_units` | Organization | Organization or assigned unit | Organization leadership only |
| `field_applications` | Organization / field registry | Active tenant/field unit; login-only lookup for the signed-in user's unit assignment | Default deny for application writes |
| `people` | Identity / membership | Own person, members visible within assigned organization/unit, and authors of published community content | Server action validates self-profile fields |
| `user_accounts` | Authentication | Own account; linked person only within authorized tenant scope; narrowly selected email during pre-auth login | Own-account update only; no account creation or role assignment through runtime policy |
| `memberships` | Membership | Organization/unit/self; published community author membership projection | Leadership membership writes; author projection SELECT only |
| `role_assignments` | RBAC | Current user and authorized tenant/unit scope; self role lookup during login | Default deny for application writes |
| `sessions` | Authentication | Current session token/current actor only | Current actor session create/revoke/update only |
| `login_rate_limits` | Authentication | One pre-authentication email/IP HMAC pair, transaction-scoped | Same pair only |
| `membership_interests` | Public intake | Leadership review queue; public duplicate-throttle check limited to same normalized name/phone in the recent window | Public INSERT only to active Srikandi organization with consent, `submitted` and `website`; review update by leadership |
| `person_interests` | Member profile | Person and organization scope | Same tenant/self scope |
| `audit_events` | Audit | Leadership SELECT within organization | Append-only INSERT with actor ID and organization matching verified request; no UPDATE/DELETE |
| `bootstrap_state` | Bootstrap | No runtime tenant read | Default deny; bootstrap principal only |
| `schema_migrations` | Deployment metadata | No runtime tenant read | Default deny; migration principal only |
| `outbox_events` | Event/outbox | No application read; tenant insert only | Authenticated tenant INSERT; narrow public intake event INSERT; worker principal not yet inventoried as a separate runtime |
| `system_settings` | Settings / public website | Tenant settings; public website/profile keys only when explicitly public | Leadership write only |
| `field_workplans` | Field programs | Organization/field scope and creator scope | Same tenant/field scope; state transition trigger retained |
| `field_programs` | Field programs | Organization/field scope and creator scope | Same tenant/field scope; status/workplan linkage triggers retained |
| `field_program_indicators` | Field programs | Organization/field scope | Same tenant/field scope |
| `field_activities` | Field programs | Organization/field scope | Same tenant/field scope; program child-link trigger retained |
| `field_tasks` | Field programs | Assigned user or creator within organization/field | Same tenant/field scope; program child-link trigger retained |
| `field_team_assignments` | Field teams | Organization/field, membership and creator scope | Same tenant/field scope |
| `agriculture_plots` | Agriculture | Organization/field; member-owned plot membership | Same tenant/field/member scope |
| `agriculture_cycles` | Agriculture | Organization/field and linked plot | Same tenant/field or linked plot scope |
| `agriculture_harvests` | Agriculture | Organization/field plus linked plot/cycle | Same tenant/field or linked parent scope |
| `agriculture_visits` | Agriculture | Organization/field plus linked plot/cycle | Same tenant/field or linked parent scope |
| `training_sessions` | Training | Organization/field and creator scope | Same tenant/field scope |
| `training_enrollments` | Training | Organization/field, participant membership and recorder scope | Same tenant/field/member scope |
| `training_assessments` | Training | Organization/field, assessor and linked enrollment | Same tenant/field or linked enrollment scope |
| `training_certificates` | Training | Organization/field, issuer and linked enrollment | Same tenant/field or linked enrollment scope |
| `business_partners` | Business / partnerships | Organization/field and creator scope | Same tenant/field scope |
| `business_opportunities` | Business / CRM | Organization/field and creator scope | Same tenant/field scope |
| `business_agreements` | Business / CRM | Organization/field and creator scope | Same tenant/field scope |
| `business_milestones` | Business / CRM | Organization/field and creator scope | Same tenant/field scope |
| `business_customers` | Business / sales | Organization/field and creator scope | Same tenant/field scope |
| `business_products` | Business / catalog | Organization/field and creator scope | Same tenant/field scope |
| `business_warehouses` | Business / inventory | Organization/field and creator scope | Same tenant/field scope |
| `business_product_stock` | Business / inventory | Organization/field and last updater | Same tenant/field scope |
| `business_inventory_movements` | Business / inventory | Organization/field and recorder | INSERT/SELECT scope; existing trigger rejects UPDATE/DELETE |
| `business_orders` | Business / sales | Organization/field and creator | Same tenant/field scope |
| `business_order_items` | Business / sales | Parent order organization/field | Same tenant/field scope |
| `business_order_payments` | Business / sales / finance | Organization/field and receipt recorder | Same tenant/field scope; existing payment integrity trigger retained |
| `finance_accounts` | Finance | Organization and creator | Same tenant; server-side finance permission remains required |
| `finance_cash_accounts` | Finance | Organization and creator | Same tenant; cashier/teller access remains governed by server permission and UAT |
| `finance_journals` | Finance | Organization and creator | Same tenant; double-entry and journal state triggers retained |
| `finance_journal_lines` | Finance | Parent organization | Same tenant; journal/period triggers retained |
| `finance_periods` | Finance | Organization and creator | Same tenant; period close guard retained |
| `finance_budgets` | Finance | Organization and creator | Same tenant; approval and immutability triggers retained |
| `finance_budget_lines` | Finance | Parent organization | Same tenant; budget-line guard retained |
| `finance_contribution_allocations` | Finance / membership | Organization, member allocation and creator | Same tenant/member scope; integrity trigger retained |
| `member_community_topics` | Member community | Own content plus published topics visible to active members in the same organization | Author/self changes and moderation state transitions remain server/trigger controlled |
| `member_community_replies` | Member community | Own content plus published replies on published topics visible to active members in the same organization | Author/self changes and moderation state transitions remain server/trigger controlled |
| `member_community_reports` | Member community | Reporter self-scope and moderator organization scope | Reporter INSERT; moderator resolve/dismiss; trigger validates reporter and target |
| `secretariat_letters` | Secretariat | Organization and creator scope | Same tenant; server-side Secretariat permission remains required |
| `secretariat_meetings` | Secretariat | Organization or assigned unit/creator | Same tenant/unit scope |
| `secretariat_minutes` | Secretariat | Parent meeting scope | Same parent meeting scope |
| `secretariat_meeting_attendance` | Secretariat | Parent meeting or own membership/person scope | Same meeting/self scope |
| `secretariat_meeting_decisions` | Secretariat | Parent minutes → meeting scope | Same parent scope |
| `secretariat_documents` | Secretariat / archive | Organization, source field and creator scope; final public documents only through a valid share grant | Same tenant/field scope; document lifecycle remains server-controlled |
| `secretariat_document_files` | Secretariat / files | Parent document scope; current final public revision via one valid token | Same parent document scope; file metadata/storage retention rules remain |
| `secretariat_document_generations` | Secretariat / generator | Parent document scope | Same parent document scope; immutable generation trigger retained |
| `file_assets` | Shared file service | Self/field/organization scope; explicit public banner projection; explicit one-token file-share projection | Same tenant/scope only; status/revocation remains server-controlled |
| `file_share_links` | Shared file service | Tenant/creator scope; token-scoped public SELECT/UPDATE for download counter only | Tenant link create/revoke; public share can only consume the matching nonexpired, nonrevoked token within its download limit |

### Non-table objects

| Object class | Inventory | Policy / test concern |
|---|---|---|
| Views | None in schema `v9` | Re-run catalog check after every migration |
| Sequences | 21 named reference sequences | `v9_app` has USAGE/SELECT; sequence privileges are not protected by table RLS |
| Existing trigger functions | 21, owned by `neondb_owner`, SECURITY INVOKER | Their internal SELECT/UPDATE queries become subject to RLS when called by `v9_app`; integrity regression is mandatory |
| Existing non-internal triggers | 22 | Finance journal/period, cash accounts, budgets, payments, inventory, field workplan/program, community moderation, document generation |
| RLS helper functions in migration | SECURITY DEFINER with pinned `search_path = pg_catalog, v9` | Owner is migration principal; EXECUTE is explicitly granted to `v9_app`; no browser-supplied tenant ID is trusted |

## 3. Server query/action coverage (source-level mapping)

| Application surface | Server source paths | Primary tables touched | Required scope |
|---|---|---|---|
| Login / session | `src/app/actions/auth.ts`, `src/lib/session.ts`, `src/app/keluar/route.ts` | `user_accounts`, `role_assignments`, `organizations`, `field_applications`, `sessions`, `login_rate_limits` | Email/IP HMAC before auth; then password-verified user ID; then session hash |
| Account/profile | `src/app/actions/account-settings.ts`, `src/app/actions/member-profile.ts`, `src/lib/self-profile.ts` | `user_accounts`, `people`, `person_interests`, `sessions`, `audit_events` | Self only; server permission and field validation |
| Membership | `src/app/actions/forms.ts`, `membership.ts`, `membership-management.ts`, `membership-management.ts`, `membership-management.ts` | `membership_interests`, `memberships`, `people`, `organizations`, `audit_events`, `outbox_events` | Public intake narrowly constrained; review/activation requires organization permission |
| Secretariat | `src/app/actions/secretariat-letters.ts`, `secretariat-meetings.ts`, `secretariat-documents.ts` | Secretariat register, minutes, attendance/decisions, files/generations, source field records, audit | Organization/unit/parent document scope |
| Shared files | `src/app/api/files/route.ts`, `src/app/api/files/[id]/route.ts`, `src/app/api/files/[id]/share/route.ts`, `src/app/api/files/share/[token]/route.ts`, `src/app/api/secretariat/documents/[id]/file/route.ts`, `src/app/api/public-site/banner/[id]/route.ts` | `file_assets`, `file_share_links`, document/file links, public website settings, audit | Self/field/org; public banner only exact configured asset; share only exact hashed token and eligible final public revision |
| Field operations | `src/app/actions/field-operations.ts`, `field-team.ts`, `workplan-approvals.ts`, `management-tasks.ts` | Workplans, programs, indicators, activities, tasks, team assignments, memberships, audit | Field-key/unit scope; approval permission checked server-side |
| Agriculture | `src/app/actions/agriculture.ts` | Plots, cycles, visits, harvests, memberships, people, field applications, audit | Field/organization and linked plot/cycle/member scope |
| Training | `src/app/actions/training.ts`, `member-training.ts` | Sessions, enrollments, assessments, certificates, memberships, audit | Field/organization plus participant/member scope |
| Business / inventory / POS | `src/app/actions/business.ts`, `business-catalog.ts`, `business-inventory.ts`, `business-orders.ts`, `src/app/app/(area)/pos/page.tsx` | Partners, opportunities, agreements, milestones, products, customers, warehouses, stock, inventory movements, orders/items/payments, finance cash accounts, audit | Organization/field; payment and stock trigger constraints |
| Finance | `src/app/actions/finance.ts`, `src/lib/finance.ts`, `src/lib/ledger.ts` | Accounts, cash accounts, journals/lines, periods, budgets/lines, contribution allocations, payment links, audit | Organization scope; role permission checks and ledger triggers remain required |
| Member community | `src/app/actions/member-community.ts` | Topics, replies, reports, memberships, people, accounts, audit | Self writes; published same-organization reads for active members; moderator scope |
| Studio / public settings | `src/app/actions/design-theme.ts`, `public-site-settings.ts`, `public-policies.ts`, `login-page-content.ts`, `src/lib/public-site-settings.ts`, `src/lib/login-page-content.ts` | `system_settings`, `file_assets`, `audit_events` | Tenant reads; public setting keys only if visibility=public; leadership writes |
| Search / public data | `src/app/api/search/route.ts`, `src/lib/search.ts`, `src/lib/operational-search.ts`, public page loaders | Domain-specific joined tables, public settings, approved public product/activity/document data | Must inherit row policy of every joined relation; exact route-level export/search regressions remain in UAT |

This is a first source-level map. The CI contract checks known server query helpers and migration inventory, but it is **not** proof that every query/route, trigger side effect or export has passed PostgreSQL integration testing. The dedicated QA query audit and operational UAT must close those gaps.

## 4. Role × access principle

Application permission checks in `src/lib/session.ts` remain mandatory. RLS is a second, database-level boundary; it does not replace action-level authorization.

| Effective role | App permission family | RLS scope rule |
|---|---|---|
| `platform_admin` | `*` | Current resolved organization only unless a separately reviewed platform/global scope is introduced |
| `organization_admin` | `*` | Assigned organization |
| `chair` | `*` | Assigned organization |
| `secretary` | Secretariat/docs/files, membership activation, read-only finance, read-only fields and moderation | Assigned organization; document and meeting parent scope |
| `treasurer` | `finance:*`, limited file and organization reads | Assigned organization; no implicit external data share |
| `field_coordinator` | Field-key wildcard, approval submit, file and finance request permissions | Assigned field/unit; no access to other fields |
| `field_staff` | Field read, activity write, limited files | Assigned field/unit and explicitly assigned tasks |
| `cashier` | POS sell, catalog read and limited files | Assigned organization/field; finance journal remains permission-gated |
| `member` | Own profile/tasks/training/community, limited files | Self; published community projection for active same-organization members |
| `government_viewer` | Portal read only | **Denied from operational tenant tables** until grant registry exists |
| `ngo_viewer` | Portal read only | **Denied from operational tenant tables** until grant registry exists |
| `partner_viewer` | Portal read only | **Denied from operational tenant tables** until grant registry exists |

External roles may still receive an explicitly public website/banner projection or a valid file-share link. That is not a dataset grant. The portal remains closed until a grant model exists with recipient, purpose, dataset/field selection, expiration, revocation and audit.

## 5. Transaction-bound request context

- `getV9Sql()` hashes the opaque server cookie and attaches context using transaction-local `set_config(..., true)` before each query through `sql.transaction([contextQuery, query])`.
- No session-level `SET ROLE`, `SET SESSION`, or connection-persistent tenant GUC is used.
- Login lookup has a separate pre-auth email/IP HMAC context. Only after password verification does the code create an account-bound login context.
- Public interest submission has a dedicated context that is restricted to one organization, one submission status/source and one normalized name/phone duplicate-throttle pair.
- Public file download has a dedicated context carrying only the SHA-256 hash of one opaque share token.
- Public banner reads are restricted to the configured public-site image asset.
- PostgreSQL HTTP pooling/concurrency tests are still required before this context is accepted for Production.

## 6. QA release gates still open

1. Latest exact-head CI must pass after the most recent migration/policy changes.
2. Preview deployment must use this branch and the branch-scoped QA `V9_DATABASE_URL`; authenticated runtime probe must show `current_user=session_user=v9_app`, non-superuser, non-BYPASSRLS, non-owner and correct Neon branch ID.
3. Apply migration `0044_tenant_row_level_security.sql` to QA only, then verify RLS and FORCE RLS on all 63 tables, all policy counts, no ownership transfer, no runtime DDL rights and default deny for bootstrap/schema_migrations.
4. PostgreSQL 16 integration suite is still outstanding; current Neon QA is PostgreSQL 18.7.
5. Two-organization positive/negative tests, unit/self-scope tests, audit/trigger side effects, public intake/share/banner and transaction concurrency/pooling tests are still outstanding.
6. Test auth/session, member/profile, secretariat/generator/files, field/agriculture, training, business/inventory/POS, finance, reporting/export/search, public settings and portal denial on Preview.
7. UAT must use legitimately provisioned users/roles only. Do not create fake Treasurer/member/external operational accounts to green the test.
8. Independent security review, idempotent migration/rollback procedure and a separate explicit Production approval remain required.

Issue #90 remains open until these gates have evidence. Issue #66 remains the parent capability gap matrix and is not to be closed while any capability gap or evidence item is outstanding.


## 7. Public website data under database RLS

Public website routes no longer SELECT operational tables directly. The following `SECURITY DEFINER` projections were added to migration `0044_tenant_row_level_security.sql`; each pins `search_path = pg_catalog, v9`, is revoked from `PUBLIC`, and is granted to `v9_app` only:

| Projection | Public output | Source predicate / boundary |
|---|---|---|
| `get_public_fields()` | Field key, names, mandate and active unit name | Active Srikandi organization, enabled field applications, active unit join |
| `get_public_products(text,text,uuid,integer)` | Public catalogue columns only | Active organization, `field_key='usaha'`, `status='active'`, `publication_status='published'`; capped limit and optional slug/category/exclusion |
| `get_public_activities(text,boolean,integer)` | Event title, date/time, field label, location and description | `open_to_public=true`, enabled field application, allowed upcoming/completed states, active Srikandi organization |
| `get_public_training_sessions(boolean,integer)` | Session schedule and aggregate registered/present counts | Only registration-open upcoming sessions or completed sessions; no participant identity or enrollment rows returned |
| `get_public_documents(text,integer)` | Public archive metadata and latest file name/size | Final document, `visibility='publik'`, active Srikandi organization; inactive/missing Cloudinary asset excluded |
| `get_public_document_file(uuid)` | Latest public file bytes/asset delivery metadata | Exact document ID must resolve to an active organization document, final/public classification and latest active file revision |

Public loaders updated to use these functions:
- Home, activity listing, organization profile and training listing
- Product catalogue, product details and related products
- Public document listing
- Tokenless download of final/public documents

The public download API retains the authenticated internal-document path for authorized Secretariat users. Anonymous access only succeeds through `get_public_document_file`; an internal, limited, draft or archived document does not qualify.

**Important distinction:** the projections preserve the fields the existing public site intentionally displays. They do not create a general row-level grant on `business_products`, `training_enrollments`, `secretariat_documents`, `secretariat_document_files` or `file_assets`. Direct base-table reads remain default-deny for anonymous `v9_app`.

PostgreSQL 16 CI integration now includes disposable-only projection fixtures proving:
- enabled field registry and explicitly public activity projection;
- published products returned, draft/private products excluded;
- training counts are aggregate-only and participant names/membership IDs are not part of the function return schema;
- final/public documents and latest public file revision returned;
- direct anonymous SELECT on products, training enrollments and Secretariat documents returns no rows.

These are CI fixtures in a temporary PostgreSQL 16 service. They are not inserted into the Neon QA rehearsal branch or Production.

## 8. Updated execution status

- Current branch PR: [#92 — QA tenant RLS and transaction-bound request context](https://github.com/teknik-informer/Srikandi-Buana/pull/92), still Draft and not merged.
- Exact-head CI on commit `8a45052079e2d0f731b9b34e742c909614a57f8c` passed: organization regression, core shell contract, tenant RLS contract, TypeScript, Next.js production build, and PostgreSQL 16 integration.
- The Neon QA branch already contained a prior RLS v1 application. The owner-visible ledger showed checksum `sha256:tenant-row-level-security-v1`; the apparent missing ledger row from the `v9_app` read was caused by the intentional default-deny policy on `schema_migrations`.
- QA migration v2 was applied atomically to `phase1-integration-rehearsal` (`br-snowy-forest-b46i5pqx`) after an explicit branch/database/principal/baseline preflight. The ledger now records `sha256:tenant-row-level-security-v2-transaction-context-privacy-policy-20261128`.
- Post-migration owner and runtime-role checks are recorded in Section 11. Production remains unchanged.
- Exact-head Vercel Preview is READY at [admin-dashboard-2gm3l2g61-teknik-informer.vercel.app](https://admin-dashboard-2gm3l2g61-teknik-informer.vercel.app), commit `8a45052079e2d0f731b9b34e742c909614a57f8c`.
- **Still pending:** execute the admin-only Preview database diagnostics endpoint from a valid authenticated Preview admin session, verify `safeForTenantUat=true`, and run operational browser UAT. CI, migration success and Vercel READY do not replace this proof.


## 9. Public organization identity boundary

The `organizations` base table no longer has an anonymous public-row policy. Its SELECT policy is restricted to the authenticated actor's current organization or an organization proven by the password-verified login context.

Public routes and settings use two fixed security-definer functions:
- `get_public_organization()`: returns only the public identity fields required by the homepage, profile and contact pages (legal name, short name, active status, legal status and address).
- `get_public_organization_id()`: returns the active Srikandi organization UUID for server-side public settings, public interest intake and the matching outbox event policy.

The public website settings, policy and login-copy loaders no longer resolve the organization by selecting `v9.organizations` directly. The public banner endpoint relies on the precise `file_assets_public_banner_read` row policy and selects only fields needed for server-side Cloudinary delivery.

PostgreSQL 16 integration additionally asserts that anonymous `v9_app` cannot directly SELECT any organization row, while `get_public_organization()` returns the approved public identity.


## 10. Preview runtime pooling/concurrency probe

The Preview-only admin diagnostic endpoint now runs two simultaneous synthetic pre-auth login contexts through the exact `getV9LoginSql()` Neon HTTP transaction wrapper. Both probes compare `current_user` and `session_user` and verify that each transaction observes only its own email, subject HMAC and IP HMAC, with no authenticated session token context injected into either pre-auth transaction. A separate normal authenticated query verifies that the actual request's cookie-derived session context is present inside its own transaction. That presence is expected and must not be interpreted as a session-level leak.

The response exposes only:
- `concurrency.transactionContextIsolation` (boolean)
- `concurrency.requestSessionContextPresent` (boolean): confirms the authenticated cookie-derived context is present inside the current wrapped request transaction; it is expected to be true and is **not** a test for session-level context leakage.
- previously documented non-secret current role/database/branch/privilege metadata

It never returns or logs synthetic emails, HMAC values, session hashes, connection strings or credentials. `safeForTenantUat` is true only when the live deployment uses `v9_app` on the exact QA branch `br-snowy-forest-b46i5pqx`, has no owner/BYPASS/DDL privilege, does not own tenant tables, and both context probes pass.

This probe has been implemented and must be executed in a signed-in Preview admin session before Issue #91 is closed. It is not replaced by PostgreSQL 16 CI or a Vercel READY status.



## 11. QA migration v2 and exact-head Preview evidence — 28 November 2026

### 11.1 Upgrade history and preflight

The QA branch was not an untouched database. Before the v2 reconciliation, the owner-visible ledger contained `0044_tenant_row_level_security.sql` with checksum `sha256:tenant-row-level-security-v1` (applied at `2026-11-28T08:09:42.825Z`). RLS and FORCE RLS were already active on the 63 V9 tables. The legacy v1 policy set still contained broad SECURITY DEFINER helpers for account, membership and person row visibility.

An early check as `v9_app` returned zero rows from `schema_migrations`; this was not evidence that the migration had not run. `schema_migrations` is intentionally default-deny for the runtime role. The migration history was verified as `neondb_owner` before proceeding.

The v2 application was executed in one transaction against only Neon branch `br-snowy-forest-b46i5pqx`:
- preflight verified `current_setting('neon.branch_id')`, database `neondb`, migration principal `neondb_owner`, 63 tables, 63 RLS flags, 63 FORCE RLS flags and the expected v1 ledger checksum;
- the preflight required all three legacy helpers to exist before replacing them;
- migration statements completed atomically; no Production connection or target was used.

### 11.2 Post-migration database state

| Check | QA result |
|---|---:|
| V9 tables | 63 |
| RLS enabled | 63 / 63 |
| FORCE RLS enabled | 63 / 63 |
| Tables with policies | 61 |
| Tables without policies | 2: `bootstrap_state`, `schema_migrations` |
| Policy count | 78 |
| Legacy broad community/account policies | 0 |
| Legacy SECURITY DEFINER helpers | 0 |
| Safe `get_member_community_author_name(uuid)` projection | Present |
| Existing triggers / trigger functions | 22 / 21 |
| Sequences / views | 21 / 0 |
| QA audit-event row count | 1; unchanged by migration |

The ledger now records `sha256:tenant-row-level-security-v2-transaction-context-privacy-policy-20261128`, applied at `2026-11-28T09:52:20.199Z`.

The new community author projection is SECURITY DEFINER with pinned `search_path`, owned by `neondb_owner`, executable by `v9_app` only and not executable by `PUBLIC`. It resolves only a name display value, requires an active membership in the actor's organization, and limits ordinary member visibility to authors of published content. Moderators can resolve same-tenant authors of content/reports they are authorized to moderate. Raw `people`, `memberships` or `user_accounts` rows are not made visible to other members for display convenience.

### 11.3 Runtime principal and least privilege (direct Neon QA connection)

| Check | Result |
|---|---|
| `current_user` | `v9_app` |
| `session_user` | `v9_app` |
| Database / Neon branch | `neondb` / `br-snowy-forest-b46i5pqx` |
| PostgreSQL | 18.7 on Neon QA |
| SUPERUSER / BYPASSRLS | false / false |
| CREATEROLE / CREATEDB | false / false |
| Member of `neondb_owner` / can SET that role | false / false |
| CREATE on schema `v9` / CREATE on database | false / false |
| Owns V9 tenant tables | false |

This direct Neon connection check verifies the QA database principal and privilege map. The Preview-only route `/api/studio/diagnostics/database` also performs the same runtime check through the deployed application and includes concurrent transaction-context isolation probes. That route has **not yet been executed in a signed-in Preview admin session**, so the Vercel request path remains a separate acceptance gate.

### 11.4 CI and Preview evidence

- PR #92 remains Draft and unmerged.
- Exact-head commit at this checkpoint: `7cca12a9b0d782eb3479f6156a5dd07707c63a28`.
- GitHub Actions run #965: success, including PostgreSQL 16 tenant RLS integration, organization regression, core shell contract, TypeScript validation and Next.js production build.
- The PostgreSQL 16 runner deliberately creates the legacy v1 helper/policy state, upgrades it to v2, runs migration a second time to verify idempotence, and then asserts the policy inventory and cross-tenant tests.
- Vercel deployment `dpl_BZT23Nsp97EdveRfbghCJKwGQogu` is READY and maps to the exact branch and SHA above. Build events contain `Deployment completed` and `Build Completed`.
- Vercel Preview runtime log query for the deployment returned no log records in the last 30 minutes and no error/fatal records in its query window. This means no logs were returned, not that authenticated feature flows were tested.

### 11.5 Remaining Issue #90 gates

1. A valid authorized administrator must sign in to the exact Preview URL and request `/api/studio/diagnostics/database`; require `safeForTenantUat=true`, `current_user=session_user=v9_app`, exact QA branch ID and successful concurrency probes.
2. Perform browser UAT on Preview, with legitimate provisioned accounts only, for login/logout/session revocation, profile/account self-service, membership, Secretariat, file upload/download/share, public banner and public projections, field/agriculture, training, inventory/POS, Finance, search, reporting and exports.
3. Test actual application request paths and trigger side effects after RLS on QA. The PostgreSQL 16 CI suite is a strong database regression gate but does not replace end-to-end UAT against Neon/Preview.
4. Independent security review must inspect helper functions, grants, role ownership, report/export queries, operational search and the full table/query/action inventory.
5. Update this document and Issue #66 with each domain's evidence. Keep Issue #90 open until the authenticated Preview probe and required UAT/security review gates are complete.

No Production SQL, role, grant, RLS, schema, environment, SSO, domain, alias or deployment operation was performed.

### 11.6 Follow-up to the authenticated Preview diagnostic — 28 November 2026

The first user-submitted authenticated Preview response confirmed the expected runtime principal and QA target (`v9_app` on `br-snowy-forest-b46i5pqx`) and all reported least-privilege flags were false. It returned `transactionContextIsolation=false` and `sessionContextPresent=true`.

Source inspection found a deterministic defect in the diagnostic itself: the second concurrent query (`probeB`) did not select `session_user`, although the comparison required `contextB.session_user === 'v9_app'`. This forced the isolation boolean to false regardless of otherwise-correct context values. The `sessionContextPresent=true` value represented the authenticated request's cookie-derived context inside the wrapped request transaction; it did not establish session-level leakage. The response field has therefore been renamed `requestSessionContextPresent` to make its meaning explicit.

The fix adds `session_user` to the second probe and a source-contract assertion that both concurrent probes compare this identity. Exact-head GitHub Actions run #965 passed on `7cca12a9b0d782eb3479f6156a5dd07707c63a28`, including PostgreSQL 16 integration, core shell contracts, TypeScript and production build.

A new Vercel Preview deployment was then created from that exact commit: `dpl_7djs6LSUfbWvENH7kPfQcptf786V` (`admin-dashboard-o5nnxtvo1-teknik-informer.vercel.app`). Its final READY state and a fresh authenticated diagnostic response are still required. The earlier user-submitted JSON remains evidence for the previous deployment only.

### 11.7 Authenticated runtime proof and Preview environment binding — 28 November 2026

The user returned the authenticated diagnostic response from the exact READY Preview deployment after sign-in. The response reports `environment=preview`; `current_user=session_user=v9_app`; database `neondb`; PostgreSQL 18.7; Neon branch `br-snowy-forest-b46i5pqx`; and endpoint `ep-icy-scene-b4f8rk0x`. All elevated capability flags are false: SUPERUSER, BYPASSRLS, CREATEROLE, CREATEDB, tenant table ownership, membership in `neondb_owner`, ability to SET `neondb_owner`, CREATE on schema `v9`, and CREATE on database.

The corrected live probes return `transactionContextIsolation=true` and `requestSessionContextPresent=true`, with `safeForTenantUat=true`. This confirms two concurrent pre-auth contexts observe isolated transaction-local values and the authenticated request has its own cookie-derived context inside its query transaction.

Read-only Vercel project environment metadata was inspected with decryption disabled. The `V9_DATABASE_URL` variable pinned to Preview branch `feat/issue-90-tenant-rls-qa-20261128` has a non-secret configuration comment identifying the dedicated `v9_app` credential and Neon QA branch `br-snowy-forest-b46i5pqx`. A separate `V9_DATABASE_URL` entry targets Production. No environment variable values were decrypted or displayed. The Preview runtime's returned Neon branch ID independently confirms the connection actually used by the request.

Source file `src/lib/db.ts` reads only `process.env.V9_DATABASE_URL`, throws when it is absent, and does not fall back to `DATABASE_URL` or `PREVIEW_DATABASE_URL`. The static contract now explicitly asserts this fail-closed/no-fallback behavior.

Exact source-contract commit `23dfc5b1f52ee7d4ea7cab7a04fa95294437cb11` passed GitHub Actions run #969: PostgreSQL 16 RLS integration, organization regressions, core workspace/tenant RLS contract checks, TypeScript validation, and Next.js production build. The deployed application code remains commit `7cca12a9b0d782eb3479f6156a5dd07707c63a28` in Vercel deployment `dpl_7djs6LSUfbWvENH7kPfQcptf786V`, state READY. The later commit added only source contract assertions/documentation; no runtime code changed after deployment.

Issue #91's narrow runtime-principal/Preview-target proof is complete. This does not close Issue #90: the comprehensive query/action inventory, all negative cross-tenant operation and side-effect tests, operational domain regressions, authenticated Preview UAT across legitimate personas, and independent security review remain open.
## 12. Source-level server action and route relation sweep — 28 November 2026

A source scan was run against the exact PR branch tree at commit `385ab790498315ebf6e7a1952ad95f7114c70a4d`. It enumerated 27 files under `src/app/actions`, the file/share/public APIs, the operational search loader, and the POS page. The following is a **relation-reference inventory**: table names were extracted from SQL clauses and normalized against the audited 63-table inventory. It is useful for finding query families, but it is not yet a complete query AST, route-caller, trigger-side-effect or authorization proof.

| Server action file | V9 relations referenced by SQL | Primary operation family |
|---|---|---|
| `account-settings.ts` | `user_accounts`, `sessions`, `audit_events` | Self password change, session revocation, audit |
| `auth.ts` | `organizations`, `user_accounts`, `role_assignments`, `field_applications`, `login_rate_limits`, `sessions` | Login lookup, rate limit, verified session creation and logout |
| `agriculture.ts` | `field_applications`, `memberships`, `people`, `agriculture_plots`, `agriculture_cycles`, `agriculture_visits`, `agriculture_harvests`, `audit_events` | Plot/cycle lifecycle, visits and harvest recording |
| `business-catalog.ts` | `field_applications`, `business_products`, `business_warehouses`, `business_product_stock`, `business_inventory_movements`, `audit_events` | Product catalog, warehouses and stock movements |
| `business-inventory.ts` | `field_applications`, `business_products`, `business_warehouses`, `business_product_stock`, `business_inventory_movements`, `audit_events` | Inventory/catalog actions; overlapping export names need caller-path confirmation |
| `business-orders.ts` | `field_applications`, `business_products`, `business_customers`, `business_warehouses`, `business_orders`, `business_order_items`, `business_product_stock`, `business_inventory_movements`, `business_order_payments`, `finance_cash_accounts`, `audit_events` | Order lifecycle, stock reservation/release, payment/cash-account linkage |
| `business.ts` | `field_applications`, `business_partners`, `business_opportunities`, `business_agreements`, `business_milestones`, `audit_events` | Partners, opportunity, agreement and milestone lifecycle |
| `finance.ts` | `finance_accounts`, `finance_cash_accounts`, `finance_journals`, `finance_journal_lines`, `finance_budgets`, `finance_budget_lines`, `finance_contribution_allocations`, `finance_periods`, `business_order_payments`, `audit_events` | COA/cash, journal draft-submit-review-post-reversal, budgets, allocations and periods |
| `field-operations.ts` | `field_applications`, `field_workplans`, `field_programs`, `field_program_indicators`, `field_activities`, `field_tasks`, `audit_events` | Workplan/program/indicator/activity/task lifecycle and approvals |
| `field-team.ts` | `field_applications`, `memberships`, `field_team_assignments`, `audit_events` | Field team proposal, approval and end assignment |
| `workplan-approvals.ts` | `field_workplans`, `audit_events` | Submitted workplan approval |
| `management-tasks.ts` | `user_accounts`, `people`, `memberships`, `field_applications`, `field_tasks`, `audit_events` | Create/reassign/status change for management tasks |
| `member-profile.ts` | `user_accounts`, `people`, `person_interests`, `audit_events` | Self profile and interest update |
| `member-tasks.ts` | `user_accounts`, `people`, `memberships`, `field_tasks`, `audit_events` | Member self-task status |
| `member-training.ts` | `user_accounts`, `people`, `memberships`, `training_sessions`, `training_enrollments`, `audit_events` | Member self-enrollment |
| `member-community.ts` | `user_accounts`, `people`, `memberships`, `member_community_topics`, `member_community_replies`, `member_community_reports`, `audit_events` | Topic/reply/report and moderation lifecycle |
| `membership.ts` | `organizations`, `membership_interests`, `people`, `memberships`, `audit_events` | Membership-interest decision and activation |
| `membership-management.ts` | `memberships`, `audit_events` | Membership status updates |
| `forms.ts` | `organizations`, `membership_interests`, `outbox_events` | Public membership-interest intake and event outbox |
| `secretariat-documents.ts` | `organizations`, `file_assets`, `secretariat_documents`, `secretariat_document_files`, `secretariat_document_generations`, `secretariat_meetings`, `secretariat_minutes`, `secretariat_letters`, `field_activities`, `field_programs`, `audit_events` | Register/update/revision/finalize/archive/generated documents |
| `secretariat-letters.ts` | `organizations`, `secretariat_letters`, `audit_events` | Letter register and disposition transitions |
| `secretariat-meetings.ts` | `organizations`, `organization_units`, `secretariat_meetings`, `secretariat_minutes`, `secretariat_meeting_decisions`, `secretariat_meeting_attendance`, `memberships`, `people`, `audit_events` | Meeting, minutes, revision, decisions and attendance |
| `training.ts` | `field_applications`, `field_programs`, `training_sessions`, `training_enrollments`, `training_assessments`, `training_certificates`, `memberships`, `people`, `audit_events` | Sessions, enrollment, attendance, assessment, certificate issue/revoke |
| `public-site-settings.ts` | `system_settings`, `file_assets`, `audit_events` | Public-site/profile settings and exact banner asset association |
| `public-policies.ts` | `system_settings`, `audit_events` | Public policy content settings |
| `login-page-content.ts` | `system_settings`, `audit_events` | Login page content settings |
| `design-theme.ts` | `system_settings`, `audit_events` | Design/theme configuration |

### 12.1 API, search and direct page query paths

| Path | V9 relations / projection | Operation and boundary to verify |
|---|---|---|
| `src/app/api/files/route.ts` | `file_assets`, `audit_events` | Upload metadata registration and audit |
| `src/app/api/files/[id]/route.ts` | `file_assets`, `secretariat_documents`, `secretariat_document_files` | Authenticated file lookup/download |
| `src/app/api/files/[id]/share/route.ts` | `file_assets`, `file_share_links`, `secretariat_documents`, `secretariat_document_files`, `audit_events` | Link create/revoke/read; token, expiry, revocation, download limit and eligible final/public revision |
| `src/app/api/files/share/[token]/route.ts` | `file_share_links`, `file_assets`, `secretariat_documents`, `secretariat_document_files` | Anonymous single-token download through `getV9PublicShareSql` |
| `src/app/api/public-site/banner/[id]/route.ts` | `file_assets` | Exact configured active public banner projection |
| `src/app/api/secretariat/documents/[id]/file/route.ts` | `secretariat_documents`, `secretariat_document_files`, `file_assets`, `get_public_document_file` | Internal authorized file delivery vs final/public projection |
| `src/lib/operational-search.ts` via `src/app/api/search/route.ts` | `agriculture_plots`, `business_products`, `field_programs`, `finance_journals`, `memberships`, `people`, `secretariat_documents` | Cross-domain search; every joined relation must inherit the correct tenant and role scope |
| `src/app/app/(area)/pos/page.tsx` | `field_applications`, `business_customers`, `business_orders`, `business_order_payments`, `business_products`, `business_warehouses`, `finance_cash_accounts`, `finance_journals` | Direct authenticated POS reads through `getV9Sql`; order/payment side effects are handled by business-order actions |
| `src/app/api/studio/diagnostics/database/route.ts` | PostgreSQL catalog and `current_setting` metadata | Preview-only admin diagnostic; no tenant row payload |

### 12.2 Coverage gaps exposed by the sweep

1. **Relation sweep is not a complete query inventory.** It identifies named table references in SQL text but does not prove every conditional SQL branch, dynamically assembled query, nested CTE, view/function/trigger side effect or every caller/route-to-action mapping.
2. **Duplicate action surface:** `business-catalog.ts` and `business-inventory.ts` expose overlapping action names and table families. Caller tracing found the active field catalog component (`field-business-catalog-section.tsx`) imports the mutations from `business-catalog.ts`; the business order component imports `business-orders.ts`, and the partner/opportunity component imports `business.ts`. No caller for `business-inventory.ts` was found in the inspected page/component set. Treat `business-inventory.ts` as an unresolved duplicate/possibly unused action surface until a full repository reference scan proves whether it is dead code; do not count it as a second active mutation path.
3. **POS direct reads:** the POS page queries business/order/finance tables directly through `getV9Sql`; query-level permission checks, tenant predicates, row policy behavior and read consistency with the business-order mutation transaction need explicit regression evidence.
4. **Finance downstream effects:** journal posting/reversal, cash-account linkage, contribution allocation, budget/period lock and linked business-order payment flows need explicit trigger/ledger invariant tests under the runtime role, not only general tenant-policy assertions.
5. **Exports and documents:** the inventory still needs an enumerated mapping of each generator/report/export endpoint to its source rows, visibility rule, file revision, audit event and no-cross-tenant download result.
6. **Operational callers/personas:** this source sweep does not prove the browser routes and all legitimate roles can complete their expected CRUD flows after QA RLS. Authenticated Preview UAT for each legitimately provisioned persona remains open.

The source relation map is an incremental deliverable, not a completion claim. Issue #90 remains open until these gaps have direct test/runtime evidence and independent review.

**Caller trace evidence:** `field-business-catalog-section.tsx` imports `createBusinessProduct`, `createBusinessWarehouse`, `recordBusinessInventoryMovement`, and product/warehouse update actions from `@/app/actions/business-catalog`; `field-business-orders-section.tsx` and the order composer/payment form import `@/app/actions/business-orders`; `field-business-section.tsx` imports partner actions from `@/app/actions/business`. These components also require `field:usaha:read` and derive write/approval visibility from `can()` checks. The inspected `inventory-crud.tsx` contains no direct business-action import. This narrows the duplicate risk but is not a proof that no other caller exists elsewhere in the repository.
### 12.3 Dashboard page-level query loaders and public page data paths

A separate page-loader scan examined the authenticated application route tree. The following page files import and call `getV9Sql()` directly (in addition to the action imports shown above):

| Route family | Page paths with direct query helper use |
|---|---|
| Member | `anggota/komunitas`, `anggota/kontribusi` |
| File center | `berkas`, `berkas/[id]` |
| Field | `bidang/[field]/[section]` |
| Finance | `keuangan/anggaran`, `iuran`, `kas-bank`, `laporan`, `pembayaran`, `penerimaan`, `piutang-utang` |
| Management | `pengurus/anggota`, `bidang`, `dokumen`, `indikator`, `laporan`, dashboard `pengurus`, `pengaturan`, `persetujuan`, `program`, `rapat`, `struktur`, `tugas` |
| POS | `pos`, `pos/penerimaan/[paymentId]` |
| Secretariat | `sekretariat/agenda`, `anggota`, `dokumen`, `dokumen/[id]/cetak`, `ekspedisi`, `laporan`, `notulen`, dashboard `sekretariat`, `presensi`, `rapat`, `sk`, `surat`, `template/[code]` |

The public route scan found database-backed data loading on homepage, document archive, activities, contact, training, product listing/detail and organization profile. These page loaders delegate failures to `loadPublicData` and route data loading through `getV9Sql` plus the public projection functions in migration 0044. Public site/profile settings are read separately from `v9.system_settings` only where `visibility='public'` and the setting key is allowlisted; public policy settings use a parallel explicit key/visibility boundary. Public pages such as help, FAQ, gallery, news, policy listings/details, join and static privacy pages do not contain direct SQL calls in their route file, although some load public-site settings.

**Required verification for these page loaders:** inspect the exact SELECT projection and filters, confirm they call only the fixed public `SECURITY DEFINER` projections for operational tables, verify no direct anonymous base-table access, and test successful-empty vs unavailable fallback states. For authenticated dashboard loaders, map each query to its role permission and tenant/unit/self predicate, confirm all joined tables have compatible policies, and exercise the page under the legitimate role in Preview. Page import/call inspection alone is not evidence that the rendered page's data is tenant-safe.

### 12.4 Static audit limitations and next checks

- The route scan confirms more than server-action mutation calls are in scope: multiple dashboard pages independently read the database. A route can therefore render or export data without invoking the corresponding action.
- SQL clause extraction is a mechanical inventory aid. It does not analyze interpolated SQL, query parameters, transaction boundaries across multiple statements, authorization branches, pagination correctness, download response bodies, or all UI callers.
- The next test increment is to convert these page/query paths into domain-level read and mutation tests. Finance/ledger, POS/order-stock, Secretariat generator/file revision, public document projection, and search are first priority because they join multiple domain tables or produce downstream effects.
### 12.5 Route-level authentication and permission gates observed

The page/layout scan confirmed these server-side guard points:

| Route group | Observed guard |
|---|---|
| `src/app/app/layout.tsx` | `requireIdentity()` is the base authentication gate for the `/app` tree |
| `(launcher)/layout.tsx` | Resolves `getIdentity()` and redirects unauthenticated requests to `/masuk` |
| `anggota/layout.tsx` | `requireIdentity("member:self")` |
| `keuangan/layout.tsx` | `requireIdentity("finance:read")` |
| `sekretariat/layout.tsx` | `requireIdentity("secretariat:read")` |
| `pengurus/layout.tsx` | `requireIdentity("organization:read")`; finance, membership and workplan panels are additionally filtered with permission checks |
| `pos/layout.tsx` | `requireIdentity("pos:sell")`; business and finance panel visibility also checks effective permissions |
| `bidang/[field]/layout.tsx` | Requires dynamic `field:<field>:read` scope |
| File-center pages | `berkas` and `berkas/[id]` each call `requireIdentity("files:read")` and apply further `files:manage` / ownership checks |
| Field subpage | `bidang/[field]/[section]` adds a specific `field:organisasi:review` gate for organization review content/actions |

The effective role permission map remains centralized in `src/lib/session.ts` and `src/lib/identity.ts`, with server identity resolved from `user_accounts`, `role_assignments`, organization, membership and field application data. The UI/layout gates are not a replacement for each server action's own permission check or database RLS. The remaining security review must verify that every mutation action validates its exact permission, active role, scope and parent-child ownership server-side, and that page-level reads do not return data before/after an unauthorized route redirect.

**Coverage caution:** these checks prove guard calls exist at the listed route boundaries. They do not yet demonstrate every legitimate role can perform its allowed actions, nor that unauthorized roles are denied for every direct action endpoint. Add role-specific negative tests for each action/route family to close that gap.
### 12.6 Server-action identity and permission guard sweep

A separate import/call scan covered all 27 action modules. The source files generally import `requireIdentity`, `requireRoles` and/or `can` from `src/lib/session.ts`; the deliberate unauthenticated paths are login/logout and public membership-interest intake. The action families observed are:

| Action family | Source-level guard evidence |
|---|---|
| Account settings | `requireIdentity()`; password/account update is designed for the current identity only |
| Agriculture | `requireIdentity` plus `field:pertanian:manage` / `field:pertanian:activity:write` checks |
| Business catalog/inventory | `requireIdentity` plus `field:usaha:manage` / `field:usaha:activity:write` checks |
| Business orders | `requireIdentity`, `field:usaha:activity:write` and `can()` checks |
| Business partners/opportunities/agreements | `requireIdentity` plus `field:usaha:manage` checks |
| Finance | `requireIdentity("finance:read")` plus action-specific `can()` checks |
| Field operations | `requireIdentity`, `requireRoles` and `can()` checks; action permissions vary by lifecycle transition |
| Field team | `requireIdentity` plus `can()`-based scope checks |
| Management tasks | `requireIdentity("organization:tasks:write")` |
| Member profile | `requireIdentity()`; profile mutation remains self-bound |
| Member tasks / training | `requireIdentity("member:self")` |
| Member community | `requireIdentity("member:self")` plus moderation `can()` checks |
| Membership management | `requireIdentity("membership:activate")` |
| Membership-interest decision | `requireIdentity("field:organisasi:review")` |
| Design theme | `requireRoles` restricted action path |
| Login page content / public policies / public-site settings | `requireIdentity("cms:publish")` |
| Secretariat documents / letters / meetings | Specific write permissions for document, letter, meeting, minutes and attendance actions |
| Training operations | `requireIdentity`, `field:pelatihan:manage` / `field:pelatihan:activity:write`, and `can()` checks |
| Workplan approvals | `requireIdentity("organization:read")` plus `can()` approval checks |
| Login/logout | Purpose-specific pre-authentication and current-session revocation helpers; no pre-existing identity is expected for login |
| Public membership-interest form | Anonymous narrow `getV9PublicInterestSql` context and fixed submit policy; does not create an account or activate membership |

The effective permission catalogue is produced from the database-resolved role in `src/lib/session.ts`; `src/lib/identity.ts` evaluates exact/wildcard grants. The demo identity catalogue is empty (`DEMO_ACCOUNTS: never[]`) in this source version.

This sweep establishes that guard calls exist in the action modules. It does **not** prove each individual exported function is guarded by the correct specific permission, that guard execution precedes every data read/write, or that no caller passes untrusted IDs that are not revalidated against parent/tenant scope. Remaining follow-up:
- inspect the first executable statements of every exported action, including dynamic permission construction and role allowlists;
- verify user/organization/unit/parent IDs are always derived from or checked against the authenticated identity, not trusted from client-supplied values;
- add negative tests that invoke each action as an authenticated but unauthorized role, and confirm no row changes or audit/outbox/trigger side effects occur;
- preserve the two intentional unauthenticated paths only under their narrow transaction contexts and ensure the login helper is not reusable for general application reads.
