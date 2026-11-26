import Link from "next/link";
import type { Metadata } from "next";
import { MENU_DRAFT } from "@/data/content";

import { BLOCK_REGISTRY, PAGE_COMPOSITIONS } from "@/config/blocks";
import { MEGA_MENU } from "@/config/navigation";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { SiteSettingsPanel } from "./site-settings-panel";
import { StudioTabs } from "./studio-tabs";
import { HalamanPanel } from "./halaman-panel";
import { ProductCrud } from "@/components/master-crud";

export const metadata: Metadata = { title: "Website Studio" };

/* ════════════════════════════════════════════════════════════════════════
 * PANEL 2 — BLOCK (katalog referensi)
 * ════════════════════════════════════════════════════════════════════════ */
function BlockPanel() {
  const groups = Array.from(new Set(BLOCK_REGISTRY.map((b) => b.group)));
  return (
    <Card>
      <CardHeader
        title="Registry block"
        subtitle="Hanya block terdaftar di sini yang dapat dipakai halaman. Katalog ini referensi — bukan tempat menyunting."
        action={<Badge tone="neutral">{BLOCK_REGISTRY.length} block</Badge>}
      />
      <div className="space-y-4 p-4">
        {groups.map((g) => {
          const items = BLOCK_REGISTRY.filter((b) => b.group === g);
          return (
            <div key={g}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted2">{g}</span>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] text-muted2">{items.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((b) => (
                  <div key={b.key} className="rounded-[9px] border border-line bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-semibold leading-tight text-ink">{b.name}</span>
                      <code className="shrink-0 rounded bg-surface2 px-1 py-0.5 text-[9px] text-muted2">
                        {b.key}
                      </code>
                    </div>
                    <div className="mt-1 text-[10.5px] leading-snug text-muted">{b.description}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {b.fields.map((f) => (
                        <span
                          key={f.name}
                          className={`rounded px-1.5 py-0.5 text-[9.5px] ${
                            f.required
                              ? "bg-[var(--sb-tint-green,#e7f2e9)] text-ink2"
                              : "bg-surface2 text-ink2"
                          }`}
                          title={f.required ? "Wajib" : "Opsional"}
                        >
                          {f.name}
                          {f.required ? "*" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * PANEL 3 — MENU (navigasi utama)
 * ════════════════════════════════════════════════════════════════════════ */
function MenuPanel() {
  const totalLinks = MEGA_MENU.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Grup menu" value={MEGA_MENU.length} note="Kolom pada mega menu" tone="accent" />
        <StatCard label="Tautan aktif" value={totalLinks} note="Seluruh tujuan" tone="info" />
        <StatCard
          label="Status"
          value={MENU_DRAFT.status === "published" ? "Terbit" : "Draf"}
          note={`Diperbarui ${MENU_DRAFT.updatedAt}`}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader
          title="Struktur mega menu"
          subtitle="Grup, jumlah tautan, dan contoh tujuan. Penyuntingan menu mengikuti alur Menu Builder."
          action={<Badge tone="success">Terbit</Badge>}
        />
        <div className="sb-scroll">
          <table className="sb-table min-w-[560px]">
            <thead>
              <tr>
                <th className="w-[28%]">Grup</th>
                <th className="w-[10%]">Tautan</th>
                <th>Tujuan</th>
              </tr>
            </thead>
            <tbody>
              {MEGA_MENU.map((g) => (
                <tr key={g.heading}>
                  <td className="font-semibold text-ink">{g.heading}</td>
                  <td>
                    <Badge tone="neutral">{g.items.length}</Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {g.items.slice(0, 4).map((i) => (
                        <code
                          key={i.href}
                          className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] text-muted"
                        >
                          {i.href}
                        </code>
                      ))}
                      {g.items.length > 4 ? (
                        <span className="text-[10px] text-muted2">+{g.items.length - 4}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * HALAMAN
 * ════════════════════════════════════════════════════════════════════════ */
export default async function WebsiteStudio({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  const { halaman } = await searchParams;
  const activePath = halaman ?? "/";
  const composition = PAGE_COMPOSITIONS[activePath] ?? [];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Website Studio"
        title="Halaman, block, menu & pengaturan"
        description="Bangun halaman dari block terdaftar. Konten draf tidak memengaruhi website live sampai diterbitkan; setiap perubahan tercatat pada riwayat revisi."
        actions={
          <Link href="/" className="sb-btn sb-btn-outline">
            Lihat live
          </Link>
        }
      />

      <StudioTabs
        badges={{
          // Jumlah halaman adalah konstanta susunan default. Angka per-halaman
          // yang sebenarnya (blok, waktu sunting) tampil di panel Halaman.
          halaman: "6",
          block: String(BLOCK_REGISTRY.length),
          menu: String(MEGA_MENU.length),
        }}
        pengaturan={<SiteSettingsPanel />}
        halaman={<HalamanPanel activePath={activePath} />}
        katalog={
          <div>
            <Card className="mb-4">
              <CardHeader
                title="Katalog produk yang tampil di situs"
                subtitle="Harga, stok, dan status tayang di sini adalah yang dibaca /produk dan kasir POS."
                action={<Link href="/produk" className="sb-btn sb-btn-outline">Lihat katalog</Link>}
              />
              <p className="px-4 pb-4 text-[12px] leading-relaxed text-muted">
                Produk berstatus <strong>Draf</strong> tidak muncul di situs publik walau datanya tersimpan.
                Mengubah harga di sini langsung berlaku — tidak perlu menerbitkan ulang halaman.
              </p>
            </Card>
            <ProductCrud />
          </div>
        }
        block={<BlockPanel />}
        menu={<MenuPanel />}
      />

      <div className="mt-5">
        <Notice tone="warning" title="Batas Website Studio">
          Konten publik hanyalah proyeksi. Data operasional dan stok internal tidak menjadi publik
          hanya karena halaman dipublikasikan. Menu tidak dapat dipakai untuk membuka data privat ke
          mitra tanpa data-sharing grant.
        </Notice>
      </div>
    </div>
  );
}
