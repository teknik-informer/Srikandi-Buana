import "server-only";

/**
 * Pembaca CMS untuk halaman publik yang dirender di server.
 *
 * Halaman `/produk`, `/kabar`, `/profil`, `/program`, dan `/kemitraan` adalah
 * server component dan tidak dapat memakai hook klien. Sebelumnya mereka
 * menulis judul dan kalimat pembukanya langsung di JSX — sehingga tab
 * "Halaman" di Website Studio menampilkan entri untuk halaman-halaman itu,
 * tetapi menyuntingnya tidak mengubah apa pun.
 *
 * Fungsi di sini membaca `cmsPages` dari dokumen bersama dan mengembalikan
 * nilai yang sudah digabung dengan susunan default. Halaman tinggal memanggil
 * `teks("/produk", "product-grid", "headline", "Katalog produk")`.
 */
import { readState } from "@/lib/state-store";
import type { BlockKey } from "@/config/blocks";
import type { CmsBlock, CmsBlockFields, CmsPage } from "@/lib/reducer";

/** Susunan default — cermin `defaultPages()` di `lib/cms.ts`, hanya bidang teks. */
const DEFAULT: Record<string, CmsBlock[]> = {
  "/": [
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
  ],
  "/profil": [
    {
      uid: "profil-rich",
      block: "rich-text",
      fields: {
        headline: "Sejarah & profil",
        subheadline: "KWT Srikandi Buana berdiri di Desa Ngadimulyo, Kecamatan Kedu.",
      },
    },
  ],
  "/program": [
    { uid: "program-list", block: "program-list", fields: { headline: "Program berjalan", limit: "6" } },
  ],
  "/produk": [
    { uid: "produk-grid", block: "product-grid", fields: { headline: "Katalog produk", limit: "8" } },
  ],
  "/kabar": [
    { uid: "kabar-news", block: "news-list", fields: { headline: "Kabar & artikel", limit: "6" } },
  ],
  "/kemitraan": [
    { uid: "mitra-rich", block: "rich-text", fields: { headline: "Bermitra dengan Srikandi Buana" } },
  ],
};

export interface HalamanPublik {
  blocks: CmsBlock[];
  /** true bila halaman ini pernah disunting organisasi. */
  shared: boolean;
}

/**
 * Ambil susunan block sebuah halaman dari dokumen bersama.
 * Jatuh ke default bila basis data belum siap — halaman tidak pernah pecah.
 */
export async function halamanPublik(path: string): Promise<HalamanPublik> {
  const def = DEFAULT[path] ?? [];
  try {
    const row = await readState();
    const stored = (row?.payload as { cmsPages?: CmsPage[] } | null)?.cmsPages;
    if (!Array.isArray(stored)) return { blocks: def, shared: false };
    const found = stored.find((p) => p.path === path);
    if (!found || !Array.isArray(found.blocks) || !found.blocks.length) {
      return { blocks: def, shared: false };
    }
    return { blocks: found.blocks, shared: true };
  } catch {
    return { blocks: def, shared: false };
  }
}

/** Baca satu field dari susunan block, dengan fallback. */
export function teksDari(
  blocks: CmsBlock[],
  block: BlockKey,
  key: keyof CmsBlockFields,
  fallback: string,
): string {
  const found = blocks.find((b) => b.block === block);
  const value = found?.fields?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Pintasan: ambil satu field dari sebuah halaman. */
export async function teks(
  path: string,
  block: BlockKey,
  key: keyof CmsBlockFields,
  fallback: string,
): Promise<string> {
  const { blocks } = await halamanPublik(path);
  return teksDari(blocks, block, key, fallback);
}
