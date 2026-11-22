"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TrendingUp, Landmark, ClipboardCheck, Scale, ArrowRight, Check, X, RotateCcw,
  CalendarDays, ListChecks, CircleDollarSign, Target, Activity as ActivityIcon, FileClock,
} from "lucide-react";
import { FIELDS } from "@/config/fields";
import { COA } from "@/data/coa";
import { MEETINGS } from "@/data/organization";
import { formatIDR, formatDateID, relativeID, percent } from "@/lib/format";
import { Badge, Card, CardHeader, Progress, StatCard, StatusBadge } from "@/components/ui";
import { Btn, Field, Modal, TextArea, DemoStateChip } from "@/components/act";
import { useStore, useFinance, demoNow } from "@/lib/store";
import { FieldMark } from "@/components/brand";

/** Short human label for an audit app code. */
const APP_LABEL: Record<string, string> = {
  pengurus: "Pengurus", keuangan: "Keuangan", sekretariat: "Sekretariat",
  pos: "POS", anggota: "Anggota", sistem: "Sistem",
};

export function PengurusDashboardClient() {
  const { state, exec, actor } = useStore();
  const { tb, is } = useFinance();
  const [deciding, setDeciding] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"disetujui" | "ditolak" | "revisi">("disetujui");

  const pending = state.approvals.filter((a) => a.status === "menunggu");
  const nextMeeting = MEETINGS.filter((m) => m.date >= "2026-11-22")[0];
  const openTasks = state.tasks.filter((t) => t.status !== "selesai");

  const fieldRows = useMemo(
    () =>
      FIELDS.map((f) => {
        const prog = state.programs.filter((p) => p.bidang === f.slug);
        const progress = prog.length ? Math.round(prog.reduce((s, p) => s + p.progress, 0) / prog.length) : 0;
        const budget = prog.reduce((s, p) => s + p.budget, 0);
        const spent = prog.reduce((s, p) => s + p.spent, 0);
        return { f, prog, progress, budget, spent };
      }),
    [state.programs],
  );

  const target = state.approvals.find((a) => a.id === deciding);

  function submit() {
    if (!deciding) return;
    exec({ type: "approval.decide", id: deciding, decision, note, actor });
    setDeciding(null);
    setNote("");
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <div className="sb-label mb-1.5">Pengurus Harian · {formatDateID("2026-11-22")}</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">
            Ringkasan organisasi lintas bidang
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DemoStateChip />
            <span className="text-[11.5px] text-muted">
              Masuk sebagai <strong className="font-semibold text-ink">{actor.name}</strong> · {actor.role}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/pengurus/persetujuan" className="sb-btn sb-btn-primary">
            Kotak persetujuan
            <span className="rounded-full bg-white/20 px-1.5 text-[10.5px] tabular-nums">{pending.length}</span>
          </Link>
          <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline">Posting jurnal</Link>
        </div>
      </header>

      {/* Live KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Surplus periode"
          value={formatIDR(is.surplus)}
          note={`Pendapatan ${formatIDR(is.totalRevenue)}`}
          tone="success"
          href="/app/keuangan/laporan"
          icon={<TrendingUp size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Neraca saldo"
          value={tb.balanced ? "Seimbang" : "Tidak seimbang"}
          note={`D ${formatIDR(tb.totalDebit)} · K ${formatIDR(tb.totalCredit)}`}
          tone={tb.balanced ? "success" : "danger"}
          href="/app/keuangan/neraca-saldo"
          icon={<Scale size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Persetujuan menunggu"
          value={pending.length}
          note={pending.length ? "Perlu keputusan Anda" : "Tidak ada antrean"}
          tone="accent"
          href="/app/pengurus/persetujuan"
          icon={<ClipboardCheck size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Tugas terbuka"
          value={openTasks.length}
          note={`${state.tasks.filter((t) => t.status === "terlambat").length} terlambat`}
          tone="info"
          href="/app/pengurus/tugas"
          icon={<ListChecks size={17} strokeWidth={2.2} />}
        />
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          {/* Inbox: decide inline */}
          <Card>
            <CardHeader
              title="Kotak persetujuan"
              subtitle="Putuskan di tempat — persetujuan anggaran langsung memposting jurnal"
              action={<Link href="/app/pengurus/persetujuan" className="text-[11.5px] font-semibold text-primary-700">Semua pengajuan →</Link>}
            />
            <div className="divide-y divide-line">
              {pending.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink2">{a.id}</span>
                        <Badge tone="neutral">{a.kind}</Badge>
                        <span className="text-[10.5px] text-muted2">{a.bidang}</span>
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-ink">{a.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        Diajukan {a.submittedBy} · {formatDateID(a.submittedAt, "short")} · tahap {a.currentStep}
                      </div>
                    </div>
                    {a.amount ? (
                      <div className="text-right font-display text-[15px] font-bold text-primary-800 tabular-nums">
                        {formatIDR(a.amount)}
                      </div>
                    ) : (
                      <Badge tone="neutral">Tanpa anggaran</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Btn
                      size="sm"
                      variant="primary"
                      icon={<Check size={13} />}
                      onClick={() => { setDeciding(a.id); setDecision("disetujui"); setNote(""); }}
                    >
                      Setujui
                    </Btn>
                    <Btn
                      size="sm"
                      variant="outline"
                      icon={<RotateCcw size={13} />}
                      onClick={() => { setDeciding(a.id); setDecision("revisi"); setNote(""); }}
                    >
                      Minta revisi
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      icon={<X size={13} />}
                      onClick={() => { setDeciding(a.id); setDecision("ditolak"); setNote(""); }}
                    >
                      Tolak
                    </Btn>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <div className="text-[13px] font-semibold text-ink">Antrean kosong</div>
                  <p className="mt-0.5 text-[12px] text-muted">Semua pengajuan sudah Anda putuskan.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Field performance */}
          <Card>
            <CardHeader title="Kinerja empat bidang" subtitle="Progres program & serapan anggaran" action={<Link href="/app/pengurus/bidang" className="text-[11.5px] font-semibold text-primary-700">Detail →</Link>} />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {fieldRows.map(({ f, prog, progress, budget, spent }) => (
                <Link key={f.fieldId} href={f.appHref} className="group rounded-sb-sm border border-line bg-white p-3.5 transition hover:border-primary-300 hover:shadow-[var(--sb-shadow)]">
                  <div className="flex items-start gap-3">
                    <FieldMark icon={f.icon} accent={f.accent} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-[12.5px] font-semibold text-ink">{f.shortName}</div>
                        <ArrowRight size={13} className="text-muted2 transition group-hover:translate-x-0.5 group-hover:text-primary-700" />
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">{prog.length} program · {f.teamSize} anggota tim</div>
                      <div className="mt-2"><Progress value={progress} /></div>
                      <div className="mt-1.5 text-[10.5px] text-muted2">Serapan {percent(spent, budget)}% dari {formatIDR(budget)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Agenda */}
          <Card>
            <CardHeader
              title="Agenda & rapat terdekat"
              action={<Link href="/app/sekretariat/agenda" className="text-[11.5px] font-semibold text-primary-700">Agenda lengkap</Link>}
            />
            <div className="divide-y divide-line">
              {nextMeeting && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12.5px] font-semibold text-ink">{nextMeeting.title}</div>
                    <Badge tone="info">{relativeID(nextMeeting.date)}</Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatDateID(nextMeeting.date)}</span>
                    <span>{nextMeeting.type}</span>
                    <span>{nextMeeting.attendees || "—"} peserta</span>
                  </div>
                </div>
              )}
              {state.tasks.filter((t) => t.priority === "tinggi" && t.status !== "selesai").slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-ink">{t.title}</div>
                    <div className="text-[10.5px] text-muted2">{t.assignee} · {t.bidang}</div>
                  </div>
                  <span className={`shrink-0 text-[10.5px] font-semibold ${t.status === "terlambat" ? "text-[var(--sb-danger)]" : "text-accent-700"}`}>
                    {relativeID(t.due)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Posisi keuangan" subtitle="Dihitung dari jurnal diposting" action={<Link href="/app/keuangan" className="text-[11.5px] font-semibold text-primary-700">Buka →</Link>} />
            <dl className="divide-y divide-line text-[12.5px]">
              {[
                ["Pendapatan periode", formatIDR(is.totalRevenue), "text-[var(--sb-success)]"],
                ["Beban periode", formatIDR(is.totalExpense), "text-[var(--sb-danger)]"],
                ["Surplus", formatIDR(is.surplus), "text-primary-800 font-semibold"],
                ["Kas", formatIDR(state.journals.length ? cashOf(state.journals, "1-1000") : 0), ""],
                ["Bank", formatIDR(cashOf(state.journals, "1-1100")), ""],
              ].map(([k, v, cls]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className={`font-medium tabular-nums ${cls}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              {state.drafts.length} draf belum diposting · {state.journals.length} jurnal total
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Jejak audit"
              subtitle="Aktivitas terbaru lintas aplikasi"
              action={<Badge tone="neutral">{state.audit.length}</Badge>}
            />
            <ol className="max-h-[340px] divide-y divide-line overflow-y-auto">
              {state.audit.slice(0, 8).map((e) => (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-ink">{e.action}</span>
                    <span className="shrink-0 rounded bg-surface2 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted">
                      {APP_LABEL[e.app] ?? e.app}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">{e.detail}</div>
                  <div className="mt-0.5 text-[10px] text-muted2">{e.actor} · {e.actorRole} · {e.at}</div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="rounded-sb border border-primary-200 bg-primary-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700">Pengalaman lintas bidang</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
              Pengurus melihat ringkasan; menulis ke domain bidang tetap dilakukan pemilik proses.
              Ini menjaga jejak audit dan pemisahan tugas.
            </p>
            <Link href="/app/pengurus/bidang" className="mt-2 inline-block text-[12px] font-semibold text-primary-700">
              Buka pandangan lintas bidang →
            </Link>
          </div>
        </div>
      </div>

      {/* Decision dialog */}
      <Modal
        open={!!target}
        onClose={() => setDeciding(null)}
        title={
          decision === "disetujui" ? "Setujui pengajuan"
          : decision === "ditolak" ? "Tolak pengajuan"
          : "Minta revisi"
        }
        description={target ? `${target.id} · ${target.title}` : undefined}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeciding(null)}>Batal</Btn>
            <Btn variant={decision === "ditolak" ? "danger" : "primary"} onClick={submit}>
              {decision === "disetujui" ? "Setujui & catat" : decision === "ditolak" ? "Tolak pengajuan" : "Kirim permintaan revisi"}
            </Btn>
          </>
        }
      >
        {target ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-sb-sm bg-paper p-3 text-[12px]">
              <dt className="text-muted">Jenis</dt><dd className="text-right font-medium text-ink">{target.kind}</dd>
              <dt className="text-muted">Bidang</dt><dd className="text-right font-medium text-ink">{target.bidang}</dd>
              <dt className="text-muted">Nilai</dt><dd className="text-right font-semibold text-primary-800">{target.amount ? formatIDR(target.amount) : "—"}</dd>
              <dt className="text-muted">Tahap</dt><dd className="text-right font-medium text-ink">{target.currentStep}</dd>
            </dl>
            {decision === "disetujui" && target.amount && target.kind === "anggaran" ? (
              <div className="rounded-sb-sm border border-[#cfe3cd] bg-[var(--sb-success-bg)] px-3 py-2 text-[11.5px] text-[var(--sb-success)]">
                <strong>Efek berantai:</strong> persetujuan ini memposting jurnal {formatIDR(target.amount)} ke Keuangan
                (debit Beban Pelatihan, kredit Kas). Surplus dan neraca saldo di halaman ini langsung berubah.
              </div>
            ) : null}
            <Field label={decision === "disetujui" ? "Catatan persetujuan" : "Alasan (wajib untuk penolakan/revisi)"} required={decision !== "disetujui"} hint="Tersimpan permanen di jejak audit.">
              {(id) => (
                <TextArea
                  id={id}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={decision === "disetujui" ? "mis. sesuai rencana kerja November" : "Jelaskan apa yang perlu diperbaiki"}
                />
              )}
            </Field>
            <p className="text-[11px] text-muted2">
              Keputusan bersifat final dan tercatat atas nama <strong className="text-ink">{actor.name}</strong>. Pemisahan tugas:
              pengaju tidak dapat menyetujui pengajuannya sendiri.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/** Opening cash/bank posted balance, recomputed from the live journal list. */
function cashOf(journals: { status: string; lines: { accountCode: string; debit: number; credit: number }[] }[], code: string) {
  let bal = 0;
  for (const j of journals) {
    if (j.status !== "diposting") continue;
    for (const l of j.lines) if (l.accountCode === code) bal += l.debit - l.credit;
  }
  return bal;
}
