import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
const REGION_API = "https://wilayah-id-api.dhanypedia.com/api/v1/regions";
const validCode = /^[0-9.]{2,16}$/;

type RegionRow = { code?: unknown; name?: unknown; parent_code?: unknown; parentCode?: unknown };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const level = params.get("level") || "provinces";
  const parent = params.get("parent") || "";
  const search = (params.get("search") || "").trim().slice(0, 80);
  if (!["provinces", "regencies", "districts", "villages"].includes(level)) {
    return Response.json({ error: "Tingkat wilayah tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (level !== "provinces" && (!validCode.test(parent) || parent.includes(".."))) {
    return Response.json({ error: "Pilih wilayah induk terlebih dahulu." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const parentParam = level === "regencies" ? "province_code" : level === "districts" ? "regency_code" : "district_code";
  const endpoint = new URL(REGION_API + "/" + level);
  endpoint.searchParams.set("limit", "1000");
  if (level !== "provinces") endpoint.searchParams.set(parentParam, parent);
  if (search) endpoint.searchParams.set("q", search);
  try {
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new Error("Penyedia data wilayah merespons " + upstream.status + ".");
    const payload = await upstream.json() as { data?: RegionRow[]; meta?: { snapshot?: string; source?: string } };
    if (!Array.isArray(payload.data)) throw new Error("Format daftar wilayah tidak sesuai.");
    const data = payload.data
      .filter((item) => typeof item.code === "string" && typeof item.name === "string")
      .map((item) => ({
        code: String(item.code),
        name: String(item.name),
        parentCode: typeof item.parent_code === "string" ? item.parent_code : typeof item.parentCode === "string" ? item.parentCode : "",
      }));
    return Response.json(
      { data, meta: { source: "Kepmendagri 2025 / Wilayah ID", snapshot: payload.meta?.snapshot || "2025" } },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return Response.json(
      { error: "Daftar wilayah belum dapat dimuat. Anda tetap dapat mengisi alamat secara manual." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
