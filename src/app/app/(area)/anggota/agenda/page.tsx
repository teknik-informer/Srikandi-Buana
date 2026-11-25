import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateFull, relativeID } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda & Kehadiran" };

// Agenda dicatat pengurus (activity.create/activity.status), jadi daftar ini
// harus mengikuti dokumen bersama — bukan ACTIVITIES statis.
export const dynamic = "force-dynamic";

export default async function AgendaAnggotaPage() {
  const { activities: ACTIVITIES, trainings: TRAININGS, shared } = await orgSummary();
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Agenda & kehadiran"
        description={`Kegiatan yang tersedia untuk Anda, termasuk kelas yang masih membuka pendaftaran.${shared ? "" : " (Mode lokal — dokumen bersama belum terbaca.)"}`}
      />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Kegiatan mendatang" subtitle={`${ACTIVITIES.filter((a) => a.status === "terjadwal").length} kegiatan`} />
          <div className="divide-y divide-line">
            {ACTIVITIES.filter((a) => a.status === "terjadwal").map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-[12.5px] font-semibold text-ink">{a.name}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateFull(a.date)} · {a.time} · {a.location}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.openToPublic && <Badge tone="info">Publik</Badge>}
                  <Badge tone="neutral">{relativeID(a.date)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Rekap kehadiran saya" subtitle="Dari presensi pelatihan" />
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] text-muted">Kehadiran 6 bulan terakhir</span>
                <span className="font-display text-[19px] font-semibold text-primary-800">91%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-primary-500" style={{ width: "91%" }} />
              </div>
              <ul className="mt-3 divide-y divide-line text-[12px]">
                {TRAININGS.filter((t) => t.status === "selesai").map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <span className="text-ink2">{t.title}</span>
                    <StatusBadge status="Hadir" />
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Pendaftaran & pembatalan</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
              Pendaftaran pelatihan tercatat pada Bidang Pemberdayaan & Pelatihan. Kuota dihitung
              server-side untuk mencegah overbook.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
