import Link from "next/link";
import type { Metadata } from "next";
import { FIELDS } from "@/config/fields";
import { PROGRAMS, TASKS, ACTIVITIES } from "@/data/operations";
import { Badge, Card, CardHeader, PageHeader, Progress, StatCard } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { formatIDR, percent } from "@/lib/format";

export const metadata: Metadata = { title: "Lintas Bidang" };

export default function LintasBidangPage() {
  const totalBudget = PROGRAMS.reduce((s, p) => s + p.budget, 0);
  const totalSpent = PROGRAMS.reduce((s, p) => s + p.spent, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Pandangan lintas bidang"
        description="Ringkasan program, beban tugas, agenda, dan serapan anggaran per bidang. Angka rinci tetap berada di aplikasi pemilik data."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Program berjalan" value={PROGRAMS.filter((p) => p.status === "berjalan").length} note={`${PROGRAMS.length} program tahun 2026`} />
        <StatCard label="Serapan anggaran" value={`${percent(totalSpent, totalBudget)}%`} note={`${formatIDR(totalSpent)} dari ${formatIDR(totalBudget)}`} tone="info" />
        <StatCard label="Tugas belum selesai" value={TASKS.filter((t) => t.status !== "selesai").length} note="Seluruh bidang" tone="warning" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {FIELDS.map((f) => {
          const code = f.slug;
          const prog = PROGRAMS.filter((p) => p.bidang === code);
          const tasks = TASKS.filter((t) => t.bidang === code);
          const agenda = ACTIVITIES.filter((a) => a.bidang === code && a.status === "terjadwal");
          const budget = prog.reduce((s, p) => s + p.budget, 0);
          const spent = prog.reduce((s, p) => s + p.spent, 0);
          return (
            <Card key={f.fieldId}>
              <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-start gap-3">
                  <FieldMark icon={f.icon} accent={f.accent} />
                  <div>
                    <div className="text-[13.5px] font-semibold text-ink">{f.shortName}</div>
                    <div className="text-[10.5px] text-muted2">{f.fieldId} · {f.modules.length} modul</div>
                  </div>
                </div>
                <Link href={f.appHref} className="sb-btn sb-btn-outline !py-1 !px-2.5 text-[11px]">Buka</Link>
              </div>
              <div className="space-y-2.5 px-4 py-3">
                {prog.map((p) => (
                  <div key={p.code}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-ink">{p.name}</span>
                      <Badge tone={p.status === "berjalan" ? "success" : "neutral"}>{p.status}</Badge>
                    </div>
                    <div className="mt-1"><Progress value={p.progress} /></div>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-[11px]">
                  <div><div className="text-muted2">Anggaran</div><div className="font-semibold text-ink">{formatIDR(budget)}</div></div>
                  <div><div className="text-muted2">Serapan</div><div className="font-semibold text-primary-800">{percent(spent, budget)}%</div></div>
                  <div><div className="text-muted2">Tugas/agenda</div><div className="font-semibold text-ink">{tasks.filter((t) => t.status !== "selesai").length}/{agenda.length}</div></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
