import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Template Surat & Dokumen" };

type Template = {
  code: string;
  name: string;
  purpose: string;
  fields: string[];
  numbering: string;
  status: "siap" | "draf" | "belum";
};

const TEMPLATES: Template[] = [
  {
    code: "TPL-SK",
    name: "Surat keputusan",
    purpose: "Penetapan pengurus, bidang, atau kepanitiaan",
    fields: ["Nomor SK", "Tentang", "Menimbang", "Memutuskan", "Penandatangan"],
    numbering: "SK-NN/YYYY",
    status: "siap",
  },
  {
    code: "TPL-UND",
    name: "Undangan rapat",
    purpose: "Mengundang pengurus/anggota ke rapat",
    fields: ["Nomor surat", "Hari & tanggal", "Waktu", "Tempat", "Agenda"],
    numbering: "NN/KWT-SB/ROM/YYYY",
    status: "siap",
  },
  {
    code: "TPL-KEL",
    name: "Surat keluar resmi",
    purpose: "Korespondensi ke dinas, mitra, atau bank",
    fields: ["Nomor surat", "Perihal", "Alamat tujuan", "Isi ringkas", "Lampiran"],
    numbering: "NN/KWT-SB/ROM/YYYY",
    status: "siap",
  },
  {
    code: "TPL-NOT",
    name: "Notulen rapat",
    purpose: "Catatan jalannya rapat dan keputusan",
    fields: ["Rapat", "Tanggal", "Peserta", "Pembahasan", "Keputusan", "Tindak lanjut"],
    numbering: "NOT-YYYY-MM",
    status: "siap",
  },
  {
    code: "TPL-LAP",
    name: "Laporan kegiatan",
    purpose: "Laporan pelaksanaan kegiatan bidang",
    fields: ["Kegiatan", "Program", "Waktu", "Peserta", "Realisasi", "Lampiran"],
    numbering: "LAP-{kode}-YYYY",
    status: "draf",
  },
  {
    code: "TPL-SPR",
    name: "Surat permohonan narasumber",
    purpose: "Meminta narasumber/pendamping dari pihak luar",
    fields: ["Nomor", "Kegiatan", "Waktu", "Nama calon", "Penanggung jawab"],
    numbering: "NN/KWT-SB/ROM/YYYY",
    status: "draf",
  },
];

const TONE = { siap: "success", draf: "warning", belum: "neutral" } as const;

export default function TemplatePage() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Template surat & dokumen"
        description="Kerangka dokumen yang dipakai berulang, beserta aturan penomoran dan field wajibnya. Template resmi menunggu pengesahan organisasi."
        actions={<Link href="/app/sekretariat/ekspedisi" className="sb-btn sb-btn-outline">Agenda ekspedisi</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Template" value={TEMPLATES.length} note={`${TEMPLATES.filter((t) => t.status === "siap").length} siap pakai`} />
        <StatCard label="Siap" value={TEMPLATES.filter((t) => t.status === "siap").length} note="Kerangka lengkap" tone="success" />
        <StatCard label="Perlu pengesahan" value={TEMPLATES.filter((t) => t.status !== "siap").length} note="Draf / belum" tone="warning" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {TEMPLATES.map((t) => (
          <Card key={t.code}>
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[14px] font-semibold text-ink">{t.name}</span>
                  <Badge tone={TONE[t.status]}>{t.status}</Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-muted">{t.purpose}</p>
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-muted2">{t.code}</span>
            </div>
            <div className="px-4 py-3">
              <div className="sb-label mb-1.5">Field wajib</div>
              <div className="flex flex-wrap gap-1">
                {t.fields.map((f) => (
                  <span key={f} className="rounded-full bg-surface2 px-2 py-0.5 text-[10.5px] text-ink2">{f}</span>
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span className="text-[11px] text-muted2">Penomoran</span>
                <span className="font-mono text-[11px] text-ink2">{t.numbering}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Template belum disahkan">
          Nama dan format dokumen resmi mengikuti kebijakan yang disahkan (§9.4.1, §10.2). Daftar di halaman ini adalah
          kerangka kerja; dokumen yang dihasilkan belum sah sebelum ada keputusan resmi.
        </Notice>
      </div>
    </div>
  );
}
