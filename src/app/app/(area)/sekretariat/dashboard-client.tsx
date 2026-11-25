"use client";

import Link from "next/link";
import { MEETINGS as SEED_MEETINGS } from "@/data/organization";
import { NEWS, STUDIO_PAGES } from "@/data/content";
import { formatDateID, relativeID } from "@/lib/format";
import { Badge, Card, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { Btn, DemoStateChip } from "@/components/act";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { useStore } from "@/lib/store";

export function SekretariatDashboardClient() {
  const { state, exec, actor } = useStore();
  const LETTERS = state.letters;
  const inbound = LETTERS.filter((l) => l.direction === "masuk" && l.status !== "selesai");
  // Dokumen & laporan dipelihara sekretariat; dibaca dari state bersama.
  const DOCUMENTS = state.documents;
  // Rapat kini punya aksi tulis (meeting.create/notulen) — baca state.
  const MEETINGS = state.meetings ?? SEED_MEETINGS;
  const drafts = NEWS.filter((n) => n.status !== "published");

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.sekretariat}
        facts={[
          `${inbound.length} surat perlu tindak lanjut`,
          `${DOCUMENTS.length} dokumen aktif`,
          `${drafts.length} draf publikasi`,
          `${state.activities.filter((a) => a.status === "terjadwal").length} agenda terjadwal`,
        ]}
        badge={<DemoStateChip tone="dark" />}
        actions={[
          { href: "/app/sekretariat/surat", label: "Registrasi surat", primary: true },
          { href: "/studio/website", label: "Website Studio" },
        ]}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Surat masuk perlu tindak lanjut" value={inbound.length} note="Termasuk 1 surat pencairan bantuan" tone="warning" href="/app/sekretariat/surat" />
        <StatCard label="Dokumen aktif" value={DOCUMENTS.length} note={`${DOCUMENTS.filter((d) => d.visibility === "publik").length} publik`} tone="info" href="/app/sekretariat/dokumen" />
        <StatCard label="Draf publikasi" value={drafts.length} note="Menunggu review pengurus" tone="accent" href="/studio/website" />
        <StatCard label="Agenda minggu ini" value={state.activities.filter((a) => a.status === "terjadwal").length} note="Lintas bidang" href="/app/sekretariat/agenda" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Surat masuk terbaru" action={<Link href="/app/sekretariat/surat" className="text-[11.5px] font-semibold text-primary-700">Semua surat →</Link>} />
            <div className="divide-y divide-line">
              {LETTERS.filter((l) => l.direction === "masuk").map((l) => (
                <div key={l.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-[12.5px] font-semibold text-ink">{l.subject}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{l.counterpart} · {l.number} · {formatDateID(l.date, "short")}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={l.status === "baru" ? "Baru" : l.status === "diproses" ? "Diproses" : "Selesai"} />
                      {l.status !== "selesai" ? (
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            exec({
                              type: "letter.status",
                              id: l.id,
                              status: l.status === "baru" ? "diproses" : "selesai",
                              actor,
                            })
                          }
                        >
                          {l.status === "baru" ? "Proses" : "Selesaikan"}
                        </Btn>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 text-[10.5px] text-muted2">Penanggung jawab: {l.assignee}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Notulen & hasil rapat" action={<Link href="/app/sekretariat/notulen" className="text-[11.5px] font-semibold text-primary-700">Buka notulen →</Link>} />
            <div className="divide-y divide-line">
              {MEETINGS.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-[12.5px] font-medium text-ink">{m.title}</div>
                    <div className="text-[10.5px] text-muted2">{formatDateID(m.date, "short")} · {m.decisions.length} keputusan</div>
                  </div>
                  <Badge tone={m.notulenStatus === "final" ? "success" : "warning"}>{m.notulenStatus}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Publikasi website" subtitle="Konten publik dikelola dari Website Studio" />
            <ul className="divide-y divide-line">
              {STUDIO_PAGES.slice(0, 4).map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="font-mono text-[11.5px] font-medium text-ink">{p.path}</div>
                    <div className="text-[10.5px] text-muted2">Diperbarui {p.updatedAt} · {p.updatedBy}</div>
                  </div>
                  <Badge tone={p.status === "published" ? "success" : "warning"}>{p.status}</Badge>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3"><Link href="/studio/website" className="sb-btn sb-btn-outline !py-1.5 text-[12px]">Kelola halaman</Link></div>
          </Card>
          <Card>
            <CardHeader title="Agenda sekretariat" />
            <ul className="divide-y divide-line">
              {state.activities.filter((a) => a.status === "terjadwal").slice(0, 4).map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-medium text-ink">{a.name}</div>
                    <span className="text-[10.5px] font-semibold text-accent-700">{relativeID(a.date)}</span>
                  </div>
                  <div className="text-[10.5px] text-muted2">{formatDateID(a.date, "short")} · {a.time} · {a.location}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
