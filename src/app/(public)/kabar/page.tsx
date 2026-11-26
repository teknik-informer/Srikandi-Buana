import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { Newspaper } from "lucide-react";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kabar & Artikel",
  description: "Kabar dan artikel resmi Srikandi Buana yang telah ditinjau dan dipublikasikan.",
};

export default async function KabarPage() {
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.news) notFound();
  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Informasi"
        title="Kabar & artikel"
        description="Berita, artikel, dan pengumuman akan ditampilkan setelah tersedia pada sistem editorial dan disetujui untuk publikasi."
      />
      <Card className="mt-6 px-5 py-10">
        <EmptyState
          icon={<Newspaper size={24} />}
          title="Belum ada kabar yang dipublikasikan"
          body="Informasi akan muncul setelah ditinjau dan disetujui untuk publikasi."
        />
      </Card>
      <div className="mt-4">
        <Notice tone="info">
          Informasi resmi yang telah disimpan pada arsip publik dapat dilihat melalui halaman Dokumen Publik.
        </Notice>
      </div>
    </div>
  );
}
