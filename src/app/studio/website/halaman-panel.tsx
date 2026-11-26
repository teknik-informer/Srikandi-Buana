"use client";

/**
 * Daftar halaman situs di Website Studio.
 *
 * Sebelumnya panel ini memakai `STUDIO_PAGES` di `data/content.ts` — daftar
 * statis dengan tanggal dan jumlah revisi karangan. Studio menampilkan
 * "12 revisi" untuk halaman yang belum pernah disunting siapa pun, dan tanggal
 * yang sama sekali tidak berasal dari dokumen.
 *
 * Sekarang isinya membaca dokumen bersama: judul, jumlah blok, status, dan
 * waktu sunting terakhir yang sebenarnya — atau "belum disunting" bila memang
 * belum pernah. Dipisah ke berkas sendiri karena ia butuh hook klien, sedangkan
 * `page.tsx` adalah server component.
 */
import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";
import { defaultPages, mergePages, isEdited } from "@/lib/cms";
import { useStore } from "@/lib/store";
import { PageEditor } from "./page-editor";

export function HalamanPanel({ activePath }: { activePath: string }) {
  const { state, ready } = useStore();
  const halaman = useMemo(
    () => (ready ? mergePages(state.cmsPages) : defaultPages()),
    [ready, state.cmsPages],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader title="Halaman situs" subtitle={`${halaman.length} halaman`} />
        <nav className="p-1.5" aria-label="Daftar halaman">
          {halaman.map((p) => {
            const isActive = activePath === p.path;
            const disunting = isEdited(state.cmsPages, p.path);
            return (
              <Link
                key={p.path}
                href={`/studio/website?halaman=${encodeURIComponent(p.path)}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-[7px] px-2.5 py-2 text-[11.5px] transition ${
                  isActive ? "bg-primary text-primary-50" : "text-ink2 hover:bg-surface2"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.title}</span>
                  <span className={`font-mono text-[10px] ${isActive ? "text-primary-200" : "text-muted2"}`}>
                    {p.path} · {p.blocks.length} block
                  </span>
                  <span className={`block truncate text-[9.5px] ${isActive ? "text-primary-200" : "text-muted2"}`}>
                    {disunting ? `${p.updatedAt} · ${p.updatedBy}` : "belum disunting · susunan awal"}
                  </span>
                </span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    p.status === "published" ? "bg-[var(--sb-success)]" : "bg-[var(--sb-warning)]"
                  }`}
                  title={p.status === "published" ? "Terbit" : "Dalam tinjauan"}
                />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line px-2.5 py-2 text-[10px] leading-relaxed text-muted2">
          Pilih halaman untuk menyunting susunan block-nya. Perubahan tersimpan ke basis data
          bersama — terlihat semua pengunjung.
        </div>
      </Card>

      <div className="min-w-0">
        <PageEditor activePath={activePath} />
      </div>
    </div>
  );
}
