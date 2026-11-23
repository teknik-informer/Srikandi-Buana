import "server-only";
import { neon } from "@neondatabase/serverless";

type V9Sql = ReturnType<typeof neon>;

type V9Global = typeof globalThis & {
  __srikandiV9Sql?: V9Sql;
};

/**
 * Server-only connection for the V9 application schema.
 * It intentionally uses a dedicated env name so an old DATABASE_URL cannot
 * accidentally point this generation at the legacy application database.
 */
export function getV9Sql(): V9Sql {
  const connectionString = process.env.V9_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("V9_DATABASE_URL is not configured.");
  }

  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    throw new Error("V9_DATABASE_URL must be a PostgreSQL connection URL.");
  }

  const globalForV9 = globalThis as V9Global;
  if (!globalForV9.__srikandiV9Sql) {
    globalForV9.__srikandiV9Sql = neon(connectionString);
  }

  return globalForV9.__srikandiV9Sql;
}
