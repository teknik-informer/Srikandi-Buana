# v14 QA Migration Rehearsal — 2026-11-08

## Applied migration

- File: `migrations/008_workspace_v14_core.sql`
- Schema namespace: `workspace_v14`
- Applied to the isolated migration rehearsal branch `br-raspy-water-b4fhxzr9`.
- Applied to the dedicated Preview/QA branch `br-mute-meadow-b4rhx1mn`.
- The existing migration ledger records `008_workspace_v14_core.sql` once on each branch.
- No SQL migration was run against Production branch `br-empty-hat-b4t6feq8`.

## Reconciliation results

| Measure | Rehearsal branch | Preview/QA branch |
|---|---:|---:|
| Existing `public.users` rows | 2 | 1 |
| Existing `public.records` rows | 4 | 1 |
| Derived organization rows | 1 | 1 |
| Organization membership rows | 2 | 1 |
| Legacy source references | 4 | 1 |
| Source references converted prematurely | 0 | 0 |
| Orphan memberships/source maps | 0 | 0 |
| Migration ledger marker | 1 | 1 |

Legacy record mapping by source kind on the rehearsal branch:

- `anggota` → `member_profiles` (pending transformation)
- `program` → `programmes` (pending transformation)
- `register` → `documents` (pending transformation)
- `kelembagaan` → `administration_records` (pending transformation)

No personal field values were copied from the old record payloads during this first stage. The manifest stores source table/ID, kind, a checksum, destination-domain intention and status. The original records and file bytes remain intact.

## Schema comparison

A schema comparison of each test branch against Production showed the additive `workspace_v14` schema, its domain tables, keys and indexes. Existing `public` tables were not altered by this migration. Production remains on the previous schema.

## Important completion boundary

This is **schema and tenant-lineage preparation**, not a completed domain-data backfill and not a Production cutover. Normalized member, partner, programme, activity, task, document, supply-chain and finance domain tables remain empty until each data mapping is reviewed and reconciled. The legacy source maps remain `pending_transform`.

The next migration phase must:
1. Verify the legal display name and organization unit data with the group.
2. Map each legacy record field to the owning v14 table, retaining source IDs and timestamps.
3. Backfill one domain at a time on QA, comparing source and destination counts/checksums.
4. Verify privacy/consent, attachment ownership, tenant isolation and role scopes.
5. Rehearse rollback and only then request a separate Production go/no-go.

Do not re-run migrations 005–007. Do not drop or truncate legacy tables. Do not treat ToT as an agreement, grant, beneficiary enrollment or certification.
