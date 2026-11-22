import Link from "next/link";
import type { Metadata } from "next";
import { APPS } from "@/config/apps";
import { FIELDS } from "@/config/fields";
import { FieldTemplates } from "@/components/studio/field-templates";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { AppIcon } from "@/components/brand";

export const metadata: Metadata = { title: "Application Studio" };

export default function AplikasiStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Application Studio"
        title="Aplikasi & template"
        description="Membuat instance aplikasi bidang dari template, mengatur menu dan modul yang diaktifkan. Aplikasi hanya muncul untuk pengguna berizin; menonaktifkan modul tidak menghapus data."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Aplikasi aktif" value={APPS.filter((a) => a.key !== "studio" && a.key !== "launcher").length} note="Termasuk 4 bidang" tone="success" />
        <StatCard label="Template tersedia" value={4} note="Bidang, sekretariat, portal, POS" tone="info" />
        <StatCard label="Bidang di registry" value={FIELDS.length} note="Status konfigurasi terpisah" tone="accent" href="/studio/organisasi" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Instance aplikasi" subtitle="Satu codebase modular; instance adalah konfigurasi" />
          <div className="divide-y divide-line">
            {APPS.filter((a) => a.key !== "launcher").map((a) => (
              <div key={a.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface2 text-ink2"><AppIcon name={a.icon} size={14} /></span>
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{a.name}</div>
                    <div className="text-[10.5px] text-muted2">{a.audience}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.badge && <Badge tone={a.badge === "Bidang" ? "accent" : "info"}>{a.badge}</Badge>}
                  <Link href={a.href} className="rounded border border-line px-2 py-1 text-[10.5px] font-semibold text-ink2 hover:border-primary-300">Buka</Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <FieldTemplates />
          <Notice tone="info" title="Yang tidak boleh dilakukan Studio">
            Mengganti skema/relasi database inti tanpa migrasi developer, melemahkan aturan ledger, atau
            mengganti komponen keamanan dengan HTML kustom.
          </Notice>
        </div>
      </div>
    </div>
  );
}
