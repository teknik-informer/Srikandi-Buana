# Migration 0045 — QA Preflight, Apply, Verification and Rollback Runbook

Status: **Applied to live Neon QA on 28 Nov 2026; postflight passed**  
Change: `db/migrations/0045_tenant_scope_field_application_identity.sql`  
Migration ledger key: `0045_tenant_scope_field_application_identity.sql`  
Expected checksum: `sha256:v9-tenant-scoped-field-application-identity-route-20261128`

## 1. Scope and intended schema

This migration makes the fixed field-module identity tenant-scoped. It changes only `v9.field_applications`:

| Constraint | Before | After |
|---|---|---|
| Primary key | `PRIMARY KEY (field_key)` | `PRIMARY KEY (organization_id, field_key)` |
| Operational FK support | `UNIQUE (field_key, organization_id)` | Preserved unchanged |
| Route uniqueness | `UNIQUE (route)` | `UNIQUE (organization_id, route)` |

The migration removes the global uniqueness assumptions. It does **not** change RLS policies, organization assignments, application roles, table ownership, grants, or application records. It is not a substitute for tenant RLS.

All 17 currently observed incoming foreign keys reference the composite pair `(field_key, organization_id)`. The migration must abort if a single-column foreign key to `field_key` is present.

## 2. Exact QA baseline before migration — read-only evidence, 28 Nov 2026

Target branch (must be re-confirmed immediately before any write):

- Neon project: `holy-night-99324539`
- Branch name: `phase1-integration-rehearsal-20261116`
- Branch ID: `br-snowy-forest-b46i5pqx`
- Parent branch ID: `br-mute-meadow-b4rhx1mn`
- Branch state: `ready`
- `default = false`, `primary = false`
- Database: `neondb`
- PostgreSQL: `18.7`

Pre-migration catalog results (historical baseline immediately before the approved change):

- Primary key at preflight: `PRIMARY KEY (field_key)`.
- Route constraint at preflight: `UNIQUE (route)`. 
- Required operational unique constraint: `UNIQUE (field_key, organization_id)` is present.
- Incoming FKs: 17; all reference `(field_key, organization_id)`; zero single-column references to `field_key`.
- `field_applications`: 4 rows across 1 organization.
- `organization_id`, `field_key`, and `route` have zero NULL values.
- No duplicate `(organization_id, field_key)` or `(organization_id, route)` groups.
- No ledger row existed for migration 0045.

These results describe the pre-migration state only. The current applied state and postflight evidence are recorded in Section 8 below.

## 3. Mandatory preflight gates

Run all checks against the exact QA branch above, using a migration-capable owner connection, never the application runtime role `v9_app`. Do not place connection strings, passwords, session tokens, or PII in commands, logs, or artifacts.

1. Confirm the Neon project, branch ID, branch name, parent, and database from branch metadata. Stop if the branch is default/primary, not ready, or does not match the approved QA target.
2. Confirm the connection resolves to database `neondb` and PostgreSQL 18.7. Record `current_user` and `session_user`; do not infer the runtime identity from the migration identity.
3. Re-read the primary key, unique constraints, incoming foreign keys, row counts, NULLs, and duplicate checks listed above.
4. Confirm the migration ledger either has no 0045 row, or has the exact expected checksum and the post-migration schema. A different checksum is a hard stop.
5. Confirm application Preview remains pinned to the QA branch and Production's database target remains separate. Do not decrypt or print environment secrets.
6. Prefer a current recovery point/restore path for the QA branch and confirm the maintenance window allows an ACCESS EXCLUSIVE lock on `v9.field_applications`. If Neon branch/snapshot quotas prevent a backup branch, do not delete unrelated branches; reassess whether the migration can safely proceed as one atomic transaction and explicitly record the limitation.

The following assertion block is a useful pre-migration check. Execute it read-only before the approved change:

```sql
DO $preflight$
DECLARE
  pk_definition text;
  route_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO pk_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_pkey'
    AND contype = 'p';

  SELECT pg_get_constraintdef(oid)
    INTO route_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_route_key'
    AND contype = 'u';

  IF pk_definition IS DISTINCT FROM 'PRIMARY KEY (field_key)' THEN
    RAISE EXCEPTION 'Unexpected pre-migration primary key: %', pk_definition;
  END IF;

  IF route_definition IS DISTINCT FROM 'UNIQUE (route)' THEN
    RAISE EXCEPTION 'Unexpected pre-migration route constraint: %', route_definition;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'v9.field_applications'::regclass
      AND conname = 'field_applications_key_org_uq'
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (field_key, organization_id)'
  ) THEN
    RAISE EXCEPTION 'Required composite UNIQUE(field_key, organization_id) is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'v9.field_applications'::regclass
      AND array_length(confkey, 1) = 1
      AND confkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'v9.field_applications'::regclass
          AND attname = 'field_key' AND NOT attisdropped
      )
  ) THEN
    RAISE EXCEPTION 'A single-column FK still references field_applications.field_key.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.field_applications
    WHERE organization_id IS NULL OR field_key IS NULL OR route IS NULL
  ) THEN
    RAISE EXCEPTION 'Tenant identity or route contains NULL values.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.field_applications
    GROUP BY organization_id, field_key HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM v9.field_applications
    GROUP BY organization_id, route HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Tenant-scoped field identity or route has duplicate rows.';
  END IF;
END
$preflight$;
```

## 4. Apply procedure — completed after explicit approval on 28 Nov 2026

The migration is transactional and is already designed to be idempotent for the expected old or new constraint state. Apply the exact committed file; do not paste a retyped approximation.

Recommended operator sequence:

1. Reconfirm the exact target branch and preflight immediately before applying.
2. Use a migration connection for `br-snowy-forest-b46i5pqx`, database `neondb`.
3. The exact committed migration logic was executed on the target as one Neon SQL transaction: the complete `DO $field_application_key$ ... $field_application_key# Migration 0045 — QA Preflight, Apply, Verification and Rollback Runbook

Status: **Applied to live Neon QA on 28 Nov 2026; postflight passed**  
Change: `db/migrations/0045_tenant_scope_field_application_identity.sql`  
Migration ledger key: `0045_tenant_scope_field_application_identity.sql`  
Expected checksum: `sha256:v9-tenant-scoped-field-application-identity-route-20261128`

## 1. Scope and intended schema

This migration makes the fixed field-module identity tenant-scoped. It changes only `v9.field_applications`:

| Constraint | Before | After |
|---|---|---|
| Primary key | `PRIMARY KEY (field_key)` | `PRIMARY KEY (organization_id, field_key)` |
| Operational FK support | `UNIQUE (field_key, organization_id)` | Preserved unchanged |
| Route uniqueness | `UNIQUE (route)` | `UNIQUE (organization_id, route)` |

The migration removes the global uniqueness assumptions. It does **not** change RLS policies, organization assignments, application roles, table ownership, grants, or application records. It is not a substitute for tenant RLS.

All 17 currently observed incoming foreign keys reference the composite pair `(field_key, organization_id)`. The migration must abort if a single-column foreign key to `field_key` is present.

## 2. Exact QA baseline before migration — read-only evidence, 28 Nov 2026

Target branch (must be re-confirmed immediately before any write):

- Neon project: `holy-night-99324539`
- Branch name: `phase1-integration-rehearsal-20261116`
- Branch ID: `br-snowy-forest-b46i5pqx`
- Parent branch ID: `br-mute-meadow-b4rhx1mn`
- Branch state: `ready`
- `default = false`, `primary = false`
- Database: `neondb`
- PostgreSQL: `18.7`

Pre-migration catalog results (historical baseline immediately before the approved change):

- Primary key at preflight: `PRIMARY KEY (field_key)`.
- Route constraint at preflight: `UNIQUE (route)`. 
- Required operational unique constraint: `UNIQUE (field_key, organization_id)` is present.
- Incoming FKs: 17; all reference `(field_key, organization_id)`; zero single-column references to `field_key`.
- `field_applications`: 4 rows across 1 organization.
- `organization_id`, `field_key`, and `route` have zero NULL values.
- No duplicate `(organization_id, field_key)` or `(organization_id, route)` groups.
- No ledger row existed for migration 0045.

These results describe the pre-migration state only. The current applied state and postflight evidence are recorded in Section 8 below.

## 3. Mandatory preflight gates

Run all checks against the exact QA branch above, using a migration-capable owner connection, never the application runtime role `v9_app`. Do not place connection strings, passwords, session tokens, or PII in commands, logs, or artifacts.

1. Confirm the Neon project, branch ID, branch name, parent, and database from branch metadata. Stop if the branch is default/primary, not ready, or does not match the approved QA target.
2. Confirm the connection resolves to database `neondb` and PostgreSQL 18.7. Record `current_user` and `session_user`; do not infer the runtime identity from the migration identity.
3. Re-read the primary key, unique constraints, incoming foreign keys, row counts, NULLs, and duplicate checks listed above.
4. Confirm the migration ledger either has no 0045 row, or has the exact expected checksum and the post-migration schema. A different checksum is a hard stop.
5. Confirm application Preview remains pinned to the QA branch and Production's database target remains separate. Do not decrypt or print environment secrets.
6. Prefer a current recovery point/restore path for the QA branch and confirm the maintenance window allows an ACCESS EXCLUSIVE lock on `v9.field_applications`. If Neon branch/snapshot quotas prevent a backup branch, do not delete unrelated branches; reassess whether the migration can safely proceed as one atomic transaction and explicitly record the limitation.

The following assertion block is a useful pre-migration check. Execute it read-only before the approved change:

```sql
DO $preflight$
DECLARE
  pk_definition text;
  route_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO pk_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_pkey'
    AND contype = 'p';

  SELECT pg_get_constraintdef(oid)
    INTO route_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_route_key'
    AND contype = 'u';

  IF pk_definition IS DISTINCT FROM 'PRIMARY KEY (field_key)' THEN
    RAISE EXCEPTION 'Unexpected pre-migration primary key: %', pk_definition;
  END IF;

  IF route_definition IS DISTINCT FROM 'UNIQUE (route)' THEN
    RAISE EXCEPTION 'Unexpected pre-migration route constraint: %', route_definition;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'v9.field_applications'::regclass
      AND conname = 'field_applications_key_org_uq'
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (field_key, organization_id)'
  ) THEN
    RAISE EXCEPTION 'Required composite UNIQUE(field_key, organization_id) is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'v9.field_applications'::regclass
      AND array_length(confkey, 1) = 1
      AND confkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'v9.field_applications'::regclass
          AND attname = 'field_key' AND NOT attisdropped
      )
  ) THEN
    RAISE EXCEPTION 'A single-column FK still references field_applications.field_key.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.field_applications
    WHERE organization_id IS NULL OR field_key IS NULL OR route IS NULL
  ) THEN
    RAISE EXCEPTION 'Tenant identity or route contains NULL values.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.field_applications
    GROUP BY organization_id, field_key HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM v9.field_applications
    GROUP BY organization_id, route HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Tenant-scoped field identity or route has duplicate rows.';
  END IF;
END
$preflight$;
```

## 4. Apply procedure — completed after explicit approval on 28 Nov 2026

The migration is transactional and is already designed to be idempotent for the expected old or new constraint state. Apply the exact committed file; do not paste a retyped approximation.

Recommended operator sequence:

1. Reconfirm the exact target branch and preflight immediately before applying.
2. Use a migration connection for `br-snowy-forest-b46i5pqx`, database `neondb`.
 block and the migration-ledger upsert ran inside the same transaction wrapper. The SQL body and checksum match the committed migration file. Both statements completed successfully.
4. If the migration reports an unexpected constraint, missing composite key, dependent single-column FK, lock timeout, or any other error, stop. The transaction must roll back; do not force or manually drop dependent objects.
5. Do not run the migration against Production, the default branch, or any other branch.

The postflight has verified the new constraints. Application code that assumes tenant-scoped duplicate field keys/routes must still be tested on Preview before broader release. Production remains outside this migration.

## 5. Post-migration verification

Run these read-only checks on the same branch after commit:

```sql
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'v9.field_applications'::regclass
  AND conname IN (
    'field_applications_pkey',
    'field_applications_key_org_uq',
    'field_applications_route_key',
    'field_applications_organization_id_route_key'
  )
ORDER BY conname;

SELECT name, checksum, applied_at
FROM v9.schema_migrations
WHERE name = '0045_tenant_scope_field_application_identity.sql';

SELECT count(*) AS incoming_fk_count,
       count(*) FILTER (
         WHERE array_length(confkey, 1) = 1
           AND confkey[1] = (
             SELECT attnum FROM pg_attribute
             WHERE attrelid = 'v9.field_applications'::regclass
               AND attname = 'field_key' AND NOT attisdropped
           )
       ) AS single_column_field_key_fk_count
FROM pg_constraint
WHERE contype = 'f'
  AND confrelid = 'v9.field_applications'::regclass;

SELECT organization_id, field_key, count(*)
FROM v9.field_applications
GROUP BY organization_id, field_key
HAVING count(*) > 1;

SELECT organization_id, route, count(*)
FROM v9.field_applications
GROUP BY organization_id, route
HAVING count(*) > 1;
```

Acceptance conditions:

- Primary key is exactly `PRIMARY KEY (organization_id, field_key)`.
- Operational unique constraint `UNIQUE (field_key, organization_id)` remains present.
- Route constraint is exactly `UNIQUE (organization_id, route)`; the global `UNIQUE (route)` is absent.
- Migration ledger contains exactly the expected filename and checksum.
- All 17 incoming FKs remain composite; single-column FK count is zero.
- Both duplicate queries return zero rows.
- PostgreSQL 16 CI remains green, including the two-tenant fixture that inserts the same fixed field key and route for two organizations.

A successful catalog check alone does not close Issue #90. Application Preview regression, tenant RLS, finance/stock side effects, and independent security review remain separate gates.

## 6. Rollback conditions and SQL

Rollback is only safe before the application has provisioned duplicate `field_key` or `route` values across different organizations. The old global constraints cannot be restored while such duplicates exist.

Before rollback:

- Stop writes/provisioning to `field_applications`.
- Revert any application code that requires tenant-duplicate field identities/routes.
- Reconfirm the exact QA branch and take/verify a recovery point.
- Acquire the table lock in the rollback transaction.
- If either duplicate check below returns a row, **abort rollback**. Do not delete, merge, or rewrite tenant records to make the constraint fit.

Use this rollback only if migration 0045 is recorded with the expected checksum:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE v9.field_applications IN ACCESS EXCLUSIVE MODE;

DO $rollback$
DECLARE
  pk_definition text;
  route_tenant_definition text;
  migration_checksum text;
BEGIN
  SELECT checksum INTO migration_checksum
  FROM v9.schema_migrations
  WHERE name = '0045_tenant_scope_field_application_identity.sql';

  IF migration_checksum IS DISTINCT FROM
    'sha256:v9-tenant-scoped-field-application-identity-route-20261128'
  THEN
    RAISE EXCEPTION 'Expected 0045 checksum is absent or different; refusing rollback.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.field_applications
    GROUP BY field_key HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: field_key is duplicated across organizations.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM v9.field_applications
    GROUP BY route HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: route is duplicated across organizations.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'v9.field_applications'::regclass
      AND array_length(confkey, 1) = 1
      AND confkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'v9.field_applications'::regclass
          AND attname = 'field_key' AND NOT attisdropped
      )
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: an unexpected single-column field_key FK exists.';
  END IF;

  SELECT pg_get_constraintdef(oid)
    INTO pk_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_pkey'
    AND contype = 'p';

  IF pk_definition = 'PRIMARY KEY (organization_id, field_key)' THEN
    ALTER TABLE v9.field_applications
      DROP CONSTRAINT field_applications_pkey;
    ALTER TABLE v9.field_applications
      ADD CONSTRAINT field_applications_pkey PRIMARY KEY (field_key);
  ELSIF pk_definition IS DISTINCT FROM 'PRIMARY KEY (field_key)' THEN
    RAISE EXCEPTION 'Unexpected primary key during rollback: %', pk_definition;
  END IF;

  SELECT pg_get_constraintdef(oid)
    INTO route_tenant_definition
  FROM pg_constraint
  WHERE conrelid = 'v9.field_applications'::regclass
    AND conname = 'field_applications_organization_id_route_key'
    AND contype = 'u';

  IF route_tenant_definition = 'UNIQUE (organization_id, route)' THEN
    ALTER TABLE v9.field_applications
      DROP CONSTRAINT field_applications_organization_id_route_key;
  ELSIF route_tenant_definition IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected tenant route constraint during rollback: %',
      route_tenant_definition;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'v9.field_applications'::regclass
      AND conname = 'field_applications_route_key'
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (route)'
  ) THEN
    ALTER TABLE v9.field_applications
      ADD CONSTRAINT field_applications_route_key UNIQUE (route);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'v9.field_applications'::regclass
      AND conname = 'field_applications_key_org_uq'
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (field_key, organization_id)'
  ) THEN
    RAISE EXCEPTION 'Required composite FK-supporting unique constraint is missing.';
  END IF;
END
$rollback$;

DELETE FROM v9.schema_migrations
WHERE name = '0045_tenant_scope_field_application_identity.sql'
  AND checksum = 'sha256:v9-tenant-scoped-field-application-identity-route-20261128';

COMMIT;
```

If any statement fails, the transaction must roll back in full. Re-run the pre-migration catalog verification afterward. Keep the composite `UNIQUE (field_key, organization_id)` constraint: the 17 operational foreign keys depend on it.

## 7. Release and recovery boundaries

- QA only. Migration 0045 has been applied only to `br-snowy-forest-b46i5pqx`. No Production migration, deployment, environment-variable change, role/grant change, table-owner change, RLS change, or business-data mutation was performed.
- Keep PR #92 Draft / unmerged and Issue #90 open until all tenant-isolation acceptance gates have evidence.
- Record exact branch ID, migration checksum, operator, timestamp, execution result, postflight output, and CI run in the release record. Exclude secrets and personal data.
- If a future migration or postflight fails, stop application rollout, retain the branch for investigation, and do not attempt an improvised repair.
- A successful migration does not authorize external government/NGO/partner data sharing.


## 8. Live QA execution record — 28 Nov 2026

**Approval:** The user explicitly approved continuing with migration 0045 on the exact QA branch and database named in the preceding conversation. This record is limited to this migration and this branch.

**Target verified immediately before applying:**

- Project: `holy-night-99324539`
- Branch: `phase1-integration-rehearsal-20261116`
- Branch ID: `br-snowy-forest-b46i5pqx`
- Parent: `br-mute-meadow-b4rhx1mn`
- Branch state: `ready`; `default=false`; `primary=false`
- Database: `neondb`
- PostgreSQL: `18.7 (3190d2f)`
- Migration role: `neondb_owner` (migration-only connection); application runtime identity was not changed.

**Preflight immediately before execution:**

- Existing PK was `PRIMARY KEY (field_key)`; global route key was `UNIQUE (route)`.
- The preserved operational unique constraint `UNIQUE (field_key, organization_id)` was present.
- There were 17 incoming FKs and zero single-column FKs to `field_key`.
- Four field-application rows existed across one organization; zero identity/route NULLs; no duplicate tenant-scoped key or route pairs.
- No 0045 migration-ledger row existed.

**Recovery-point limitation, recorded explicitly:**

- Neon rejected `create_snapshot` because the QA target is a non-root branch.
- Neon also rejected creation of a child backup branch because the project branch limit was exceeded.
- No unrelated branch was deleted, and no existing branch was altered to make room.
- The operator proceeded only because migration 0045 is transactional, its full preflight passed, and it modifies constraints plus the migration ledger without rewriting application rows. Both migration statements were run in one transaction, so any exception would roll back the complete operation. This is not a claim that a branch snapshot existed.

**Execution:**

- Applied `db/migrations/0045_tenant_scope_field_application_identity.sql` to the exact QA branch above.
- Executed the complete migration DO block and the exact migration-ledger upsert in one Neon transaction.
- Transaction result: both statements completed; no SQL error.
- Ledger `applied_at`: `2026-11-28T12:11:26.112Z`.
- Ledger checksum: `sha256:v9-tenant-scoped-field-application-identity-route-20261128`.

**Postflight results:**

| Check | Result |
|---|---|
| Primary key | `PRIMARY KEY (organization_id, field_key)` |
| Operational unique | `UNIQUE (field_key, organization_id)` preserved |
| Route uniqueness | `UNIQUE (organization_id, route)` |
| Old global `UNIQUE (route)` | Absent |
| Migration ledger | Exact filename and checksum present |
| Incoming foreign keys | 17 |
| Single-column FK to `field_key` | 0 |
| NULL tenant identity / route rows | 0 |
| Duplicate `(organization_id, field_key)` groups | 0 |
| Duplicate `(organization_id, route)` groups | 0 |
| Field-application row count | 4 (unchanged) |
| RLS | Enabled and FORCE RLS remains true |
| Existing RLS policy | `field_applications_read_scope` unchanged and present |

The four existing rows and their routes remained intact (`organisasi`, `pelatihan`, `pertanian`, `usaha`). No business row was inserted, updated, or deleted by this migration.

**Boundaries:** Only Neon QA migration 0045 was applied. Migrations 0046 and 0047 remain unapplied on live QA. Production database, Vercel environment variables, Production deployment, roles/grants, table ownership, RLS policy definitions, and business data were not changed. PR #92 remains Draft/Open/Unmerged; Issue #90 remains Open pending remaining Preview UAT and security gates.
