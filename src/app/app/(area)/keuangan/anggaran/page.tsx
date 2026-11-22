import type { Metadata } from "next";
import { BUDGETS, FUNDS, PERIODS } from "@/data/finance";
import { PROGRAMS } from "@/data/operations";
import { programSpend } from "@/lib/finance";
import { formatIDR, percent, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Progress, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Anggaran & Dana" };

export default function AnggaranPage() {
  const spend = programSpend();
  const totalPlanned = BUDGETS.reduce((s, b) => s + b.planned, 0);
  const totalActual = spend.reduce((s, p) => s + p.actual, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Anggaran, komitmen & dana"
        description="Anggaran disusun per program dan akun. Realisasi ditarik dari jurnal; komitmen (utang/PO) dicatat terpisah hingga dibukukan."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total anggaran" value={formatIDR(totalPlanned)} tone="info" />
        <StatCard label="Realisasi" value={formatIDR(totalActual)} note={`${percent(totalActual, totalPlanned)}% dari anggaran`} tone="accent" />
        <StatCard label="Sisa anggaran" value={formatIDR(totalPlanned - totalActual)} tone="success" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Anggaran vs realisasi per program" subtitle="Realisasi = beban posted dengan dimensi program" />
          <div className="divide-y divide-line">
            {spend.map((s) => {
              const prog = PROGRAMS.find((p) => p.code === s.programCode);
              return (
                <div key={s.programCode} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[12.5px] font-semibold text-ink">{prog?.name ?? s.programCode}</div>
                      <div className="text-[10.5px] text-muted2">{s.programCode} · {prog?.bidang ?? "—"}</div>
                    </div>
                    <span className="text-[11.5px] text-muted">{formatIDR(s.actual)} / {formatIDR(s.planned)}</span>
                  </div>
                  <div className="mt-1.5"><Progress value={percent(s.actual, s.planned)} tone={percent(s.actual, s.planned) > 85 ? "danger" : "primary"} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Rincian anggaran per akun" />
            <div className="sb-scroll">
              <table className="sb-table min-w-[420px]">
                <thead><tr><th>Akun</th><th>Program</th><th className="num">Anggaran</th></tr></thead>
                <tbody>
                  {BUDGETS.map((b) => (
                    <tr key={b.id}>
                      <td className="text-[11.5px] text-muted">{b.accountCode} · {b.accountName}</td>
                      <td className="font-medium text-ink">{b.programName.split(" ").slice(0, 3).join(" ")}…</td>
                      <td className="num">{formatIDR(b.planned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sumber dana & pembatasan" subtitle="Setiap transaksi wajib membawa dimensi dana bila relevan" />
          <div className="divide-y divide-line">
            {FUNDS.map((f) => (
              <div key={f.code} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12.5px] font-semibold text-ink">{f.name}</div>
                  <Badge tone={f.status === "aktif" ? "success" : "neutral"}>{f.source}</Badge>
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted2">{f.restriction}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 text-[11px] text-muted">
                  <span>Diterima {formatIDR(f.received)}</span>
                  <span>Terpakai {formatIDR(f.used)}</span>
                  <span className="font-semibold text-primary-800">Sisa {formatIDR(f.received - f.used)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pengendalian periode" subtitle="Posting ke periode tertutup ditolak" />
          <div className="divide-y divide-line">
            {PERIODS.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div>
                  <div className="text-[12px] font-medium text-ink">{p.label}</div>
                  <div className="text-[10.5px] text-muted2">{p.note}</div>
                </div>
                <StatusBadge status={p.status === "terbuka" ? "Terbuka" : "Terkunci"} />
              </div>
            ))}
          </div>
          <div className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] text-muted2">
            Membuka kembali periode terkunci memerlukan proses yang sah dan tercatat pada audit log.
            {new Date(PERIODS[1].label) ? null : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
