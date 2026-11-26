"use client";

/**
 * Pengaturan situs untuk footer publik.
 *
 * RIWAYAT PERBAIKAN
 * -----------------
 * Versi sebelumnya membaca `localStorage` (`sb_site_settings_v1`). Panel studio
 * menulis ke sana, jadi pengaturan hanya berubah di peramban yang menyunting —
 * sekaligus menduplikasi sumber data, karena `site.update` di reducer SUDAH
 * menulis `site` ke dokumen bersama. Dua tempat menyimpan hal yang sama, dan
 * yang dibaca publik adalah yang salah.
 *
 * Sekarang footer membaca `state.site` dari dokumen bersama. Satu sumber,
 * satu kebenaran: yang disimpan pengurus terlihat semua pengunjung.
 *
 * CATATAN HIDRASI
 * ---------------
 * Footer dirender di server. Server memakai `DEFAULT_SITE_SETTINGS` (HTML awal
 * deterministik), lalu setelah mount nilai bersama mengambil alih. Bila
 * organisasi belum pernah menyunting, keduanya identik sehingga tidak ada
 * kedipan.
 */
import { useMemo } from "react";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/reducer";
import { usePublicContent } from "@/lib/public-content";

export type { SiteSettings };

/** Nilai efektif: pengaturan bersama bila ada, default bila belum. */
export function useSiteSettings(): SiteSettings {
  const { site: sharedSite, ready } = usePublicContent();
  return useMemo(() => {
    const site = ready ? sharedSite : undefined;
    if (!site) return DEFAULT_SITE_SETTINGS;
    // Pastikan bentuknya utuh walau dokumen lama tidak punya sebagian field.
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...site,
      social: Array.isArray(site.social) && site.social.length
        ? DEFAULT_SITE_SETTINGS.social.map((base) => ({
            ...base,
            ...(site.social.find((s) => s.key === base.key) ?? {}),
          }))
        : DEFAULT_SITE_SETTINGS.social,
    };
  }, [ready, sharedSite]);
}

/** Nilai awal untuk formulir studio sebelum pengguna mengubah apa pun. */
export function loadSiteSettings(): SiteSettings {
  return DEFAULT_SITE_SETTINGS;
}

export { DEFAULT_SITE_SETTINGS };
