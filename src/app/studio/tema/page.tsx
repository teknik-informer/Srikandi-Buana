import type { Metadata } from "next";
import { Palette, Type, Ruler } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";

import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Design & Theme Manager" };

const CURRENT_TOKENS = [
  { name: "Primary", value: "#127e2f", purpose: "Aksi utama dan navigasi aktif" },
  { name: "Accent", value: "#f0b429", purpose: "Penanda perhatian dan aksen" },
  { name: "Canvas", value: "#f8fafe", purpose: "Latar utama halaman" },
  { name: "Surface 2", value: "#f1f4f9", purpose: "Latar sekunder dan chip" },
  { name: "Border strong", value: "#cbd4e2", purpose: "Batas kontrol dan tabel" },
  { name: "Ink", value: "#0f1a2b", purpose: "Teks utama" },
  { name: "Muted", value: "#5c6a7d", purpose: "Teks sekunder" },
];

export default async function TemaStudio() {
  await requireRoles(["platform_admin", "organization_admin"]);
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Design & Theme Manager"
        title="Sistem desain"
        description="Token yang digunakan aplikasi saat ini dikelola melalui source stylesheet. Halaman ini adalah referensi baca-saja; perubahan tema dan preset dinamis belum disimpan pada registry organisasi."
        actions={<Badge tone="neutral">Source-controlled</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader
            title="Token visual aktif"
            subtitle="Nilai berikut mencerminkan token pada src/app/globals.css"
            action={<Palette size={16} className="text-muted2" />}
          />
          <div className="divide-y divide-line">
            {CURRENT_TOKENS.map((token) => (
              <div key={token.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-[8px] border border-line" style={{ backgroundColor: token.value }} />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-ink">{token.name}</span>
                    <span className="block text-[10.5px] text-muted">{token.purpose}</span>
                  </span>
                </div>
                <code className="font-mono text-[11px] text-muted2">{token.value}</code>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Skala tipografi & layout" action={<Type size={16} className="text-muted2" />} />
            <div className="divide-y divide-line">
              {[
                ["Font utama", "Plus Jakarta Sans / system fallback"],
                ["Shell maksimum", "1392 px"],
                ["Gutter kecil", "16 px"],
                ["Gutter desktop", "24 px"],
                ["Radius kartu", "16 px"],
                ["Radius kontrol", "10 px"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 px-4 py-3">
                  <span className="text-[11.5px] text-muted">{label}</span>
                  <span className="text-right text-[11.5px] font-medium text-ink">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-[10.5px] text-muted2">
              <Ruler size={13} /> Nilai dibaca dari token stylesheet, bukan dari konfigurasi database.
            </div>
          </Card>
          <Notice tone="warning" title="Editor preset belum tersedia">
            Pilihan preset, density per aplikasi, editor palet, dan penyimpanan versi tema belum terhubung ke registry. Tidak ada tombol yang mengubah tema sebagian atau hanya pada browser.
          </Notice>
          <Notice tone="info" title="Kontras dan aksesibilitas">
            Warna status harus tetap didampingi teks atau ikon. Perubahan token memerlukan pemeriksaan kontras dan uji tampilan pada perangkat kecil sebelum dirilis.
          </Notice>
        </div>
      </div>
    </div>
  );
}
