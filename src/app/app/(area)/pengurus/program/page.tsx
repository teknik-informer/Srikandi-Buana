import Link from "next/link";
import type { Metadata } from "next";
import { PROGRAMS, ACTIVITIES, TASKS } from "@/data/operations";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, PageHeader, Progress, StatCard } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { formatIDR, formatDateID, percent, daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Program & Rencana Kerja" };

const STATUS_TONE = {
  berjalan: "success",
  perencanaan: "info",
  selesai: "neutral",
  ditangguhkan: "warning",
} as const;

export default function ProgramPengurusPage() {
  const totalBudget = PROGRAMS.reduce((s, p) => s + p.budget, 0);
  const totalSpent = PROGRAMS.reduce((s, p) => s + p.spent, 0);
  const berjalan = PROGRAMS.filter((p) => p.status === "berjalan");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Program & rencana kerja"
        description="Pandangan pengurus atas seluruh program: tujuan, periode, indikator, dan serapan anggaran. Pelaksanaan harian tetap di aplikasi bidang masing-masing."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Program 2026" value={PROGRAMS.length} note={`${berjalan.length} berjalan`} />
        <StatCard label="Total anggaran" value={formatIDR(totalBudget)} note="Seluruh bidang" tone="info" />
        <StatCard label="Serapan" value={`${percent(totalSpent, totalBudget)}%`} note={`${formatIDR(totalSpent)} terpakai`} tone={percent(totalSpent, totalBudget) > 80 ? "warning" : "success"} />
        <StatCard label="Tugas terbuka" value={TASKS.filter((t) => t.status !== "selesai").length} note={`${TASKS.filter((t) => t.status === "terlambat").length} terlambat`} tone="warning" />
      </div>

      <div className="mt-5 space-y-4">
        {PROGRAMS.map((p) => {
          const field = FIELDS.find((f) => f.slug === p.bidang);
          const agenda = ACTIVITIES.filter((a) => a.programCode === p.code);
          const tasks = TASKS.filter((t) => t.programCode === p.code);
          const nextAgenda = agenda
            .filter((a) => daysUntil(a.date) >= 0)
            .sort((a, b) => a.date.localeCompare(b.date))[0];
          return (
            <Card key={p.code}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  {field ? <FieldMark icon={field.icon} accent={field.accent} /> : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[15px] font-semibold text-ink">{p.name}</span>
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                      <span className="font-mono text-[10.5px] text-muted2">{p.code}</span>
                    </div>
                    <p className="mt-0.5 max-w-2xl text-[12.5px] text-muted">{p.objective}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {field ? <Link href={field.appHref} className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]">Aplikasi bidang</Link> : null}
                  <Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Terbit publik" : "Internal"}</Badge>
                </div>
              </div>

              <div className="grid gap-4 px-4 py-3 lg:grid-cols-[1.1fr_1fr_0.9fr]">
                <div>
                  <div className="sb-label mb-1.5">Kemajuan</div>
                  <Progress value={p.progress} />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted2">Anggaran</div>
                      <div className="font-semibold text-ink">{formatIDR(p.budget)}</div>
                    </div>
                    <div>
                      <div className="text-muted2">Serapan</div>
                      <div className="font-semibold text-primary-800">{formatIDR(p.spent)} ({percent(p.spent, p.budget)}%)</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted">Periode {p.period}</div>
                </div>

                <div>
                  <div className="sb-label mb-1.5">Indikator</div>
                  <ul className="space-y-1">
                    {p.indicators.map((i) => (
                      <li key={i.label} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                        <span className="text-muted">{i.label}</span>
                        <span className="font-semibold text-ink tabular-nums">{i.actual} <span className="text-muted2">/ {i.target}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="sb-label mb-1.5">Kegiatan & tugas</div>
                  <div className="text-[11.5px] text-muted">
                    {agenda.length} kegiatan · {tasks.filter((t) => t.status !== "selesai").length} tugas terbuka
                  </div>
                  {nextAgenda ? (
                    <div className="mt-1.5 rounded-md border border-line bg-paper px-2.5 py-2">
                      <div className="text-[11.5px] font-medium text-ink">{nextAgenda.name}</div>
                      <div className="text-[10.5px] text-muted2">{formatDateID(nextAgenda.date, "short")} · {nextAgenda.location}</div>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[11px] text-muted2">Tidak ada agenda mendatang</div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Rencana kerja per bidang"
            subtitle="Satu bidang resmi memiliki satu rencana kerja yang disepakati"
            action={<Link href="/app/pengurus/bidang" className="text-[11.5px] font-semibold text-primary-700">Lintas bidang →</Link>}
          />
          <div className="sb-scroll">
            <table className="sb-table min-w-[620px]">
              <thead>
                <tr><th>Bidang</th><th className="num">Program</th><th className="num">Anggaran</th><th className="num">Terpakai</th><th>Serapan</th></tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => {
                  const list = PROGRAMS.filter((p) => p.bidang === f.slug);
                  const b = list.reduce((s, p) => s + p.budget, 0);
                  const sp = list.reduce((s, p) => s + p.spent, 0);
                  return (
                    <tr key={f.fieldId}>
                      <td className="font-medium text-ink">{f.shortName}</td>
                      <td className="num">{list.length}</td>
                      <td className="num">{formatIDR(b)}</td>
                      <td className="num">{formatIDR(sp)}</td>
                      <td><Progress value={percent(sp, b)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
