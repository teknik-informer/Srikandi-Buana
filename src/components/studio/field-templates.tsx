import { Card, CardHeader, Badge } from "@/components/ui";

const TEMPLATES = [
  { name: "Template Aplikasi Bidang", modules: ["Dashboard", "Rencana", "Program", "Tugas", "Data Operasional", "Formulir", "Dokumen", "Anggaran", "Laporan"], status: "dipakai" },
  { name: "Template Sekretariat", modules: ["Surat", "Notulen", "Agenda", "Dokumen"], status: "dipakai" },
  { name: "Template Portal Anggota", modules: ["Profil", "Agenda", "Tugas", "Komunitas"], status: "dipakai" },
  { name: "Template POS", modules: ["Katalog", "Kasir", "Riwayat", "Sinkronisasi"], status: "dipakai" },
];

export function FieldTemplates() {
  return (
    <Card>
      <CardHeader title="Template aplikasi" subtitle="Komposisi modul default" />
      <div className="divide-y divide-line">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12.5px] font-semibold text-ink">{t.name}</div>
              <Badge tone="neutral">{t.status}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {t.modules.map((m) => <span key={m} className="rounded bg-surface2 px-1.5 py-0.5 text-[9.5px] text-ink2">{m}</span>)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
