import Link from "next/link";
import type { Metadata } from "next";
import { FIELDS } from "@/config/fields";
import { PROGRAMS, ACTIVITIES, TASKS } from "@/data/operations";
import { APPROVALS, MEETINGS } from "@/data/organization";
import { incomeStatement, cashPosition, trialBalance } from "@/lib/finance";
import { formatIDR, formatDateID, relativeID, percent } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Progress, StatCard, StatusBadge } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { TrendingUp, Landmark, ClipboardCheck, Scale } from "lucide-react";

export const metadata: Metadata = { title: "Ringkasan Organisasi" };

export default function PengurusDashboard() {
  const is = incomeStatement();
  const cash = cashPosition();
  const tb = trialBalance();
  const pending = APPROVALS.filter((a) => a.status === "menunggu");
  const nextMeeting = MEETINGS.filter((m) => m.date >= "2026-11-22")[0];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian · 22 November 2026"
        title="Ringkasan organisasi lintas bidang"
        description="Pandangan menyeluruh tanpa membuka data di luar kewenangan. Semua angka berasal dari aplikasi domain, bukan salinan manual."
        actions={
          <>
            <Link href="/app/pengurus/persetujuan" className="sb-btn sb-btn-primary">Kotak persetujuan <span className="rounded-full bg-white/20 px-1.5 text-[10.5px]">{pending.length}</span></Link>
            <Link href="/app/keuangan/laporan" className="sb-btn sb-btn-outline">Laporan keuangan</Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Surplus periode" value={formatIDR(is.surplus)} note={`Pendapatan ${formatIDR(is.totalRevenue)}`} tone="success" href="/app/keuangan/laporan" icon={<TrendingUp size={17} strokeWidth={2.2} />} />
        <StatCard label="Saldo kas & bank" value={formatIDR(cash.totalClosing)} note="Kas + bank, dari buku besar" tone="info" href="/app/keuangan/kas-bank" icon={<Landmark size={17} strokeWidth={2.2} />} />
        <StatCard label="Persetujuan menunggu" value={pending.length} note="Rata-rata 1,4 hari" tone="accent" href="/app/pengurus/persetujuan" icon={<ClipboardCheck size={17} strokeWidth={2.2} />} />
        <StatCard label="Neraca saldo" value={tb.balanced ? "Seimbang" : "Tidak seimbang"} note={`D ${formatIDR(tb.totalDebit)}`} tone={tb.balanced ? "success" : "danger"} href="/app/keuangan/neraca-saldo" icon={<Scale size={17} strokeWidth={2.2} />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Kinerja empat bidang" subtitle="Progres program & realisasi anggaran" action={<Link href="/app/pengurus/bidang" className="text-[11.5px] font-semibold text-primary-700">Detail lintas bidang →</Link>} />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {FIELDS.map((f) => {
                const prog = PROGRAMS.filter((p) => p.bidang === f.slug);
                const progress = prog.length ? Math.round(prog.reduce((s, p) => s + p.progress, 0) / prog.length) : 0;
                const budget = prog.reduce((s, p) => s + p.budget, 0);
                const spent = prog.reduce((s, p) => s + p.spent, 0);
                return (
                  <Link key={f.fieldId} href={f.appHref} className="rounded-sb-sm border border-line bg-white p-3.5 transition hover:border-primary-300">
                    <div className="flex items-start gap-3">
                      <FieldMark icon={f.icon} accent={f.accent} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-ink">{f.shortName}</div>
                        <div className="mt-0.5 text-[10.5px] text-muted">{prog.length} program · {f.teamSize} anggota tim</div>
                        <div className="mt-2"><Progress value={progress} /></div>
                        <div className="mt-1.5 text-[10.5px] text-muted2">Serapan {percent(spent, budget)}% dari {formatIDR(budget)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Keputusan yang menunggu" subtitle="Dari Workflow Builder, sesuai aturan pemisahan tugas" />
            <div className="divide-y divide-line">
              {pending.map((a) => (
                <Link key={a.id} href="/app/pengurus/persetujuan" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-paper">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-ink">{a.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{a.bidang} · diajukan {a.submittedBy} · {formatDateID(a.submittedAt, "short")}</div>
                    <div className="mt-0.5 text-[10.5px] text-accent-700">Tahap: {a.currentStep}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.amount ? <span className="text-[13px] font-semibold text-primary-800">{formatIDR(a.amount)}</span> : null}
                    <Badge tone="warning">Menunggu</Badge>
                  </div>
                </Link>
              ))}
              {pending.length === 0 && <div className="px-4 py-6 text-center text-[12.5px] text-muted">Tidak ada pengajuan menunggu.</div>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Agenda & rapat terdekat" action={<Link href="/app/pengurus/rapat" className="text-[11.5px] font-semibold text-primary-700">Rapat &amp; keputusan</Link>} />
            <div className="divide-y divide-line">
              {nextMeeting && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12.5px] font-semibold text-ink">{nextMeeting.title}</div>
                    <Badge tone="info">{relativeID(nextMeeting.date)}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">{formatDateID(nextMeeting.date)} · {nextMeeting.type} · {nextMeeting.attendees || "—"} peserta terdaftar</div>
                </div>
              )}
              {ACTIVITIES.filter((a) => a.status === "terjadwal").slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-[12.5px] font-medium text-ink">{a.name}</div>
                    <div className="text-[10.5px] text-muted2">{formatDateID(a.date, "short")} · {a.time} · {a.person}</div>
                  </div>
                  <span className="shrink-0 text-[10.5px] font-semibold text-accent-700">{relativeID(a.date)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Posisi keuangan ringkas" />
            <dl className="divide-y divide-line text-[12.5px]">
              {[
                ["Pendapatan periode", formatIDR(is.totalRevenue), "text-[var(--sb-success)]"],
                ["Beban periode", formatIDR(is.totalExpense), "text-[var(--sb-danger)]"],
                ["Surplus", formatIDR(is.surplus), "text-primary-800 font-semibold"],
                ["Kas", formatIDR(cash.accounts.find((a) => a.code === "1-1000")?.closing ?? 0), ""],
                ["Bank", formatIDR(cash.accounts.find((a) => a.code === "1-1100")?.closing ?? 0), ""],
              ].map(([k, v, cls]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className={`font-medium tabular-nums ${cls}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              Dihitung dari jurnal berstatus posted saja. Jurnal draft/menunggu tidak memengaruhi saldo.
            </div>
          </Card>

          <Card>
            <CardHeader title="Tugas lintas bidang" subtitle="Yang perlu perhatian pengurus" />
            <ul className="divide-y divide-line">
              {TASKS.filter((t) => t.priority === "tinggi").slice(0, 5).map((t) => (
                <li key={t.id} className="px-4 py-2.5">
                  <div className="text-[12px] font-medium leading-snug text-ink">{t.title}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[10.5px] text-muted2">
                    <span>{t.assignee} · {t.bidang}</span>
                    <span className={t.status === "terlambat" ? "font-semibold text-[var(--sb-danger)]" : ""}>{relativeID(t.due)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="rounded-sb border border-primary-200 bg-primary-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700">Pengalaman lintas bidang</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
              Pengurus melihat ringkasan; menulis ke domain bidang tetap dilakukan pemilik proses.
              Ini menjaga jejak audit dan pemisahan tugas.
            </p>
            <Link href="/app/pengurus/bidang" className="mt-2 inline-block text-[12px] font-semibold text-primary-700">Buka pandangan lintas bidang →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
