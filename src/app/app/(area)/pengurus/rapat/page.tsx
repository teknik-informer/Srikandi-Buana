import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateFull } from "@/lib/format";

export const metadata: Metadata = { title: "Rapat & Keputusan" };

export const dynamic = "force-dynamic";

export default async function RapatPage() {
  const { meetings: MEETINGS } = await orgSummary();
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Rapat & keputusan"
        description="Setiap keputusan memiliki konteks, peserta, dan status notulen. Perubahan struktur organisasi hanya sah melalui proses ini."
      />
      <div className="space-y-4">
        {MEETINGS.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink2">{m.id}</span>
                  <Badge tone="neutral">{m.type}</Badge>
                </div>
                <h2 className="mt-1.5 font-display text-[17px] font-semibold text-ink">{m.title}</h2>
                <div className="mt-0.5 text-[11.5px] text-muted">{formatDateFull(m.date)} · {m.attendees} peserta</div>
              </div>
              <StatusBadge status={m.notulenStatus === "final" ? "Notulen final" : "Notulen draf"} />
            </div>
            <div className="px-4 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Keputusan</div>
              {m.decisions.length ? (
                <ol className="mt-2 space-y-2">
                  {m.decisions.map((d, i) => (
                    <li key={i} className="flex gap-2.5 text-[12.5px] text-ink2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-800">{i + 1}</span>
                      {d}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1.5 text-[12px] text-muted">Rapat belum berlangsung; agenda sedang disiapkan sekretariat.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Catatan tata kelola</div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink2">
          Keputusan rapat yang mengubah struktur bidang wajib dicatat pada Organization Studio dengan
          nomor, tanggal, pejabat pengesah, dan tanggal efektif. Data lama tetap terkait ke unit saat
          record dibuat (Blueprint Skenario F).
        </p>
      </Card>
    </div>
  );
}
