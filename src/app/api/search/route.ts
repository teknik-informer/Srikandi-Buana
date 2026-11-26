import { getIdentity } from "@/lib/session";
import { searchOperationalRecords } from "@/lib/operational-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return Response.json({ error: "Sesi masuk diperlukan." }, { status: 401, headers });
    }

    const raw = new URL(request.url).searchParams.get("q") ?? "";
    const term = raw.trim().replace(/\s+/g, " ").slice(0, 80);
    if (term.length < 2) return Response.json({ groups: [] }, { headers });

    const groups = await searchOperationalRecords(identity, term);
    return Response.json({ groups }, { headers });
  } catch (error) {
    const errorType =
      error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)
        ? error.name
        : "UnknownError";
    console.warn("[search] Operational index unavailable", errorType);
    return Response.json(
      { error: "Pencarian data belum tersedia. Menu aplikasi tetap dapat digunakan." },
      { status: 503, headers },
    );
  }
}
