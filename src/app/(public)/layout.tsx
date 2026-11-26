import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { PublicContentProvider } from "@/lib/public-content";
import { readState } from "@/lib/state-store";
import type { CmsPage, SiteSettings } from "@/lib/reducer";

/**
 * Layout situs publik.
 *
 * `PublicContentProvider` menerima nilai awal dari server supaya HTML pertama
 * sudah memuat konten yang benar — bukan teks default yang berganti sesudah
 * hidrasi. Bila basis data belum berisi dokumen, nilainya `null` dan provider
 * memakai susunan default di kode.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let site: SiteSettings | null = null;
  let cmsPages: CmsPage[] | null = null;

  try {
    const row = await readState();
    if (row?.payload && typeof row.payload === "object") {
      const p = row.payload as Partial<{ site: SiteSettings; cmsPages: CmsPage[] }>;
      site = p.site && typeof p.site === "object" ? p.site : null;
      cmsPages = Array.isArray(p.cmsPages) ? p.cmsPages : null;
    }
  } catch {
    // Basis data belum siap: situs tetap tampil dengan susunan default.
  }

  return (
    <PublicContentProvider
      initial={{
        site: site ?? undefined,
        cmsPages: cmsPages ?? undefined,
        shared: !!(site || cmsPages),
        ready: true,
      }}
    >
      <div className="public-canvas min-h-dvh">
        <PublicHeader />
        {/* one named content region: the body shell is `main > .sb-shell` */}
        <main className="public-body">{children}</main>
        <PublicFooter />
      </div>
    </PublicContentProvider>
  );
}
