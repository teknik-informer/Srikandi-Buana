import type { Metadata } from "next";
import { DESIGN_PRESETS } from "@/data/content";
import { Card, CardHeader, Notice, PageHeader, Badge } from "@/components/ui";

const TOKENS = [
  { name: "Primary", value: "#38571a", use: "Aksi utama, navigasi aktif" },
  { name: "Accent", value: "#d58400", use: "Perhatian, CTA sekunder" },
  { name: "Surface 2", value: "#ebebeb", use: "Latar sekunder, chip" },
  { name: "Border strong", value: "#c0c0c0", use: "Garis kontrol form" },
  { name: "Ink", value: "#1c2115", use: "Teks utama" },
  { name: "Muted", value: "#6a6f61", use: "Teks sekunder" },
];

export default function TemaStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Design & Theme Manager"
        title="Token visual & preset"
        description="Skala tipografi, spacing, radius, dan warna ditetapkan sekali. Semua aplikasi mengikuti token yang sama; density boleh berbeda per layout."
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Preset tema" subtitle="Preset membatasi perubahan agar kontras tetap aman" action={<Badge tone="neutral">3 preset</Badge>} />
          <div className="divide-y divide-line">
            {DESIGN_PRESETS.map((p) => (
              <div key={p.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="h-8 w-8 rounded-md border border-line" style={{ background: p.primary }} />
                    <span className="h-8 w-8 rounded-md border border-line" style={{ background: p.accent }} />
                    <span className="h-8 w-8 rounded-md border border-line" style={{ background: p.surface }} />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{p.name}</div>
                    <div className="text-[10.5px] text-muted2">Density {p.density} · Primary {p.primary}</div>
                  </div>
                </div>
                <Badge tone={p.name.includes("aktif") ? "success" : "neutral"}>{p.name.includes("aktif") ? "Aktif" : "Tersedia"}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Token inti" subtitle="Blueprint §11.5" />
            <div className="divide-y divide-line">
              {TOKENS.map((t) => (
                <div key={t.name} className="flex items-center justify-between gap-2 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded border border-line" style={{ background: t.value }} />
                    <span className="text-[12px] font-medium text-ink">{t.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted">{t.value}</span>
                  <span className="hidden text-[10.5px] text-muted2 sm:block">{t.use}</span>
                </div>
              ))}
            </div>
          </Card>
          <Notice tone="info" title="Aksesibilitas">
            Semua token diuji WCAG 2.2 AA (teks kecil, label, tombol, badge, focus indicator). Status
            tidak pernah disampaikan hanya melalui warna.
          </Notice>
        </div>
      </div>
    </div>
  );
}
