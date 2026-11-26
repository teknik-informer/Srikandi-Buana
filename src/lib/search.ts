/**
 * SEARCH — indeks pencarian bersama untuk kotak topbar dan halaman /app/cari.
 *
 * RIWAYAT PERBAIKAN
 * -----------------
 * Versi sebelumnya membangun indeks SEKALI saat modul dievaluasi, dari
 * konstanta benih (`data/organization.ts`, `data/operations.ts`, `data/content.ts`).
 * Akibatnya anggota yang baru ditambahkan, produk yang baru dibuat, atau surat
 * yang baru diregistrasi tidak pernah muncul di pencarian — pencarian
 * menjanjikan "seluruh workspace", yang diberikannya hanya data awal.
 *
 * Sekarang `collect(state)` menerima dokumen bersama sebagai sumber. Pemanggil
 * (dialog pencarian) menyalurkan `useStore().state`, sehingga hasil pencarian
 * mengikuti apa yang benar-benar tersimpan. `SEARCH_INDEX` tetap ada sebagai
 * cadangan untuk pemakaian non-React, tetapi tidak lagi dipakai dialog.
 *
 * Batas yang jujur: pencarian mencocokkan kata, bukan sinonim samar. Setiap
 * hasil membawa rute yang bisa dibuka, jadi tidak ada hasil yang buntu.
 */
import { MEMBERS, DOCUMENTS } from "@/data/organization";
import { APPS } from "@/config/apps";
import { PROGRAMS, PRODUCTS, LANDS } from "@/data/operations";
import { NEWS } from "@/data/content";
import { JOURNALS } from "@/data/finance";
import type {
  Member, DocumentRow, Program, Product, LandPlot, JournalEntry, Letter,
} from "@/data/types";

export type SearchGroup =
  | "Menu"
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

/**
 * Destinations, not records. The previous site's search opened a dialog that
 * searched the *navigation* first — typing "jurnal" or "persetujuan" there
 * took you somewhere. Records alone made the placeholder a promise the index
 * could not keep ("jurnal" matched no member, document or line item).
 */
const PLACES: { label: string; meta: string; href: string; words: string }[] = [
  { label: "Jurnal keuangan", meta: "Keuangan · buku besar", href: "/app/keuangan/jurnal", words: "jurnal keuangan buku besar akuntansi transaksi" },
  { label: "Buku besar", meta: "Keuangan · akun & saldo", href: "/app/keuangan/buku-besar", words: "buku besar ledger akun saldo" },
  { label: "Kas & bank", meta: "Keuangan · rekonsiliasi", href: "/app/keuangan/kas-bank", words: "kas bank rekonsiliasi setoran mutasi" },
  { label: "Anggaran", meta: "Keuangan · rencana & realisasi", href: "/app/keuangan/anggaran", words: "anggaran budget rencana realisasi" },
  { label: "Persetujuan", meta: "Pengurus · keputusan menunggu", href: "/app/pengurus/persetujuan", words: "persetujuan approval setuju keputusan menunggu" },
  { label: "Agenda & rapat", meta: "Pengurus · jadwal", href: "/app/pengurus/rapat", words: "agenda rapat jadwal pertemuan notulen" },
  { label: "Dokumen keputusan", meta: "Sekretariat · arsip", href: "/app/sekretariat/dokumen", words: "dokumen surat arsip keputusan sk" },
  { label: "Data anggota", meta: "Bidang · organisasi & keanggotaan", href: "/app/bidang/organisasi/data", words: "anggota data keanggotaan profil" },
  { label: "Lahan & petak", meta: "Bidang · pertanian", href: "/app/bidang/pertanian/data", words: "lahan petak pertanian komoditas panen" },
  { label: "Produk & stok", meta: "Bidang · usaha", href: "/app/bidang/usaha/data", words: "produk stok usaha inventaris barang" },
  { label: "Data pelatihan", meta: "Bidang · pemberdayaan", href: "/app/bidang/pelatihan/data", words: "pelatihan peserta kelas materi" },
  { label: "Kasir POS", meta: "POS · transaksi penjualan", href: "/app/pos", words: "pos kasir penjualan struk bayar" },
  { label: "Notifikasi", meta: "Beranda · pemberitahuan", href: "/app/notifikasi", words: "notifikasi pemberitahuan pesan" },
  { label: "Studio Pengelola", meta: "Platform · konfigurasi", href: "/studio", words: "studio pengelola konfigurasi website tema" },
];

/**
 * Sumber data pencarian: bagian dokumen bersama yang diindeks.
 * Memakai tipe asli supaya tidak ada bayangan tipe yang menyimpang dari data.
 */
export interface SearchSource {
  members?: Member[];
  documents?: DocumentRow[];
  programs?: Program[];
  products?: Product[];
  lands?: LandPlot[];
  journals?: JournalEntry[];
  letters?: Letter[];
}

function collect(state?: SearchSource | null): SearchHit[] {
  const rows: SearchHit[] = [];
  // Sumber data: dokumen bersama bila tersedia, benih bila belum.
  const MEMBERS_SRC = state?.members ?? MEMBERS;
  const DOCUMENTS_SRC = state?.documents ?? DOCUMENTS;
  const PROGRAMS_SRC = state?.programs ?? PROGRAMS;
  const PRODUCTS_SRC = state?.products ?? PRODUCTS;
  const LANDS_SRC = state?.lands ?? LANDS;
  const JOURNALS_SRC = state?.journals ?? JOURNALS;
  for (const a of APPS) {
    rows.push({
      group: "Menu",
      label: a.short,
      meta: a.audience,
      href: a.href,
      hay: `${a.name} ${a.short} ${a.audience} ${a.description} aplikasi`.toLowerCase(),
    });
  }
  for (const p of PLACES) {
    rows.push({
      group: "Menu",
      label: p.label,
      meta: p.meta,
      href: p.href,
      hay: `${p.label} ${p.meta} ${p.words}`.toLowerCase(),
    });
  }
  for (const m of MEMBERS_SRC) {
    rows.push({
      group: "Anggota",
      label: m.name,
      meta: `${m.role} · ${m.scope}`,
      href: m.field ? `/app/bidang/${m.field}/data` : "/app/bidang/organisasi/data",
      hay: `${m.name} ${m.role} ${m.scope} ${m.id} ${m.village}`.toLowerCase(),
    });
  }
  for (const d of DOCUMENTS_SRC) {
    rows.push({
      group: "Dokumen",
      label: d.title,
      meta: `${d.number} · ${d.visibility}`,
      href: "/app/sekretariat/dokumen",
      hay: `${d.title} ${d.number} ${d.category} ${d.owner}`.toLowerCase(),
    });
  }
  for (const p of PROGRAMS_SRC) {
    rows.push({
      group: "Program",
      label: p.name,
      meta: `${p.code} · ${p.status}`,
      href: `/app/bidang/${p.bidang}`,
      hay: `${p.name} ${p.code} ${p.objective}`.toLowerCase(),
    });
  }
  for (const p of PRODUCTS_SRC) {
    rows.push({
      group: "Produk",
      label: p.name,
      meta: `${p.category} · ${p.published ? "terbit" : "draf"}`,
      href: "/app/bidang/usaha/data",
      hay: `${p.name} ${p.category} ${p.producer} ${p.unit}`.toLowerCase(),
    });
  }
  for (const l of LANDS_SRC) {
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
  // Surat masuk/keluar — dulu tidak ada di pencarian sama sekali padahal
  // sekretariat meregistrasinya setiap hari.
  const LETTERS_SRC = state?.letters ?? [];
  for (const l of LETTERS_SRC) {
    rows.push({
      group: "Dokumen",
      label: `${l.number} — ${l.subject}`,
      meta: `${l.direction === "masuk" ? "Surat masuk" : "Surat keluar"} · ${l.counterpart}`,
      href: "/app/sekretariat/surat",
      hay: `${l.number} ${l.subject} ${l.counterpart}`.toLowerCase(),
    });
  }
  for (const j of JOURNALS_SRC) {
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

/** Indeks dari benih awal — cadangan bila tidak ada dokumen bersama. */
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

/**
 * Cari di seluruh workspace.
 *
 * `state` adalah dokumen bersama dari `useStore()`. Bila diberikan, indeks
 * dibangun dari data yang benar-benar tersimpan — bukan dari benih. Bila tidak,
 * dipakai `SEARCH_INDEX` supaya pemakaian non-React tetap jalan.
 */
export function searchAll(
  query: string,
  limitPerGroup = 6,
  state?: SearchSource | null,
): { group: SearchGroup; hits: SearchHit[] }[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const indeks = state ? collect(state) : SEARCH_INDEX;
  const scored = indeks.map((h) => ({ h, s: score(h, term) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.h.label.localeCompare(b.h.label));

  const order: SearchGroup[] = ["Menu", "Anggota", "Program", "Produk", "Dokumen", "Lahan", "Jurnal", "Kabar"];
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
