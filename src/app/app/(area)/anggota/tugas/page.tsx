import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateID, relativeID } from "@/lib/format";

export const metadata: Metadata = { title: "Penugasan" };

// Tugas punya aksi hidup (task.create/assign/status), jadi baca dokumen bersama.
export const dynamic = "force-dynamic";

export default async function TugasAnggotaPage() {
  const { tasks: TASKS } = await orgSummary();
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Penugasan saya"
        description="Tugas yang diberikan bidang dan tim. Setiap perubahan status tercatat pada aktivitas."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {TASKS.slice(0, 6).map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-ink">{t.title}</div>
                <div className="mt-0.5 text-[10.5px] text-muted2">{t.bidang} · {t.assignee}</div>
              </div>
              <StatusBadge status={t.status === "terlambat" ? "Terlambat" : t.status === "proses" ? "Proses" : t.status === "selesai" ? "Selesai" : "Belum"} />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
              <span>Tenggat {formatDateID(t.due, "short")}</span>
              <span className={t.status === "terlambat" ? "font-semibold text-[var(--sb-danger)]" : "text-accent-700"}>{relativeID(t.due)}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Badge tone={t.priority === "tinggi" ? "danger" : t.priority === "sedang" ? "warning" : "neutral"}>{t.priority}</Badge>
              {t.programCode && <span className="sb-chip !text-[10px]">{t.programCode}</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
