"use client";

/**
 * CMS — satu sumber kebenaran untuk isi halaman publik yang dapat disunting.
 *
 * MASALAH YANG DIPERBAIKI
 * -----------------------
 * Sebelum modul ini ada, judul hero, sub-judul, teks ajakan, dan susunan block
 * setiap halaman tertulis langsung di `src/app/(public)/page.tsx` dan
 * halaman-halaman lain. Website Studio hanya *menampilkan* susunan block dari
 * konstanta `PAGE_COMPOSITIONS` dan tidak dapat mengubahnya. Akibatnya Studio
 * adalah katalog baca-saja: tombol panah nonaktif, tidak ada kontrol edit, dan
 * setiap perubahan di studio tidak pernah muncul di situs publik.
 *
 * STRUKTUR
 * --------
 * - `CMS_PAGES`  — halaman yang dapat disunting, mengikuti `STUDIO_PAGES`.
 * - `PAGE_BLOCKS` — block per halaman, dengan field yang benar-benar dirender.
 * - Penyimpanan memakai localStorage (pola yang sama dengan `site-settings.ts`),
 *   dan menyiarkan perubahan lewat CustomEvent supaya pratinjau langsung ikut.
 *
 * BATAS YANG JUJUR
 * ----------------
 * Ini persistensi peramban, bukan basis data bersama. Artinya suntingan hanya
 * berlaku di perangkat yang menyunting sampai integrasi Neon mengambil alih
 * (lihat audit integrasi: migrasi store operasional masih menjadi gerbang
 * rilis). Studio menyatakannya terang-terangan di antarmuka, bukan menyembunyi-
 * nyembunyikannya.
 */
import { useEffect, useState } from "react";
import type { BlockKey } from "@/config/blocks";

/* ─────────────────────────── tipe ─────────────────────────── */

/** Field yang dapat disunting pada sebuah block. Semua opsional. */
export interface BlockFields {
  /** Judul utama block (h1 pada hero, judul section pada block lain). */
  headline?: string;
  /** Kalimat pendukung di bawah judul. */
  subheadline?: string;
  /** Label kecil di atas judul. */
  eyebrow?: string;
  /** Teks tombol utama. */
  ctaPrimary?: string;
  /** Teks tombol kedua. */
  ctaSecondary?: string;
  /** Tautan tombol utama. */
  hrefPrimary?: string;
  /** Tautan tombol kedua. */
  hrefSecondary?: string;
  /** Catatan kecil di bawah block, dipakai block bertipe data. */
  note?: string;
  /** Jumlah baris yang ditampilkan (block daftar). */
  limit?: string;
}

export interface CmsBlock {
  /** Kunci unik dalam satu halaman — dipakai untuk pengurutan & penghapusan. */
  uid: string;
  block: BlockKey;
  /** Field yang dirender. Kosongkan untuk memakai default block. */
  fields: BlockFields;
}

export type PageStatus = "published" | "review" | "draft";

export interface CmsPage {
  path: string;
  title: string;
  status: PageStatus;
  /** Block dalam urutan tampil. */
  blocks: CmsBlock[];
  updatedAt: string;
  updatedBy: string;
}

/* ─────────────────────────── skema field per block ───────────────────────────
 * Dideklarasikan di sini (bukan di config/blocks.ts) karena ini yang menentukan
 * kontrol editor mana yang muncul. `config/blocks.ts` tetap menjadi registry
 * resmi; entri di sini hanya memilih subset field yang benar-benar dirender
 * oleh halaman publik.
 */
export interface FieldSpec {
  key: keyof BlockFields;
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

/* ─────────────────────────── default ─────────────────────────── */

let uidSeq = 0;
export function newUid(): string {
  uidSeq += 1;
  return `b${Date.now().toString(36)}${uidSeq.toString(36)}`;
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
  ];
}

/* ─────────────────────────── penyimpanan ─────────────────────────── */

const KEY = "sb_cms_pages_v1";

export function loadPages(): CmsPage[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPages();
    const parsed = JSON.parse(raw) as CmsPage[];
    if (!Array.isArray(parsed) || !parsed.length) return defaultPages();
    // Gabungkan dengan default supaya halaman/block baru dari kode tetap muncul.
    return defaultPages().map((base) => {
      const stored = parsed.find((p) => p.path === base.path);
      return stored ? { ...base, ...stored } : base;
    });
  } catch {
    return defaultPages();
  }
}

export function savePages(pages: CmsPage[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pages));
    window.dispatchEvent(new CustomEvent("sb:cms-pages", { detail: pages }));
  } catch {
    /* mode privat: perubahan tetap berlaku untuk sesi studio ini */
  }
}

/** Apakah ada suntingan tersimpan yang berbeda dari default. */
export function hasStoredPages(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function resetPages() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("sb:cms-pages", { detail: null }));
  } catch {
    /* diabaikan */
  }
}

/* ─────────────────────────── pembacaan oleh halaman publik ─────────────────────────── */

/**
 * Mengembalikan block sebuah halaman. Di server (sebelum mount) mengembalikan
 * susunan default supaya HTML awal tetap deterministik dan tidak ada
 * ketidakcocokan hidrasi; setelah mount nilai tersimpan menggantikannya.
 */
export function useCmsPage(path: string): CmsPage {
  const [page, setPage] = useState<CmsPage>(() => {
    const base = defaultPages().find((p) => p.path === path);
    return base ?? { path, title: path, status: "draft", blocks: [], updatedAt: "", updatedBy: "" };
  });

  useEffect(() => {
    const read = () => {
      const found = loadPages().find((p) => p.path === path);
      if (found) setPage(found);
    };
    read();
    const onUpdate = () => read();
    window.addEventListener("sb:cms-pages", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("sb:cms-pages", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [path]);

  return page;
}

/** Ambil field sebuah block dengan fallback ke nilai default. */
export function field<T extends keyof BlockFields>(
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
