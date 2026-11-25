/**
 * Navigation-only search index.
 *
 * Operational records must come from permission-checked server queries. Until
 * that service is enabled, this index deliberately contains destinations
 * only; it never indexes seeded members, documents, finance rows or products.
 */
import { APPS } from "@/config/apps";

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
  /** Internal search text, never rendered. */
  hay: string;
}

export const SEARCH_PLACES: { label: string; meta: string; href: string; words: string }[] = [
  { label: "Jurnal keuangan", meta: "Keuangan · buku besar", href: "/app/keuangan/jurnal", words: "jurnal keuangan buku besar akuntansi transaksi" },
  { label: "Buku besar", meta: "Keuangan · akun & saldo", href: "/app/keuangan/buku-besar", words: "buku besar ledger akun saldo" },
  { label: "Kas & bank", meta: "Keuangan · rekening dan saldo", href: "/app/keuangan/kas-bank", words: "kas bank rekening saldo setoran mutasi" },
  { label: "Anggaran", meta: "Keuangan · kesiapan anggaran", href: "/app/keuangan/anggaran", words: "anggaran budget rencana alokasi" },
  { label: "Persetujuan", meta: "Pengurus · antrean keputusan", href: "/app/pengurus/persetujuan", words: "persetujuan approval setuju keputusan menunggu" },
  { label: "Agenda & rapat", meta: "Pengurus · jadwal", href: "/app/pengurus/rapat", words: "agenda rapat jadwal pertemuan notulen" },
  { label: "Dokumen keputusan", meta: "Sekretariat · arsip", href: "/app/sekretariat/dokumen", words: "dokumen surat arsip keputusan sk" },
  { label: "Data anggota", meta: "Bidang · organisasi dan keanggotaan", href: "/app/bidang/organisasi/data", words: "anggota data keanggotaan profil" },
  { label: "Lahan & petak", meta: "Bidang · pertanian", href: "/app/bidang/pertanian/data", words: "lahan petak pertanian komoditas panen" },
  { label: "Produk & stok", meta: "Bidang · usaha", href: "/app/bidang/usaha/data", words: "produk stok usaha inventaris barang" },
  { label: "Data pelatihan", meta: "Bidang · pemberdayaan", href: "/app/bidang/pelatihan/data", words: "pelatihan peserta kelas materi" },
  { label: "Kasir POS", meta: "POS · pesanan draf", href: "/app/pos", words: "pos kasir penjualan pesanan" },
  { label: "Notifikasi", meta: "Beranda · layanan belum aktif", href: "/app/notifikasi", words: "notifikasi pemberitahuan pesan" },
  { label: "Studio Pengelola", meta: "Platform · konfigurasi", href: "/studio", words: "studio pengelola konfigurasi website tema" },
];

function collect(): SearchHit[] {
  return [
    ...APPS.map((app) => ({
      group: "Menu" as const,
      label: app.short,
      meta: app.audience,
      href: app.href,
      hay: `${app.name} ${app.short} ${app.audience} ${app.description} aplikasi`.toLowerCase(),
    })),
    ...SEARCH_PLACES.map((place) => ({
      group: "Menu" as const,
      label: place.label,
      meta: place.meta,
      href: place.href,
      hay: `${place.label} ${place.meta} ${place.words}`.toLowerCase(),
    })),
  ];
}

export const SEARCH_INDEX = collect();

/** Score: exact prefix > word prefix > substring. Stable, no fuzzy magic. */
function score(hit: SearchHit, term: string): number {
  const label = hit.label.toLowerCase();
  if (label.startsWith(term)) return 3;
  if (label.split(/\\s+/).some((word) => word.startsWith(term))) return 2;
  if (label.includes(term)) return 1.5;
  if (hit.hay.includes(term)) return 1;
  return 0;
}

export function searchAll(query: string, limitPerGroup = 6): { group: SearchGroup; hits: SearchHit[] }[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const scored = SEARCH_INDEX.map((hit) => ({ hit, score: score(hit, term) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.label.localeCompare(b.hit.label));

  const buckets = new Map<SearchGroup, SearchHit[]>();
  for (const { hit } of scored) {
    const list = buckets.get(hit.group) ?? [];
    if (list.length < limitPerGroup) list.push(hit);
    buckets.set(hit.group, list);
  }
  return buckets.has("Menu") ? [{ group: "Menu", hits: buckets.get("Menu")! }] : [];
}

export function countHits(groups: { hits: SearchHit[] }[]): number {
  return groups.reduce((total, group) => total + group.hits.length, 0);
}
