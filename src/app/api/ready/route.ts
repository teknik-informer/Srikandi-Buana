import { env } from "@/lib/runtime";
import { logServerFailure } from "@/lib/server-diagnostics";

const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const dynamic = "force-dynamic";

/**
 * Confirms both database connectivity and the schema contract required by
 * internal/external sign-in. This deliberately reveals no schema detail.
 */
const authSchemaQuery = `
  WITH required(table_name, column_name) AS (
    VALUES
      ('users','id'),('users','email'),('users','password_hash'),('users','full_name'),
      ('users','enabled'),('users','created'),('users','role'),('users','workspace_owner'),
      ('sessions','token_hash'),('sessions','user_id'),('sessions','expires'),('sessions','created'),
      ('rate_limits','key'),('rate_limits','window_start'),('rate_limits','attempts'),
      ('external_portal_accounts','id'),('external_portal_accounts','workspace_owner'),
      ('external_portal_accounts','organization_id'),('external_portal_accounts','email'),
      ('external_portal_accounts','full_name'),('external_portal_accounts','password_hash'),
      ('external_portal_accounts','status'),('external_portal_accounts','last_login_at'),
      ('external_portal_accounts','updated_at'),
      ('external_organizations','id'),('external_organizations','workspace_owner'),
      ('external_organizations','organization_type'),('external_organizations','verification_status'),
      ('external_access_grants','id'),('external_access_grants','workspace_owner'),
      ('external_access_grants','account_id'),('external_access_grants','audience'),
      ('external_access_grants','status'),('external_access_grants','valid_from'),
      ('external_access_grants','valid_until'),
      ('external_access_grant_scopes','workspace_owner'),('external_access_grant_scopes','grant_id'),
      ('external_access_grant_scopes','permission'),
      ('external_portal_sessions','token_hash'),('external_portal_sessions','account_id'),
      ('external_portal_sessions','expires_at'),('external_portal_sessions','created_at')
  ), coverage AS (
    SELECT COUNT(*) AS required_columns, COUNT(c.column_name) AS available_columns
    FROM required r
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
      AND c.table_name = r.table_name
      AND c.column_name = r.column_name
  )
  SELECT
    required_columns::int AS required_columns,
    available_columns::int AS available_columns,
    (required_columns = available_columns) AS ready
  FROM coverage
`;

export async function GET(request: Request) {
  try {
    const database = env.DB;
    if (!database) {
      return Response.json(
        { status: "not_ready", database: "not_ready" },
        { status: 503, headers },
      );
    }

    const schema = await database.prepare(authSchemaQuery).first();
    if (!schema?.ready) {
      const error = Object.assign(
        new Error("Required authentication schema is incomplete."),
        { code: "SCHEMA_MISMATCH" },
      );
      logServerFailure(
        "database_readiness_failed",
        "schema_contract",
        error,
        request.headers.get("x-vercel-id"),
      );
      return Response.json(
        { status: "not_ready", database: "not_ready" },
        { status: 503, headers },
      );
    }

    return Response.json({ status: "ready", database: "ok" }, { headers });
  } catch (error) {
    logServerFailure(
      "database_readiness_failed",
      "database_probe",
      error,
      request.headers.get("x-vercel-id"),
    );
    return Response.json(
      { status: "not_ready", database: "not_ready" },
      { status: 503, headers },
    );
  }
}
