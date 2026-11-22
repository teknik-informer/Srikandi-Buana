/**
 * SEARCH — one local index, shared by the topbar box and the /app/cari page.
 *
 * The demo has no backend, so search runs against the same seed data every
 * screen reads. Honest limits: it searches what this workspace can see,
 * matching words, not fuzzy synonyms. Results carry the route they open so a
 * hit always lands somewhere real.
 */
import { MEMBERS, DOCUMENTS } from "@/data/organization";
import { PROGRAMS, PRODUCTS, LANDS } from "@/data/operations";
import { NEWS } from "@/data/content";
import { JOURNALS } from "@/data/finance";

export type SearchGroup =
  | "Anggota"
  | "Dokumen"
  | "Program"
  | "Produk"
  | "Lahan"
  | "Kabar"
  | "Jurnal";

export interface SearchHit {
  group: SearchGroup;
  label: string;
  meta: string;
  href: string;
  /** internal: text used for scoring, never shown */
  hay: string;
}

function collect(): SearchHit[] {
  const rows: SearchHit[] = [];
  for (const m of MEMBERS) {
    rows.push({
      group: "Anggota",
      label: m.name,
      meta: `${m.role} · ${m.scope}`,
      href: m.field ? `/app/bidang/${m.field}/data` : "/app/bidang/organisasi/data",
      hay: `${m.name} ${m.role} ${m.scope} ${m.id} ${m.village}`.toLowerCase(),
    });
  }
  for (const d of DOCUMENTS) {
    rows.push({
      group: "Dokumen",
      label: d.title,
      meta: `${d.number} · ${d.visibility}`,
      href: "/app/sekretariat/dokumen",
      hay: `${d.title} ${d.number} ${d.category} ${d.owner}`.toLowerCase(),
    });
  }
  for (const p of PROGRAMS) {
    rows.push({
      group: "Program",
      label: p.name,
      meta: `${p.code} · ${p.status}`,
      href: `/app/bidang/${p.bidang}`,
      hay: `${p.name} ${p.code} ${p.objective}`.toLowerCase(),
    });
  }
  for (const p of PRODUCTS) {
    rows.push({
      group: "Produk",
      label: p.name,
      meta: `${p.category} · ${p.published ? "terbit" : "draf"}`,
      href: "/app/bidang/usaha/data",
      hay: `${p.name} ${p.category} ${p.producer} ${p.unit}`.toLowerCase(),
    });
  }
  for (const l of LANDS) {
    rows.push({
      group: "Lahan",
      label: `${l.id} — ${l.commodity}`,
      meta: `${l.owner} · ${l.village}`,
      href: "/app/bidang/pertanian/data",
      hay: `${l.id} ${l.commodity} ${l.owner} ${l.village} ${l.status}`.toLowerCase(),
    });
  }
  for (const n of NEWS) {
    rows.push({
      group: "Kabar",
      label: n.title,
      meta: `${n.kind} · ${n.status}`,
      href: `/kabar/${n.slug}`,
      hay: `${n.title} ${n.excerpt ?? ""}`.toLowerCase(),
    });
  }
  for (const j of JOURNALS) {
    rows.push({
      group: "Jurnal",
      label: j.description,
      meta: j.number,
      href: "/app/keuangan/jurnal",
      hay: `${j.description} ${j.number} ${j.createdBy}`.toLowerCase(),
    });
  }
  return rows;
}

export const SEARCH_INDEX = collect();

/** Score: exact prefix > word prefix > substring. Stable, no fuzzy magic. */
function score(hit: SearchHit, term: string) {
  const label = hit.label.toLowerCase();
  if (label.startsWith(term)) return 3;
  if (label.split(/\s+/).some((w) => w.startsWith(term))) return 2;
  if (label.includes(term)) return 1.5;
  if (hit.hay.includes(term)) return 1;
  return 0;
}

export function searchAll(query: string, limitPerGroup = 6): { group: SearchGroup; hits: SearchHit[] }[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const scored = SEARCH_INDEX.map((h) => ({ h, s: score(h, term) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.h.label.localeCompare(b.h.label));

  const order: SearchGroup[] = ["Anggota", "Program", "Produk", "Dokumen", "Lahan", "Jurnal", "Kabar"];
  const buckets = new Map<SearchGroup, SearchHit[]>();
  for (const { h } of scored) {
    const list = buckets.get(h.group) ?? [];
    if (list.length < limitPerGroup) list.push(h);
    buckets.set(h.group, list);
  }
  return order.filter((g) => buckets.has(g)).map((g) => ({ group: g, hits: buckets.get(g)! }));
}

export function countHits(groups: { hits: SearchHit[] }[]) {
  return groups.reduce((n, g) => n + g.hits.length, 0);
}
