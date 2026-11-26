import { can, getIdentity } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import type { SearchGroup, SearchHit } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchRow {
  label: string;
  meta: string;
  href: string;
}

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};

function grouped(group: SearchGroup, rows: SearchRow[]): { group: SearchGroup; hits: SearchHit[] } | null {
  const hits = rows.map((row) => ({
    group,
    label: row.label,
    meta: row.meta,
    href: row.href,
    hay: `${row.label} ${row.meta}`.toLowerCase(),
  }));
  return hits.length ? { group, hits } : null;
}

function fieldScope(identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>>): string | null {
  if (!identity.field || can(identity, "organization:read") || can(identity, "field:read")) return null;
  return identity.field;
}

export async function GET(request: Request) {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return Response.json({ error: "Sesi masuk diperlukan." }, { status: 401, headers });
    }

    const raw = new URL(request.url).searchParams.get("q") ?? "";
    const term = raw.trim().replace(/\s+/g, " ").slice(0, 80);
    if (term.length < 2) return Response.json({ groups: [] }, { headers });

    const pattern = `%${term}%`;
    const sql = getV9Sql();
    const scopedField = fieldScope(identity);
    const jobs: Promise<{ group: SearchGroup; hits: SearchHit[] } | null>[] = [];

    const canReadMembers =
      can(identity, "organization:read") ||
      can(identity, "membership:activate") ||
      can(identity, "field:organisasi:read");
    if (canReadMembers) {
      const href = can(identity, "membership:activate")
        ? "/app/sekretariat/anggota"
        : can(identity, "field:organisasi:read")
          ? "/app/bidang/organisasi/data"
          : "/app/pengurus/anggota";
      jobs.push(
        sql`
          SELECT
            person.full_name AS label,
            concat_ws(' · ', NULLIF(membership.member_number, ''), membership.status) AS meta,
            ${href} AS href
          FROM v9.memberships AS membership
          INNER JOIN v9.people AS person ON person.id = membership.person_id
          WHERE membership.organization_id = ${identity.organizationId}
            AND membership.status IN ('pending', 'active')
            AND (
              person.full_name ILIKE ${pattern}
              OR COALESCE(person.preferred_name, '') ILIKE ${pattern}
              OR COALESCE(membership.member_number, '') ILIKE ${pattern}
            )
          ORDER BY person.full_name
          LIMIT 6
        `.then((result) => grouped("Anggota", rowsFromResult<SearchRow>(result))),
      );
    }

    const canReadPrograms =
      can(identity, "organization:read") ||
      can(identity, "field:read") ||
      Boolean(identity.field && can(identity, `field:${identity.field}:read`));
    if (canReadPrograms) {
      jobs.push(
        sql`
          SELECT
            title AS label,
            concat_ws(' · ', reference_no, field_key, status) AS meta,
            ('/app/bidang/' || field_key) AS href
          FROM v9.field_programs
          WHERE organization_id = ${identity.organizationId}
            AND (${scopedField}::text IS NULL OR field_key = ${scopedField})
            AND (title ILIKE ${pattern} OR reference_no ILIKE ${pattern})
          ORDER BY updated_at DESC, title
          LIMIT 6
        `.then((result) => grouped("Program", rowsFromResult<SearchRow>(result))),
      );
    }

    const canReadProducts =
      can(identity, "organization:read") ||
      can(identity, "catalog:read") ||
      can(identity, "field:usaha:read");
    if (canReadProducts) {
      const href = can(identity, "pos:sell") && !can(identity, "field:usaha:read")
        ? "/app/pos"
        : "/app/bidang/usaha/data";
      jobs.push(
        sql`
          SELECT
            product_name AS label,
            concat_ws(' · ', reference_no, sku, status) AS meta,
            ${href} AS href
          FROM v9.business_products
          WHERE organization_id = ${identity.organizationId}
            AND publication_status <> 'archived'
            AND (product_name ILIKE ${pattern} OR sku ILIKE ${pattern} OR reference_no ILIKE ${pattern})
          ORDER BY updated_at DESC, product_name
          LIMIT 6
        `.then((result) => grouped("Produk", rowsFromResult<SearchRow>(result))),
      );
    }

    const canReadPlots =
      can(identity, "organization:read") ||
      can(identity, "field:read") ||
      Boolean(identity.field && can(identity, `field:${identity.field}:read`));
    if (canReadPlots) {
      jobs.push(
        sql`
          SELECT
            plot.plot_code AS label,
            concat_ws(' · ', plot.commodity, plot.village, plot.status) AS meta,
            '/app/bidang/pertanian/data' AS href
          FROM v9.agriculture_plots AS plot
          WHERE plot.organization_id = ${identity.organizationId}
            AND (${scopedField}::text IS NULL OR plot.field_key = ${scopedField})
            AND (
              plot.plot_code ILIKE ${pattern}
              OR plot.owner_label ILIKE ${pattern}
              OR plot.commodity ILIKE ${pattern}
              OR plot.village ILIKE ${pattern}
            )
          ORDER BY plot.updated_at DESC, plot.plot_code
          LIMIT 6
        `.then((result) => grouped("Lahan", rowsFromResult<SearchRow>(result))),
      );
    }

    const canReadDocuments = can(identity, "documents:read");
    if (canReadDocuments) {
      const canReadInternalDocuments =
        can(identity, "organization:read") || can(identity, "documents:publish");
      jobs.push(
        sql`
          SELECT
            title AS label,
            concat_ws(' · ', reference_no, category, status) AS meta,
            ${canReadInternalDocuments ? "/app/sekretariat/dokumen" : "/dokumen"} AS href
          FROM v9.secretariat_documents
          WHERE organization_id = ${identity.organizationId}
            AND (
              (status = 'final' AND visibility = 'publik')
              OR (
                ${canReadInternalDocuments}
                AND status <> 'arsip'
              )
            )
            AND (title ILIKE ${pattern} OR reference_no ILIKE ${pattern} OR number ILIKE ${pattern})
          ORDER BY updated_at DESC, title
          LIMIT 6
        `.then((result) => grouped("Dokumen", rowsFromResult<SearchRow>(result))),
      );
    }

    if (can(identity, "finance:read")) {
      jobs.push(
        sql`
          SELECT
            reference_no AS label,
            concat_ws(' · ', journal_date::text, description, status) AS meta,
            '/app/keuangan/jurnal' AS href
          FROM v9.finance_journals
          WHERE organization_id = ${identity.organizationId}
            AND (reference_no ILIKE ${pattern} OR description ILIKE ${pattern})
          ORDER BY journal_date DESC, created_at DESC
          LIMIT 6
        `.then((result) => grouped("Jurnal", rowsFromResult<SearchRow>(result))),
      );
    }

    const groups = (await Promise.all(jobs)).filter(
      (group): group is { group: SearchGroup; hits: SearchHit[] } => group !== null,
    );
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
