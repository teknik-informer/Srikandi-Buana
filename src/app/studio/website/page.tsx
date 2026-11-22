import Link from "next/link";
import type { Metadata } from "next";
import { STUDIO_PAGES, MENU_DRAFT } from "@/data/content";
import { BLOCK_REGISTRY, PAGE_COMPOSITIONS } from "@/config/blocks";
import { MEGA_MENU } from "@/config/navigation";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Website Studio" };

export default async function WebsiteStudio({ searchParams }: { searchParams: Promise<{ halaman?: string }> }) {
  const { halaman } = await searchParams;
  const activePath = halaman ?? "/";
  const composition = PAGE_COMPOSITIONS[activePath] ?? [];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Website Studio"
        title="Halaman, block & menu"
        description="Bangun halaman dari block terdaftar. Konten draf tidak memengaruhi website live sampai diterbitkan; setiap perubahan tercatat pada riwayat revisi."
        actions={<Link href="/" className="sb-btn sb-btn-outline">Lihat live</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Halaman" value={STUDIO_PAGES.length} note={`${STUDIO_PAGES.filter((p) => p.status === "published").length} terbit`} tone="success" />
        <StatCard label="Block terdaftar" value={BLOCK_REGISTRY.length} note="Allowlist tervalidasi" tone="info" />
        <StatCard label="Menu utama" value={`${MENU_DRAFT.items} grup`} note={`${MENU_DRAFT.subItems} tautan aktif`} tone="accent" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Halaman situs" subtitle="Pilih untuk mengedit komposisi" />
          <div className="p-1.5">
            {STUDIO_PAGES.map((p) => (
              <Link
                key={p.path}
                href={`/studio/website?halaman=${encodeURIComponent(p.path)}`}
                className={`flex items-center justify-between gap-2 rounded-[7px] px-2.5 py-2 text-[11.5px] ${activePath === p.path ? "bg-primary text-primary-50" : "text-ink2 hover:bg-surface2"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.title}</span>
                  <span className={`font-mono text-[10px] ${activePath === p.path ? "text-primary-200" : "text-muted2"}`}>{p.path}</span>
                </span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.status === "published" ? "bg-[var(--sb-success)]" : "bg-[var(--sb-warning)]"}`} />
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={`Komposisi: ${STUDIO_PAGES.find((p) => p.path === activePath)?.title ?? activePath}`}
              subtitle="Susunan block sesuai registry — dieksekusi sebagai konfigurasi terstruktur, bukan kode"
              action={<Badge tone="neutral">{composition.length} block</Badge>}
            />
            {composition.length ? (
              <ol className="divide-y divide-line">
                {composition.map((c, i) => {
                  const def = BLOCK_REGISTRY.find((b) => b.key === c.block);
                  return (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface2 text-[10.5px] font-bold text-ink2">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12.5px] font-semibold text-ink">{def?.name ?? c.block}</span>
                          <span className="font-mono text-[10px] text-muted2">{c.block}</span>
                          <Badge tone="neutral">{def?.group}</Badge>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">{c.note}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" className="rounded border border-line px-1.5 py-1 text-[10.5px] text-muted" disabled>↑</button>
                        <button type="button" className="rounded border border-line px-1.5 py-1 text-[10.5px] text-muted" disabled>↓</button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="px-4 py-6 text-[12px] text-muted">Belum ada komposisi tersimpan untuk halaman ini.</div>
            )}
            <div className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] text-muted2">
              Pengurutan block & pengeditan field dilakukan di Page Editor (layout studio-editor). Pada
              demo ini kontrol edit dinonaktifkan agar tidak ada perubahan konfigurasi yang tersimpan palsu.
            </div>
          </Card>

          <Card>
            <CardHeader title="Registry block" subtitle="Hanya block ini yang dapat dipakai halaman" />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {BLOCK_REGISTRY.map((b) => (
                <div key={b.key} className="rounded-sb-sm border border-line bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-ink">{b.name}</span>
                    <Badge tone="neutral">{b.group}</Badge>
                  </div>
                  <div className="mt-0.5 text-[10.5px] leading-snug text-muted">{b.description}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {b.fields.map((f) => (
                      <span key={f.name} className="rounded bg-surface2 px-1.5 py-0.5 text-[9.5px] text-ink2">{f.name}{f.required ? "*" : ""}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Mega menu" subtitle={`Status: ${MENU_DRAFT.status} · ${MENU_DRAFT.updatedAt}`} action={<Badge tone="success">Terbit</Badge>} />
            <div className="sb-scroll">
              <table className="sb-table min-w-[560px]">
                <thead><tr><th>Grup</th><th>Tautan</th><th>Contoh tujuan</th></tr></thead>
                <tbody>
                  {MEGA_MENU.map((g) => (
                    <tr key={g.heading}>
                      <td className="font-semibold text-ink">{g.heading}</td>
                      <td>{g.items.length}</td>
                      <td className="font-mono text-[10.5px] text-muted">{g.items.map((i) => i.href).slice(0, 3).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

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
