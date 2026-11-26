import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { Camera } from "lucide-react";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Galeri publik Srikandi Buana setelah materi visual disetujui untuk publikasi.",
};

export default async function GaleriPage() {
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.gallery) notFound();
  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Galeri"
        title="Potret dari lapangan"
        description="Foto dan video hanya akan ditampilkan setelah izin publikasi, keterangan media, dan batas penggunaan tercatat."
      />
      <Card className="mt-6 px-5 py-10">
        <EmptyState
          icon={<Camera size={24} />}
          title="Belum ada media publik yang terdaftar"
          body="Platform belum memiliki media library dengan status persetujuan publikasi dan pemilik materi. Dokumentasi akan ditampilkan setelah persetujuan publikasi dan keterangan media tercatat."
        />
      </Card>
      <div className="mt-4">
        <Notice tone="info" title="Perlindungan privasi">
          Foto anggota, peserta kegiatan, dan lokasi kerja hanya dapat dipublikasikan setelah persetujuan yang sesuai dicatat.
        </Notice>
      </div>
    </div>
  );
}
