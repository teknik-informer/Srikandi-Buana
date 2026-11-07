import { env } from "@/lib/runtime";

const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const dynamic = "force-dynamic";

/** Database readiness check; returns no connection strings or provider errors. */
export async function GET() {
  if (!env.DB) {
    return Response.json({ status: "not_ready" }, { status: 503, headers });
  }

  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    return Response.json({ status: "ready", database: "ok" }, { headers });
  } catch {
    return Response.json({ status: "not_ready" }, { status: 503, headers });
  }
}
