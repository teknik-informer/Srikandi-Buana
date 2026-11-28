import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Blocks, Building2, Database, GitBranch, Palette, Workflow } from "lucide-react";
import { Badge, Card, CardHeader, Notice, ComingSoonBadge } from "@/components/ui";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Studio Pengelola" };

const BUILDERS = [
  {
    name: "Website Studio",
    href: "/studio/website",
    description: "Editor identitas, Hero, banner, fitur publik, navigasi, footer, dan kebijakan sudah tersimpan. CMS halaman dan revisi konten masih disiapkan.",
    status: "Editor aktif",
    comingSoon: "CMS halaman & revisi",
    icon: <Blocks size={16} />,
  },
  {
    name: "Application Studio",
    href: "/studio/aplikasi",
    description: "Registry aplikasi bidang aktif. Pengelolaan template, cloning, dan menu instance belum tersedia.",
    status: "Registry live",
    comingSoon: "Template & cloning",
    icon: <Building2 size={16} />,
  },
  {
    name: "Data & Form Builder",
    href: "/studio/data",
    description: "Modul domain operasional tersedia. Pembuatan formulir generik dan versi skema masih disiapkan.",
    status: "Modul domain live",
    comingSoon: "Form Builder",
    icon: <Database size={16} />,
  },
  {
    name: "Dashboard Studio",
    href: "/studio/dashboard",
    description: "Dashboard operasional dapat dibuka sesuai izin. Pengaturan grid, widget, dan tata letak per peran belum tersimpan.",
    status: "Dashboard aktif",
    comingSoon: "Widget Layout",
    icon: <Blocks size={16} />,
  },
  {
    name: "Workflow Studio",
    href: "/studio/workflow",
    description: "Pemantauan antrean domain aktif. Definisi tahapan, approver, SLA, dan delegasi generik belum tersedia.",
    status: "Antrean live",
    comingSoon: "Workflow Editor",
    icon: <Workflow size={16} />,
  },
  {
    name: "Organization Studio",
    href: "/studio/organisasi",
    description: "Registry unit, anggota aktif, dan penugasan dapat dibaca. Editor perubahan struktur dan masa jabatan masih disiapkan.",
    status: "Registry live",
    comingSoon: "Editor tata kelola",
    icon: <Building2 size={16} />,
  },
  {
    name: "Design & Theme",
    href: "/studio/tema",
    description: "Preset, palet, radius, penyimpanan tema organisasi, dan audit perubahan telah aktif. Density per aplikasi belum tersedia.",
    status: "Theme Manager aktif",
    comingSoon: "Density per aplikasi",
    icon: <Palette size={16} />,
  },
  {
    name: "Module Manager",
    href: "/studio/modul",
    description: "Status aplikasi dan unit bidang dibaca dari registry. Sakelar modul turunan belum memiliki penyimpanan.",
    status: "Registry live",
    comingSoon: "Toggle submodul",
    icon: <Blocks size={16} />,
  },
  {
    name: "Release Manager",
    href: "/studio/rilis",
    description: "Gerbang rilis dan sumber CI/CD aktif. Approval konfigurasi dan metadata rollback belum disimpan di Studio.",
    status: "CI/CD aktif",
    comingSoon: "Approval & rollback",
    icon: <GitBranch size={16} />,
  },
];

export default async function StudioHome() {
  await requireRoles(["platform_admin", "organization_admin"]);
  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.studio}
        title="Studio Pengelola"
        lead="Pusat kendali builder organisasi. Status baca-saja, registry aktif, dan fitur yang belum memiliki penyimpanan dijelaskan secara terbuka."
        facts={[`${BUILDERS.length} area pengelolaan`, "Akses administrator"]}
        actions={[
          { href: "/studio/website", label: "Website Studio", primary: true },
          { href: "/", label: "Lihat website publik" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {BUILDERS.map((builder) => (
          <Link key={builder.href} href={builder.href} className="group rounded-[14px] border border-line bg-white p-4 transition hover:border-primary-300 hover:shadow-[var(--sb-shadow)]">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-paper text-ink2">{builder.icon}</span>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Badge tone={builder.status.toLowerCase().includes("aktif") || builder.status.includes("live") ? "success" : "neutral"}>{builder.status}</Badge>
                {builder.comingSoon ? <ComingSoonBadge label={builder.comingSoon} /> : null}
              </div>
            </div>
            <h2 className="mt-3 text-[12.5px] font-semibold text-ink group-hover:text-primary-800">{builder.name}</h2>
            <p className="mt-1 min-h-[48px] text-[10.5px] leading-relaxed text-muted">{builder.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-700">Buka builder <ArrowRight size={12} /></span>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Prinsip pengelolaan" subtitle="Studio mengatur konfigurasi yang didukung, bukan menggantikan proses organisasi" />
          <div className="space-y-2 px-4 py-3 text-[11.5px] leading-relaxed text-muted">
            <p>Perubahan identitas, struktur, mandat, dan penugasan mengikuti keputusan organisasi dan alur persetujuan yang sah.</p>
            <p>Perubahan kode, skema database, dan perilaku inti melalui review developer, CI, backup, dan rilis terkontrol.</p>
            <p>Builder tidak boleh mengubah ledger, stok, permission, atau data anggota hanya melalui state browser.</p>
          </div>
        </Card>
        <Notice tone="warning" title="Batas editor konfigurasi">
          Label Segera Hadir menandai komponen yang belum mempunyai penyimpanan dan alur kerja lengkap. Registry operasional, Website Studio, Theme Manager, serta pemantauan antrean yang sudah aktif tetap dapat digunakan sesuai hak akses.
        </Notice>
      </div>
    </div>
  );
}
