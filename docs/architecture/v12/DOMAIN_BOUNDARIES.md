# SRIKANDI BUANA v12 — Domain Boundaries

## Architecture decision

Use a **modular monolith with feature-driven boundaries**. Keep one Next.js deployment and one primary PostgreSQL/Neon data platform while separating business capabilities in code. Do not introduce microservices, queues, or a second database merely to create the appearance of scale.

A dashboard pillar is a user-experience grouping. It is not a database schema, service boundary, or authorization boundary.

## Five dashboard pillars

| Pillar | User-facing responsibility | Existing route families |
|---|---|---|
| Ecosystem | Cross-unit coordination, member services, submissions, notifications | `portal`, `pengajuan`, `enterprise`, `notifikasi` |
| Management | Programs, operations, performance, finance and assets | `program`, `tindaklanjut`, `kegiatan`, `kehadiran`, `kas`, `laporan`, `usaha`, `aset`, `lotkopi`, `kemitraan`, `akuntansi` |
| Administration | Membership, governance, documents, accounts and site configuration | `anggota`, `pengurus`, `musyawarah`, `persetujuan`, `sumber`, `kelembagaan`, `register`, `transkripsi`, `dokumen`, `akun`, `akun-saya`, `pengaturan` |
| E-Commerce | Catalog, inventory, orders and commerce workflows | `penjualan` |
| Public & Support | Published information, gallery, communication and help | `publikasi`, `galeri`, `pesan`, `panduan` |

The v12 registry groups existing routes and preserves their IDs. A route being present in the registry is **not** a claim that its full business workflow is production-complete.

## Code boundaries

Target feature layout:

```text
src/
  app/                         # Next.js routing and composition only
  features/
    enterprise/                # Pillar registry and shared workspace contracts
    identity/                  # Authentication, sessions and account lifecycle
    organization/              # Members, officers, governance and consent
    operations/                 # Programs, tasks, events and approvals
    finance/                    # Cashbook, ledger, reconciliation and reporting
    commerce/                   # Catalog, stock, orders and fulfillment
    administration/             # Documents, settings and access administration
    public-content/             # Public pages, publishing, gallery and support
  components/                   # Shared presentational components
  lib/                          # Platform adapters and low-level utilities
migrations/                     # Ordered, reviewed SQL migrations
tests/                          # Unit, integration, security and regression tests
```

Adopt this layout incrementally. Move a feature only when its imports, API contracts, authorization, data ownership and tests can move together. Do not create empty duplicate implementations beside working legacy modules.

Each feature should own:
- Domain types and validation rules.
- Application use cases / services.
- Persistence queries for its tables.
- API handlers or server actions.
- UI composition and feature-specific tests.

Shared platform code should own database connections, request parsing, logging, session primitives, file storage adapters and common response contracts. A feature must not import another feature's private repository implementation; expose a small application contract instead.

## Data ownership and invariants

- Neon PostgreSQL remains the source of truth for business records.
- Every workspace-owned query must include the authenticated workspace owner in its predicate. A client-supplied owner ID is never authoritative.
- Account identity (`accountId`) and workspace identity (`userId`) remain distinct.
- Record-level authorization and program scoping remain server-side. Hiding a menu item is not security.
- Commerce order status, payment status and fulfillment status must be separate concepts before a payment provider is introduced.
- Posted ledger entries are immutable. Corrections use linked reversing entries; do not delete posted history.
- Notifications are projections of committed business events, not a second source of business truth.

## Cross-domain communication

For the current scale, call application services directly inside the monolith and keep transactions local to the owning domain. When reliable asynchronous delivery is needed, introduce a transactional outbox table in the same database transaction as the business change. Consumers must be idempotent and record delivery attempts.

Do not use database triggers as a substitute for domain services. Existing stock-audit triggers can remain until a reviewed migration replaces them with an equivalent, tested audit mechanism.

## Security boundaries

- Authentication and session verification happen on the server.
- API handlers validate the session, same-origin policy for writes, input schema, rate limits and workspace ownership.
- Role permissions decide whether an action is available; record scope decides which rows can be read or changed.
- File downloads must re-check ownership and authorization at request time.
- Public publishing requires explicit publication state and recorded consent where personal imagery is involved.
- Secrets, private member documents and database exports must never be committed to this public repository.

## Current implementation note

The v12 foundation introduces `src/features/enterprise/registry.ts`, extracts the role/record access policy into `src/features/identity/access-policy.ts`, and places shared input primitives, SKU validation, and balanced-journal validation in `src/features/shared`, `src/features/commerce`, and `src/features/finance`. The API handlers for products, orders, and ledger now import their owning feature contracts. `src/lib/permissions.ts` and `src/lib/ecosystem/validation.mjs` remain compatibility facades so legacy imports keep working. The existing `dashboardGroups` definitions remain the compatibility source for route labels and URLs while the dashboard navigation is presented as five pillars. Next, extract persistence and application services one domain at a time with integration tests and migration review.
