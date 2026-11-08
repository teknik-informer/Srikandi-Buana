import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
const REGION_API = "https://www.emsifa.com/api-wilayah-indonesia/v2";
const validCode = /^\d{2}(?:\.\d{2}){0,2}$/;

type RegionRow = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  postal_code?: unknown;
  province?: { id?: unknown };
  regency?: { id?: unknown };
  district?: { id?: unknown };
};

const levels = ["provinces", "regencies", "districts", "villages"] as const;
type Level = typeof levels[number];

function validParent(level: Level, parent: string) {
  if (level === "provinces") return !parent;
  if (!validCode.test(parent)) return false;
  const segments = parent.split(".").length;
  return level === "regencies" ? segments === 1 : level === "districts" ? segments === 2 : segments === 3;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const level = params.get("level") || "provinces";
  const parent = params.get("parent") || "";
  if (!levels.includes(level as Level)) {
    return Response.json({ error: "Tingkat wilayah tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const selectedLevel = level as Level;
  if (!validParent(selectedLevel, parent)) {
    return Response.json({ error: selectedLevel === "provinces" ? "Parameter wilayah tidak valid." : "Pilih wilayah induk terlebih dahulu." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const endpoint = selectedLevel === "provinces"
    ? new URL(REGION_API + "/provinces.json")
    : new URL(REGION_API + "/" + selectedLevel + "/" + parent + ".json");

  try {
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error("Penyedia data wilayah merespons " + upstream.status + ".");
    const payload = await upstream.json() as { data?: RegionRow[]; meta?: { updated_at?: string; generated_at?: string } };
    if (!Array.isArray(payload.data)) throw new Error("Format daftar wilayah tidak sesuai.");
    const data = payload.data
      .filter((item) => {
        const id = typeof item.id === "string" ? item.id : typeof item.code === "string" ? item.code : "";
        return Boolean(id && typeof item.name === "string");
      })
      .map((item) => ({
        code: String(item.id ?? item.code),
        name: String(item.name),
        postalCode: typeof item.postal_code === "string" ? item.postal_code : "",
      }));
    return Response.json(
      { data, meta: { source: "EMSIFA · Kepmendagri 2025 / BIG", updatedAt: payload.meta?.updated_at || payload.meta?.generated_at || "" } },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return Response.json(
      { error: "Daftar wilayah belum dapat dimuat. Anda tetap dapat mengisi alamat secara manual." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
