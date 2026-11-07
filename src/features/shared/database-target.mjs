/**
 * Resolve the database connection for the active deployment environment.
 *
 * Preview deployments must never fall back to the Production DATABASE_URL.
 * Configure PREVIEW_DATABASE_URL only after a dedicated, sanitized staging
 * database has been prepared.
 */
export function databaseUrlForEnvironment(env = process.env) {
  const key = env.VERCEL_ENV === "preview" ? "PREVIEW_DATABASE_URL" : "DATABASE_URL";
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
