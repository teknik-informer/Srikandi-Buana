# SRIKANDI BUANA — Data Ownership Matrix

**Status:** Proposed target ownership; current persistence noted separately.  
**Rule:** One authoritative writer per business fact. Other applications consume contracts or projections.

## 1. Ownership matrix

| Data entity | Owning domain | Consumers | Current evidence / migration note |
|---|---|---|---|
| Accounts, sessions, invitations | Core Identity | All apps | Existing users/sessions/invitations and identity workflows |
| Workspace/org configuration | Core | All apps | Existing workspace owner model; organization registry requires consolidation review |
| Positions and assignments | HRM / Organization | Core RBAC, Projects | Multiple officer positions supported by migration 013; access profile remains separate |
| Members, employees, volunteers | HRM | Projects, CRM (limited), POS (customer identity where appropriate) | Member records currently include generic `records` storage; workforce directory is not complete |
| Attendance sessions/records | HRM | Projects, reports | Current attendance implementation uses owner-scoped `records` compatibility kinds |
| Training and competencies | HRM | Projects, reports | Target capability; completion not verified |
| Contacts, customers, suppliers, buyers, donors | CRM | POS, Projects | Target CRM master; avoid duplicating person/account identity |
| Partnerships and agreements | CRM | Projects, Accounting (funding references) | External organization/access tables exist; full CRM pipeline remains incomplete |
| Programs and projects | Projects | HRM, CRM, Accounting, POS | Existing operational program records and external grants; normalize by vertical slice |
| Tasks, milestones, evidence, indicators | Projects | Reports, Accounting | Target project work model; not yet complete |
| Chart of accounts and journals | Accounting | POS, Projects, reporting | Existing ledger tables and journal validation/reversal foundation |
| Cashbook and bank reconciliation | Accounting | Reporting | Reconciliation with ledger not verified complete |
| Budget and restricted fund | Accounting (budget ownership) + Projects (project allocation reference) | Projects, CRM | Define one authoritative approved budget and immutable version history |
| Products, price, stock, stock movements | POS (initial owner) | Accounting, CRM | Existing commerce product/order/stock tables; not full retail/POS workflow |
| Sales, refunds and payment state | POS | Accounting, CRM | Orders exist; payment gateway, refund and shift workflows remain gaps |
| Documents and file metadata | Shared Document Service | All apps | Existing files/file_objects and file APIs; private authorization rechecked on download |
| Audit/security events | Shared Audit | All apps | Existing audit facilities and append-only controls for selected domains |
| Notifications | Shared Notification Service | All apps | Existing ecosystem notification table |
| Traceability batches and chain of custody | Agriculture domain initially; integrate with POS/Projects | CRM, POS, public site | Agriculture tables exist; full batch-to-sale traceability is future work |

## 2. Data ownership rules

1. Domain owns its schema, writes and lifecycle. Consumers may hold foreign references and read projections.
2. Do not duplicate a member as a separate CRM contact when the same person identity can be referenced with a distinct relationship type.
3. A person can be a member, officer, employee, volunteer, customer or partner contact at different times; relationships must be explicit and independently revocable.
4. Use UUID identifiers for new normalized domain entities where appropriate, but preserve existing IDs and references during compatibility migration.
5. Tenant/workspace identity must be enforced in database constraints where feasible, not only in application code.
6. Use archive/deactivation for master records where historical references exist. Do not cascade-delete financial or audit history.
7. Documents are stored as private objects or controlled public assets; database rows contain metadata and authorization references, not public exposure by default.
8. Reports must record their source period, query/scope, generation time, data freshness and approval state.

## 3. Cross-domain reference contract

A cross-domain reference should carry:
- Stable source entity ID.
- Source domain and entity type.
- Workspace/organization identifier.
- Event or transaction reference.
- Created/committed timestamp.
- Version or revision when source changes matter.
- Minimal display projection needed by the consumer.

Do not permit direct writes to the source domain through a consumer's UI/API.

## 4. Migration order

1. Inventory actual tables, foreign keys, indexes, owner/workspace predicates and consumers.
2. Reconcile migration filenames and QA migration ledger.
3. Define canonical identity and organization references.
4. Normalize HRM member/position/attendance slices with compatibility reads.
5. Formalize CRM contact and organization relationships.
6. Formalize Projects and budget reference contract.
7. Complete Accounting period, ledger, reconciliation and reporting controls.
8. Complete POS sale/payment/refund/stock transaction contracts.
9. Build reporting projections and traceability joins using stable references.

No data backfill or destructive migration is authorized by this document.
