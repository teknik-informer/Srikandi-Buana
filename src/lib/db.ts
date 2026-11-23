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

/** Normalize Neon HTTP query output to a row array without trusting its shape. */
export function rowsFromResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }

  return [];
}
