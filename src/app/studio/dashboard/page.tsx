import type { Metadata } from "next";
import { Card, CardHeader, Notice, PageHeader, Badge } from "@/components/ui";

const WIDGETS = [
  { name: "MetricTile", source: "Program / indikator", audience: "Pengurus, Koordinator", status: "aktif" },
  { name: "TaskQueue", source: "Workflow & penugasan", audience: "Semua peran internal", status: "aktif" },
  { name: "CalendarMonth", source: "Kegiatan", audience: "Semua", status: "aktif" },
  { name: "ApprovalPanel", source: "Workflow approvals", audience: "Pengurus", status: "aktif" },
  { name: "LedgerSummary", source: "Finance (scope)", audience: "Bendahara, Pengurus", status: "aktif" },
  { name: "HarvestTrend", source: "Pertanian", audience: "Bidang Pertanian", status: "aktif" },
  { name: "TrainingCompletion", source: "Pelatihan", audience: "Bidang Pelatihan", status: "aktif" },
  { name: "PartnerPipeline", source: "Usaha", audience: "Bidang Usaha", status: "draft" },
];

export default function DashboardStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Dashboard Builder"
        title="Widget & susunan dashboard"
        description="Dashboard disusun dari widget terdaftar dengan query data yang diizinkan. Setiap widget menghormati audience dan scope pengguna."
      />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Widget registry" subtitle="Hanya widget terdaftar yang dapat dipakai" action={<Badge tone="neutral">{WIDGETS.length} widget</Badge>} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[560px]">
              <thead><tr><th>Widget</th><th>Sumber data</th><th>Audience</th><th>Status</th></tr></thead>
              <tbody>
                {WIDGETS.map((w) => (
                  <tr key={w.name}>
                    <td className="font-mono text-[11.5px] font-medium text-ink">{w.name}</td>
                    <td className="text-muted">{w.source}</td>
                    <td className="text-muted">{w.audience}</td>
                    <td><Badge tone={w.status === "aktif" ? "success" : "warning"}>{w.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Susunan dashboard Pengurus" subtitle="Grid 4 kolom, responsif" />
            <div className="grid grid-cols-4 gap-1.5 p-3">
              {["Metric", "Metric", "Metric", "Metric", "TaskQueue span-2", "ApprovalPanel span-2", "LedgerSummary span-4"].map((w, i) => (
                <div key={i} className={`rounded border border-dashed border-line-strong bg-paper px-2 py-3 text-center text-[9.5px] font-semibold text-muted ${w.includes("span-2") ? "col-span-2" : w.includes("span-4") ? "col-span-4" : ""}`}>
                  {w.replace(" span-2", "").replace(" span-4", "")}
                </div>
              ))}
            </div>
          </Card>
          <Notice tone="warning" title="Aturan dashboard">
            Widget tidak boleh membuka data privat ke mitra tanpa data-sharing grant, dan tidak boleh
            menampilkan metrik yang tidak terdefinisi atau berasal dari query ilegal.
          </Notice>
        </div>
      </div>
    </div>
  );
}
