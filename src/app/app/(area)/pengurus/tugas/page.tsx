import Link from "next/link";
import type { Metadata } from "next";
import { TASKS, PROGRAMS } from "@/data/operations";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { daysUntil, formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Tugas Pengurus" };

const STATUS_TONE = { belum: "neutral", proses: "info", selesai: "success", terlambat: "danger" } as const;
const PRIORITY_TONE = { tinggi: "danger", sedang: "warning", rendah: "neutral" } as const;

export default function TugasPengurusPage() {
  const pengurusBidang = ["organisasi", "keuangan", "sekretariat"];
  const tugasPengurus = TASKS.filter((t) => pengurusBidang.includes(t.bidang));
  const terbuka = TASKS.filter((t) => t.status !== "selesai");
  const terlambat = TASKS.filter((t) => t.status === "terlambat");
  const sorted = [...TASKS].sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Tugas pengurus"
        description="Beban kerja lintas peran pengurus: persetujuan, rekonsiliasi, kesekretariatan, dan tindak lanjut usulan anggota. Status mengikuti pemilik tugas masing-masing."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tugas terbuka" value={terbuka.length} note={`${TASKS.length} tugas tercatat`} tone="info" />
        <StatCard label="Terlambat" value={terlambat.length} note="Melewati tenggat demo" tone={terlambat.length ? "danger" : "success"} />
        <StatCard label="Urgensi tinggi" value={terbuka.filter((t) => t.priority === "tinggi").length} note="Prioritas tinggi & belum selesai" tone="warning" />
        <StatCard label="Tugas pengurus inti" value={tugasPengurus.length} note="Organisasi · keuangan · sekretariat" />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Daftar tugas"
            subtitle="Diurutkan menurut tenggat terdekat"
            action={<Badge tone="neutral">{sorted.length} baris</Badge>}
          />
          <div className="sb-scroll">
            <table className="sb-table min-w-[760px]">
              <thead>
                <tr><th>Tugas</th><th>Bidang</th><th>Penanggung jawab</th><th>Tenggat</th><th>Prioritas</th><th>Status</th></tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const field = FIELDS.find((f) => f.slug === t.bidang);
                  const d = daysUntil(t.due);
                  return (
                    <tr key={t.id}>
                      <td className="font-medium text-ink">
                        {t.title}
                        {t.programCode ? <div className="mt-0.5 font-mono text-[10px] text-muted2">{t.programCode}</div> : null}
                      </td>
                      <td className="text-muted">{field?.shortName ?? t.bidang}</td>
                      <td className="text-ink2">{t.assignee}</td>
                      <td className="whitespace-nowrap text-muted">
                        {formatDateID(t.due, "short")}
                        <div className={`text-[10.5px] ${d < 0 ? "text-[var(--sb-danger)]" : "text-muted2"}`}>
                          {d < 0 ? `lewat ${Math.abs(d)} hari` : d === 0 ? "hari ini" : `${d} hari lagi`}
                        </div>
                      </td>
                      <td><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                      <td><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Beban per bidang" subtitle="Tugas belum selesai" />
          <ul className="divide-y divide-line">
            {FIELDS.map((f) => {
              const list = TASKS.filter((t) => t.bidang === f.slug && t.status !== "selesai");
              return (
                <li key={f.fieldId} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-[12.5px] text-ink">{f.shortName}</span>
                  <div className="flex items-center gap-2">
                    {f.appHref ? <Link href={f.appHref} className="text-[11px] font-semibold text-primary-700">Buka</Link> : null}
                    <Badge tone={list.length ? "info" : "success"}>{list.length} terbuka</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Terkait program" subtitle="Tugas yang menopang program aktif" />
          <ul className="divide-y divide-line">
            {PROGRAMS.filter((p) => p.status === "berjalan").map((p) => {
              const list = TASKS.filter((t) => t.programCode === p.code && t.status !== "selesai");
              return (
                <li key={p.code} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="min-w-0 text-[12.5px] text-ink">{p.name}</span>
                  <Badge tone={list.length ? "warning" : "success"}>{list.length} tugas</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
