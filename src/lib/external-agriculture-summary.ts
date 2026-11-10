import "server-only";
import { env } from "@/lib/runtime";
import { canExternalRead, type ExternalPrincipal } from "@/lib/external-access-policy";
import { programs } from "@/lib/srikandi";

type Availability = "available" | "empty" | "suppressed" | "unavailable" | "not_granted";
export type ExternalAgricultureSummary = {
  members: { availability: Availability; verifiedCount: number | null };
  land: { availability: Availability; verifiedParcels: number | null; areaHectares: number | null };
  harvest: { availability: Availability; items: { commodity: string; quantity: number; unit: string }[] };
  programs: { id: string; name: string; goal: string; period: string; category: string }[];
};

const allowed = (principal: ExternalPrincipal, key: string) => canExternalRead(principal, {
  workspaceOwner: principal.workspaceOwner,
  classification: "aggregate",
  aggregateKey: key,
});

export async function getExternalAgricultureSummary(principal: ExternalPrincipal): Promise<ExternalAgricultureSummary> {
  const unavailable: ExternalAgricultureSummary = {
    members: { availability: "unavailable", verifiedCount: null },
    land: { availability: "unavailable", verifiedParcels: null, areaHectares: null },
    harvest: { availability: "unavailable", items: [] },
    programs: [],
  };
  const db = env.DB;
  if (!db) return unavailable;

  const summary: ExternalAgricultureSummary = {
    members: { availability: allowed(principal, "members") ? "empty" : "not_granted", verifiedCount: null },
    land: { availability: allowed(principal, "land") ? "empty" : "not_granted", verifiedParcels: null, areaHectares: null },
    harvest: { availability: allowed(principal, "harvest") ? "empty" : "not_granted", items: [] },
    programs: programs.filter((program) => canExternalRead(principal, {
      workspaceOwner: principal.workspaceOwner,
      classification: "program",
      programId: program.id,
    })).map((program) => ({
      id: program.id,
      name: program.name,
      goal: program.goal,
      period: program.period,
      category: program.category,
    })),
  };

  try {
    if (summary.members.availability !== "not_granted") {
      const row = await db.prepare(
        "SELECT COUNT(*) AS verified_count FROM records WHERE owner=? AND kind='anggota' AND data::jsonb->>'status'='Aktif' AND data::jsonb->>'verification'='Terverifikasi'"
      ).bind(principal.workspaceOwner).first();
      const count = Number(row?.verified_count || 0);
      summary.members = count >= 5
        ? { availability: "available", verifiedCount: count }
        : { availability: count === 0 ? "empty" : "suppressed", verifiedCount: null };
    }

    if (summary.land.availability !== "not_granted") {
      const row = await db.prepare(
        "SELECT COUNT(*) AS parcel_count,COUNT(DISTINCT p.member_id) AS contributing_members,COALESCE(SUM(p.area_m2),0) AS area_m2 FROM farm_parcels p JOIN records r ON r.id=p.member_id AND r.owner=p.workspace_owner AND r.kind='anggota' WHERE p.workspace_owner=? AND p.status='active' AND p.verification_status='verified' AND r.data::jsonb->>'status'='Aktif' AND r.data::jsonb->>'verification'='Terverifikasi'"
      ).bind(principal.workspaceOwner).first();
      const count = Number(row?.parcel_count || 0);
      const contributors = Number(row?.contributing_members || 0);
      summary.land = contributors >= 3
        ? {
            availability: "available",
            verifiedParcels: count,
            areaHectares: Math.round((Number(row?.area_m2 || 0) / 10000) * 10) / 10,
          }
        : { availability: count === 0 ? "empty" : "suppressed", verifiedParcels: null, areaHectares: null };
    }

    if (summary.harvest.availability !== "not_granted") {
      const rows = await db.prepare(
        "SELECT a.name AS commodity,h.unit_code,COUNT(DISTINCT p.member_id) AS contributing_members,SUM(h.quantity) AS total_quantity " +
        "FROM harvest_records h JOIN crop_cycles c ON c.id=h.crop_cycle_id AND c.workspace_owner=h.workspace_owner " +
        "JOIN farm_parcels p ON p.id=c.parcel_id AND p.workspace_owner=c.workspace_owner " +
        "JOIN agriculture_commodities a ON a.id=c.commodity_id AND a.workspace_owner=c.workspace_owner JOIN records r ON r.id=p.member_id AND r.owner=p.workspace_owner AND r.kind='anggota' " +
        "WHERE h.workspace_owner=? AND h.verification_status='verified' AND c.verification_status='verified' " +
        "AND p.verification_status='verified' AND p.status='active' AND r.data::jsonb->>'status'='Aktif' AND r.data::jsonb->>'verification'='Terverifikasi' " +
        "GROUP BY a.id,a.name,h.unit_code ORDER BY a.name,h.unit_code"
      ).bind(principal.workspaceOwner).all();
      const visible = rows.results.filter((row) => Number(row.contributing_members || 0) >= 3).map((row) => ({
        commodity: String(row.commodity),
        quantity: Number(row.total_quantity || 0),
        unit: String(row.unit_code),
      }));
      summary.harvest = {
        availability: visible.length ? "available" : rows.results.length ? "suppressed" : "empty",
        items: visible,
      };
    }
    return summary;
  } catch {
    return unavailable;
  }
}
