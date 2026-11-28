import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/session";
import { getV9LoginSql, getV9Sql, rowsFromResult } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RuntimeContextProbe {
  current_user: string;
  session_user: string;
  database_name: string;
  neon_branch_id: string | null;
  login_email: string;
  login_subject_hash: string;
  login_ip_hash: string;
  session_context_empty: boolean;
}

interface RuntimeDatabaseRow {
  current_user: string;
  session_user: string;
  database_name: string;
  server_version: string;
  neon_branch_id: string | null;
  neon_endpoint_id: string | null;
  is_superuser: boolean;
  bypasses_rls: boolean;
  can_create_role: boolean;
  can_create_database: boolean;
  owns_tenant_tables: boolean;
  member_of_owner_role: boolean;
  can_set_owner_role: boolean;
  can_create_in_schema: boolean;
  can_create_database_objects: boolean;
}

/**
 * Preview-only, platform-admin diagnostics. Never returns a connection URL,
 * hostname, password, cookie, token, organization data, or table contents.
 */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const identity = await getIdentity();
  if (!identity || !["platform_admin", "organization_admin", "chair"].includes(identity.roleKey)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const sql = getV9Sql();

    // Exercise the actual Neon HTTP transaction wrapper with two concurrent,
    // synthetic pre-auth contexts. Only a boolean is returned; test values are
    // deterministic invalid-domain data and are never logged or persisted.
    const probeA = getV9LoginSql({
      email: "tenant-context-a@invalid.example",
      subjectHash: "a".repeat(64),
      ipHash: "1".repeat(64),
    });
    const probeB = getV9LoginSql({
      email: "tenant-context-b@invalid.example",
      subjectHash: "b".repeat(64),
      ipHash: "2".repeat(64),
    });
    const [contextAResult, contextBResult, sessionContextResult] = await Promise.all([
      probeA`
        SELECT current_user::text AS current_user,
          session_user::text AS session_user,
          current_database()::text AS database_name,
          NULLIF(current_setting('neon.branch_id', true), '') AS neon_branch_id,
          current_setting('v9.login_email', true) AS login_email,
          current_setting('v9.login_subject_hash', true) AS login_subject_hash,
          current_setting('v9.login_ip_hash', true) AS login_ip_hash,
          NULLIF(current_setting('v9.session_token_hash', true), '') IS NULL AS session_context_empty
      `,
      probeB`
        SELECT current_user::text AS current_user,
          current_database()::text AS database_name,
          NULLIF(current_setting('neon.branch_id', true), '') AS neon_branch_id,
          current_setting('v9.login_email', true) AS login_email,
          current_setting('v9.login_subject_hash', true) AS login_subject_hash,
          current_setting('v9.login_ip_hash', true) AS login_ip_hash,
          NULLIF(current_setting('v9.session_token_hash', true), '') IS NULL AS session_context_empty
      `,
      sql`
        SELECT NULLIF(current_setting('v9.session_token_hash', true), '') IS NOT NULL
          AS session_context_present
      `,
    ]);
    const contextA = rowsFromResult<RuntimeContextProbe>(contextAResult)[0];
    const contextB = rowsFromResult<RuntimeContextProbe>(contextBResult)[0];
    const sessionContext = rowsFromResult<{ session_context_present: boolean }>(sessionContextResult)[0];
    const concurrencyProbePassed = Boolean(
      contextA &&
      contextB &&
      contextA.current_user === contextB.current_user &&
      contextA.current_user === "v9_app" &&
      contextA.session_user === contextB.session_user &&
      contextA.session_user === "v9_app" &&
      contextA.database_name === contextB.database_name &&
      contextA.neon_branch_id === contextB.neon_branch_id &&
      contextA.login_email === "tenant-context-a@invalid.example" &&
      contextB.login_email === "tenant-context-b@invalid.example" &&
      contextA.login_subject_hash === "a".repeat(64) &&
      contextB.login_subject_hash === "b".repeat(64) &&
      contextA.login_ip_hash === "1".repeat(64) &&
      contextB.login_ip_hash === "2".repeat(64) &&
      contextA.session_context_empty === true &&
      contextB.session_context_empty === true
    );

    const result = await sql`
      SELECT
        current_user::text AS current_user,
        session_user::text AS session_user,
        current_database()::text AS database_name,
        current_setting('server_version')::text AS server_version,
        NULLIF(current_setting('neon.branch_id', true), '') AS neon_branch_id,
        NULLIF(current_setting('neon.endpoint_id', true), '') AS neon_endpoint_id,
        role.rolsuper AS is_superuser,
        role.rolbypassrls AS bypasses_rls,
        role.rolcreaterole AS can_create_role,
        role.rolcreatedb AS can_create_database,
        EXISTS (
          SELECT 1
          FROM pg_class AS relation
          INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'v9'
            AND relation.relkind IN ('r', 'p')
            AND relation.relowner = role.oid
        ) AS owns_tenant_tables,
        pg_has_role(current_user, 'neondb_owner', 'MEMBER') AS member_of_owner_role,
        pg_has_role(current_user, 'neondb_owner', 'SET') AS can_set_owner_role,
        has_schema_privilege(current_user, 'v9', 'CREATE') AS can_create_in_schema,
        has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_database_objects
      FROM pg_roles AS role
      WHERE role.rolname = current_user
      LIMIT 1
    `;

    const row = rowsFromResult<RuntimeDatabaseRow>(result)[0];
    if (!row) throw new Error("Database runtime identity was not returned.");

    return NextResponse.json(
      {
        environment: "preview",
        runtime: row,
        concurrency: {
          transactionContextIsolation: concurrencyProbePassed,
          sessionContextPresent: sessionContext?.session_context_present === true,
        },
        safeForTenantUat:
          concurrencyProbePassed &&
          sessionContext?.session_context_present === true &&
          row.current_user === "v9_app" &&
          row.session_user === "v9_app" &&
          row.neon_branch_id === "br-snowy-forest-b46i5pqx" &&
          !row.is_superuser &&
          !row.bypasses_rls &&
          !row.can_create_role &&
          !row.can_create_database &&
          !row.owns_tenant_tables &&
          !row.member_of_owner_role &&
          !row.can_set_owner_role &&
          !row.can_create_in_schema &&
          !row.can_create_database_objects,
      },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    const errorType =
      error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)
        ? error.name
        : "UnknownError";
    console.error("[tenant-diagnostics] Runtime probe failed", errorType);
    return NextResponse.json(
      { error: "Pemeriksaan identitas database QA tidak tersedia." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
