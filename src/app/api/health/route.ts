const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const dynamic = "force-dynamic";

/** Process liveness only; does not expose configuration or database details. */
export async function GET() {
  return Response.json({ status: "ok" }, { headers });
}
