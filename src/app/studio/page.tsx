import Link from "next/link";
import type { Metadata } from "next";
import { STUDIO_PAGES, MENU_DRAFT, DESIGN_PRESETS } from "@/data/content";
import { FIELDS } from "@/config/fields";
import { BLOCK_REGISTRY } from "@/config/blocks";
import { APPS } from "@/config/apps";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Studio Pengelola" };

const BUILDERS = [
  { name: "Website Studio", href: "/studio/website", desc: "Halaman, section, block, menu, media, publikasi.", icon: "◫" },
  { name: "Application Studio", href: "/studio/aplikasi", desc: "Instance aplikasi bidang, menu, modul aktif.", icon: "▦" },
  { name: "Data & Form Builder", href: "/studio/data", desc: "Field, formulir, view, validasi, impor/ekspor.", icon: "▤" },
  { name: "Dashboard Builder", href: "/studio/dashboard", desc: "Widget, grid, filter, audience.", icon: "▥" },
  { name: "Workflow Builder", href: "/studio/workflow", desc: "Status, langkah, approver, notifikasi, SLA.", icon: "⇄" },
  { name: "Organization Studio", href: "/studio/organisasi", desc: "Registry bidang, tim, peran, cakupan.", icon: "◇" },
  { name: "Design & Theme", href: "/studio/tema", desc: "Token warna, tipografi, density, header/footer.", icon: "◐" },
  { name: "Modul & Ekstensi", href: "/studio/modul", desc: "Aktif/nonaktif modul, konfigurasi aman.", icon: "◈" },
  { name: "Rilis & Riwayat", href: "/studio/rilis", desc: "Draf, review, publish, rollback konfigurasi.", icon: "⟲" },
];

export default function StudioHome() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Studio Pengelola"
        title="Beranda Studio"
        description="Pusat kustomisasi: pengelola mengubah konten, halaman, menu, tema, modul, formulir, dashboard, dan alur yang didukung — tanpa menulis kode. Logika inti & keamanan tetap milik developer."
        actions={<Link href="/" className="sb-btn sb-btn-outline">Pratinjau website</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Halaman website" value={STUDIO_PAGES.length} note={`${STUDIO_PAGES.filter((p) => p.status === "published").length} terbit`} tone="success" href="/studio/website" />
        <StatCard label="Block terdaftar" value={BLOCK_REGISTRY.length} note="Allowlist, bukan HTML bebas" tone="info" href="/studio/website" />
        <StatCard label="Aplikasi" value={APPS.length} note="1 codebase modular" tone="accent" href="/studio/aplikasi" />
        <StatCard label="Bidang resmi" value={FIELDS.length} note="Registry terpisah dari aplikasi" href="/studio/organisasi" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Builder & pengelola" subtitle="Setiap builder terikat pada batas keamanan masing-masing" />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {BUILDERS.map((b) => (
                <Link key={b.href} href={b.href} className="group flex items-start gap-3 rounded-sb-sm border border-line bg-white p-3 transition hover:border-primary-300 hover:bg-primary-50/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-100 text-[15px] text-primary-800">{b.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-ink group-hover:text-primary-800">{b.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">{b.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Halaman terbaru" subtitle="Status draf → review → terbit" action={<Link href="/studio/website" className="text-[11.5px] font-semibold text-primary-700">Website Studio →</Link>} />
            <div className="divide-y divide-line">
              {STUDIO_PAGES.map((p) => (
                <div key={p.path} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{p.title} <span className="ml-1 font-mono text-[10.5px] font-normal text-muted2">{p.path}</span></div>
                    <div className="text-[10.5px] text-muted2">{p.blocks} block · {p.revisions} revisi · diubah {p.updatedAt} oleh {p.updatedBy}</div>
                  </div>
                  <StatusBadge status={p.status === "published" ? "Terbit" : p.status === "review" ? "Review" : "Draf"} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Konfigurasi aktif" subtitle="Ringkasan environment demo" />
            <dl className="divide-y divide-line text-[12px]">
              {[
                ["Blueprint", "V9.1"],
                ["Design preset", DESIGN_PRESETS[0].name],
                ["Mega menu", `${MENU_DRAFT.items} grup · ${MENU_DRAFT.subItems} tautan · terbit`],
                ["Mode data", "Demo berlabel"],
                ["Akuntansi eksternal", "Tidak ada (native)"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium text-ink2">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Notice tone="info" title="Batasan yang dijaga Studio">
            Studio tidak menjalankan JavaScript/SQL arbitrer dari browser, tidak mengganti skema inti
            tanpa migrasi, dan tidak boleh melemahkan aturan ledger, persetujuan, atau keamanan.
          </Notice>
          <Card className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Alur rilis</div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              {["Draf", "Pratinjau", "Review", "Terbit", "Riwayat"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 font-semibold text-primary-800">{s}</span>
                  {i < 4 && <span className="text-muted2">→</span>}
                </span>
              ))}
            </div>
            <Link href="/studio/rilis" className="mt-2.5 inline-block text-[11.5px] font-semibold text-primary-700">Buka Release Manager →</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
