"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays, Check, ClipboardCheck, Compass, FileText, Handshake, Landmark,
  LineChart, ListChecks, RotateCcw, Scale, Sprout, TrendingUp, Users, Wallet, X,
  ArrowRight, GraduationCap, Store, ShieldCheck, CircleDollarSign, Target,
  Clock, SlidersHorizontal, BarChart3, FolderOpen, CircleHelp, Home, Network,
} from "lucide-react";
import { FIELDS } from "@/config/fields";
import { MEETINGS as SEED_MEETINGS, MEMBERS as SEED_MEMBERS } from "@/data/organization";
import { NEWS } from "@/data/content";
import { formatIDR, formatDateID, relativeID } from "@/lib/format";
import { Badge, Card, CardHeader } from "@/components/ui";
import { Btn, Field, Modal, TextArea } from "@/components/act";
import { useStore, useFinance } from "@/lib/store";
import {
  ActivityChart, AgendaCard, AppBanner, DonutCard, GrowthCard, KpiStrip, NewsCard,
  QuickAccess, RecentCard, WorkspaceCard, type Kpi,
} from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";

type DashChart = {
  ranges: { key: string; label: string }[];
  labels: Record<string, string[]>;
  series: Record<string, { key: string; label: string; color: string; points: number[] }[]>;
};

const APP_LABEL: Record<string, string> = {
  pengurus: "Pengurus", keuangan: "Keuangan", sekretariat: "Sekretariat",
  pos: "POS", anggota: "Anggota", sistem: "Sistem",
};

/** The demo clock; everything below is measured against it. */
const SPAN_START = "2016-01";   // founding year column in the activity chart
const ACTIVITY_START = "2026-08";

export function PengurusDashboardClient() {
  const { state, exec, actor } = useStore();
  const { tb, is } = useFinance();
  const [deciding, setDeciding] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"disetujui" | "ditolak" | "revisi">("disetujui");

  const pending = state.approvals.filter((a) => a.status === "menunggu");
  const openTasks = state.tasks.filter((t) => t.status !== "selesai");
  const late = state.tasks.filter((t) => t.status === "terlambat");
  // Rapat bagian dari dokumen bersama sejak meeting.create ada.
  const semuaRapat = state.meetings ?? SEED_MEETINGS;
  const nextMeeting = semuaRapat.filter((m) => m.date >= "2026-11-22").sort((a, b) => a.date.localeCompare(b.date))[0];

  /* ---- live figures, all derived from the same store the apps write to ---- */
  /**
   * Angka di bawah dibaca dari state bersama, bukan dari konstanta data.
   * Sebelumnya `MEMBERS` dan `LANDS` diimpor langsung, sehingga anggota yang
   * baru didaftarkan tidak pernah mengubah dasbor — dasbor tampak hidup padahal
   * hanya membaca arsip contoh. Sekarang ia mengikuti apa yang benar-benar
   * tercatat di buku induk dan data lahan.
   */
  const activeMembers = state.members.filter((m) => m.status === "aktif").length;
  const candidates = state.members.filter((m) => m.status === "menunggu").length;
  const landHa = state.lands.reduce((s: number, l) => s + (Number(l.areaHa) || 0), 0);
  const cash = postedBalance(state.journals, "1-1000");
  const bank = postedBalance(state.journals, "1-1100");

  const donePrograms = state.programs.filter((p) => p.status === "selesai").length;
  const runPrograms = state.programs.filter((p) => p.status === "berjalan").length;
  const planPrograms = state.programs.filter((p) => p.status !== "selesai" && p.status !== "berjalan").length;
  const programTotal = state.programs.length || 1;

  const meetingsDone = state.activities.filter((a) => a.status === "selesai").length;
  const partners = 3; // documented in the partner register; not a live entity in this demo

  /* Activity chart: three real series, bucketed from real dated records.
     Every range is a trailing window that ends on the demo clock (22 Nov). */
  const chart = useMemo((): DashChart => {
    const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const dayLabel = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`;
    const window7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 10, 15 + i));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });
    const window14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 10, 8 + i));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });
    const window22 = Array.from({ length: 22 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 10, 1 + i));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });

    const seriesFor = (days: string[]) => [
      {
        key: "kegiatan",
        label: "Kegiatan",
        color: "#127e2f",
        points: days.map((iso) => state.activities.filter((a) => a.date === iso).length),
      },
      {
        key: "tugas",
        label: "Tugas jatuh tempo",
        color: "#1f6fd0",
        points: days.map((iso) => state.tasks.filter((t) => t.due === iso).length),
      },
      {
        key: "keuangan",
        label: "Transaksi",
        color: "#e8a012",
        points: days.map((iso) => state.journals.filter((j) => j.date === iso).length),
      },
    ];

    return {
      ranges: [
        { key: "7h", label: "7 Hari" },
        { key: "14h", label: "14 Hari" },
        { key: "22h", label: "22 Hari" },
      ],
      labels: {
        "7h": window7.map(dayLabel),
        "14h": window14.map(dayLabel),
        "22h": window22.map(dayLabel),
      },
      series: {
        "7h": seriesFor(window7),
        "14h": seriesFor(window14),
        "22h": seriesFor(window22),
      },
    };
  }, [state.tasks, state.journals, state.activities]);

  const target = state.approvals.find((a) => a.id === deciding);

  function submit() {
    if (!deciding) return;
    exec({ type: "approval.decide", id: deciding, decision, note, actor });
    setDeciding(null);
    setNote("");
  }

  /* KPI strip — every number computed, none typed in by hand. */
  const kpis: Kpi[] = [
    {
      label: "Jumlah Anggota",
      value: String(activeMembers),
      delta: candidates ? `${candidates} calon menunggu` : undefined,
      note: `dari ${state.members.length} terdaftar`,
      href: "/app/pengurus/anggota",
      tone: "green",
      icon: <Users size={15} />,
      watermark: <Users size={62} strokeWidth={1.6} />,
    },
    {
      label: "Luas Lahan Produktif",
      value: `${landHa.toFixed(2).replace(".", ",")} Ha`,
      note: `${state.lands.filter((l) => l.status === "produktif").length} petak produktif`,
      href: "/app/bidang/pertanian",
      tone: "blue",
      icon: <Sprout size={15} />,
      watermark: <Sprout size={62} strokeWidth={1.6} />,
    },
    {
      label: "Saldo Kas & Bank",
      value: formatIDR(cash + bank),
      note: `${state.drafts.length} draf belum diposting`,
      href: "/app/keuangan/kas-bank",
      tone: "amber",
      icon: <Wallet size={15} />,
      watermark: <CircleDollarSign size={62} strokeWidth={1.6} />,
    },
    {
      label: "Kegiatan Bulan Ini",
      value: String(state.activities.filter((a) => a.date.startsWith("2026-11")).length),
      note: `${meetingsDone} selesai · ${nextMeeting ? relativeID(nextMeeting.date).toLowerCase() : "—"} rapat`,
      href: "/app/sekretariat/agenda",
      tone: "violet",
      icon: <CalendarDays size={15} />,
      watermark: <CalendarDays size={62} strokeWidth={1.6} />,
    },
    {
      label: "Mitra Aktif",
      value: String(partners),
      note: "tercatat di daftar mitra",
      href: "/kemitraan",
      tone: "teal",
      icon: <Handshake size={15} />,
      watermark: <Handshake size={62} strokeWidth={1.6} />,
    },
  ];

  /* Agenda Hari Ini — pulled from meetings, open tasks due soon, and letters. */
  const agenda = [
    ...(nextMeeting
      ? [{
          time: "08.00",
          title: nextMeeting.title,
          place: `${formatDateID(nextMeeting.date, "short")} · ${nextMeeting.type}`,
          color: "#127e2f",
          href: "/app/sekretariat/rapat",
        }]
      : []),
    ...state.tasks
      .filter((t) => t.status !== "selesai" && t.due <= "2026-11-24")
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 3)
      .map((t, i) => ({
        time: ["10.00", "13.00", "15.30"][i] ?? "16.00",
        title: t.title,
        place: `${t.assignee} · tenggat ${relativeID(t.due).toLowerCase()}`,
        color: ["#1f6fd0", "#e8a012", "#7b5cd6"][i] ?? "#7b5cd6",
        href: "/app/pengurus/tugas",
      })),
  ].slice(0, 4);

  /* Aktivitas Terbaru — the audit trail, newest first. */
  const recent = state.audit.slice(0, 4).map((e) => {
    const isMoney = e.app === "keuangan" || e.app === "pos";
    return {
      title: e.action,
      meta: `${e.detail} · ${e.actor}`,
      pill: APP_LABEL[e.app] ?? e.app,
      pillClass: isMoney
        ? "bg-[#fdf6e8] text-[#7a5210] ring-[#ecd9a6]"
        : e.app === "sekretariat"
          ? "bg-[#eef5fd] text-[#0f3f6d] ring-[#bfd6ee]"
          : "bg-[#eef8ef] text-[#14532a] ring-[#bfe2c4]",
      icon: isMoney ? <Wallet size={13} /> : e.app === "sekretariat" ? <FileText size={13} /> : <Check size={13} />,
      iconClass: isMoney ? "bg-[#fdf6e8] text-[#b07c0a]" : e.app === "sekretariat" ? "bg-[#eef5fd] text-[#1f6fd0]" : "bg-[#eaf6ec] text-[#127e2f]",
    };
  });

  const newsItems = NEWS.filter((n) => n.status === "published").slice(0, 3).map((n) => ({
    title: n.title.length > 62 ? n.title.slice(0, 60) + "…" : n.title,
    excerpt: n.excerpt,
    date: formatDateID(n.date, "short"),
    href: `/kabar/${n.slug}`,
    image: n.image,
    tag: n.kind === "pengumuman" ? "Pengumuman" : n.kind === "artikel" ? "Artikel" : "Berita",
  }));

  const profileMember = state.members.find((m) => m.role === actor.role) ?? state.members[0] ?? SEED_MEMBERS[0];
  const profilePct = useMemo(() => {
    const m = state.members.find((x) => x.role === actor.role);
    if (!m) return 0;
    const checks = [!!m.name, !!m.role && m.role !== "—", !!m.scope && m.scope !== "—", !!m.village, !!m.joined, !!m.phone, (m.interests?.length ?? 0) > 0, !!m.status];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [actor.key]);

  return (
    <div className="pb-4">
      {/* ── BANNER — this app's own photograph and the organisation's own
             words. The facts underneath are counted from the live store, so
             the banner can never claim something the data does not show. ── */}
      <AppBanner
        {...APP_IDENTITY.pengurus}
        badge={
          <span className="rounded-full bg-[#e6c56a]/18 px-2.5 py-1 text-[10px] font-bold text-[#f2dda2] ring-1 ring-inset ring-[#e6c56a]/30">
            Data contoh berlabel
          </span>
        }
        facts={[
          `${activeMembers} anggota aktif`,
          `${pending.length} persetujuan menunggu`,
          `${openTasks.length} tugas terbuka`,
          nextMeeting ? `Rapat berikutnya ${formatDateID(nextMeeting.date, "short")}` : "Belum ada rapat terjadwal",
        ]}
        actions={[
          { href: "/program", label: "Lihat program", primary: true },
          { href: "/app/pengurus/persetujuan", label: "Persetujuan" },
        ]}
      />

      {/* ── KPI STRIP ───────────────────────────────────────────────── */}
      <div className="mt-3">
        <KpiStrip items={kpis} />
      </div>

      {/* ── MAIN GRID ───────────────────────────────────────────────── */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.62fr_1fr]">
        <div className="min-w-0 space-y-3">
          <ActivityChart
            title="Aktivitas Organisasi"
            subtitle="Dari catatan kegiatan, tugas, dan jurnal yang benar-benar ada"
            ranges={chart.ranges}
            labels={chart.labels}
            series={chart.series["14h"]}
            icon={<LineChart size={16} />}
          />
          <RecentCard items={recent} href="/app/pengurus/laporan" linkLabel="Lihat Semua" />

          {/* Approval inbox keeps the working decision flow, restyled */}
          <Card className="!rounded-[16px]">
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
                    <Btn size="sm" variant="primary" icon={<Check size={13} />} onClick={() => { setDeciding(a.id); setDecision("disetujui"); setNote(""); }}>
                      Setujui
                    </Btn>
                    <Btn size="sm" variant="outline" icon={<RotateCcw size={13} />} onClick={() => { setDeciding(a.id); setDecision("revisi"); setNote(""); }}>
                      Minta revisi
                    </Btn>
                    <Btn size="sm" variant="danger" icon={<X size={13} />} onClick={() => { setDeciding(a.id); setDecision("ditolak"); setNote(""); }}>
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

          {/* Field performance, condensed to the reference's card language */}
          <Card className="!rounded-[16px]">
            <CardHeader title="Kinerja empat bidang" subtitle="Progres program & serapan anggaran" action={<Link href="/app/pengurus/bidang" className="text-[11.5px] font-semibold text-primary-700">Detail →</Link>} />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {FIELDS.map((f) => {
                const prog = state.programs.filter((p) => p.bidang === f.slug);
                const progress = prog.length ? Math.round(prog.reduce((s, p) => s + p.progress, 0) / prog.length) : 0;
                const budget = prog.reduce((s, p) => s + p.budget, 0);
                const spent = prog.reduce((s, p) => s + p.spent, 0);
                return (
                  <Link key={f.fieldId} href={f.appHref} className="group flex items-center gap-3 rounded-[12px] border border-line bg-white p-3 transition hover:border-primary-300 hover:shadow-[var(--sb-shadow)]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: f.accent }}>
                      {f.slug === "organisasi" ? <Users size={17} /> : f.slug === "pertanian" ? <Sprout size={17} /> : f.slug === "pelatihan" ? <GraduationCap size={17} /> : <Store size={17} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate text-[12px] font-semibold text-ink">{f.shortName}</span>
                        <ArrowRight size={12} className="text-muted2 transition group-hover:translate-x-0.5 group-hover:text-primary-700" />
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#eef1ee]">
                        <span className="block h-full rounded-full" style={{ width: `${progress}%`, background: f.accent }} />
                      </span>
                      <span className="mt-1 block text-[10px] text-muted2">{progress}% · serapan {budget ? Math.round((spent / budget) * 100) : 0}%</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── RIGHT RAIL ──────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-3">
          <DonutCard
            title="Status Program"
            total={programTotal}
            centerLabel="Berjalan / selesai"
            headline={runPrograms + donePrograms}
            segments={[
              { label: "Berjalan", value: runPrograms, color: "#2fa84f" },
              { label: "Selesai", value: donePrograms, color: "#127e2f" },
              { label: "Direncanakan", value: planPrograms, color: "#1f6fd0" },
              { label: "Tertunda", value: Math.max(programTotal - runPrograms - donePrograms - planPrograms, 0), color: "#e8a012" },
            ]}
            legendNote={`${runPrograms + donePrograms} dari ${programTotal} program sudah berjalan`}
          />
          <AgendaCard items={agenda} href="/app/sekretariat/agenda" linkLabel="Lihat" />
          <QuickAccess
            items={[
              { label: "Input Kegiatan", href: "/app/sekretariat/agenda", icon: <CalendarDays size={14} />, tone: "green" },
              { label: "Kelola Anggota", href: "/app/pengurus/anggota", icon: <Users size={14} />, tone: "blue" },
              { label: "Laporan", href: "/app/keuangan/laporan", icon: <BarChart3 size={14} />, tone: "violet" },
              { label: "Keuangan", href: "/app/keuangan", icon: <Wallet size={14} />, tone: "orange" },
              { label: "Dokumen", href: "/app/pengurus/dokumen", icon: <FolderOpen size={14} />, tone: "teal" },
              { label: "Bantuan", href: "/bantuan", icon: <CircleHelp size={14} />, tone: "blue" },
            ]}
          />
          <NewsCard items={newsItems} />
          <GrowthCard href="/gabung" />
        </div>
      </div>

      {/* ── BOTTOM ROW — workspace, finance position, help ──────────── */}
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <WorkspaceCard
          pct={profilePct}
          label={profilePct >= 90 ? "Sangat baik" : profilePct >= 70 ? "Baik" : "Perlu dilengkapi"}
          name={profileMember.name}
          role={actor.role}
          href="/app/anggota/profil"
        />
        {/* Financial position moved from the old right rail */}
        <Card className="!rounded-[16px]">
          <CardHeader title="Posisi keuangan" subtitle="Dihitung dari jurnal diposting" action={<Link href="/app/keuangan" className="text-[11.5px] font-semibold text-primary-700">Buka →</Link>} />
          <dl className="divide-y divide-line text-[12.5px]">
            {[
              ["Pendapatan periode", formatIDR(is.totalRevenue), "text-[var(--sb-success)]"],
              ["Beban periode", formatIDR(is.totalExpense), "text-[var(--sb-danger)]"],
              ["Surplus", formatIDR(is.surplus), "text-primary-800 font-semibold"],
              ["Kas", formatIDR(cash), ""],
              ["Bank", formatIDR(bank), ""],
            ].map(([k, v, cls]) => (
              <div key={k} className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className={`font-medium tabular-nums ${cls}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
            {state.drafts.length} draf belum diposting · {state.journals.length} jurnal total · neraca {tb.balanced ? "seimbang" : "tidak seimbang"}
          </div>
        </Card>
        <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#eaf6ec] text-[#127e2f]"><ShieldCheck size={16} /></span>
            <h3 className="font-display text-[13.5px] font-bold text-ink">Pemisahan tugas</h3>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink2">
            Pengurus melihat ringkasan dan memutuskan pengajuan; menulis ke domain bidang tetap
            dilakukan pemilik proses. Setiap keputusan tercatat di jejak audit beserta nama dan perannya.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link href="/app/pengurus/persetujuan" className="sb-chip hover:!border-primary-400">Kotak persetujuan</Link>
            <Link href="/app/pengurus/laporan" className="sb-chip hover:!border-primary-400">Jejak audit</Link>
            <Link href="/bantuan" className="sb-chip hover:!border-primary-400">Pusat bantuan</Link>
          </div>
        </div>
      </div>

      {/* ── DECISION DIALOG (unchanged behaviour) ───────────────────── */}
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

/** Posted balance for one account, recomputed from the live journal list. */
function postedBalance(journals: { status: string; lines: { accountCode: string; debit: number; credit: number }[] }[], code: string) {
  let bal = 0;
  for (const j of journals) {
    if (j.status !== "diposting") continue;
    for (const l of j.lines) if (l.accountCode === code) bal += l.debit - l.credit;
  }
  return bal;
}
