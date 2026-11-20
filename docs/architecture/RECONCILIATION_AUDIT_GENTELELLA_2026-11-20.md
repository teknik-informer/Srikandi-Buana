# Reconciliation Audit — Gentelella Rebuild vs Master Application Architecture v1.0

**Audit date:** 20 November 2026  
**Target branch:** `feat/gentelella-rebuild-clean-2026-11-20`  
**Target commit:** `3533604df939c9b1ba93b36a1bc2a3c35ecef5f1`  
**PR:** [#49 — Rebuild workspace UI on Gentelella design foundation](https://github.com/teknik-informer/Srikandi-Buana/pull/49)  
**Authoritative architecture:** [Master Application Architecture v1.0](https://github.com/teknik-informer/Srikandi-Buana/blob/fix/v13-release-safety-gates-2026-11-17/docs/MASTER_APPLICATION_ARCHITECTURE_v1.md), created 17 November 2026  
**Prior audit:** [Implementation Audit Matrix v1.0](https://github.com/teknik-informer/Srikandi-Buana/blob/fix/v13-release-safety-gates-2026-11-17/docs/IMPLEMENTATION_AUDIT_MATRIX_v1.md)  
**Audit method:** read-only source comparison. No Production database, secrets, deployment aliases, or data were changed.

## 1. Executive finding

PR #49 is not based on the previously established application architecture implementation line. It targets `main` at `de9bc10b546ca066c6b4067c8a2e2ef4b63fc483`, while the approved Master Application Architecture v1.0 and Implementation Audit Matrix v1.0 are on `fix/v13-release-safety-gates-2026-11-17` (PR #33, head at audit time `5f9231e408772d288a33dab29f06efae91bd0d7b`). The Gentelella branch consequently starts from an older production branch and re-creates a simplified application registry rather than carrying forward the canonical six-application registry and its established mappings.

**This is the principal source-of-truth error.** The issue is not that the Gentelella visual system is inherently wrong. The rebuild mixed a visual redesign with an architecture/navigation reinterpretation.

PR #49 remains Draft and must not be merged or promoted until this divergence is resolved.

## 2. Binding architecture rules

The 17 November 2026 Master Application Architecture v1.0 establishes:

1. One platform, six integrated applications, one shared data foundation.
2. The six top-level applications are exactly:
   - Platform Core
   - Organization
   - Agriculture
   - Business & Enterprise
   - BI & Analytics
   - Public & Partnership
3. Each application has its own mandate, dashboard, menu, workflows, permissions, and domain ownership.
4. Every business fact has one authoritative write owner. Other applications consume references, contracts, or approved projections; no competing master data.
5. BI is a read/analysis layer, not a transaction-entry or source-data mutation path.
6. Public & Partnership consumes only approved/public-safe projections; internal data is not exposed by default.
7. Legacy workspaces (HRM, Accounting, CRM, Projects, POS, Analytics and supporting modules) are compatibility submodules to be mapped under the six top-level applications, not competing top-level application identities.
8. The app shell, navigation, and design system are shared. Visual redesign must not alter domain boundaries, data ownership, route compatibility, or authorization semantics.
9. Existing route prefixes are conceptual targets; do not mass-rewrite routes. Preserve legacy routes and use tested aliases/redirects.
10. A card, menu item, route, or dashboard is not proof that a domain workflow is implemented.

The prior Implementation Audit Matrix v1.0 explicitly marked the six-app registry and domain ownership as P0 work and required one top-level application registry, with legacy workspaces mapped beneath it.

## 3. Direct comparison: architecture vs PR #49

| Area | Master Architecture / prior audit | PR #49 current state | Finding |
|---|---|---|---|
| Top-level applications | Six canonical applications | Six cards are shown, but their routing is derived from four old enterprise dashboards | **P0 — structural mismatch** |
| Application registry | Canonical product registry with legacy workspace mapping | Adds `dashboardId` and `featureId` references to the four-dashboard registry | **P0 — wrong source of truth** |
| Platform Core | Shared identity, access, workspace, modules, audit, notifications, integrations, platform settings | Card routes to the legacy `/dashboard/pengaturan` feature | **P1 — incomplete/incorrect landing contract** |
| Organization | Organization and people domain, source of member/structure records | Card routes to generic legacy `portal` feature | **P1 — does not establish Organization workspace boundary** |
| Agriculture | Independent agricultural operations and source of farmer/land/production records | Card routes to an existing agriculture feature nested under old `ecosystem` dashboard | **P1 — feature exists, app boundary is not implemented** |
| Business & Enterprise | Business operations: products, procurement, inventory, sales, cash/bank, accounting | Card routes to generic `usaha` feature under old `finance` dashboard | **P1 — partial mapping; legacy accounting/POS/CRM workspaces not unified** |
| BI & Analytics | Cross-domain, governed, read-only indicators and reports | Card routes to generic `laporan` feature under old `finance` dashboard | **P1 — analytics mandate and read-only contract not proven by this mapping** |
| Public & Partnership | Public website, editorial approval, partner portal and approved projections | Card routes to `publikasi` under old `publication` dashboard | **P1 — public/partner domain boundary not established** |
| Legacy workspaces | Retained as submodules and mapped explicitly | Existing route/feature registry is reused as the top-level application resolver | **P0 — inversion of intended hierarchy** |
| Navigation | Separate Applications, Workspaces, Administration concepts in one shared shell | Sidebar presents four production areas; app cards resolve back into them | **P0 — user experience contradicts six-app model** |
| Authorization | Identity + workspace + role + permission + resource scope + workflow state | Existing server-side guards retained; app-card visibility is not itself an authorization boundary | **Needs parity tests; no claim of failure solely from UI mapping** |
| Domain ownership | One write owner per business entity | Registry mapping alone does not prove ownership or integration contracts | **Not demonstrated by PR #49** |
| Shared services | Identity, documents, notifications, approvals, audit, integrations, reporting | Existing services largely retained | **Preserve; verify before extraction/refactor** |
| Visual system | One shared design system across six applications | Gentelella visual tokens and shared workspace shell introduced | **Directionally aligned; visual layer can be retained** |
| Routes and APIs | Preserve old routes and workflows during incremental migration | Catch-all aliases and existing APIs mostly retained | **Compatibility must be tested; avoid remapping to semantically unrelated features** |
| Data/migrations | Additive, controlled, lineage reconciled; no big-bang rewrite | PR #49 does not add SQL migrations | **Good boundary; keep frozen** |

## 4. Exact code-level divergence

### 4.1 Canonical registry exists in the architecture line

The previously established `src/features/platform/application-registry.ts` on the architecture branch defines the six application identities and their intended compatibility mapping:

- Platform Core → `/dashboard/module-center`
- Organization → `/dashboard/hrm`
- Agriculture → `/dashboard/pertanian`
- Business & Enterprise → `/dashboard/accounting`
- BI & Analytics → `/dashboard/analytics`
- Public & Partnership → `/dashboard/crm`

These are the previously audited legacy entry points for that code line, not a direction to blindly copy routes into a different branch. The exact route must be checked against the target branch and current role policy before integration.

### 4.2 PR #49 replaces that mapping with a different model

PR #49 defines a new registry that adds `dashboardId` and `featureId` and resolves six app cards through four `enterpriseDashboards` IDs (`ecosystem`, `publication`, `finance`, `system`). Its current mapping is:

| PR #49 application | Four-dashboard target | Feature |
|---|---|---|
| Platform Core | system | pengaturan |
| Organization Management | ecosystem | portal |
| Agriculture Management | ecosystem | pertanian |
| Business & Enterprise | finance | usaha |
| BI & Analytics | finance | laporan |
| Public & Partnership | publication | publikasi |

That model turns the six canonical applications into shortcuts into four legacy dashboard groupings. It does not preserve the previously approved six-app application boundary. A runtime test proving that each shortcut resolves to one of the four old dashboards proves only that the shortcuts are internally consistent with that old registry; it does not prove compliance with Master Application Architecture v1.0.

### 4.3 Important nuance

The four-dashboard registry on `main` is a real legacy production navigation structure and must be preserved for compatibility. It is not the canonical product-architecture registry. Both can coexist only with a clear hierarchy:

- Six-app registry = product/application identity and application-level landing/navigation.
- Legacy dashboard/feature registry = compatibility routes and operational submodules.
- Domain services and server policies = actual data ownership and authorization enforcement.

The old registry must not be promoted into the new six-app architecture's parent structure.

## 5. Work in PR #49 classified by disposition

| Change group | Disposition | Required treatment |
|---|---|---|
| Gentelella tokens, CSS, shared page header, workspace shell styling | **Retain conditionally** | Keep visual-only changes; verify desktop/mobile and contrast before acceptance |
| Shared button/table/form styling | **Retain conditionally** | Ensure no component behavior or accessibility regression |
| Global settings moved into Pusat Pengaturan | **Retain conditionally** | Preserve placement; validate persisted preference behavior and admin policy |
| Organization settings API | **Review separately** | Verify existing settings/audit semantics, ownership, authorization, and no conflicting config source |
| Six-app card UI | **Retain presentation; replace resolver** | Cards must read canonical six-app registry, not infer app identity from four old dashboards |
| `application-registry.ts` with `dashboardId/featureId` | **Rework** | Restore the canonical registry contract from the architecture line; add only evidence-backed route adapters |
| `enterprise.registry.ts` four dashboards | **Preserve as legacy compatibility** | Do not delete or redefine it as the six-app architecture |
| Sidebar and catch-all route remapping | **Review/rework** | Keep old deep links; define application context separately from legacy feature routes |
| Existing APIs, auth, permissions, database, migrations | **Preserve** | No broad refactor or schema changes as part of visual rebuild |

## 6. Required reconciliation sequence

### P0 — Freeze the incorrect architecture coupling
- Keep PR #49 Draft.
- Do not merge, promote, or change Production.
- Do not add new mappings from six apps into four dashboards.
- Keep the four-dashboard registry and all legacy routes intact as compatibility surfaces.

### P0 — Restore the canonical architecture source
- Reconcile PR #49 with the architecture branch containing Master Application Architecture v1.0 and Implementation Audit Matrix v1.0.
- Use the canonical six-app registry as the top-level application source.
- Preserve legacy workspaces and route IDs as child workspaces/aliases.
- Avoid replacing the existing role/permission engine with client-side visibility logic.

### P1 — Define app-to-legacy route adapters
For every canonical app, record:
- canonical app ID and owner domain;
- actual current landing route and route owner;
- legacy workspace IDs and feature routes;
- role/module grants and record scopes;
- source tables/services and write ownership;
- status: active, partial, preview, unavailable;
- redirect/deep-link compatibility and tests.

Do not use a fallback route simply because a similarly named legacy feature exists. If the intended app landing page does not yet exist, provide an explicit application overview/status page rather than silently opening an unrelated workspace.

### P1 — Separate application navigation from operational navigation
- Application switcher selects one of the six canonical applications.
- Application context determines the relevant dashboard and navigation groups.
- Legacy operational modules remain discoverable beneath the owning application.
- Platform administration remains a distinct technical surface.
- Server policy still authorizes every route and action.

### P2 — Verify vertical slices before claiming completion
- Organization: member identity, structure, positions, meetings, attendance, correspondence.
- Agriculture: farmer reference, land, commodity, cultivation, harvest, traceability.
- Business: product → procurement → inventory → sale → cash/bank → accounting references.
- BI: governed read-only KPI definitions, lineage and freshness.
- Public & Partnership: draft → review → approved → published and partner-scoped access.
- Platform Core: identity, workspace, permission, module registry, audit, notifications, integrations.

### Release gate
No merge or Production promotion until architecture mapping, route compatibility, role/scope negative tests, regression tests, responsive visual QA and authenticated UAT are evidenced. CI/build success alone is not an acceptance substitute.

## 7. Scope and confidence

This is a source-level reconciliation audit of the documented architecture branch and PR #49 head. It does not certify:
- authenticated browser behavior;
- actual data ownership for every live API write;
- complete domain workflow parity;
- database migration lineage or QA schema compatibility;
- production readiness or release approval.

No Production database or data was queried or changed during this audit. No migrations were run. PR #49 remains Draft.
