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
    ...(safeIdentifier(fields.code)
      ? { errorCode: safeIdentifier(fields.code) }
      : {}),
  });
}
