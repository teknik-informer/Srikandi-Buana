import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Blocks, Building2, Database, GitBranch, Palette, Workflow } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Studio Pengelola" };

const BUILDERS = [
  {
    name: "Website Studio",
    href: "/studio/website",
    description: "Inventaris source halaman, block, dan mega menu. Pengeditan/publikasi dinamis belum tersimpan bersama.",
    status: "Baca-saja",
    icon: <Blocks size={16} />,
  },
  {
    name: "Application Studio",
    href: "/studio/aplikasi",
    description: "Registry empat aplikasi bidang dan status aktif yang tersimpan pada organisasi.",
    status: "Registry live",
    icon: <Building2 size={16} />,
  },
  {
    name: "Data & Form Builder",
    href: "/studio/data",
    description: "Akses modul operasional domain. Form Builder generik belum memiliki registry dan penyimpanan jawaban.",
    status: "Katalog modul",
    icon: <Database size={16} />,
  },
  {
    name: "Dashboard Studio",
    href: "/studio/dashboard",
    description: "Tautan dashboard operasional yang berjalan. Susunan widget dinamis belum tersimpan.",
    status: "Katalog dashboard",
    icon: <Blocks size={16} />,
  },
  {
    name: "Workflow Studio",
    href: "/studio/workflow",
    description: "Pemantauan antrean jurnal, pendaftaran, rencana kerja, dan pesanan sesuai permission.",
    status: "Antrean live",
    icon: <Workflow size={16} />,
  },
  {
    name: "Organization Studio",
    href: "/studio/organisasi",
    description: "Registry organisasi, unit, keanggotaan aktif, dan penugasan tim dari Neon.",
    status: "Registry live",
    icon: <Building2 size={16} />,
  },
  {
    name: "Design & Theme",
    href: "/studio/tema",
    description: "Referensi token visual source-controlled. Editor preset dan penyimpanan tema belum aktif.",
    status: "Referensi",
    icon: <Palette size={16} />,
  },
  {
    name: "Module Manager",
    href: "/studio/modul",
    description: "Status aplikasi dan unit bidang. Toggle submodul belum tersedia karena tidak ada registry-nya.",
    status: "Registry live",
    icon: <Blocks size={16} />,
  },
  {
    name: "Release Manager",
    href: "/studio/rilis",
    description: "Gerbang rilis dan tautan ke sistem CI/CD resmi GitHub Actions dan Vercel.",
    status: "CI/CD",
    icon: <GitBranch size={16} />,
  },
];

export default function StudioHome() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Studio Pengelola"
        title="Beranda Studio"
        description="Pusat kendali yang menunjukkan kemampuan nyata setiap builder. Status baca-saja, registry aktif, dan fitur yang belum memiliki penyimpanan dibedakan secara terbuka."
        actions={<Link href="/" className="sb-btn sb-btn-outline">Lihat website publik</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {BUILDERS.map((builder) => (
          <Link key={builder.href} href={builder.href} className="group rounded-[14px] border border-line bg-white p-4 transition hover:border-primary-300 hover:shadow-[var(--sb-shadow)]">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-paper text-ink2">{builder.icon}</span>
              <Badge tone={builder.status === "Registry live" || builder.status === "Antrean live" ? "success" : "neutral"}>{builder.status}</Badge>
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
          Form Builder, Widget Layout Editor, Workflow Definition Registry, Theme Preset Storage, CMS page revisions, dan Release History belum seluruhnya memiliki model penyimpanan bersama. Menu Studio hanya menampilkan fitur yang memang terhubung, atau menjelaskan batas yang masih tersisa.
        </Notice>
      </div>
    </div>
  );
}
