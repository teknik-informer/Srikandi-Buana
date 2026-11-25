"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { FIELDS } from "@/config/fields";
import { useEffect, useState } from "react";
import { Badge, Card, CardHeader, PageHeader, Progress, StatCard } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { Btn, Field, Modal, Select, TextInput } from "@/components/act";
import { formatIDR, formatDateID, percent, daysUntil } from "@/lib/format";
import type { Program } from "@/data/types";

/** Bentuk isian program baru. */
const KOSONG = {
  name: "", bidang: "organisasi", objective: "", period: "2026",
  status: "perencanaan" as Program["status"], progress: "0", budget: "", spent: "0",
};

/**
 * Angka ramah Indonesia: "5.000.000" dan "5000000" sama-sama dipahami.
 * Sama seperti di Meja Kerja — petugas menulis ribuan dengan titik.
 */
function angka(s: string): number {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return 0;
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  const titik = t.split(".");
  if (titik.length > 2) return Number(t.replace(/\./g, ""));
  if (titik.length === 2 && titik[1].length === 3) return Number(titik.join(""));
  return Number(t);
}

const STATUS_TONE = {
  berjalan: "success",
  perencanaan: "info",
  selesai: "neutral",
  ditangguhkan: "warning",
} as const;

export default function ProgramPengurusPage() {
  /**
   * Program dan seluruh hitungannya dibaca dari state bersama. `program.publish`
   * dulu tidak punya tombol di mana pun — aksinya ada, tetapi tidak ada layar
   * yang memanggilnya. Sekarang tombol terbit ada di kartu program.
   */
  const { state, exec, actor } = useStore();
  const { programs: PROGRAMS, activities: ACTIVITIES, tasks: TASKS } = state;
  const totalBudget = PROGRAMS.reduce((s, p) => s + p.budget, 0);
  const totalSpent = PROGRAMS.reduce((s, p) => s + p.spent, 0);
  const berjalan = PROGRAMS.filter((p) => p.status === "berjalan");
  const [buatOpen, setBuatOpen] = useState(false);
  const [ubah, setUbah] = useState<string | null>(null);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Program & rencana kerja"
        description="Pandangan pengurus atas seluruh program: tujuan, periode, indikator, dan serapan anggaran. Pelaksanaan harian tetap di aplikasi bidang masing-masing."
        actions={<Btn variant="primary" onClick={() => setBuatOpen(true)}>Program baru</Btn>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Program 2026" value={PROGRAMS.length} note={`${berjalan.length} berjalan`} />
        <StatCard label="Total anggaran" value={formatIDR(totalBudget)} note="Seluruh bidang" tone="info" />
        <StatCard label="Serapan" value={`${percent(totalSpent, totalBudget)}%`} note={`${formatIDR(totalSpent)} terpakai`} tone={percent(totalSpent, totalBudget) > 80 ? "warning" : "success"} />
        <StatCard label="Tugas terbuka" value={TASKS.filter((t) => t.status !== "selesai").length} note={`${TASKS.filter((t) => t.status === "terlambat").length} terlambat`} tone="warning" />
      </div>

      <div className="mt-5 space-y-4">
        {PROGRAMS.map((p) => {
          const field = FIELDS.find((f) => f.slug === p.bidang);
          const agenda = ACTIVITIES.filter((a) => a.programCode === p.code);
          const tasks = TASKS.filter((t) => t.programCode === p.code);
          const nextAgenda = agenda
            .filter((a) => daysUntil(a.date) >= 0)
            .sort((a, b) => a.date.localeCompare(b.date))[0];
          return (
            <Card key={p.code}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  {field ? <FieldMark icon={field.icon} accent={field.accent} /> : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[15px] font-semibold text-ink">{p.name}</span>
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                      <span className="font-mono text-[10.5px] text-muted2">{p.code}</span>
                    </div>
                    <p className="mt-0.5 max-w-2xl text-[12.5px] text-muted">{p.objective}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {field ? <Link href={field.appHref} className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]">Aplikasi bidang</Link> : null}
                  <Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Terbit publik" : "Internal"}</Badge>
                  <button
                    type="button"
                    onClick={() => exec({ type: "program.publish", code: p.code, actor })}
                    className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                    title={p.published ? "Tarik dari halaman publik" : "Terbitkan ke halaman publik"}
                  >
                    {p.published ? "Tarik" : "Terbitkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUbah(p.code)}
                    className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                  >
                    Ubah
                  </button>
                </div>
              </div>

              <div className="grid gap-4 px-4 py-3 lg:grid-cols-[1.1fr_1fr_0.9fr]">
                <div>
                  <div className="sb-label mb-1.5">Kemajuan</div>
                  <Progress value={p.progress} />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted2">Anggaran</div>
                      <div className="font-semibold text-ink">{formatIDR(p.budget)}</div>
                    </div>
                    <div>
                      <div className="text-muted2">Serapan</div>
                      <div className="font-semibold text-primary-800">{formatIDR(p.spent)} ({percent(p.spent, p.budget)}%)</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted">Periode {p.period}</div>
                </div>

                <div>
                  <div className="sb-label mb-1.5">Indikator</div>
                  <ul className="space-y-1">
                    {p.indicators.map((i) => (
                      <li key={i.label} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                        <span className="text-muted">{i.label}</span>
                        <span className="font-semibold text-ink tabular-nums">{i.actual} <span className="text-muted2">/ {i.target}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="sb-label mb-1.5">Kegiatan & tugas</div>
                  <div className="text-[11.5px] text-muted">
                    {agenda.length} kegiatan · {tasks.filter((t) => t.status !== "selesai").length} tugas terbuka
                  </div>
                  {nextAgenda ? (
                    <div className="mt-1.5 rounded-md border border-line bg-paper px-2.5 py-2">
                      <div className="text-[11.5px] font-medium text-ink">{nextAgenda.name}</div>
                      <div className="text-[10.5px] text-muted2">{formatDateID(nextAgenda.date, "short")} · {nextAgenda.location}</div>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[11px] text-muted2">Tidak ada agenda mendatang</div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Rencana kerja per bidang"
            subtitle="Satu bidang resmi memiliki satu rencana kerja yang disepakati"
            action={<Link href="/app/pengurus/bidang" className="text-[11.5px] font-semibold text-primary-700">Lintas bidang →</Link>}
          />
          <div className="sb-scroll">
            <table className="sb-table min-w-[620px]">
              <thead>
                <tr><th>Bidang</th><th className="num">Program</th><th className="num">Anggaran</th><th className="num">Terpakai</th><th>Serapan</th></tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => {
                  const list = PROGRAMS.filter((p) => p.bidang === f.slug);
                  const b = list.reduce((s, p) => s + p.budget, 0);
                  const sp = list.reduce((s, p) => s + p.spent, 0);
                  return (
                    <tr key={f.fieldId}>
                      <td className="font-medium text-ink">{f.shortName}</td>
                      <td className="num">{list.length}</td>
                      <td className="num">{formatIDR(b)}</td>
                      <td className="num">{formatIDR(sp)}</td>
                      <td><Progress value={percent(sp, b)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ProgramBaru open={buatOpen} onClose={() => setBuatOpen(false)} />
      <ProgramUbah kode={ubah} onClose={() => setUbah(null)} />
    </div>
  );
}

/* ───────────────────────── dialog program ───────────────────────── */

function ProgramBaru({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { exec, actor } = useStore();
  const [f, setF] = useState(KOSONG);
  const [err, setErr] = useState<string | null>(null);

  function simpan() {
    const r = exec({
      type: "program.create",
      program: {
        name: f.name, bidang: f.bidang, objective: f.objective, period: f.period,
        status: f.status, progress: Math.min(100, Math.max(0, angka(f.progress))),
        budget: angka(f.budget), spent: angka(f.spent),
        indicators: [], published: false,
      },
      actor,
    });
    if (r.ok) { onClose(); setF(KOSONG); setErr(null); } else setErr(r.message);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Program baru"
      description="Kode program dibuat otomatis mengikuti bidang. Tampil di Meja Kerja dan laporan."
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn variant="primary" onClick={simpan}>Simpan program</Btn></>}
    >
      <div className="space-y-3">
        <Field label="Nama program" required error={err ?? undefined}>
          {(id) => <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Penguatan usaha madu hutan" />}
        </Field>
        <Field label="Tujuan">
          {(id) => <TextInput id={id} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} placeholder="Hasil yang ingin dicapai" />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bidang">{(id) => (
            <Select id={id} value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })}>
              {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
            </Select>
          )}</Field>
          <Field label="Periode">{(id) => (
            <TextInput id={id} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} placeholder="2026" />
          )}</Field>
          <Field label="Anggaran (Rp)" required>{(id) => (
            <TextInput id={id} value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} placeholder="12.500.000" inputMode="numeric" />
          )}</Field>
          <Field label="Status">{(id) => (
            <Select id={id} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Program["status"] })}>
              <option value="perencanaan">Perencanaan</option>
              <option value="berjalan">Berjalan</option>
              <option value="selesai">Selesai</option>
              <option value="ditangguhkan">Ditangguhkan</option>
            </Select>
          )}</Field>
        </div>
      </div>
    </Modal>
  );
}

function ProgramUbah({ kode, onClose }: { kode: string | null; onClose: () => void }) {
  const { state, exec, actor } = useStore();
  const p = state.programs.find((x) => x.code === kode);
  const [err, setErr] = useState<string | null>(null);

  type Isi = { name: string; objective: string; status: Program["status"]; progress: string; budget: string; spent: string };
  const [isi, setIsi] = useState<Isi | null>(null);

  /**
   * Isian diisi dari program yang dipilih, di dalam efek — bukan saat render.
   * Menyetel state saat render membuat React memperingatkan dan, bila nilainya
   * terus berubah, berputar tanpa henti.
   */
  useEffect(() => {
    if (!p) {
      setIsi(null);
      return;
    }
    setIsi({
      name: p.name,
      objective: p.objective,
      status: p.status,
      progress: String(p.progress),
      budget: String(p.budget),
      spent: String(p.spent),
    });
    setErr(null);
  }, [kode, p?.code]); // hanya saat program yang dibuka berganti

  const isiAman: Isi = isi ?? { name: "", objective: "", status: "perencanaan", progress: "0", budget: "0", spent: "0" };
  const ubah = (patch: Partial<Isi>) => setIsi({ ...isiAman, ...patch });

  function simpan() {
    if (!p) return;
    const r = exec({
      type: "program.update",
      code: p.code,
      patch: {
        name: isiAman.name,
        objective: isiAman.objective,
        status: isiAman.status,
        progress: Math.min(100, Math.max(0, angka(isiAman.progress))),
        budget: angka(isiAman.budget),
        spent: angka(isiAman.spent),
      },
      actor,
    });
    if (r.ok) { setIsi(null); onClose(); } else setErr(r.message);
  }

  return (
    <Modal
      open={kode !== null && !!p}
      onClose={() => { setIsi(null); onClose(); }}
      title={p ? `Ubah ${p.code}` : "Ubah program"}
      description="Perubahan langsung mengubah serapan dan angka di laporan."
      footer={<><Btn variant="ghost" onClick={() => { setIsi(null); onClose(); }}>Batal</Btn><Btn variant="primary" onClick={simpan}>Simpan perubahan</Btn></>}
    >
      <div className="space-y-3">
        <Field label="Nama program" required error={err ?? undefined}>
          {(id) => <TextInput id={id} value={isiAman.name} onChange={(e) => ubah({ name: e.target.value })} />}
        </Field>
        <Field label="Tujuan">
          {(id) => <TextInput id={id} value={isiAman.objective} onChange={(e) => ubah({ objective: e.target.value })} />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status">{(id) => (
            <Select id={id} value={isiAman.status} onChange={(e) => ubah({ status: e.target.value as Program["status"] })}>
              <option value="perencanaan">Perencanaan</option>
              <option value="berjalan">Berjalan</option>
              <option value="selesai">Selesai</option>
              <option value="ditangguhkan">Ditangguhkan</option>
            </Select>
          )}</Field>
          <Field label="Kemajuan (%)">{(id) => (
            <TextInput id={id} value={isiAman.progress} onChange={(e) => ubah({ progress: e.target.value })} inputMode="numeric" />
          )}</Field>
          <Field label="Anggaran (Rp)">{(id) => (
            <TextInput id={id} value={isiAman.budget} onChange={(e) => ubah({ budget: e.target.value })} inputMode="numeric" />
          )}</Field>
          <Field label="Serapan (Rp)">{(id) => (
            <TextInput id={id} value={isiAman.spent} onChange={(e) => ubah({ spent: e.target.value })} inputMode="numeric" />
          )}</Field>
        </div>
      </div>
    </Modal>
  );
}
