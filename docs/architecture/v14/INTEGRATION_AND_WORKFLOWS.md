# SRIKANDI BUANA — Integration Contracts and Business Workflows

**Architecture:** synchronous application services first; transactional outbox for reliable asynchronous delivery when needed.

## 1. Integration principles

- Source domain remains authoritative for its data and state transitions.
- Cross-domain calls use application service interfaces or documented API contracts.
- A consumer must not write another domain's tables.
- Use stable event IDs and idempotency keys for retried requests.
- Persist an outbox event in the same database transaction as the source change when asynchronous delivery is required.
- Consumers store processed event IDs and make handlers idempotent.
- Record retry count, last error, next attempt and terminal failure state.
- Reconciliation jobs detect missing projections or stuck events.
- Never report success before the source transaction commits.

## 2. Target workflows

### A. People and organization
HRM person/member registration → verification → membership/position assignment → access request → module grant → activity/attendance.

Identity lifecycle and HRM relationship lifecycle remain separate. Removing a module grant must not delete the person or historical attendance.

### B. Partnership funding to program delivery
CRM partner/donor relationship → proposal and agreement → Projects project registration → Accounting approved budget/fund reference → project activity and procurement → Accounting expense/journal → Projects evidence and indicators → approved donor report.

A signed agreement is not automatically a cash receipt. Receipt confirmation belongs to Accounting and must reference the bank/cash evidence.

### C. POS sale
POS cart/price validation → sale confirmation → stock movement reservation/commit → Accounting posting request → ledger journal reference → CRM customer activity → receipt and reporting.

The workflow must define the transaction boundary or compensating actions before production use. A successful sale must not be displayed as financially posted until Accounting confirms the journal. Repeated delivery of the same event must not duplicate stock deduction or journal posting.

### D. Project expense
Project expense request → budget availability check → approval under delegated authority → Accounting transaction and posting → Project budget realization projection → evidence and audit event.

Budget availability is a reservation/authorization decision, not itself an accounting expense.

### E. Agricultural traceability
Member/farmer → farm plot → crop cycle → production activity → harvest record → batch/lot → processing/storage movement → POS sale/order → buyer/customer → chain-of-custody report.

Traceability claims must distinguish recorded, verified and externally certified facts. The system does not confer EUDR or sustainability certification.

## 3. Event envelope

Recommended event contract:

```json
{
  "eventId": "uuid",
  "eventType": "pos.sale.confirmed",
  "schemaVersion": 1,
  "occurredAt": "ISO-8601",
  "workspaceId": "uuid",
  "source": { "domain": "pos", "entityType": "sale", "entityId": "uuid" },
  "correlationId": "uuid",
  "idempotencyKey": "stable-key",
  "actorId": "uuid",
  "payload": {}
}
```

Payload must contain only the minimum fields required by the consumer. Personal data should be referenced, not copied, unless the consumer has a lawful and documented need.

## 4. Failure handling

- Retry transient infrastructure errors with bounded backoff.
- Do not retry validation or authorization failures automatically.
- Keep failed events visible to authorized technical operators without exposing business payloads unnecessarily.
- Provide replay only with idempotency protection and audit.
- Use reconciliation reports for source-vs-projection mismatches.
- Never "fix" an integration by editing immutable financial or audit rows directly.

## 5. Initial API boundaries

Each domain should publish versioned contracts for commands and queries. OpenAPI documentation is required before external consumers are enabled. Internal service contracts may be TypeScript interfaces initially, but must have explicit validation and authorization at their boundary.
