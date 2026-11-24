import "server-only";

/**
 * Loads read-only data for public pages without turning a temporary source
 * outage into an unhandled HTTP 500. An unavailable result is kept distinct
 * from a successful query that returned an empty dataset.
 */
export type PublicDataResult<T> =
  | { data: T; unavailable: false }
  | { data: T; unavailable: true };

export async function loadPublicData<T>(
  area: string,
  load: () => Promise<T>,
  fallback: T,
): Promise<PublicDataResult<T>> {
  try {
    return { data: await load(), unavailable: false };
  } catch (reason) {
    const errorName = reason instanceof Error && reason.name ? reason.name : "UnknownError";
    // Deliberately omit the exception message and stack: database drivers may
    // include connection details or query context in those values.
    console.error(`[public-data:${area}] Source unavailable (${errorName}).`);
    return { data: fallback, unavailable: true };
  }
}
