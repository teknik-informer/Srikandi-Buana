"use client";

/**
 * CMS — satu sumber kebenaran untuk isi halaman publik yang dapat disunting.
 *
 * RIWAYAT PERBAIKAN
 * -----------------
 * Versi pertama modul ini menyimpan suntingan ke `localStorage`. Akibatnya
 * suntingan hanya berlaku di peramban yang menyunting: pengunjung lain, dan
 * perangkat lain, tetap melihat teks lama. Studio tampak berfungsi tetapi tidak
 * pernah mengubah apa pun yang dilihat orang.
 *
 * Sejak revisi ini, halaman publik yang disunting disimpan di dokumen bersama
 * `v9.app_state` lewat aksi `cms.save`, sehingga:
 *
 *   - suntingan terlihat oleh SEMUA pengunjung di SEMUA perangkat;
 *   - setiap penyimpanan tercatat di jejak audit dengan nama penyunting;
 *   - dua penyunting pada halaman berbeda tidak saling menimpa (aksi per
 *     halaman, bukan tulis-utuh).
 *
 * STRUKTUR
 * --------
 * - `defaultPages()` — susunan awal, mencerminkan situs apa adanya. Dipakai
 *   selama organisasi belum pernah menyunting halaman tersebut.
 * - `useCmsPages()` — halaman efektif: hasil suntingan bila ada, default bila
 *   belum. Membaca dari store, bukan dari peramban.
 * - `field()` / `limitOf()` — pembaca nilai dengan fallback, dipakai halaman
 *   publik.
 *
 * CATATAN HIDRASI
 * ---------------
 * Halaman publik sebagian dirender di server. Server tidak dapat membaca store
 * klien, jadi ia memakai default — HTML awal selalu deterministik. Setelah
 * mount, nilai bersama menggantikannya. Karena default dan nilai tersimpan
 * berbentuk sama, tidak ada kedipan tata letak: hanya teks yang berganti bila
 * organisasi pernah menyuntingnya.
 */
import { useMemo } from "react";
import type { BlockKey } from "@/config/blocks";
import { usePublicContent } from "@/lib/public-content";
import type { CmsBlock, CmsBlockFields, CmsPage } from "@/lib/reducer";

export type { CmsBlock, CmsPage };
export type BlockFields = CmsBlockFields;
export type PageStatus = CmsPage["status"];

/* ─────────────────────────── skema field per block ───────────────────────────
 * Dideklarasikan di sini (bukan di config/blocks.ts) karena ini yang menentukan
 * kontrol editor mana yang muncul. `config/blocks.ts` tetap menjadi registry
 * resmi; entri di sini hanya memilih subset field yang benar-benar dirender
 * oleh halaman publik.
 */
export interface FieldSpec {
  key: keyof CmsBlockFields;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "url";
  max?: number;
  required?: boolean;
}

export const EDITABLE_FIELDS: Record<BlockKey, FieldSpec[]> = {
  "hero-editorial": [
    { key: "eyebrow", label: "Label di atas judul", hint: "Huruf kapital kecil, satu baris pendek.", type: "text", max: 48 },
    { key: "headline", label: "Judul utama", hint: "Tampil sebagai H1. Baris baru akan dipertahankan.", type: "textarea", max: 120, required: true },
    { key: "subheadline", label: "Kalimat pendukung", hint: "Satu sampai dua kalimat di bawah judul.", type: "textarea", max: 220 },
    { key: "ctaPrimary", label: "Tombol utama", type: "text", max: 32 },
    { key: "hrefPrimary", label: "Tautan tombol utama", hint: "Diawali garis miring, mis. /gabung", type: "url" },
    { key: "ctaSecondary", label: "Tombol kedua", type: "text", max: 32 },
    { key: "hrefSecondary", label: "Tautan tombol kedua", type: "url" },
  ],
  "stat-strip": [
    { key: "headline", label: "Judul bagian", type: "text", max: 60 },
    { key: "note", label: "Keterangan sumber", hint: "Dipakai sebagai catatan kecil di bawah angka.", type: "text", max: 90 },
  ],
  "field-cards": [
    { key: "eyebrow", label: "Label di atas judul", type: "text", max: 48 },
    { key: "headline", label: "Judul bagian", type: "text", max: 80 },
    { key: "subheadline", label: "Kalimat pengantar", type: "textarea", max: 180 },
  ],
  "program-list": [
    { key: "headline", label: "Judul bagian", type: "text", max: 80 },
    { key: "subheadline", label: "Kalimat pengantar", type: "textarea", max: 180 },
    { key: "limit", label: "Jumlah program ditampilkan", hint: "Angka 1–6.", type: "text", max: 1 },
  ],
  "product-grid": [
    { key: "headline", label: "Judul bagian", type: "text", max: 80 },
    { key: "subheadline", label: "Kalimat pengantar", type: "textarea", max: 180 },
    { key: "limit", label: "Jumlah produk ditampilkan", hint: "Angka 1–8.", type: "text", max: 1 },
  ],
  "news-list": [
    { key: "headline", label: "Judul bagian", type: "text", max: 80 },
    { key: "subheadline", label: "Kalimat pengantar", type: "textarea", max: 180 },
    { key: "limit", label: "Jumlah berita ditampilkan", hint: "Angka 1–6.", type: "text", max: 1 },
  ],
  "story-quote": [
    { key: "headline", label: "Nama penutur", type: "text", max: 60 },
    { key: "subheadline", label: "Kutipan", type: "textarea", max: 240 },
    { key: "note", label: "Keterangan / jabatan", type: "text", max: 80 },
  ],
  "gallery-strip": [
    { key: "headline", label: "Judul bagian", type: "text", max: 80 },
    { key: "limit", label: "Jumlah foto ditampilkan", type: "text", max: 1 },
  ],
  "cta-join": [
    { key: "headline", label: "Judul ajakan", type: "text", max: 80 },
    { key: "subheadline", label: "Kalimat pendukung", type: "textarea", max: 200 },
    { key: "ctaPrimary", label: "Teks tombol", type: "text", max: 32 },
    { key: "hrefPrimary", label: "Tautan tombol", type: "url" },
  ],
  "doc-list": [
    { key: "headline", label: "Judul bagian", type: "text", max: 80 },
    { key: "limit", label: "Jumlah dokumen ditampilkan", type: "text", max: 1 },
  ],
  "rich-text": [
    { key: "headline", label: "Judul", type: "text", max: 80 },
    { key: "subheadline", label: "Isi teks", hint: "Baris baru akan dipertahankan.", type: "textarea", max: 600 },
  ],
  "contact-panel": [
    { key: "headline", label: "Judul panel", type: "text", max: 60 },
    { key: "subheadline", label: "Keterangan", type: "textarea", max: 200 },
    { key: "note", label: "Jam layanan", type: "text", max: 60 },
  ],
};

/* ─────────────────────────── susunan awal ─────────────────────────── */

let uidSeq = 0;
function nextUid(prefix: string) {
  uidSeq += 1;
  return `${prefix}${Date.now().toString(36)}${uidSeq.toString(36)}`;
}

export function newUid(): string {
  return nextUid("b");
}

/** Susunan awal setiap halaman — mencerminkan kondisi situs saat ini. */
export function defaultPages(): CmsPage[] {
  const stamp = "2026-11-20 14:20";
  return [
    {
      path: "/",
      title: "Beranda",
      status: "published",
      updatedAt: stamp,
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "home-hero",
          block: "hero-editorial",
          fields: {
            eyebrow: "Platform Kolaborasi & Produktivitas",
            headline: "Srikandi Buana\nBersama, Berkarya, Berdaya",
            subheadline:
              "Platform terpadu untuk mengelola organisasi, menjalankan kegiatan, dan mewujudkan tujuan bersama — mudah, aman, dan modern.",
            ctaPrimary: "Mulai Sekarang",
            hrefPrimary: "/gabung",
            ctaSecondary: "Pelajari Lebih Lanjut",
            hrefSecondary: "/profil",
          },
        },
        { uid: "home-stat", block: "stat-strip", fields: { note: "Sumber: registry anggota & catatan panen" } },
        {
          uid: "home-fields",
          block: "field-cards",
          fields: {
            eyebrow: "Enam bidang kerja",
            headline: "Satu kelompok, enam bidang yang saling menopang",
            subheadline: "Setiap bidang punya aplikasi kerjanya sendiri, dengan data yang mengalir ke satu tempat.",
          },
        },
        {
          uid: "home-programs",
          block: "program-list",
          fields: { headline: "Program yang sedang berjalan", limit: "3" },
        },
        { uid: "home-quote", block: "story-quote", fields: {} },
        {
          uid: "home-products",
          block: "product-grid",
          fields: { headline: "Produk unggulan", limit: "4" },
        },
        { uid: "home-news", block: "news-list", fields: { headline: "Kabar terbaru", limit: "3" } },
        {
          uid: "home-cta",
          block: "cta-join",
          fields: {
            headline: "Ingin bergabung?",
            subheadline: "Sampaikan minat Anda; Sekretariat akan menghubungi untuk verifikasi keanggotaan.",
            ctaPrimary: "Daftar minat bergabung",
            hrefPrimary: "/gabung",
          },
        },
      ],
    },
    {
      path: "/profil",
      title: "Profil Srikandi Buana",
      status: "published",
      updatedAt: "2026-11-11 09:02",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "profil-rich",
          block: "rich-text",
          fields: { headline: "Sejarah & profil", subheadline: "KWT Srikandi Buana berdiri di Desa Ngadimulyo, Kecamatan Kedu." },
        },
        { uid: "profil-fields", block: "field-cards", fields: { headline: "Struktur bidang resmi" } },
        { uid: "profil-stat", block: "stat-strip", fields: { note: "Angka keanggotaan" } },
      ],
    },
    {
      path: "/program",
      title: "Program Berjalan",
      status: "published",
      updatedAt: "2026-11-18 16:44",
      updatedBy: "Pengurus Harian",
      blocks: [
        {
          uid: "program-list",
          block: "program-list",
          fields: { headline: "Program berjalan", limit: "6" },
        },
        { uid: "program-cta", block: "cta-join", fields: { headline: "Ikut program berikutnya" } },
      ],
    },
    {
      path: "/produk",
      title: "Katalog Produk",
      status: "published",
      updatedAt: "2026-11-19 10:11",
      updatedBy: "Bidang Usaha",
      blocks: [
        {
          uid: "produk-grid",
          block: "product-grid",
          fields: { headline: "Katalog produk", limit: "8" },
        },
        { uid: "produk-cta", block: "cta-join", fields: { headline: "Pesan produk" } },
      ],
    },
    {
      path: "/kabar",
      title: "Kabar & Artikel",
      status: "published",
      updatedAt: "2026-11-19 08:30",
      updatedBy: "Sekretariat",
      blocks: [
        { uid: "kabar-news", block: "news-list", fields: { headline: "Kabar & artikel", limit: "6" } },
        { uid: "kabar-gallery", block: "gallery-strip", fields: { limit: "6" } },
      ],
    },
    {
      path: "/kemitraan",
      title: "Kemitraan",
      status: "review",
      updatedAt: "2026-11-21 13:05",
      updatedBy: "Sekretariat",
      blocks: [
        { uid: "mitra-rich", block: "rich-text", fields: { headline: "Bermitra dengan Srikandi Buana" } },
        { uid: "mitra-contact", block: "contact-panel", fields: {} },
        { uid: "mitra-cta", block: "cta-join", fields: { headline: "Ajukan kemitraan" } },
      ],
    },
    /* ── halaman pendukung ──────────────────────────────────────────────
     * Sebelumnya sembilan halaman ini tidak ada di CMS sama sekali: judul dan
     * pembukanya tertulis di JSX, sehingga tidak bisa diubah pengurus tanpa
     * developer. Block-nya `rich-text` karena yang disunting memang teks
     * pembuka — isi terperinci tetap dari data masing-masing halaman.
     */
    {
      path: "/bantuan",
      title: "Bantuan & Panduan",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "bantuan-rich",
          block: "rich-text",
          fields: {
            headline: "Panduan per peran.",
            subheadline:
              "Setiap peran punya jalan pintas sendiri. Halaman ini menjelaskan apa yang bisa dilakukan Ketua, Sekretaris, Bendahara, dan anggota.",
          },
        },
      ],
    },
    {
      path: "/dokumen",
      title: "Dokumen Publik",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "dokumen-rich",
          block: "rich-text",
          fields: {
            headline: "Dokumen publik.",
            subheadline: "Arsip yang boleh dibaca siapa pun: anggaran dasar, laporan kegiatan, dan kesepakatan mitra.",
          },
        },
        { uid: "dokumen-list", block: "doc-list", fields: { headline: "Daftar dokumen", limit: "6" } },
      ],
    },
    {
      path: "/faq",
      title: "Pertanyaan Umum",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "faq-rich",
          block: "rich-text",
          fields: {
            headline: "Pertanyaan yang sering diajukan.",
            subheadline: "Jawaban singkat soal keanggotaan, produk, dan cara kerja kelompok.",
          },
        },
      ],
    },
    {
      path: "/gabung",
      title: "Gabung Anggota",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "gabung-rich",
          block: "rich-text",
          fields: {
            headline: "Satu formulir, satu tindak lanjut yang jelas.",
            subheadline:
              "Sampaikan minat Anda. Sekretariat akan menghubungi untuk verifikasi keanggotaan sebelum data Anda masuk buku induk.",
          },
        },
      ],
    },
    {
      path: "/galeri",
      title: "Galeri",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "galeri-rich",
          block: "rich-text",
          fields: {
            headline: "Potret dari lapangan.",
            subheadline: "Dokumentasi kegiatan, panen, dan pelatihan anggota.",
          },
        },
        { uid: "galeri-strip", block: "gallery-strip", fields: { headline: "Foto terbaru", limit: "8" } },
      ],
    },
    {
      path: "/kegiatan",
      title: "Kegiatan",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "kegiatan-rich",
          block: "rich-text",
          fields: {
            headline: "Kegiatan yang bisa diikuti.",
            subheadline: "Agenda terbuka untuk anggota dan masyarakat sekitar.",
          },
        },
      ],
    },
    {
      path: "/kontak",
      title: "Kontak",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "kontak-rich",
          block: "rich-text",
          fields: {
            headline: "Bicara langsung dengan sekretariat.",
            subheadline: "Jam layanan, alamat, dan kanal komunikasi resmi kelompok.",
          },
        },
        { uid: "kontak-panel", block: "contact-panel", fields: {} },
      ],
    },
    {
      path: "/pelatihan",
      title: "Pelatihan",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Sekretariat",
      blocks: [
        {
          uid: "pelatihan-rich",
          block: "rich-text",
          fields: {
            headline: "Kelas yang dibuka untuk anggota.",
            subheadline: "Jadwal, kuota, dan materi pelatihan yang sedang berjalan.",
          },
        },
      ],
    },
    {
      path: "/produk/pemesanan",
      title: "Cara Pemesanan",
      status: "published",
      updatedAt: "2026-11-20 10:00",
      updatedBy: "Bidang Usaha",
      blocks: [
        {
          uid: "pesan-rich",
          block: "rich-text",
          fields: {
            headline: "Empat langkah, tanpa akun.",
            subheadline: "Pilih produk, konfirmasi ketersediaan, sepakati pengiriman, lalu selesaikan pembayaran.",
          },
        },
      ],
    },
  ];
}

/** Halaman yang dapat disunting di Website Studio, berurutan. */
export const CMS_PAGES: { path: string; title: string }[] = defaultPages().map((p) => ({
  path: p.path,
  title: p.title,
}));

/* ─────────────────────────── penggabungan ─────────────────────────── */

/**
 * Gabungkan susunan default dengan hasil suntingan.
 *
 * Default tetap menjadi kerangka: block yang ditambahkan di kode baru muncul
 * untuk organisasi yang sudah pernah menyunting, tanpa menghapus suntingan
 * mereka. Suntingan menimpa per halaman, bukan menggantikan seluruh koleksi.
 */
export function mergePages(stored: CmsPage[] | undefined | null): CmsPage[] {
  const basis = defaultPages();
  if (!Array.isArray(stored) || !stored.length) return basis;
  return basis.map((base) => {
    const found = stored.find((p) => p.path === base.path);
    if (!found) return base;
    return {
      ...base,
      ...found,
      // Block hasil suntingan dipakai apa adanya; bila kosong, pakai default.
      blocks: Array.isArray(found.blocks) && found.blocks.length ? found.blocks : base.blocks,
    };
  });
}

/* ─────────────────────────── pembacaan oleh halaman publik ─────────────────────────── */

/**
 * Halaman efektif dari dokumen bersama.
 *
 * Mengembalikan susunan default selama store belum siap (server render), lalu
 * nilai bersama setelah mount. Ini menjaga HTML awal deterministik.
 */
export function useCmsPages(): CmsPage[] {
  const { cmsPages, ready } = usePublicContent();
  return useMemo(() => (ready ? mergePages(cmsPages) : defaultPages()), [ready, cmsPages]);
}

/** Satu halaman berdasarkan path. */
export function useCmsPage(path: string): CmsPage {
  const pages = useCmsPages();
  return useMemo(() => {
    return (
      pages.find((p) => p.path === path) ?? {
        path,
        title: path,
        status: "draft" as const,
        blocks: [],
        updatedAt: "",
        updatedBy: "",
      }
    );
  }, [pages, path]);
}

/** Ambil field sebuah block dengan fallback ke nilai default. */
export function field<T extends keyof CmsBlockFields>(
  blocks: CmsBlock[],
  block: BlockKey,
  key: T,
  fallback: string,
): string {
  const found = blocks.find((b) => b.block === block);
  const value = found?.fields?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Jumlah baris efektif untuk block daftar. */
export function limitOf(blocks: CmsBlock[], block: BlockKey, fallback: number, max: number): number {
  const raw = field(blocks, block, "limit", String(fallback));
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

/**
 * Apakah halaman ini pernah disunting organisasi.
 * Dipakai studio untuk menampilkan badge "belum disunting" vs "tersimpan".
 */
export function isEdited(stored: CmsPage[] | undefined | null, path: string): boolean {
  return Array.isArray(stored) && stored.some((p) => p.path === path);
}
