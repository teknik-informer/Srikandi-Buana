"use server";

/**
 * Server action untuk situs publik.
 *
 * Hanya mengirim dua bidang: `site` dan `cmsPages`. Dokumen operasional
 * (anggota, kas, surat, jurnal) tidak pernah ikut — pengunjung anonim tidak
 * berhak menerimanya, dan mengirim seluruh dokumen ke setiap kunjungan beranda
 * hanya membuang bandwidth tanpa manfaat.
 */
import { readState } from "@/lib/state-store";
import { DEFAULT_SITE_SETTINGS, type CmsPage, type SiteSettings } from "@/lib/reducer";

export interface PublicContentResult {
  ok: boolean;
  site: SiteSettings | null;
  cmsPages: CmsPage[] | null;
  /** true bila nilai berasal dari dokumen bersama. */
  shared: boolean;
  message?: string;
}

export async function loadPublicContent(): Promise<PublicContentResult> {
  try {
    const row = await readState();
    if (!row) {
      // Dokumen belum pernah ditulis: pakai default kode.
      return { ok: true, site: null, cmsPages: null, shared: false };
    }
    const p = (row.payload ?? {}) as Partial<{ site: SiteSettings; cmsPages: CmsPage[] }>;

    // Bentuk `site` divalidasi seadanya: kalau dokumen lama tidak punya field
    // tertentu, konsumen menggabungkannya dengan default.
    const site =
      p.site && typeof p.site === "object" ? (p.site as SiteSettings) : null;

    const cmsPages = Array.isArray(p.cmsPages) ? (p.cmsPages as CmsPage[]) : null;

    return { ok: true, site, cmsPages, shared: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "basis data tidak tersedia";
    // Situs publik tidak boleh pecah hanya karena basis data sedang mati;
    // ia jatuh ke susunan default di kode.
    return {
      ok: false,
      site: DEFAULT_SITE_SETTINGS,
      cmsPages: null,
      shared: false,
      message: message.includes("DATABASE_NOT_CONFIGURED")
        ? "Basis data belum dikonfigurasi."
        : "Basis data tidak dapat dihubungi.",
    };
  }
}
