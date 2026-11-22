"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, RotateCcw, Clock, History } from "lucide-react";
import { Badge, Card, CardHeader, StatusBadge } from "@/components/ui";
import { Btn, Field, Modal, Segmented, SearchBox, SearchProvider, useSearch, match, NoRows, TextArea, DemoStateChip } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatIDR, formatDateID } from "@/lib/format";
import type { Approval } from "@/data/types";

type Tab = "menunggu" | "revisi" | "disetujui" | "ditolak" | "semua";

const KIND_LABEL: Record<Approval["kind"], string> = {
  anggaran: "Anggaran", kegiatan: "Kegiatan", pembayaran: "Pembayaran",
  dokumen: "Dokumen", keanggotaan: "Keanggotaan",
};

export function PersetujuanClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state, exec, actor } = useStore();
  const { q } = useSearch();
  const [tab, setTab] = useState<Tab>("menunggu");
  const [dialog, setDialog] = useState<{ id: string; decision: "disetujui" | "ditolak" | "revisi" } | null>(null);
  const [note, setNote] = useState("");

  const counts = {
    menunggu: state.approvals.filter((a) => a.status === "menunggu").length,
    revisi: state.approvals.filter((a) => a.status === "revisi").length,
    disetujui: state.approvals.filter((a) => a.status === "disetujui").length,
    ditolak: state.approvals.filter((a) => a.status === "ditolak").length,
    semua: state.approvals.length,
  };

  const list = state.approvals
    .filter((a) => (tab === "semua" ? true : a.status === tab))
    .filter((a) => match(`${a.id} ${a.title} ${a.bidang} ${a.submittedBy}`, q));

  const target = state.approvals.find((a) => a.id === dialog?.id);

  function submit() {
    if (!dialog) return;
    const r = exec({ type: "approval.decide", id: dialog.id, decision: dialog.decision, note, actor });
    if (r.ok) setDialog(null);
    setNote("");
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Pengurus Harian</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Kotak persetujuan</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Setiap keputusan mencatat aktor, waktu, alasan, dan tahap. Persetujuan anggaran memposting
            jurnal ke Keuangan secara otomatis.
          </p>
        </div>
        <DemoStateChip />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Tab>
          label="Filter status pengajuan"
          value={tab}
          onChange={setTab}
          options={[
            { key: "menunggu", label: "Menunggu", count: counts.menunggu },
            { key: "revisi", label: "Revisi", count: counts.revisi },
            { key: "disetujui", label: "Disetujui", count: counts.disetujui },
            { key: "ditolak", label: "Ditolak", count: counts.ditolak },
            { key: "semua", label: "Semua", count: counts.semua },
          ]}
        />
        <SearchBox placeholder="Cari pengajuan, bidang, pengaju…" className="w-full sm:w-[300px]" />
      </div>

      <div className="mt-4 space-y-3">
        {list.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink2">{a.id}</span>
                  <Badge tone="neutral">{KIND_LABEL[a.kind]}</Badge>
                  <StatusBadge status={a.status === "menunggu" ? "Menunggu" : a.status === "revisi" ? "Revisi" : a.status === "disetujui" ? "Disetujui" : "Ditolak"} />
                </div>
                <h2 className="mt-1.5 font-display text-[17px] font-semibold text-ink">{a.title}</h2>
                <div className="mt-0.5 text-[11.5px] text-muted">
                  {a.bidang} · diajukan {a.submittedBy} · {formatDateID(a.submittedAt)}
                </div>
              </div>
              <div className="text-right">
                {a.amount ? (
                  <div className="font-display text-[20px] font-semibold text-primary-800 tabular-nums">{formatIDR(a.amount)}</div>
                ) : (
                  <div className="text-[12px] text-muted">Non-finansial</div>
                )}
                <div className="text-[10.5px] text-muted2">Tahap: {a.currentStep}</div>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <History size={12} /> Riwayat keputusan
              </div>
              <ol className="mt-2 space-y-2">
                {a.history.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${i === a.history.length - 1 ? "bg-primary-600" : "bg-primary-300"}`} />
                    <div className="text-[12px]">
                      <span className="font-semibold text-ink">{h.actor}</span>{" "}
                      <span className="text-ink2">{h.action.toLowerCase()}</span>{" "}
                      <span className="text-muted2">· {h.at}</span>
                      {h.note ? <div className="text-[11px] text-muted">{h.note}</div> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {(a.status === "menunggu" || a.status === "revisi") && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper px-4 py-2.5">
                <Btn size="sm" variant="primary" icon={<Check size={13} />} onClick={() => { setDialog({ id: a.id, decision: "disetujui" }); setNote(""); }}>
                  Setujui
                </Btn>
                <Btn size="sm" variant="outline" icon={<RotateCcw size={13} />} onClick={() => { setDialog({ id: a.id, decision: "revisi" }); setNote(""); }}>
                  Minta revisi
                </Btn>
                <Btn size="sm" variant="danger" icon={<X size={13} />} onClick={() => { setDialog({ id: a.id, decision: "ditolak" }); setNote(""); }}>
                  Tolak
                </Btn>
                {a.amount && a.kind === "anggaran" ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-muted2">
                    <Clock size={11} /> Persetujuan memposting jurnal otomatis
                  </span>
                ) : null}
              </div>
            )}
          </Card>
        ))}
        {list.length === 0 && (
          <Card>
            <NoRows q={q} />
            {tab !== "semua" && !q ? (
              <div className="border-t border-line px-4 py-3 text-center">
                <Link href="/app/pengurus" className="text-[11.5px] font-semibold text-primary-700">Kembali ke dasbor →</Link>
              </div>
            ) : null}
          </Card>
        )}
      </div>

      <Modal
        open={!!target}
        onClose={() => setDialog(null)}
        title={dialog?.decision === "disetujui" ? "Setujui pengajuan" : dialog?.decision === "ditolak" ? "Tolak pengajuan" : "Minta revisi"}
        description={target ? `${target.id} · ${target.title}` : undefined}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDialog(null)}>Batal</Btn>
            <Btn variant={dialog?.decision === "ditolak" ? "danger" : "primary"} onClick={submit}>
              {dialog?.decision === "disetujui" ? "Setujui & catat" : dialog?.decision === "ditolak" ? "Tolak pengajuan" : "Kirim permintaan revisi"}
            </Btn>
          </>
        }
      >
        {target ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-sb-sm bg-paper p-3 text-[12px]">
              <dt className="text-muted">Jenis</dt><dd className="text-right font-medium text-ink">{KIND_LABEL[target.kind]}</dd>
              <dt className="text-muted">Nilai</dt><dd className="text-right font-semibold text-primary-800">{target.amount ? formatIDR(target.amount) : "—"}</dd>
              <dt className="text-muted">Tahap</dt><dd className="text-right font-medium text-ink">{target.currentStep}</dd>
            </dl>
            {dialog?.decision === "disetujui" && target.amount && target.kind === "anggaran" ? (
              <div className="rounded-sb-sm border border-[#cfe3cd] bg-[var(--sb-success-bg)] px-3 py-2 text-[11.5px] text-[var(--sb-success)]">
                <strong>Efek berantai:</strong> jurnal {formatIDR(target.amount)} diposting ke Keuangan. Surplus dan laporan langsung berubah.
              </div>
            ) : null}
            <Field label="Catatan keputusan" required={dialog?.decision !== "disetujui"} hint="Tersimpan permanen di jejak audit.">
              {(id) => (
                <TextArea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan atau catatan…" />
              )}
            </Field>
            <p className="text-[11px] text-muted2">
              Tercatat atas nama <strong className="text-ink">{actor.name}</strong> ({actor.role}). Pengaju tidak dapat menyetujui pengajuannya sendiri.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
