import type { Metadata } from "next";
import { ACTIVITIES } from "@/data/operations";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { formatDateFull, relativeID } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda Organisasi" };

const BIDANG_LABEL: Record<string, string> = {
  organisasi: "Organisasi & Keanggotaan",
  pertanian: "Pertanian & Produksi",
  pelatihan: "Pemberdayaan & Pelatihan",
  usaha: "Usaha & Kemitraan",
};

export default function AgendaPage() {
  const byDate = new Map<string, typeof ACTIVITIES>();
  for (const a of ACTIVITIES.filter((x) => x.status === "terjadwal")) {
    byDate.set(a.date, [...(byDate.get(a.date) ?? []), a]);
  }
  const dates = [...byDate.keys()].sort();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Agenda organisasi"
        description="Kalender kegiatan lintas bidang. Kegiatan publik tersinkron ke halaman agenda website."
      />
      <div className="space-y-4">
        {dates.map((d) => (
          <Card key={d}>
            <CardHeader title={formatDateFull(d)} subtitle={`${byDate.get(d)!.length} kegiatan · ${relativeID(d)}`} />
            <div className="divide-y divide-line">
              {byDate.get(d)!.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{a.name}</div>
                    <div className="text-[10.5px] text-muted2">{a.time} · {a.location} · PIC {a.person}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone="neutral">{BIDANG_LABEL[a.bidang]}</Badge>
                    {a.openToPublic && <Badge tone="info">Publik</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
