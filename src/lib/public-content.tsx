"use client";

/**
 * Konten publik — jalur baca khusus untuk situs publik.
 *
 * MENGAPA TIDAK MEMAKAI `useStore`
 * --------------------------------
 * `StoreProvider` memuat SELURUH dokumen operasional: buku induk anggota, kas,
 * surat, jurnal, gaji, kontak. Itu wajar di dalam ruang kerja yang sudah
 * terautentikasi, tetapi tidak wajar dikirim ke peramban pengunjung anonim.
 *
 * Halaman publik hanya butuh dua hal dari dokumen bersama:
 *
 *   - `site`     — nama, logo, kontak, tautan sosial untuk header & footer;
 *   - `cmsPages` — teks halaman yang disunting lewat Website Studio.
 *
 * Karena itu ada jalur baca tersendiri yang MEMILIH hanya dua bidang itu di
 * server, lalu mengirimkan hasilnya. Sisa dokumen tidak pernah meninggalkan
 * server.
 *
 * CATATAN HIDRASI
 * ---------------
 * HTML awal dirender dari nilai default (deterministik). Setelah mount, jalur
 * ini mengambil nilai bersama dan menggantikannya. Bila organisasi belum
 * pernah menyunting, keduanya identik sehingga tidak ada kedipan.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadPublicContent } from "@/app/actions/public";
import { DEFAULT_SITE_SETTINGS, type CmsPage, type SiteSettings } from "@/lib/reducer";

export interface PublicContent {
  site: SiteSettings;
  cmsPages: CmsPage[];
  /** true bila nilai berasal dari dokumen bersama, bukan default kode. */
  shared: boolean;
  ready: boolean;
}

const AWAL: PublicContent = {
  site: DEFAULT_SITE_SETTINGS,
  cmsPages: [],
  shared: false,
  ready: false,
};

const Ctx = createContext<PublicContent>(AWAL);

export function PublicContentProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** Nilai hasil render server — menghindari satu putaran bolak-balik. */
  initial?: Partial<PublicContent>;
}) {
  const [isi, setIsi] = useState<PublicContent>({ ...AWAL, ...initial });

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await loadPublicContent();
        if (batal || !res.ok) return;
        setIsi({
          site: res.site ?? DEFAULT_SITE_SETTINGS,
          cmsPages: res.cmsPages ?? [],
          shared: !!res.shared,
          ready: true,
        });
      } catch {
        /* biarkan default: situs tetap tampil walau basis data tak terjangkau */
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  return <Ctx.Provider value={isi}>{children}</Ctx.Provider>;
}

export function usePublicContent(): PublicContent {
  return useContext(Ctx);
}
