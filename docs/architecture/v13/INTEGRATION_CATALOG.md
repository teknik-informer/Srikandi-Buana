# Cross-Module Integration Catalog — Architecture v13

## Status

This document defines target contracts and workflows. It does not assert that durable asynchronous event delivery is already deployed.

The current v12 baseline uses application-service calls within one modular monolith. Introduce a transactional outbox, queue and independent consumers only when a domain has actually been separated or asynchronous delivery is required.

## Contract envelope

Every cross-domain event must carry:

| Field | Meaning |
|---|---|
| `event_id` | Globally unique event identifier |
| `event_type` | Stable namespaced event name |
| `schema_version` | Version of the payload contract |
| `occurred_at` | Source-domain commit time, ISO 8601 |
| `producer` | Canonical producing module |
| `organization_id` | Organization/workspace scope |
| `aggregate_id` | Stable identifier of the changed source aggregate |
| `actor_id` | Authenticated actor or system principal |
| `correlation_id` | Identifier connecting a multi-step business workflow |
| `idempotency_key` | Stable key preventing duplicate processing |
| `payload` | Minimal event data and stable references |

Events must not contain unnecessary personal data. Consumers retrieve additional approved details through the owning domain's API.

## Integration matrix

| Producer | Consumer | Business trigger | Target event/command | Consumer responsibility |
|---|---|---|---|---|
| HRM | Project Management | A member or volunteer is verified and assigned | `hrm.member.verified`, `hrm.assignment.changed` | Store the member reference and project assignment; do not copy the full member profile. |
| HRM | Platform Core | Account/member status changes | `hrm.membership.status_changed` | Re-evaluate access grants and revoke access when policy requires it. |
| Project Management | Accounting | Project plan or budget request is submitted/approved | `project.budget.requested`, `project.approved` | Review, approve and record the authoritative budget in Accounting. |
| Accounting | Project Management | Budget approval or actual spending is posted | `accounting.budget.approved`, `accounting.ledger.entry.posted`, `accounting.ledger.entry.reversed` | Display synchronized budget and spend summaries with source timestamp; never post journals from Project. |
| CRM | Project Management | A partnership opportunity becomes an approved program/project | `crm.partnership.approved` | Create the project through a validated conversion flow and retain the CRM opportunity reference. |
| Agriculture | Inventory | A harvest batch is accepted into storage | `agriculture.harvest.recorded`, Inventory receipt command | Validate receiving quantity/quality and post one stock receipt. Agriculture retains the harvest record. |
| POS | Inventory | A sale is completed or reversed | `pos.sale.completed`, `pos.sale.reversed` | Post an idempotent stock movement and return the resulting movement reference. |
| POS | Accounting | A completed sale is financially settled/recognized | `pos.sale.completed`, `pos.payment.settled` | Map the sale to configured accounts and post the balanced journal once. POS must not write to the ledger. |
| Inventory | Accounting | A stock valuation or approved inventory adjustment affects financial value | `inventory.valuation.posted`, `inventory.adjustment.approved` | Post the configured financial effect using an approved mapping. |
| Project Management | MEL | An output, outcome or milestone is evidenced | `project.deliverable.verified`, `mel.indicator.observation.created` | Record measurement and evidence with period, unit and verification status. |
| Documents | Public CMS | An authorized document/publication is approved | `document.approved`, `content.publication.published` | Publish only approved versions with required consent and public visibility settings. |
| All domains | Analytics | A source fact changes and is committed | Domain-specific projection event | Refresh a read model with source, period, status and last synchronization timestamp. |

## State and idempotency rules

- An event is emitted only after the source transaction commits.
- The producer persists the outbox event in the same database transaction as the business change.
- A consumer records the event ID or idempotency key before applying its side effect.
- Re-delivering an event must not create a second stock movement, journal, receipt, task or publication.
- A failed consumer can retry safely; permanent failures go to a dead-letter state with reason and correlation ID.
- Replay must preserve the original event ID and use a consumer replay marker.
- Corrections use explicit reversal/compensation events; do not silently rewrite already-consumed history.
- A reconciliation process compares source and consumer references and surfaces unresolved differences.

## Transaction boundaries

Do not promise an atomic commit across multiple independent databases.

Examples:
- A completed POS sale is committed in POS first. Inventory and Accounting process the event independently and report their own synchronization state.
- If inventory cannot fulfill a sale, use a compensating business action or controlled exception process; do not pretend the POS transaction never occurred.
- A project budget request is not an Accounting budget until Accounting has approved and recorded it.
- A harvest record is not warehouse stock until Inventory has accepted the receipt.

Use sagas only for workflows that genuinely need multi-domain coordination. Keep each local transaction within its owning domain.

## Integration health

The Integration Center should eventually expose:

- Producer/consumer name and contract version.
- Last successful delivery time.
- Pending, retried and dead-letter event counts.
- Most recent failure reason.
- Correlation ID and safe source references.
- Reconciliation status and manual resolution record.

The Integration Center must not expose secrets, private personal data or raw database connection details.
