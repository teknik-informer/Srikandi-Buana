import Link from "next/link";
import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { Badge, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Dokumen Keputusan" };

/** Decision documents = records that carry an adopted decision: SK, notulen, laporan resmi. */
const DECISION_CATEGORIES = ["SK", "Notulen", "Laporan"] as const;

export const dynamic = "force-dynamic";

export default async function DokumenKeputusanPage() {
  // Dokumen & persetujuan hidup; rapat masih benih.
  const { documents: DOCUMENTS, approvals: APPROVALS, meetings: MEETINGS } = await orgSummary();
  const decisions = DOCUMENTS.filter((d) => (DECISION_CATEGORIES as readonly string[]).includes(d.category));
  const adopted = MEETINGS.filter((m) => m.decisions.length > 0);
  const totalDecisions = adopted.reduce((s, m) => s + m.decisions.length, 0);
  const approved = APPROVALS.filter((a) => a.status === "disetujui");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Dokumen keputusan"
        description="Keputusan pengurus yang sudah ditetapkan beserta dasar dokumennya. Keputusan hanya sah bila tercatat pada rapat atau SK; draf belum mengikat."
        actions={<Link href="/app/sekretariat/dokumen" className="sb-btn sb-btn-outline">Arsip lengkap</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Dokumen keputusan" value={decisions.length} note={`${DOCUMENTS.length} dokumen di arsip`} />
        <StatCard label="Keputusan rapat" value={totalDecisions} note={`Dari ${adopted.length} rapat`} tone="info" />
        <StatCard label="Usulan disetujui" value={approved.length} note={`${APPROVALS.length} usulan tercatat`} tone="success" href="/app/pengurus/persetujuan" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader
            title="Keputusan rapat"
            subtitle="Diambil dalam rapat pengurus/anggota dan dicatat di notulen"
            action={<Link href="/app/pengurus/rapat" className="text-[11.5px] font-semibold text-primary-700">Rapat →</Link>}
          />
          <div className="divide-y divide-line">
            {MEETINGS.map((m) => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">{m.title}</span>
                  <Badge tone={m.notulenStatus === "final" ? "success" : "warning"}>
                    Notulen {m.notulenStatus === "final" ? "final" : "draf"}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {formatDateID(m.date, "long")} · {m.type} · {m.attendees} hadir
                </div>
                {m.decisions.length ? (
                  <ul className="mt-2 space-y-1">
                    {m.decisions.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-[12px] text-ink2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sb-primary-500)]" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1.5 text-[11px] text-muted2">
                    {m.notulenStatus === "final" ? "Belum tercatat keputusan." : "Keputusan menunggu rapat dilaksanakan."}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Dokumen dasar" subtitle="SK, notulen final, dan laporan resmi" />
          <ul className="divide-y divide-line">
            {decisions.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink">{d.title}</div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-muted2">{d.number} · {formatDateID(d.date, "short")}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone="neutral">{d.category}</Badge>
                    <Badge tone={d.visibility === "publik" ? "success" : d.visibility === "internal" ? "info" : "warning"}>{d.visibility}</Badge>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-muted">Pemilik: {d.owner} · status {d.status}</div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Berkas lampiran tidak disertakan pada demo ini — arsip dokumen hanya menampilkan metadata.
          </div>
        </Card>
      </div>
    </div>
  );
}
