import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Blocks, ExternalLink, Menu, PanelsTopLeft } from "lucide-react";
import {
  Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard,
} from "@/components/ui";
import { BLOCK_REGISTRY, PAGE_COMPOSITIONS } from "@/config/blocks";
import { MEGA_MENU } from "@/config/navigation";

export const metadata: Metadata = { title: "Website Studio" };

export default function WebsiteStudio() {
  const compositions = Object.entries(PAGE_COMPOSITIONS);
  const menuLinkCount = MEGA_MENU.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Website Studio"
        title="Struktur website publik"
        description="Inventaris halaman, block, dan menu yang saat ini ditentukan pada source code. Editor konten dan publikasi dinamis belum terhubung ke penyimpanan bersama."
        actions={<Link href="/" className="sb-btn sb-btn-outline">Lihat website publik <ExternalLink size={13} /></Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Komposisi halaman" value={compositions.length} note="Didefinisikan pada PAGE_COMPOSITIONS" tone="info" icon={<PanelsTopLeft size={17} />} />
        <StatCard label="Block terdaftar" value={BLOCK_REGISTRY.length} note="Allowlist pada source code" tone="success" icon={<Blocks size={17} />} />
        <StatCard label="Tautan mega menu" value={menuLinkCount} note={MEGA_MENU.length + " kelompok menu"} tone="neutral" icon={<Menu size={17} />} />
      </div>

      <div className="mt-4">
        <Notice tone="warning" title="Editor dan pengaturan footer dinonaktifkan">
          Panel sebelumnya menyimpan pilihan logo, kontak, dan tautan sosial pada localStorage browser. Perubahan tersebut tidak menjadi pengaturan bersama untuk seluruh pengunjung dan tidak mempunyai audit trail server. Karena itu panel simpan/publikasi tidak ditampilkan sebagai fitur aktif.
        </Notice>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Card>
          <CardHeader
            title="Komposisi halaman"
            subtitle="Definisi source-controlled; bukan daftar halaman yang diedit dari database"
          />
          {compositions.length ? (
            <div className="divide-y divide-line">
              {compositions.map(([path, blocks]) => (
                <article key={path} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-ink">{path}</span>
                    <Badge tone="neutral">{blocks.length} block</Badge>
                  </div>
                  {blocks.length ? (
                    <ol className="mt-2 space-y-1.5">
                      {blocks.map((item, index) => {
                        const definition = BLOCK_REGISTRY.find((block) => block.key === item.block);
                        return (
                          <li key={item.block + index} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10.5px]">
                            <span className="w-4 shrink-0 text-muted2">{index + 1}.</span>
                            <span className="font-semibold text-ink2">{definition?.name ?? item.block}</span>
                            <span className="font-mono text-[9.5px] text-muted2">{item.block}</span>
                            <span className="text-muted">· {item.note}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="mt-2 text-[10.5px] text-muted2">Belum ada block yang didefinisikan.</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4"><EmptyState title="Belum ada komposisi halaman" body="Definisi halaman belum tersedia pada registry source." /></div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Registry block" subtitle="Komponen yang diizinkan pada komposisi source" />
            <div className="divide-y divide-line">
              {BLOCK_REGISTRY.map((block) => (
                <div key={block.key} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-ink">{block.name}</span>
                    <Badge tone="neutral">{block.group}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{block.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {block.fields.map((field) => (
                      <span key={field.name} className="rounded bg-paper px-1.5 py-0.5 font-mono text-[9px] text-muted2">
                        {field.name}{field.required ? "*" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Mega menu source" subtitle="Menu yang digunakan situs saat ini" />
            <div className="divide-y divide-line">
              {MEGA_MENU.map((group) => (
                <div key={group.heading} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-[11.5px] font-medium text-ink">{group.heading}</span>
                  <Badge tone="neutral">{group.items.length} tautan</Badge>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link href="/bantuan#peta-situs" className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-700">
                Peta situs publik <ArrowRight size={12} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Notice tone="info" title="Cara perubahan yang berlaku saat ini">
          Perubahan komposisi halaman, block, dan mega menu dilakukan melalui perubahan source code yang direview, lulus CI, lalu dirilis melalui pipeline aplikasi. Halaman ini tidak mengubah website live.
        </Notice>
        <Notice tone="warning" title="Penyimpanan bersama belum tersedia">
          Registry konten, revisi halaman, publikasi, media library, dan audit perubahan website belum disatukan dalam CMS/database pada versi ini. Jangan memasukkan kontak resmi atau data pribadi melalui panel browser lokal.
        </Notice>
      </div>
    </div>
  );
}
