import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { Card, CardHeader, PageHeader, Progress, Badge, StatCard } from "@/components/ui";
import { formatIDR, percent } from "@/lib/format";

export const metadata: Metadata = { title: "Kinerja & Indikator" };

// Program dikelola pengurus (program.create/update/status), jadi angka di
// halaman ini harus mengikuti dokumen bersama — bukan PROGRAMS statis.
export const dynamic = "force-dynamic";

export default async function IndikatorPage() {
  const { programs: PROGRAMS, shared } = await orgSummary();
  const totalBudget = PROGRAMS.reduce((s, p) => s + p.budget, 0);
  const totalSpent = PROGRAMS.reduce((s, p) => s + p.spent, 0);
  const allIndicators = PROGRAMS.flatMap((p) => p.indicators.map((i) => ({ ...i, program: p.name })));

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Kinerja & indikator"
        description={`Indikator yang ditetapkan pada rencana kerja bidang. Nilai berasal dari data operasional, bukan input manual di dashboard.${shared ? "" : " (Mode lokal — dokumen bersama belum terbaca.)"}`}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Indikator terpantau" value={allIndicators.length} note={`${PROGRAMS.filter((p) => p.status === "berjalan").length} program`} />
        <StatCard label="Serapan anggaran" value={`${percent(totalSpent, totalBudget)}%`} note={formatIDR(totalSpent)} tone="info" />
        <StatCard label="Program di atas 70%" value={PROGRAMS.filter((p) => p.progress >= 70).length} note="Progres capaian" tone="success" />
      </div>

      <div className="mt-5 space-y-4">
        {PROGRAMS.filter((p) => p.published).map((p) => (
          <Card key={p.code}>
            <CardHeader
              title={p.name}
              subtitle={`${p.code} · ${p.period}`}
              action={<Badge tone={p.status === "berjalan" ? "success" : "neutral"}>{p.status}</Badge>}
            />
            <div className="px-4 py-2.5"><Progress value={p.progress} /></div>
            <div className="sb-scroll">
              <table className="sb-table min-w-[520px]">
                <thead><tr><th>Indikator</th><th>Target</th><th>Realisasi</th><th>Status</th></tr></thead>
                <tbody>
                  {p.indicators.map((i) => {
                    const t = parseFloat(i.target.replace(/[^\d.]/g, ""));
                    const a = parseFloat(i.actual.replace(/[^\d.]/g, ""));
                    const ok = a >= t * 0.9;
                    return (
                      <tr key={i.label}>
                        <td className="font-medium text-ink">{i.label}</td>
                        <td>{i.target}</td>
                        <td className="font-semibold text-primary-800">{i.actual}</td>
                        <td><Badge tone={ok ? "success" : "warning"}>{ok ? "Sesuai jalur" : "Perlu perhatian"}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
