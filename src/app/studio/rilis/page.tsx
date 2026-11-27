import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, GitBranch, ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";

import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Rilis & Riwayat" };

const releaseSystems = [
  {
    name: "GitHub Actions",
    purpose: "Pemeriksaan TypeScript, validasi build, dan workflow CI",
    href: "https://github.com/teknik-informer/Srikandi-Buana/actions",
    status: "Sumber CI",
  },
  {
    name: "Vercel Project",
    purpose: "Preview deployment, Production deployment, dan domain",
    href: "https://vercel.com/teknik-informer/srikandi-buana-v9",
    status: "Sumber deployment",
  },
];

export default async function RilisStudio() {
  await requireRoles(["platform_admin", "organization_admin"]);
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Release Manager"
        title="Rilis, pratinjau & riwayat"
        description="Status build dan deployment diperiksa pada pipeline rilis. Halaman ini tidak menampilkan riwayat rilis contoh atau mengklaim publikasi yang belum dikonfirmasi."
        actions={<Badge tone="neutral">Integrasi CI/CD</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {releaseSystems.map((system) => (
          <Card key={system.name}>
            <CardHeader title={system.name} action={<Badge tone="info">{system.status}</Badge>} />
            <div className="px-4 pb-4">
              <p className="text-[11.5px] leading-relaxed text-muted">{system.purpose}</p>
              <Link href={system.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-700">
                Buka sumber rilis <ArrowUpRight size={13} />
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Gerbang rilis" action={<ShieldCheck size={16} className="text-muted2" />} />
          <ol className="space-y-3 px-4 py-4 text-[11.5px]">
            {[
              ["1", "Pemeriksaan kode", "TypeScript dan lint/build harus lulus pada commit yang akan dirilis."],
              ["2", "Preview", "Deployment Preview harus READY pada commit branch yang sama."],
              ["3", "Uji fungsional", "Login, RBAC, transaksi baca/tulis, dan alur kritis diuji pada Preview."],
              ["4", "Uji perangkat", "Layout diperiksa pada desktop, tablet, dan ponsel tanpa overflow."],
              ["5", "Persetujuan Production", "Backup, preflight database, dan persetujuan eksplisit sebelum deployment atau perpindahan domain."],
            ].map(([step, title, detail]) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-[10px] font-bold text-ink2">{step}</span>
                <span className="min-w-0">
                  <strong className="block text-ink">{title}</strong>
                  <span className="mt-0.5 block text-muted">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-4">
          <Notice tone="warning" title="Riwayat konfigurasi belum disimpan di Studio">
            Belum ada tabel release registry, approval konfigurasi, atau rollback metadata yang dikelola oleh Studio. Riwayat commit dan deployment berada pada GitHub dan Vercel. Tidak ada status rilis yang dibuat dari daftar contoh.
          </Notice>
          <Notice tone="info" title="Rollback berbeda dari migrasi data">
            Rollback deployment mengembalikan versi aplikasi. Migrasi database dan data memerlukan backup, evaluasi kompatibilitas, dan prosedur pemulihan terpisah.
          </Notice>
        </div>
      </div>
    </div>
  );
}
