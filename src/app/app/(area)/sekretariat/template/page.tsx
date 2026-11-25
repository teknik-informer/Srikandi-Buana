import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FilePlus2, FileText } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { requireIdentity } from "@/lib/session";
import { SECRETARIAT_TEMPLATES } from "@/lib/secretariat-templates";

export const metadata: Metadata = { title: "Template Surat & Dokumen" };

export default async function TemplatePage() {
  await requireIdentity("secretariat:documents:write");
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Generator surat & dokumen"
        description="Pilih kerangka, isi data organisasi, simpan sebagai draf Register Dokumen, lalu cetak atau simpan sebagai PDF dari halaman dokumen."
        actions={
          <Link href="/app/sekretariat/dokumen" className="sb-btn sb-btn-outline">
            <FileText size={14} /> Register dokumen
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Kerangka tersedia" value={SECRETARIAT_TEMPLATES.length} note="Dapat digunakan untuk membuat draf" />
        <StatCard label="Jenis surat" value={3} note="SK dan dua jenis korespondensi" tone="info" />
        <StatCard label="Laporan & notulen" value={2} note="Kegiatan dan rapat" tone="success" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {SECRETARIAT_TEMPLATES.map((template) => (
          <Card key={template.code}>
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[14px] font-semibold text-ink">{template.name}</span>
                  <Badge tone="info">Generator</Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-muted">{template.purpose}</p>
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-muted2">{template.code}</span>
            </div>
            <div className="px-4 py-3">
              <div className="sb-label mb-1.5">Bagian dokumen</div>
              <div className="flex flex-wrap gap-1">
                {template.sections.map((section) => (
                  <span key={section.title} className="rounded-full bg-surface2 px-2 py-0.5 text-[10.5px] text-ink2">
                    {section.title}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[10.5px] text-muted2">{template.fields.length} kolom isi</span>
                <Link href={`/app/sekretariat/template/${template.code}`} className="sb-btn sb-btn-primary !h-8 !px-3 text-[10.5px]">
                  <FilePlus2 size={13} /> Buat draf <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Kerangka bantu, bukan pengesahan">
          Generator tidak mengarang nomor surat resmi, dasar hukum, keputusan organisasi, atau tanda tangan.
          Nomor resmi boleh dikosongkan sampai ditetapkan. Setiap hasil masuk ke Register Dokumen sebagai draf,
          dan harus diperiksa sebelum finalisasi. Untuk dokumen yang memerlukan bukti bertanda tangan, unggah
          berkas hasil pemindaian atau PDF pada register setelah dokumen ditandatangani.
        </Notice>
      </div>
    </div>
  );
}
