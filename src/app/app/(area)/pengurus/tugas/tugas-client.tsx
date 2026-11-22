"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, UserPlus, CheckCircle2, Circle, Loader2, AlertTriangle, CalendarClock } from "lucide-react";
import { FIELDS } from "@/config/fields";
import { MEMBERS } from "@/data/organization";
import { Badge, Card, CardHeader, StatCard } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, NoRows, SearchBox, SearchProvider, Select, Segmented, TextInput, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { daysUntil, formatDateID } from "@/lib/format";
import type { Task } from "@/data/types";

const STATUS_TONE = { belum: "neutral", proses: "info", selesai: "success", terlambat: "danger" } as const;
const PRIORITY_TONE = { tinggi: "danger", sedang: "warning", rendah: "neutral" } as const;

type Filter = "terbuka" | "terlambat" | "selesai" | "semua";

export function TugasClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state, exec, actor } = useStore();
  const { q } = useSearch();
  const [filter, setFilter] = useState<Filter>("terbuka");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", bidang: "pertanian", assignee: MEMBERS[1]?.name ?? "", due: "2026-11-30", priority: "sedang" as Task["priority"] });
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const open = state.tasks.filter((t) => t.status !== "selesai");
  const late = state.tasks.filter((t) => t.status === "terlambat");
  const today = "2026-11-22";

  const list = useMemo(
    () =>
      [...state.tasks]
        .filter((t) =>
          filter === "terbuka" ? t.status !== "selesai"
          : filter === "terlambat" ? t.status === "terlambat"
          : filter === "selesai" ? t.status === "selesai"
          : true,
        )
        .filter((t) => match(`${t.title} ${t.assignee} ${t.bidang} ${t.programCode ?? ""}`, q))
        .sort((a, b) => a.due.localeCompare(b.due)),
    [state.tasks, filter, q],
  );

  const target = state.tasks.find((t) => t.id === assignOpen);

  function cycle(t: Task) {
    const order: Task["status"][] = ["belum", "proses", "selesai"];
    const idx = order.indexOf(t.status);
    const next = t.status === "terlambat" ? "proses" : order[Math.min(order.length - 1, idx + 1)];
    exec({ type: "task.status", id: t.id, status: next, actor });
  }

  function create() {
    setErr(null);
    const r = exec({ type: "task.create", title: form.title, bidang: form.bidang, assignee: form.assignee, due: form.due, priority: form.priority, actor });
    if (r.ok) {
      setCreateOpen(false);
      setForm({ ...form, title: "" });
    } else setErr(r.message);
  }

  function saveAssign() {
    if (!assignOpen) return;
    const r = exec({ type: "task.assign", id: assignOpen, assignee: assignee || target?.assignee || "", due: due || target?.due || today, actor });
    if (r.ok) setAssignOpen(null);
    else setErr(r.message);
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Pengurus Harian</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Tugas pengurus</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Beban kerja lintas peran: persetujuan, rekonsiliasi, kesekretariatan, dan tindak lanjut usulan anggota.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip compact />
          <Btn variant="primary" icon={<Plus size={15} />} onClick={() => { setErr(null); setCreateOpen(true); }}>
            Tugas baru
          </Btn>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tugas terbuka" value={open.length} note={`${state.tasks.length} tugas tercatat`} tone="info" icon={<Circle size={17} />} />
        <StatCard label="Terlambat" value={late.length} note={late.length ? "Perlu tindakan hari ini" : "Tidak ada yang lewat tenggat"} tone={late.length ? "danger" : "success"} icon={<AlertTriangle size={17} />} />
        <StatCard label="Urgensi tinggi" value={open.filter((t) => t.priority === "tinggi").length} note="Prioritas tinggi & belum selesai" tone="warning" icon={<CalendarClock size={17} />} />
        <StatCard label="Selesai" value={state.tasks.filter((t) => t.status === "selesai").length} note="Dari sesi ini dan data awal" tone="success" icon={<CheckCircle2 size={17} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          label="Filter tugas"
          value={filter}
          onChange={setFilter}
          options={[
            { key: "terbuka", label: "Terbuka", count: open.length },
            { key: "terlambat", label: "Terlambat", count: late.length },
            { key: "selesai", label: "Selesai", count: state.tasks.filter((t) => t.status === "selesai").length },
            { key: "semua", label: "Semua", count: state.tasks.length },
          ]}
        />
        <SearchBox placeholder="Cari tugas atau penanggung jawab…" className="w-full sm:w-[320px]" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Daftar tugas" subtitle="Klik status untuk memajukannya — tercatat di jejak audit" action={<Badge tone="neutral">{list.length} baris</Badge>} />
        <div className="sb-scroll">
          <table className="sb-table min-w-[840px]">
            <thead>
              <tr><th>Tugas</th><th>Bidang</th><th>Penanggung jawab</th><th>Tenggat</th><th>Prioritas</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const field = FIELDS.find((f) => f.slug === t.bidang);
                const d = daysUntil(t.due);
                return (
                  <tr key={t.id}>
                    <td className="font-medium text-ink">
                      {t.title}
                      {t.programCode ? <div className="mt-0.5 font-mono text-[10px] text-muted2">{t.programCode}</div> : null}
                    </td>
                    <td className="text-muted">{field?.shortName ?? t.bidang}</td>
                    <td className="text-ink2">{t.assignee}</td>
                    <td className="whitespace-nowrap text-muted">
                      {formatDateID(t.due, "short")}
                      <div className={`text-[10.5px] ${d < 0 ? "text-[var(--sb-danger)]" : "text-muted2"}`}>
                        {t.status === "selesai" ? "selesai" : d < 0 ? `lewat ${Math.abs(d)} hari` : d === 0 ? "hari ini" : `${d} hari lagi`}
                      </div>
                    </td>
                    <td><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => cycle(t)}
                        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-[11.5px] font-semibold text-ink transition hover:border-primary-300 hover:bg-primary-50"
                        title={`Ubah status tugas (sekarang: ${t.status})`}
                      >
                        {t.status === "selesai" ? <CheckCircle2 size={13} className="text-[var(--sb-success)]" />
                          : t.status === "proses" ? <Loader2 size={13} className="text-[var(--sb-info)]" />
                          : t.status === "terlambat" ? <AlertTriangle size={13} className="text-[var(--sb-danger)]" />
                          : <Circle size={13} className="text-muted2" />}
                        {t.status}
                      </button>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => { setAssignOpen(t.id); setAssignee(t.assignee); setDue(t.due); setErr(null); }}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold text-primary-700 hover:bg-primary-50"
                        title="Delegasikan ulang"
                      >
                        <UserPlus size={13} /> Delegasi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 ? <NoRows q={q} /> : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Beban per bidang" subtitle="Tugas belum selesai" />
          <ul className="divide-y divide-line">
            {FIELDS.map((f) => {
              const n = state.tasks.filter((t) => t.bidang === f.slug && t.status !== "selesai").length;
              return (
                <li key={f.fieldId} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-[12.5px] text-ink">{f.shortName}</span>
                  <div className="flex items-center gap-2">
                    {f.appHref ? <Link href={f.appHref} className="text-[11px] font-semibold text-primary-700">Buka</Link> : null}
                    <Badge tone={n ? "info" : "success"}>{n} terbuka</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Terkait program" subtitle="Tugas yang menopang program aktif" />
          <ul className="divide-y divide-line">
            {state.programs.filter((p) => p.status === "berjalan").map((p) => {
              const n = state.tasks.filter((t) => t.programCode === p.code && t.status !== "selesai").length;
              return (
                <li key={p.code} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="min-w-0 text-[12.5px] text-ink">{p.name}</span>
                  <Badge tone={n ? "warning" : "success"}>{n} tugas</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Create */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tugas baru"
        description="Tugas langsung masuk daftar dan tercatat di jejak audit."
        footer={<><Btn variant="ghost" onClick={() => setCreateOpen(false)}>Batal</Btn><Btn variant="primary" onClick={create}>Buat tugas</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Judul tugas" required error={err ?? undefined}>
            {(id) => <TextInput id={id} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Menyusun draf laporan triwulan" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bidang">{(id) => (
              <Select id={id} value={form.bidang} onChange={(e) => setForm({ ...form, bidang: e.target.value })}>
                {FIELDS.map((f) => <option key={f.slug} value={f.slug}>{f.shortName}</option>)}
              </Select>
            )}</Field>
            <Field label="Penanggung jawab">{(id) => (
              <Select id={id} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                {MEMBERS.map((m) => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
              </Select>
            )}</Field>
            <Field label="Tenggat" required>{(id) => <TextInput id={id} type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />}</Field>
            <Field label="Prioritas">{(id) => (
              <Select id={id} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}>
                <option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option>
              </Select>
            )}</Field>
          </div>
        </div>
      </Modal>

      {/* Assign */}
      <Modal
        open={!!target}
        onClose={() => setAssignOpen(null)}
        title="Delegasikan tugas"
        description={target?.title}
        footer={<><Btn variant="ghost" onClick={() => setAssignOpen(null)}>Batal</Btn><Btn variant="primary" onClick={saveAssign}>Simpan delegasi</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Penanggung jawab baru">{(id) => (
            <Select id={id} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {MEMBERS.map((m) => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
            </Select>
          )}</Field>
          <Field label="Tenggat baru">{(id) => <TextInput id={id} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
          {err ? <p className="text-[11.5px] font-medium text-[var(--sb-danger)]" role="alert">{err}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
