import type { Metadata } from "next";
import { ClipboardList, AlertTriangle, CalendarClock } from "lucide-react";
import { requireIdentity } from "@/lib/session";
import { loadMemberAreaData } from "@/lib/member-area";
import { MemberTaskAction } from "@/components/member-task-action";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID, relativeID } from "@/lib/format";
import { FIELDS_BY_SLUG } from "@/config/fields";

export const metadata: Metadata = { title: "Penugasan Saya" };

const STATUS_LABEL: Record<string, string> = {
  belum: "Belum dimulai",
  proses: "Sedang dikerjakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default async function TugasAnggotaPage() {
  const identity = await requireIdentity("member:self");
  const data = await loadMemberAreaData(identity);
  const openTasks = data.tasks.filter((task) => !["selesai", "dibatalkan"].includes(task.status));
  const overdue = data.tasks.filter((task) => task.isOverdue);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Penugasan saya"
        description="Daftar ini hanya berisi tugas yang dialokasikan langsung ke akun Anda. Nama penanggung jawab pada teks tugas tidak dianggap sebagai penugasan akun."
      />

      {data.errors.includes("tasks") ? (
        <Notice tone="danger" title="Daftar tugas belum dapat dimuat">
          Layanan data penugasan belum tersedia. Daftar tidak ditampilkan sebagai kosong ketika sumber data gagal dibaca.
          Muat ulang setelah layanan pulih.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tugas terbuka" value={data.errors.includes("tasks") ? "—" : openTasks.length} tone="info" icon={<ClipboardList size={16} />} />
        <StatCard label="Terlambat" value={data.errors.includes("tasks") ? "—" : overdue.length} tone={overdue.length ? "warning" : "success"} icon={<AlertTriangle size={16} />} />
        <StatCard label="Selesai" value={data.errors.includes("tasks") ? "—" : data.tasks.filter((task) => task.status === "selesai").length} tone="success" icon={<CalendarClock size={16} />} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Daftar penugasan" subtitle="Perubahan status dicatat pada audit organisasi" action={<Badge tone="neutral">{data.errors.includes("tasks") ? "Data tidak tersedia" : `${data.tasks.length} tugas`}</Badge>} />
        {data.tasks.length ? (
          <div className="divide-y divide-line">
            {data.tasks.map((task) => (
              <article key={task.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted2">{task.referenceNo}</span>
                    <Badge tone={task.priority === "tinggi" ? "danger" : task.priority === "sedang" ? "warning" : "neutral"}>{task.priority}</Badge>
                    <Badge tone={task.isOverdue ? "danger" : task.status === "selesai" ? "success" : task.status === "proses" ? "info" : "neutral"}>
                      {task.isOverdue ? "Terlambat" : STATUS_LABEL[task.status]}
                    </Badge>
                  </div>
                  <h2 className="mt-1 text-[13px] font-semibold text-ink">{task.title}</h2>
                  <p className="mt-1 text-[10.5px] text-muted2">
                    {FIELDS_BY_SLUG[task.fieldKey]?.shortName ?? task.fieldKey}
                    {task.dueDate ? ` · Tenggat ${formatDateID(task.dueDate, "short")} · ${relativeID(task.dueDate)}` : " · Tenggat belum ditetapkan"}
                  </p>
                </div>
                <MemberTaskAction taskId={task.id} status={task.status} />
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-muted">
            {data.errors.includes("tasks")
              ? "Data penugasan tidak dapat dibaca."
              : "Belum ada tugas yang dialokasikan langsung ke akun Anda."}
          </div>
        )}
      </Card>
    </div>
  );
}
