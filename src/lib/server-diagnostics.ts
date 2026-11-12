type ErrorLike = {
  name?: unknown;
  code?: unknown;
  cause?: unknown;
};

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,47}$/.test(value)
    ? value
    : undefined;
}

function deepestCause(error: unknown): unknown {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") break;
    const cause = (current as ErrorLike).cause;
    if (!cause || cause === current) break;
    current = cause;
  }
  return current;
}

function classifyDatabaseError(fields: ErrorLike): string {
  const code = typeof fields.code === "string" ? fields.code : "";
  const message = typeof (fields as ErrorLike & { message?: unknown }).message === "string"
    ? String((fields as ErrorLike & { message?: unknown }).message).toLowerCase()
    : "";

  if (code === "42P01" || code === "42703" || /does not exist|undefined_table|undefined_column/.test(message)) {
    return "schema_object_missing";
  }
  if (code === "42501" || /permission denied|insufficient privilege/.test(message)) {
    return "database_permission_denied";
  }
  if (code.startsWith("28") || /password authentication failed|authentication failed|invalid authorization|role .* does not exist/.test(message)) {
    return "database_authentication_failed";
  }
  if (code.startsWith("08") || /connection refused|connection reset|connection timed out|timeout|timed out|econn|enotfound|fetch failed|socket|tls|server closed the connection/.test(message)) {
    return "database_connection_failed";
  }
  if (code === "53300" || /too many connections|remaining connection slots/.test(message)) {
    return "database_capacity_exceeded";
  }
  return "database_operation_failed";
}

/**
 * Log only allow-listed diagnostic metadata.
 * Never log messages, stack traces, SQL, bind values, identities, or secrets.
 */
export function logServerFailure(
  event: string,
  stage: string,
  error: unknown,
  requestId?: string | null,
) {
  const root = deepestCause(error);
  const fields = root && typeof root === "object"
    ? root as ErrorLike
    : {};

  const environment = process.env.VERCEL_ENV;
  console.error("[srikandi-server-failure]", {
    event: safeIdentifier(event) || "server_error",
    stage: safeIdentifier(stage) || "unknown",
    environment: environment === "production" || environment === "preview"
      ? environment
      : "development",
    requestId: safeIdentifier(requestId),
    errorName: safeIdentifier(fields.name) || "UnknownError",
    errorCategory: classifyDatabaseError(fields),
    ...(safeIdentifier(fields.code)
      ? { errorCode: safeIdentifier(fields.code) }
      : {}),
  });
}
