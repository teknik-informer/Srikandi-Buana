import Link from "next/link";
import { CalendarDays, ClipboardCheck, MapPin, Sprout, Wheat } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import type { FieldDef } from "@/config/fields";
import {
  createAgricultureCycle,
  createAgriculturePlot,
  recordAgricultureHarvest,
  recordAgricultureVisit,
  updateAgricultureCycleStatus,
  updateAgriculturePlotStatus,
} from "@/app/actions/agriculture";

interface AgricultureSummary {
  plot_count: number;
  total_area_ha: string;
  active_cycle_count: number;
  visit_count_this_year: number;
  harvest_weight_this_year: string;
}

interface PlotRow {
  id: string;
  plot_code: string;
  owner_label: string;
  hamlet: string | null;
  village: string;
  commodity: string;
  land_use: string | null;
  area_ha: string;
  location_note: string | null;
  status: "active" | "paused" | "archived";
  active_cycle_count: number;
}

interface CycleRow {
  id: string;
  plot_id: string;
  plot_code: string;
  village: string;
  owner_label: string;
  crop_name: string;
  variety: string | null;
  season_label: string | null;
  planting_date: string | null;
  planned_harvest_date: string | null;
  harvested_on: string | null;
  status: "planned" | "planted" | "growing" | "harvested" | "cancelled";
  harvest_count: number;
  harvest_weight_kg: string;
}

interface VisitRow {
  id: string;
  plot_code: string;
  owner_label: string;
  village: string;
  crop_name: string | null;
  visit_date: string;
  visit_type: "monitoring" | "budidaya" | "hama_penyakit" | "sarana" | "panen" | "lainnya";
  observer_label: string;
  findings: string | null;
  recommendations: string | null;
}

interface HarvestRow {
  id: string;
  plot_code: string;
  owner_label: string;
  crop_name: string;
  harvest_date: string;
  commodity: string;
  weight_kg: string;
  quality_grade: string | null;
  moisture_percent: string | null;
  recorded_by_label: string;
}

interface MemberOption {
  id: string;
  member_number: string | null;
  full_name: string;
}

const plotStatus: Record<PlotRow["status"], string> = {
  active: "Aktif",
  paused: "Jeda",
  archived: "Arsip",
};

const cycleStatus: Record<CycleRow["status"], string> = {
  planned: "Direncanakan",
  planted: "Sudah ditanam",
  growing: "Dalam pertumbuhan",
  harvested: "Sudah dipanen",
  cancelled: "Dibatalkan",
};

const visitTypeLabel: Record<VisitRow["visit_type"], string> = {
  monitoring: "Pemantauan",
  budidaya: "Budidaya",
  hama_penyakit: "Hama & penyakit",
  sarana: "Sarana pertanian",
  panen: "Panen",
  lainnya: "Lainnya",
};

function dateLabel(value: string | null): string {
  if (!value) return "Belum dicatat";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function numberLabel(value: string | number, maximumFractionDigits = 2): string {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(number);
}

const resultNotices: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  "plot-created": { tone: "success", text: "Petak berhasil diregistrasikan." },
  "plot-updated": { tone: "success", text: "Status petak berhasil diperbarui." },
  "cycle-created": { tone: "success", text: "Siklus budidaya berhasil dibuat." },
  "cycle-updated": { tone: "success", text: "Status siklus budidaya berhasil diperbarui." },
  "visit-recorded": { tone: "success", text: "Kunjungan lapangan berhasil dicatat." },
  "harvest-recorded": { tone: "success", text: "Catatan panen berhasil disimpan." },
  invalid: { tone: "danger", text: "Isian tidak valid. Periksa kembali tanggal dan nilai yang dimasukkan." },
  duplicate: { tone: "warning", text: "Kode petak sudah digunakan pada organisasi ini." },
  "member-unavailable": { tone: "warning", text: "Anggota pemilik tidak ditemukan atau tidak aktif. Pilih pemilik lain atau kosongkan tautan ke anggota." },
  "plot-unavailable": { tone: "warning", text: "Petak tidak tersedia atau sudah diarsipkan." },
  "plot-or-cycle-unavailable": { tone: "warning", text: "Petak atau siklus tidak tersedia pada bidang ini." },
  "cycle-unavailable": { tone: "warning", text: "Siklus tidak ditemukan, bukan milik petak tersebut, atau belum berada pada tahap pertumbuhan/panen." },
  "cycle-transition-blocked": { tone: "warning", text: "Perubahan status siklus belum memenuhi urutan. Siklus hanya dapat ditandai panen setelah ada catatan hasil panen." },
  "plot-stale-or-active-cycle": { tone: "warning", text: "Petak tidak dapat diarsipkan selama masih memiliki siklus budidaya aktif." },
  error: { tone: "danger", text: "Data belum dapat disimpan. Periksa koneksi lalu coba kembali." },
};

export async function FieldAgricultureSection({
  field,
  result,
}: {
  field: FieldDef;
  result?: string;
}) {
  const identity = await requireIdentity("field:pertanian:read");
  const canWrite = can(identity, "field:pertanian:data:write");
  const sql = getV9Sql();

  const [summaryResult, plotResult, cycleResult, visitResult, harvestResult, memberResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int
          FROM v9.agriculture_plots AS plot
          WHERE plot.organization_id = ${identity.organizationId}
            AND plot.field_key = 'pertanian'
            AND plot.status <> 'archived'
        ) AS plot_count,
        (SELECT COALESCE(sum(area_ha), 0)::text
          FROM v9.agriculture_plots AS plot
          WHERE plot.organization_id = ${identity.organizationId}
            AND plot.field_key = 'pertanian'
            AND plot.status <> 'archived'
        ) AS total_area_ha,
        (SELECT count(*)::int
          FROM v9.agriculture_cycles AS cycle
          WHERE cycle.organization_id = ${identity.organizationId}
            AND cycle.field_key = 'pertanian'
            AND cycle.status IN ('planned','planted','growing')
        ) AS active_cycle_count,
        (SELECT count(*)::int
          FROM v9.agriculture_visits AS visit
          WHERE visit.organization_id = ${identity.organizationId}
            AND visit.field_key = 'pertanian'
            AND visit.visit_date >= date_trunc('year', current_date)::date
        ) AS visit_count_this_year,
        (SELECT COALESCE(sum(weight_kg), 0)::text
          FROM v9.agriculture_harvests AS harvest
          WHERE harvest.organization_id = ${identity.organizationId}
            AND harvest.field_key = 'pertanian'
            AND harvest.harvest_date >= date_trunc('year', current_date)::date
        ) AS harvest_weight_this_year
    `,
    sql`
      SELECT
        plot.id::text AS id,
        plot.plot_code,
        plot.owner_label,
        plot.hamlet,
        plot.village,
        plot.commodity,
        plot.land_use,
        plot.area_ha::text AS area_ha,
        plot.location_note,
        plot.status,
        (
          SELECT count(*)::int
          FROM v9.agriculture_cycles AS cycle
          WHERE cycle.plot_id = plot.id
            AND cycle.organization_id = plot.organization_id
            AND cycle.status IN ('planned','planted','growing')
        ) AS active_cycle_count
      FROM v9.agriculture_plots AS plot
      WHERE plot.organization_id = ${identity.organizationId}
        AND plot.field_key = 'pertanian'
      ORDER BY CASE plot.status WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
        plot.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT
        cycle.id::text AS id,
        cycle.plot_id::text AS plot_id,
        plot.plot_code,
        plot.village,
        plot.owner_label,
        cycle.crop_name,
        cycle.variety,
        cycle.season_label,
        cycle.planting_date::text AS planting_date,
        cycle.planned_harvest_date::text AS planned_harvest_date,
        cycle.harvested_on::text AS harvested_on,
        cycle.status,
        (SELECT count(*)::int
          FROM v9.agriculture_harvests AS harvest
          WHERE harvest.cycle_id = cycle.id
            AND harvest.organization_id = cycle.organization_id
        ) AS harvest_count,
        (SELECT COALESCE(sum(weight_kg), 0)::text
          FROM v9.agriculture_harvests AS harvest
          WHERE harvest.cycle_id = cycle.id
            AND harvest.organization_id = cycle.organization_id
        ) AS harvest_weight_kg
      FROM v9.agriculture_cycles AS cycle
      INNER JOIN v9.agriculture_plots AS plot
        ON plot.id = cycle.plot_id
        AND plot.organization_id = cycle.organization_id
        AND plot.field_key = cycle.field_key
      WHERE cycle.organization_id = ${identity.organizationId}
        AND cycle.field_key = 'pertanian'
      ORDER BY
        CASE cycle.status WHEN 'growing' THEN 1 WHEN 'planted' THEN 2 WHEN 'planned' THEN 3 WHEN 'harvested' THEN 4 ELSE 5 END,
        cycle.planned_harvest_date NULLS LAST,
        cycle.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT
        visit.id::text AS id,
        plot.plot_code,
        plot.owner_label,
        plot.village,
        cycle.crop_name,
        visit.visit_date::text AS visit_date,
        visit.visit_type,
        visit.observer_label,
        visit.findings,
        visit.recommendations
      FROM v9.agriculture_visits AS visit
      INNER JOIN v9.agriculture_plots AS plot
        ON plot.id = visit.plot_id
        AND plot.organization_id = visit.organization_id
        AND plot.field_key = visit.field_key
      LEFT JOIN v9.agriculture_cycles AS cycle
        ON cycle.id = visit.cycle_id
        AND cycle.organization_id = visit.organization_id
        AND cycle.field_key = visit.field_key
        AND cycle.plot_id = visit.plot_id
      WHERE visit.organization_id = ${identity.organizationId}
        AND visit.field_key = 'pertanian'
      ORDER BY visit.visit_date DESC, visit.created_at DESC
      LIMIT 100
    `,
    sql`
      SELECT
        harvest.id::text AS id,
        plot.plot_code,
        plot.owner_label,
        cycle.crop_name,
        harvest.harvest_date::text AS harvest_date,
        harvest.commodity,
        harvest.weight_kg::text AS weight_kg,
        harvest.quality_grade,
        harvest.moisture_percent::text AS moisture_percent,
        harvest.recorded_by_label
      FROM v9.agriculture_harvests AS harvest
      INNER JOIN v9.agriculture_plots AS plot
        ON plot.id = harvest.plot_id
        AND plot.organization_id = harvest.organization_id
        AND plot.field_key = harvest.field_key
      INNER JOIN v9.agriculture_cycles AS cycle
        ON cycle.id = harvest.cycle_id
        AND cycle.organization_id = harvest.organization_id
        AND cycle.field_key = harvest.field_key
        AND cycle.plot_id = harvest.plot_id
      WHERE harvest.organization_id = ${identity.organizationId}
        AND harvest.field_key = 'pertanian'
      ORDER BY harvest.harvest_date DESC, harvest.created_at DESC
      LIMIT 100
    `,
    sql`
      SELECT
        membership.id::text AS id,
        membership.member_number,
        person.full_name
      FROM v9.memberships AS membership
      INNER JOIN v9.people AS person ON person.id = membership.person_id
      WHERE membership.organization_id = ${identity.organizationId}
        AND membership.status = 'active'
      ORDER BY person.full_name
      LIMIT 500
    `,
  ]);

  const summary = rowsFromResult<AgricultureSummary>(summaryResult)[0] ?? {
    plot_count: 0,
    total_area_ha: "0",
    active_cycle_count: 0,
    visit_count_this_year: 0,
    harvest_weight_this_year: "0",
  };
  const plots = rowsFromResult<PlotRow>(plotResult);
  const cycles = rowsFromResult<CycleRow>(cycleResult);
  const visits = rowsFromResult<VisitRow>(visitResult);
  const harvests = rowsFromResult<HarvestRow>(harvestResult);
  const members = rowsFromResult<MemberOption>(memberResult);
  const availablePlots = plots.filter((plot) => plot.status !== "archived");
  const harvestableCycles = cycles.filter((cycle) => cycle.status === "growing" || cycle.status === "harvested");
  const message = result ? resultNotices[result] : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Data lahan & produksi"
        description="Register petak, siklus budidaya, kunjungan lapangan, dan catatan panen. Data produksi berasal dari pencatatan petugas, bukan angka contoh."
        actions={<Link href={field.appHref} className="sb-btn sb-btn-outline">Ringkasan bidang</Link>}
      />

      {message ? (
        <div className="mb-4">
          <Notice tone={message.tone} title="Pembaruan data pertanian">{message.text}</Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Petak terdata" value={summary.plot_count} note="Tidak termasuk petak arsip" tone="success" />
        <StatCard label="Luas tercatat" value={`${numberLabel(summary.total_area_ha, 4)} ha`} note="Total luas petak aktif/jeda" tone="info" />
        <StatCard label="Siklus budidaya aktif" value={summary.active_cycle_count} note="Rencana, tanam, dan pertumbuhan" tone="accent" />
        <StatCard label="Kunjungan tahun berjalan" value={summary.visit_count_this_year} note="Berdasarkan tanggal kunjungan" tone="warning" />
        <StatCard label="Hasil panen tahun berjalan" value={`${numberLabel(summary.harvest_weight_this_year, 3)} kg`} note="Akumulasi catatan panen V9" tone="success" />
      </div>

      {canWrite ? (
        <Card className="mt-5">
          <CardHeader title="Registrasi petak / lahan" subtitle="Pemilik dapat ditautkan ke anggota aktif atau dicatat sebagai nama pemilik di lapangan." />
          <form action={createAgriculturePlot} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="plot-code" className="mb-1 block text-[11.5px] font-semibold text-ink2">Kode petak</label>
              <input id="plot-code" name="plot_code" required minLength={2} maxLength={60} className="sb-input" placeholder="Mis. P-001" />
            </div>
            <div>
              <label htmlFor="plot-owner" className="mb-1 block text-[11.5px] font-semibold text-ink2">Nama pemilik / pengelola</label>
              <input id="plot-owner" name="owner_label" required minLength={2} maxLength={160} className="sb-input" placeholder="Nama pemilik lahan" />
            </div>
            <div>
              <label htmlFor="plot-owner-member" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tautkan ke anggota (opsional)</label>
              <select id="plot-owner-member" name="owner_membership_id" defaultValue="" className="sb-input">
                <option value="">Tidak ditautkan</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}{member.member_number ? ` · ${member.member_number}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="plot-commodity" className="mb-1 block text-[11.5px] font-semibold text-ink2">Komoditas utama</label>
              <input id="plot-commodity" name="commodity" required minLength={2} maxLength={120} className="sb-input" placeholder="Mis. Kopi, cabai, sayuran" />
            </div>
            <div>
              <label htmlFor="plot-area" className="mb-1 block text-[11.5px] font-semibold text-ink2">Luas lahan (hektare)</label>
              <input id="plot-area" name="area_ha" type="number" required min="0.0001" max="100000" step="0.0001" className="sb-input" placeholder="0,25" />
            </div>
            <div>
              <label htmlFor="plot-land-use" className="mb-1 block text-[11.5px] font-semibold text-ink2">Jenis penggunaan lahan</label>
              <input id="plot-land-use" name="land_use" maxLength={120} className="sb-input" placeholder="Kebun / tegalan / pekarangan" />
            </div>
            <div>
              <label htmlFor="plot-hamlet" className="mb-1 block text-[11.5px] font-semibold text-ink2">Dusun</label>
              <input id="plot-hamlet" name="hamlet" maxLength={120} className="sb-input" placeholder="Nama dusun" />
            </div>
            <div>
              <label htmlFor="plot-village" className="mb-1 block text-[11.5px] font-semibold text-ink2">Desa</label>
              <input id="plot-village" name="village" required minLength={2} maxLength={120} className="sb-input" placeholder="Nama desa" />
            </div>
            <div>
              <label htmlFor="plot-location" className="mb-1 block text-[11.5px] font-semibold text-ink2">Keterangan lokasi</label>
              <input id="plot-location" name="location_note" maxLength={1000} className="sb-input" placeholder="Petunjuk lokasi / batas petak" />
            </div>
            <div className="flex items-end justify-end sm:col-span-2 xl:col-span-3">
              <button type="submit" className="sb-btn sb-btn-primary"><MapPin size={14} /> Simpan petak</button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader title="Register petak" subtitle={`${plots.length} catatan · maksimal 200 petak terbaru`} />
          {plots.length ? (
            <div className="divide-y divide-line">
              {plots.map((plot) => (
                <article key={plot.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9.5px] text-muted2">{plot.plot_code}</div>
                      <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{plot.owner_label}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        <span>{plot.village}{plot.hamlet ? ` · ${plot.hamlet}` : ""}</span>
                        <span>{plot.commodity}</span>
                        <span>{numberLabel(plot.area_ha, 4)} ha</span>
                        {plot.land_use ? <span>{plot.land_use}</span> : null}
                      </div>
                      {plot.location_note ? <p className="mt-1 text-[10.5px] text-muted2">{plot.location_note}</p> : null}
                    </div>
                    <Badge tone={plot.status === "active" ? "success" : plot.status === "paused" ? "warning" : "neutral"}>{plotStatus[plot.status]}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="text-[10.5px] text-muted2">{plot.active_cycle_count} siklus aktif</span>
                    {canWrite && plot.status !== "archived" ? (
                      <>
                        <form action={updateAgriculturePlotStatus}>
                          <input type="hidden" name="plot_id" value={plot.id} />
                          <input type="hidden" name="next_status" value={plot.status === "active" ? "paused" : "active"} />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">{plot.status === "active" ? "Jeda petak" : "Aktifkan petak"}</button>
                        </form>
                        <form action={updateAgriculturePlotStatus}>
                          <input type="hidden" name="plot_id" value={plot.id} />
                          <input type="hidden" name="next_status" value="archived" />
                          <button type="submit" disabled={plot.active_cycle_count > 0} className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10px]">Arsipkan</button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState title="Belum ada petak terdaftar" body="Mulai dari data lahan yang telah diverifikasi di lapangan. Sistem tidak membuat petak contoh." />
            </div>
          )}
        </Card>
      </div>

      {canWrite && availablePlots.length ? (
        <Card className="mt-5">
          <CardHeader title="Buat siklus budidaya" subtitle="Satu petak dapat memiliki beberapa siklus sesuai komoditas dan musim." />
          <form action={createAgricultureCycle} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-3">
              <label htmlFor="cycle-plot" className="mb-1 block text-[11.5px] font-semibold text-ink2">Petak</label>
              <select id="cycle-plot" name="plot_id" required defaultValue="" className="sb-input">
                <option value="" disabled>Pilih petak aktif / jeda</option>
                {availablePlots.map((plot) => <option key={plot.id} value={plot.id}>{plot.plot_code} · {plot.owner_label} · {plot.commodity}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cycle-crop" className="mb-1 block text-[11.5px] font-semibold text-ink2">Komoditas / tanaman</label>
              <input id="cycle-crop" name="crop_name" required minLength={2} maxLength={120} className="sb-input" placeholder="Nama tanaman" />
            </div>
            <div>
              <label htmlFor="cycle-variety" className="mb-1 block text-[11.5px] font-semibold text-ink2">Varietas</label>
              <input id="cycle-variety" name="variety" maxLength={120} className="sb-input" placeholder="Varietas (opsional)" />
            </div>
            <div>
              <label htmlFor="cycle-season" className="mb-1 block text-[11.5px] font-semibold text-ink2">Musim / periode</label>
              <input id="cycle-season" name="season_label" maxLength={100} className="sb-input" placeholder="Musim / periode tanam" />
            </div>
            <div>
              <label htmlFor="cycle-planting" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal tanam</label>
              <input id="cycle-planting" name="planting_date" type="date" className="sb-input" />
            </div>
            <div>
              <label htmlFor="cycle-harvest" className="mb-1 block text-[11.5px] font-semibold text-ink2">Perkiraan panen</label>
              <input id="cycle-harvest" name="planned_harvest_date" type="date" className="sb-input" />
            </div>
            <div>
              <label htmlFor="cycle-notes" className="mb-1 block text-[11.5px] font-semibold text-ink2">Catatan</label>
              <input id="cycle-notes" name="notes" maxLength={3000} className="sb-input" placeholder="Catatan budidaya" />
            </div>
            <div className="flex justify-end sm:col-span-2 xl:col-span-3">
              <button type="submit" className="sb-btn sb-btn-primary"><Sprout size={14} /> Simpan siklus</button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mt-5">
        <Card>
          <CardHeader title="Siklus budidaya" subtitle={`${cycles.length} siklus tercatat`} />
          {cycles.length ? (
            <div className="divide-y divide-line">
              {cycles.map((cycle) => (
                <article key={cycle.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9.5px] text-muted2">{cycle.plot_code} · {cycle.village}</div>
                      <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{cycle.crop_name}{cycle.variety ? ` · ${cycle.variety}` : ""}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                        <span>Pemilik {cycle.owner_label}</span>
                        {cycle.season_label ? <span>{cycle.season_label}</span> : null}
                        <span>Tanam {dateLabel(cycle.planting_date)}</span>
                        <span>Perkiraan panen {dateLabel(cycle.planned_harvest_date)}</span>
                      </div>
                    </div>
                    <Badge tone={cycle.status === "growing" ? "success" : cycle.status === "harvested" ? "info" : cycle.status === "cancelled" ? "neutral" : "warning"}>{cycleStatus[cycle.status]}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted2">
                    <span>{cycle.harvest_count} catatan panen</span>
                    <span>{numberLabel(cycle.harvest_weight_kg, 3)} kg tercatat</span>
                    {cycle.harvested_on ? <span>Panen selesai {dateLabel(cycle.harvested_on)}</span> : null}
                  </div>
                  {canWrite && ["planned","planted","growing"].includes(cycle.status) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      {cycle.status === "planned" ? (
                        <form action={updateAgricultureCycleStatus}>
                          <input type="hidden" name="cycle_id" value={cycle.id} />
                          <input type="hidden" name="next_status" value="planted" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Tandai ditanam</button>
                        </form>
                      ) : null}
                      {cycle.status === "planted" ? (
                        <form action={updateAgricultureCycleStatus}>
                          <input type="hidden" name="cycle_id" value={cycle.id} />
                          <input type="hidden" name="next_status" value="growing" />
                          <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Mulai pertumbuhan</button>
                        </form>
                      ) : null}
                      {cycle.status === "growing" && cycle.harvest_count > 0 ? (
                        <form action={updateAgricultureCycleStatus} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="cycle_id" value={cycle.id} />
                          <input type="hidden" name="next_status" value="harvested" />
                          <input name="harvested_on" type="date" required className="sb-input !h-8 w-[145px] text-[10px]" aria-label="Tanggal panen selesai" />
                          <button type="submit" className="sb-btn sb-btn-primary !h-8 !px-3 text-[10px]">Selesaikan siklus</button>
                        </form>
                      ) : null}
                      <form action={updateAgricultureCycleStatus}>
                        <input type="hidden" name="cycle_id" value={cycle.id} />
                        <input type="hidden" name="next_status" value="cancelled" />
                        <button type="submit" className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10px]">Batalkan siklus</button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-9">
              <EmptyState title="Belum ada siklus budidaya" body="Buat siklus dari petak yang sudah diregistrasikan." />
            </div>
          )}
        </Card>
      </div>

      {canWrite ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Catat kunjungan lapangan" subtitle="Kunjungan dapat dihubungkan ke petak dan siklus tanaman." />
            {availablePlots.length ? (
              <form action={recordAgricultureVisit} className="grid gap-3 p-4">
                <div>
                  <label htmlFor="visit-plot" className="mb-1 block text-[11.5px] font-semibold text-ink2">Petak</label>
                  <select id="visit-plot" name="plot_id" required defaultValue="" className="sb-input">
                    <option value="" disabled>Pilih petak</option>
                    {availablePlots.map((plot) => <option key={plot.id} value={plot.id}>{plot.plot_code} · {plot.owner_label}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="visit-date" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal kunjungan</label>
                    <input id="visit-date" name="visit_date" type="date" required className="sb-input" />
                  </div>
                  <div>
                    <label htmlFor="visit-type" className="mb-1 block text-[11.5px] font-semibold text-ink2">Jenis kunjungan</label>
                    <select id="visit-type" name="visit_type" defaultValue="monitoring" className="sb-input">
                      <option value="monitoring">Pemantauan</option>
                      <option value="budidaya">Budidaya</option>
                      <option value="hama_penyakit">Hama & penyakit</option>
                      <option value="sarana">Sarana pertanian</option>
                      <option value="panen">Panen</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="visit-cycle" className="mb-1 block text-[11.5px] font-semibold text-ink2">Siklus terkait (opsional)</label>
                  <select id="visit-cycle" name="cycle_id" defaultValue="" className="sb-input">
                    <option value="">Tidak ditautkan</option>
                    {cycles.filter((cycle) => cycle.status !== "cancelled").map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.plot_code} · {cycle.crop_name} · {cycleStatus[cycle.status]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="visit-observer" className="mb-1 block text-[11.5px] font-semibold text-ink2">Petugas / pengamat</label>
                  <input id="visit-observer" name="observer_label" required minLength={2} maxLength={160} className="sb-input" placeholder="Nama petugas" />
                </div>
                <div>
                  <label htmlFor="visit-findings" className="mb-1 block text-[11.5px] font-semibold text-ink2">Temuan lapangan</label>
                  <textarea id="visit-findings" name="findings" rows={3} maxLength={5000} className="sb-input !h-auto resize-y py-2.5" placeholder="Kondisi tanaman, sarana, hama, atau hasil pengamatan." />
                </div>
                <div>
                  <label htmlFor="visit-recommendations" className="mb-1 block text-[11.5px] font-semibold text-ink2">Rekomendasi / tindak lanjut</label>
                  <textarea id="visit-recommendations" name="recommendations" rows={2} maxLength={3000} className="sb-input !h-auto resize-y py-2.5" placeholder="Tindak lanjut yang disarankan." />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="sb-btn sb-btn-primary"><ClipboardCheck size={14} /> Simpan kunjungan</button>
                </div>
              </form>
            ) : (
              <div className="p-4 text-[11.5px] text-muted">Registrasikan petak terlebih dahulu.</div>
            )}
          </Card>

          <Card>
            <CardHeader title="Catat hasil panen" subtitle="Catatan panen harus terhubung ke siklus budidaya yang sedang tumbuh atau telah dipanen." />
            {harvestableCycles.length ? (
              <form action={recordAgricultureHarvest} className="grid gap-3 p-4">
                <div>
                  <label htmlFor="harvest-cycle" className="mb-1 block text-[11.5px] font-semibold text-ink2">Siklus / petak</label>
                  <select id="harvest-cycle" name="cycle_id" required defaultValue="" className="sb-input">
                    <option value="" disabled>Pilih siklus tanaman</option>
                    {harvestableCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.plot_code} · {cycle.crop_name} · {cycleStatus[cycle.status]}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="harvest-date" className="mb-1 block text-[11.5px] font-semibold text-ink2">Tanggal panen</label>
                    <input id="harvest-date" name="harvest_date" type="date" required className="sb-input" />
                  </div>
                  <div>
                    <label htmlFor="harvest-commodity" className="mb-1 block text-[11.5px] font-semibold text-ink2">Komoditas</label>
                    <input id="harvest-commodity" name="commodity" required minLength={2} maxLength={120} className="sb-input" placeholder="Komoditas panen" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="harvest-weight" className="mb-1 block text-[11.5px] font-semibold text-ink2">Berat (kg)</label>
                    <input id="harvest-weight" name="weight_kg" type="number" required min="0.001" max="100000000" step="0.001" className="sb-input" placeholder="0,000" />
                  </div>
                  <div>
                    <label htmlFor="harvest-grade" className="mb-1 block text-[11.5px] font-semibold text-ink2">Mutu / grade</label>
                    <input id="harvest-grade" name="quality_grade" maxLength={60} className="sb-input" placeholder="Grade (opsional)" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="harvest-moisture" className="mb-1 block text-[11.5px] font-semibold text-ink2">Kadar air (%)</label>
                    <input id="harvest-moisture" name="moisture_percent" type="number" min="0" max="100" step="0.01" className="sb-input" placeholder="Opsional" />
                  </div>
                  <div>
                    <label htmlFor="harvest-recorder" className="mb-1 block text-[11.5px] font-semibold text-ink2">Petugas pencatat</label>
                    <input id="harvest-recorder" name="recorded_by_label" required minLength={2} maxLength={160} className="sb-input" placeholder="Nama petugas" />
                  </div>
                </div>
                <div>
                  <label htmlFor="harvest-note" className="mb-1 block text-[11.5px] font-semibold text-ink2">Catatan (opsional)</label>
                  <textarea id="harvest-note" name="note" rows={2} maxLength={3000} className="sb-input !h-auto resize-y py-2.5" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="sb-btn sb-btn-primary"><Wheat size={14} /> Simpan catatan panen</button>
                </div>
              </form>
            ) : (
              <div className="p-4">
                <EmptyState title="Belum ada siklus siap panen" body="Siklus harus berstatus dalam pertumbuhan atau sudah dipanen agar catatan hasil panen dapat ditambahkan." />
              </div>
            )}
          </Card>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Riwayat kunjungan" subtitle={`${visits.length} catatan terbaru`} />
          {visits.length ? (
            <div className="divide-y divide-line">
              {visits.map((visit) => (
                <article key={visit.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-ink">{visit.plot_code} · {visit.village}</div>
                    <Badge tone="neutral">{visitTypeLabel[visit.visit_type]}</Badge>
                  </div>
                  <div className="mt-1 text-[10.5px] text-muted">{dateLabel(visit.visit_date)} · {visit.observer_label}{visit.crop_name ? ` · ${visit.crop_name}` : ""}</div>
                  {visit.findings ? <p className="mt-2 whitespace-pre-wrap text-[11px] text-ink2">{visit.findings}</p> : null}
                  {visit.recommendations ? <p className="mt-1 whitespace-pre-wrap text-[10.5px] text-muted">Tindak lanjut: {visit.recommendations}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8"><EmptyState title="Belum ada kunjungan" body="Catatan petugas lapangan akan muncul setelah disimpan." /></div>
          )}
        </Card>

        <Card>
          <CardHeader title="Rekap hasil panen" subtitle={`${harvests.length} catatan terbaru`} />
          {harvests.length ? (
            <div className="divide-y divide-line">
              {harvests.map((harvest) => (
                <article key={harvest.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-ink">{harvest.commodity}</div>
                    <div className="mt-1 text-[10.5px] text-muted">{harvest.plot_code} · {harvest.owner_label} · {harvest.crop_name}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted2">
                      <span>{dateLabel(harvest.harvest_date)}</span>
                      {harvest.quality_grade ? <span>Mutu {harvest.quality_grade}</span> : null}
                      {harvest.moisture_percent ? <span>Kadar air {numberLabel(harvest.moisture_percent)}%</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold tabular-nums text-primary-800">{numberLabel(harvest.weight_kg, 3)} kg</div>
                    <div className="text-[9.5px] text-muted2">{harvest.recorded_by_label}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8"><EmptyState title="Belum ada panen tercatat" body="Catatan hasil akan tampil setelah panen dicatat berdasarkan siklus tanaman." /></div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Keakuratan data lapangan">
          Kode petak, pemilik/pengelola, desa, komoditas, luas, tanggal, dan berat panen dicatat dari
          hasil verifikasi petugas. Koordinat presisi tidak dikumpulkan pada tahap ini sampai mekanisme
          persetujuan dan akses geolokasi ditetapkan. Catatan hasil panen bukan jurnal atau transaksi
          keuangan.
        </Notice>
      </div>
    </div>
  );
}
