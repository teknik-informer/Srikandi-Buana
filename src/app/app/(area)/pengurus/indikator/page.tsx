import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { FIELDS } from "@/config/fields";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Kinerja & Indikator" };

interface IndicatorRecord {
  id: string;
  program_id: string;
  program_reference: string;
  program_title: string;
  field_key: string;
  program_status: string;
  indicator_label: string;
  target_value: string | null;
  actual_value: string | null;
  unit_label: string | null;
  note: string | null;
  sort_order: number;
  updated_at: string;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function numberLabel(value: string | null, unit: string | null): string {
  if (value === null) return "Belum dicatat";
  const n = Number(value);
  const result = Number.isFinite(n)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)
    : value;
  return unit ? result + " " + unit : result;
}

const statusLabel: Record<string, string> = {
  draft: "Draf",
  planned: "Direncanakan",
  active: "Berjalan",
  completed: "Selesai",
  paused: "Ditunda",
  cancelled: "Dibatalkan",
};

export default async function IndikatorPage() {
  const identity = await requireIdentity("organization:read");
  let rows: IndicatorRecord[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        indicator.id::text AS id,
        indicator.program_id::text AS program_id,
        program.reference_no AS program_reference,
        program.title AS program_title,
        program.field_key,
        program.status AS program_status,
        indicator.indicator_label,
        indicator.target_value::text AS target_value,
        indicator.actual_value::text AS actual_value,
        indicator.unit_label,
        indicator.note,
        indicator.sort_order,
        indicator.updated_at::text AS updated_at
      FROM v9.field_program_indicators AS indicator
      INNER JOIN v9.field_programs AS program
        ON program.id = indicator.program_id
        AND program.organization_id = indicator.organization_id
      WHERE indicator.organization_id = ${identity.organizationId}
      ORDER BY program.field_key, program.title, indicator.sort_order, indicator.created_at
      LIMIT 1000
    `;
    rows = rowsFromResult<IndicatorRecord>(result);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-indicators] Source unavailable", safeErrorType(reason));
  }

  const programs = new Set(rows.map((row) => row.program_id));
  const targetsConfigured = rows.filter((row) => row.target_value !== null).length;
  const actualsRecorded = rows.filter((row) => row.actual_value !== null).length;
  const targetsReached = rows.filter((row) =>
    row.target_value !== null &&
    row.actual_value !== null &&
    Number(row.actual_value) >= Number(row.target_value)
  ).length;
  const grouped = new Map<string, IndicatorRecord[]>();
  for (const row of rows) {
    const list = grouped.get(row.program_id) ?? [];
    list.push(row);
    grouped.set(row.program_id, list);
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Kinerja & indikator"
        description="Target dan realisasi indikator yang disimpan pada masing-masing program organisasi."
        actions={<Badge tone="info">Data organisasi</Badge>}
      />

      <div className="mb-4">
        <Notice tone="info" title="Sumber realisasi indikator">
          Nilai realisasi dibaca dari catatan indikator program. Nilai ini tidak dihitung otomatis dari panen,
          kehadiran, penjualan, atau jurnal; setiap indikator harus diperbarui melalui modul pemilik datanya.
        </Notice>
      </div>

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Data indikator belum dapat dimuat">
            Sumber data indikator sedang tidak tersedia. Nilai contoh tidak ditampilkan sebagai pengganti.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Indikator tercatat" value={rows.length} note={programs.size + " program memiliki indikator"} tone="info" icon={<Target size={17} />} />
        <StatCard label="Target ditetapkan" value={targetsConfigured} note="Target dengan nilai tersimpan" tone="success" />
        <StatCard label="Realisasi dicatat" value={actualsRecorded} note="Indikator dengan nilai aktual" tone="neutral" />
        <StatCard label="Target tercapai" value={targetsReached} note="Aktual sama dengan atau di atas target" tone="success" />
      </div>

      {rows.length ? (
        <div className="mt-5 space-y-4">
          {Array.from(grouped.entries()).map(([programId, items]) => {
            const program = items[0];
            const field = FIELDS.find((item) => item.slug === program.field_key);
            const targetCount = items.filter((item) => item.target_value !== null).length;
            const updatedCount = items.filter((item) => item.actual_value !== null).length;
            return (
              <Card key={programId}>
                <CardHeader
                  title={program.program_title}
                  subtitle={program.program_reference + " · " + (field?.shortName ?? program.field_key)}
                  action={
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={program.program_status === "active" ? "success" : "neutral"}>
                        {statusLabel[program.program_status] ?? program.program_status}
                      </Badge>
                      {field ? (
                        <Link href={field.appHref} className="sb-btn sb-btn-outline !h-7 !px-2.5 text-[10px]">
                          Buka bidang <ArrowRight size={11} />
                        </Link>
                      ) : null}
                    </div>
                  }
                />
                <div className="border-b border-line px-4 py-2 text-[10.5px] text-muted2">
                  {items.length} indikator · {targetCount} target terisi · {updatedCount} realisasi dicatat
                </div>
                <div className="sb-scroll">
                  <table className="sb-table min-w-[650px]">
                    <thead><tr><th>Indikator</th><th className="num">Target</th><th className="num">Realisasi</th><th>Perbandingan</th><th>Catatan</th></tr></thead>
                    <tbody>
                      {items.map((item) => {
                        const hasBoth = item.target_value !== null && item.actual_value !== null;
                        const reached = hasBoth && Number(item.actual_value) >= Number(item.target_value);
                        return (
                          <tr key={item.id}>
                            <td className="font-medium text-ink">{item.indicator_label}</td>
                            <td className="num tabular-nums text-muted">{numberLabel(item.target_value, item.unit_label)}</td>
                            <td className="num font-semibold tabular-nums text-ink">{numberLabel(item.actual_value, item.unit_label)}</td>
                            <td>
                              {hasBoth ? (
                                <Badge tone={reached ? "success" : "warning"}>{reached ? "Target tercapai" : "Di bawah target"}</Badge>
                              ) : (
                                <Badge tone="neutral">Belum lengkap</Badge>
                              )}
                            </td>
                            <td className="max-w-[240px] text-muted">{item.note ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-line px-4 py-2 text-[9.5px] text-muted2">
                  Terakhir diperbarui: {formatDateID(program.updated_at, "short")}
                </div>
              </Card>
            );
          })}
        </div>
      ) : !unavailable ? (
        <Card className="mt-5 p-4">
          <EmptyState
            title="Belum ada indikator tersimpan"
            body="Indikator akan tampil setelah target dan realisasinya dicatat pada modul Program. Tidak ada target atau persentase dari data contoh."
          />
        </Card>
      ) : null}
    </div>
  );
}
