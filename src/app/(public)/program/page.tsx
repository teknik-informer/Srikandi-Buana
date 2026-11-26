import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Program",
  description: "Informasi program organisasi Srikandi Buana yang telah disahkan untuk publikasi.",
};

export default async function ProgramPage() {
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.programs) notFound();
  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Program organisasi"
        title="Program dan capaian"
        description="Halaman ini hanya akan menampilkan program yang telah ditetapkan untuk publikasi. Nilai anggaran, target, realisasi, dan catatan internal tidak dibuka otomatis."
      />

      <Card className="mt-6 px-5 py-10">
        <EmptyState
          icon={<ClipboardList size={24} />}
          title="Belum ada program yang ditandai untuk publikasi"
          body="Data program operasional tersimpan di aplikasi bidang, tetapi registry saat ini belum menyediakan kolom persetujuan publikasi program. Karena itu daftar program internal tidak ditampilkan pada website publik."
        />
      </Card>

      <div className="mt-4">
        <Notice tone="info" title="Transparansi program">
          Laporan publik akan diterbitkan setelah organisasi menetapkan data, periode, indikator, dan batas informasi yang boleh dibagikan.
        </Notice>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dokumen" className="sb-btn sb-btn-outline">Dokumen publik <ArrowRight size={13} /></Link>
        <Link href="/kontak?tujuan=informasi" className="sb-btn sb-btn-primary">Ajukan permintaan informasi <ArrowRight size={13} /></Link>
      </div>
    </div>
  );
}
