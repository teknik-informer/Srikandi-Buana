import type { Metadata } from "next";
import { APPROVALS } from "@/data/organization";
import { Badge, Card, CardHeader, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateID, formatIDR } from "@/lib/format";

const STEPS = [
  { label: "Diajukan", by: "Bidang / staf", rule: "Formulir tervalidasi" },
  { label: "Reviu Koordinator", by: "Koordinator bidang", rule: "Kelengkapan & kesesuaian rencana" },
  { label: "Persetujuan Bendahara", by: "Bendahara", rule: "Ketersediaan dana & anggaran" },
  { label: "Persetujuan Ketua", by: "Ketua", rule: "Nilai > ambang (belum ditetapkan)" },
  { label: "Selesai", by: "Sistem", rule: "Memicu penugasan & posting keuangan" },
];

export default function WorkflowStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Workflow Builder"
        title="Alur pengajuan → persetujuan"
        description="Status hanya berubah melalui transisi yang sah. Setiap langkah menyimpan aktor, waktu, keputusan, dan alasan; delegasi tercatat dengan masa berlaku."
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title="Workflow: Pengajuan Anggaran Kegiatan" subtitle="Versi v2 · 5 tahap" action={<Badge tone="success">Aktif</Badge>} />
          <ol className="divide-y divide-line">
            {STEPS.map((s, i) => (
              <li key={s.label} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10.5px] font-bold text-primary-800">{i + 1}</span>
                <div>
                  <div className="text-[12.5px] font-semibold text-ink">{s.label}</div>
                  <div className="text-[11px] text-muted">Penanggung jawab: {s.by}</div>
                  <div className="text-[10.5px] text-muted2">Aturan: {s.rule}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Pengajuan berjalan" subtitle="Dari data approval aktual" />
            <div className="divide-y divide-line">
              {APPROVALS.slice(0, 4).map((a) => (
                <div key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-ink">{a.title}</span>
                    <StatusBadge status={a.status === "menunggu" ? "Menunggu" : a.status} />
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{a.currentStep} · {formatDateID(a.submittedAt, "short")}{a.amount ? ` · ${formatIDR(a.amount)}` : ""}</div>
                </div>
              ))}
            </div>
          </Card>
          <Notice tone="warning" title="Kebijakan belum ditetapkan">
            Ambang nilai persetujuan dan aturan delegasi wajib ditetapkan organisasi. Workflow
            menyediakan konfigurasi; tidak mengarang kebijakan.
          </Notice>
        </div>
      </div>
    </div>
  );
}
