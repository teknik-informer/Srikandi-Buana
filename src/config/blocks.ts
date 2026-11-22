/**
 * BLOCK REGISTRY — Blueprint §37.5.
 * The Website Studio page builder may compose pages ONLY from registered blocks.
 * Configuration selects a block by approved key; components are never evaluated
 * from arbitrary markup or JS.
 */

export type BlockKey =
  | "hero-editorial"
  | "stat-strip"
  | "field-cards"
  | "program-list"
  | "product-grid"
  | "news-list"
  | "story-quote"
  | "gallery-strip"
  | "cta-join"
  | "doc-list"
  | "rich-text"
  | "contact-panel";

export interface BlockDef {
  key: BlockKey;
  name: string;
  group: "pembuka" | "konten" | "data" | "ajakan";
  description: string;
  fields: { name: string; type: "text" | "textarea" | "image" | "collection" | "toggle"; required: boolean }[];
}

export const BLOCK_REGISTRY: BlockDef[] = [
  {
    key: "hero-editorial",
    name: "Hero Editorial",
    group: "pembuka",
    description: "Judul besar, tagline, gambar utama, dan dua ajakan bertindak.",
    fields: [
      { name: "eyebrow", type: "text", required: false },
      { name: "headline", type: "text", required: true },
      { name: "subheadline", type: "textarea", required: true },
      { name: "image", type: "image", required: true },
      { name: "ctaPrimary", type: "text", required: true },
      { name: "ctaSecondary", type: "text", required: false },
    ],
  },
  {
    key: "stat-strip",
    name: "Strip Angka Kunci",
    group: "data",
    description: "Tiga sampai empat angka ringkas dengan keterangan sumber.",
    fields: [
      { name: "items", type: "collection", required: true },
      { name: "note", type: "text", required: false },
    ],
  },
  {
    key: "field-cards",
    name: "Kartu Bidang Resmi",
    group: "data",
    description: "Menampilkan bidang resmi dari Approved Field Registry.",
    fields: [{ name: "source", type: "text", required: true }],
  },
  {
    key: "program-list",
    name: "Daftar Program",
    group: "data",
    description: "Proyeksi publik program operasional yang telah disetujui.",
    fields: [
      { name: "limit", type: "text", required: false },
      { name: "filterBidang", type: "text", required: false },
    ],
  },
  {
    key: "product-grid",
    name: "Grid Produk",
    group: "data",
    description: "Produk terpublikasi saja; data stok internal tidak dibuka.",
    fields: [
      { name: "limit", type: "text", required: false },
      { name: "kategori", type: "text", required: false },
    ],
  },
  {
    key: "news-list",
    name: "Daftar Berita",
    group: "data",
    description: "Berita/artikel dengan status published.",
    fields: [{ name: "limit", type: "text", required: false }],
  },
  {
    key: "story-quote",
    name: "Kutipan & Cerita",
    group: "konten",
    description: "Kutipan panjang dengan atribusi; perlu persetujuan publikasi.",
    fields: [
      { name: "quote", type: "textarea", required: true },
      { name: "attribution", type: "text", required: true },
      { name: "photo", type: "image", required: false },
    ],
  },
  {
    key: "gallery-strip",
    name: "Strip Galeri",
    group: "konten",
    description: "Baris foto dari media collection.",
    fields: [{ name: "collection", type: "collection", required: true }],
  },
  {
    key: "cta-join",
    name: "Ajakan Bergabung",
    group: "ajakan",
    description: "Panel ajakan dengan formulir minat bergabung.",
    fields: [
      { name: "title", type: "text", required: true },
      { name: "body", type: "textarea", required: true },
    ],
  },
  {
    key: "doc-list",
    name: "Daftar Dokumen",
    group: "data",
    description: "Dokumen publik/laporan yang telah disetujui untuk dibagikan.",
    fields: [{ name: "kategori", type: "text", required: false }],
  },
  {
    key: "rich-text",
    name: "Teks Kaya",
    group: "konten",
    description: "Teks dengan allowlist format (judul, daftar, kutipan).",
    fields: [{ name: "body", type: "textarea", required: true }],
  },
  {
    key: "contact-panel",
    name: "Panel Kontak",
    group: "ajakan",
    description: "Alamat, jam layanan, dan kanal komunikasi resmi.",
    fields: [{ name: "showHours", type: "toggle", required: false }],
  },
];

/** Pages currently composed from registered blocks (demo composition). */
export const PAGE_COMPOSITIONS: Record<string, { block: BlockKey; note: string }[]> = {
  "/": [
    { block: "hero-editorial", note: "Dikomposisi di Website Studio" },
    { block: "stat-strip", note: "Sumber: registry anggota & panen" },
    { block: "field-cards", note: "Sumber: Approved Field Registry" },
    { block: "program-list", note: "Hanya program berstatus disetujui" },
    { block: "story-quote", note: "Persetujuan publikasi tercatat" },
    { block: "product-grid", note: "Produk terpublikasi" },
    { block: "news-list", note: "Status published" },
    { block: "cta-join", note: "Formulir minat bergabung" },
  ],
  "/profil": [
    { block: "rich-text", note: "Sejarah & profil" },
    { block: "field-cards", note: "Struktur bidang resmi" },
    { block: "stat-strip", note: "Angka keanggotaan" },
  ],
  "/produk": [
    { block: "product-grid", note: "Katalog publik" },
    { block: "cta-join", note: "Ajakan pesan" },
  ],
};
