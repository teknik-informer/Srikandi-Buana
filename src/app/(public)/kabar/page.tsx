import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kabar & Artikel",
  description: "Kabar dan artikel resmi Srikandi Buana yang telah ditinjau dan dipublikasikan.",
};

export default function KabarPage() {
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
          body="Belum tersedia registry berita dan artikel pada CMS. Materi contoh tidak ditampilkan sebagai berita organisasi."
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
