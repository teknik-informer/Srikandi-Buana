import Link from "next/link";
import type { Metadata } from "next";
import { MEETINGS } from "@/data/organization";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatDateFull, daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Rapat & Undangan" };

export default function RapatSekretariatPage() {
  const mendatang = MEETINGS.filter((m) => daysUntil(m.date) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const lampau = MEETINGS.filter((m) => daysUntil(m.date) <= 0).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Rapat & undangan"
        description="Jadwal rapat, undangan, dan kesiapan notulen. Undangan diterbitkan sekretariat sebelum rapat; hasilnya dicatat pada notulen."
        actions={<Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline">Notulen</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Rapat mendatang" value={mendatang.length} note="Undangan perlu disiapkan" tone="info" />
        <StatCard label="Rapat terlaksana" value={lampau.length} note="Dengan notulen" tone="success" />
        <StatCard label="Hadir tercatat" value={lampau.reduce((s, m) => s + m.attendees, 0)} note="Akumulasi kehadiran" tone="neutral" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Agenda mendatang" subtitle="Belum dilaksanakan" />
          {mendatang.length ? (
            <ul className="divide-y divide-line">
              {mendatang.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-ink">{m.title}</div>
                      <div className="mt-0.5 text-[11.5px] text-muted">{formatDateFull(m.date)}</div>
                    </div>
                    <Badge tone="info">{daysUntil(m.date)} hari lagi</Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-muted2">{m.type} · notulen {m.notulenStatus}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8"><EmptyState title="Belum ada rapat terjadwal" body="Tambahkan agenda rapat melalui sekretariat." /></div>
          )}
        </Card>

        <Card>
          <CardHeader title="Sudah terlaksana" subtitle="Undangan terkirim, notulen tersedia" />
          <ul className="divide-y divide-line">
            {lampau.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink">{m.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{formatDateFull(m.date)}</div>
                  </div>
                  <Badge tone={m.notulenStatus === "final" ? "success" : "warning"}>notulen {m.notulenStatus}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted2">
                  {m.attendees} hadir · {m.decisions.length} keputusan
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
