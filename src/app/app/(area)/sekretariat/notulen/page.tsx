import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { Badge, Card, CardHeader, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateFull } from "@/lib/format";

export const metadata: Metadata = { title: "Notulen & Putusan" };

export const dynamic = "force-dynamic";

export default async function NotulenPage() {
  // Notulen kini dikelola sekretariat (meeting.create/notulen).
  const { meetings: MEETINGS } = await orgSummary();
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Notulen & putusan"
        description="Catatan rapat dengan keputusan tertulis. Notulen final tidak dapat diubah tanpa jejak revisi."
      />
      <div className="space-y-4">
        {MEETINGS.map((m) => (
          <Card key={m.id}>
            <CardHeader
              title={m.title}
              subtitle={`${formatDateFull(m.date)} · ${m.type} · ${m.attendees} peserta`}
              action={<StatusBadge status={m.notulenStatus === "final" ? "Final" : "Draf"} />}
            />
            <div className="px-4 py-3">
              {m.decisions.length ? (
                <ol className="space-y-2">
                  {m.decisions.map((d, i) => (
                    <li key={i} className="flex gap-2.5 text-[12.5px] text-ink2">
                      <Badge tone="neutral">{String(i + 1).padStart(2, "0")}</Badge>
                      {d}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[12px] text-muted">Belum ada keputusan tercatat.</p>
              )}
            </div>
            <div className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] text-muted2">
              Notulen {m.notulenStatus === "final" ? "final — perubahan hanya melalui revisi berjenjang" : "masih draf — menunggu pemeriksaan"}.
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-5">
        <Notice tone="info" title="Keterkaitan dengan keputusan organisasi">
          Keputusan yang mengubah struktur atau menetapkan pejabat bidang diteruskan ke Organization
          Studio, dengan nomor keputusan dan tanggal efektif. Sistem tidak mengubah registry bidang
          dari halaman notulen.
        </Notice>
      </div>
    </div>
  );
}
