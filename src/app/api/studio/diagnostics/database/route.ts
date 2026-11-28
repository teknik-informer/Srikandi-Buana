import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        ) AS owns_tenant_tables
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
        safeForTenantUat:
          row.current_user !== "neondb_owner" &&
          row.session_user !== "neondb_owner" &&
          !row.is_superuser &&
          !row.bypasses_rls &&
          !row.can_create_role &&
          !row.can_create_database &&
          !row.owns_tenant_tables &&
          !!row.neon_branch_id,
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
