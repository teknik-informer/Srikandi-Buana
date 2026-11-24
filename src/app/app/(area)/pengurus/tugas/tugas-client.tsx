"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, UserPlus, CheckCircle2, Circle, Loader2, AlertTriangle, CalendarClock, Database } from "lucide-react";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, Notice, StatCard } from "@/components/ui";
import { Btn, Field, Modal, NoRows, SearchBox, SearchProvider, Select, Segmented, TextInput, useSearch, match } from "@/components/act";
import { daysUntil, formatDateID } from "@/lib/format";
import {
  createManagementTask,
  updateManagementTaskStatus,
  reassignManagementTask,
} from "@/app/actions/management-tasks";

type TaskStatus = "belum" | "proses" | "selesai" | "dibatalkan";
type TaskPriority = "tinggi" | "sedang" | "rendah";

export interface ManagementAssignee {
  userId: string;
  name: string;
  memberNumber: string | null;
}

export interface ManagementTask {
  id: string;
  referenceNo: string;
  title: string;
  fieldKey: string;
  fieldName: string;
  assigneeLabel: string;
  assignedToUserId: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  programCode: string | null;
  isOverdue: boolean;
}

const STATUS_TONE = {
  belum: "neutral",
  proses: "info",
  selesai: "success",
  dibatalkan: "neutral",
  terlambat: "danger",
} as const;
const PRIORITY_TONE = { tinggi: "danger", sedang: "warning", rendah: "neutral" } as const;

type Filter = "terbuka" | "terlambat" | "selesai" | "semua";

export function TugasClient({
  tasks,
  assignees,
  assigneeLoadError,
  canManage,
  loadError,
}: {
  tasks: ManagementTask[];
  assignees: ManagementAssignee[];
  assigneeLoadError: boolean;
  canManage: boolean;
  loadError: boolean;
}) {
  return (
    <SearchProvider>
      <Inner tasks={tasks} assignees={assignees} assigneeLoadError={assigneeLoadError} canManage={canManage} loadError={loadError} />
    </SearchProvider>
  );
}

function Inner({
  tasks,
  assignees,
  assigneeLoadError,
  canManage,
  loadError,
}: {
  tasks: ManagementTask[];
  assignees: ManagementAssignee[];
  assigneeLoadError: boolean;
  canManage: boolean;
  loadError: boolean;
}) {
  const router = useRouter();
  const { q } = useSearch();
  const [filter, setFilter] = useState<Filter>("terbuka");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    fieldKey: "pertanian",
    assigneeLabel: "",
    assigneeUserId: "",
    dueDate: "",
    priority: "sedang" as TaskPriority,
  });
  const [assignee, setAssignee] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const open = tasks.filter((t) => t.status !== "selesai" && t.status !== "dibatalkan");
  const late = tasks.filter((t) => t.isOverdue);
  const completed = tasks.filter((t) => t.status === "selesai");
  const target = tasks.find((t) => t.id === assignOpen);

  const list = useMemo(
    () =>
      [...tasks]
        .filter((t) =>
          filter === "terbuka" ? t.status !== "selesai" && t.status !== "dibatalkan"
          : filter === "terlambat" ? t.isOverdue
          : filter === "selesai" ? t.status === "selesai"
          : true,
        )
        .filter((t) => match(`${t.title} ${t.assigneeLabel} ${t.fieldName} ${t.referenceNo} ${t.programCode ?? ""}`, q))
        .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31")),
    [tasks, filter, q],
  );

  async function cycle(task: ManagementTask) {
    if (!canManage || pending || task.status === "selesai" || task.status === "dibatalkan") return;
    setErr(null);
    setPending(true);
    try {
      const nextStatus = task.status === "proses" ? "selesai" : "proses";
      const result = await updateManagementTaskStatus(task.id, nextStatus);
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      router.refresh();
    } catch {
      setErr("Layanan belum dapat memproses perubahan. Silakan muat ulang dan coba kembali.");
    } finally {
      setPending(false);
    }
  }

  async function create() {
    if (!canManage || pending) return;
    setErr(null);
    setPending(true);
    try {
      const result = await createManagementTask(form);
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      setCreateOpen(false);
      setForm({ ...form, title: "", assigneeLabel: "", assigneeUserId: "", dueDate: "" });
      router.refresh();
    } catch {
      setErr("Layanan belum dapat menyimpan tugas. Periksa koneksi lalu coba kembali.");
    } finally {
      setPending(false);
    }
  }

  async function saveAssign() {
    if (!canManage || !assignOpen || pending) return;
    setErr(null);
    setPending(true);
    try {
      const result = await reassignManagementTask(assignOpen, assigneeUserId, assignee, dueDate);
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      setAssignOpen(null);
      router.refresh();
    } catch {
      setErr("Layanan belum dapat menyimpan delegasi. Periksa koneksi lalu coba kembali.");
    } finally {
      setPending(false);
    }
  }

  const programTasks = tasks.filter((t) => t.programCode);
  const displayStatus = (task: ManagementTask) => task.isOverdue ? "terlambat" : task.status;
  const statusLabel: Record<keyof typeof STATUS_TONE, string> = {
    belum: "Belum",
    proses: "Proses",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan",
    terlambat: "Terlambat",
  };

  if (loadError) {
    return (
      <div className="pb-10">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="sb-label mb-1.5">Pengurus Harian</div>
            <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Tugas pengurus</h1>
            <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
              Penugasan lintas bidang yang tersimpan di basis data organisasi dan tercatat pada jejak audit.
            </p>
          </div>
        </header>
        <Notice tone="danger" title="Data tugas belum dapat dimuat">
          Layanan data organisasi sedang tidak tersedia. Saya tidak akan menampilkan keadaan kosong atau angka nol
          seolah-olah data tugas memang tidak ada. Muat ulang halaman setelah koneksi pulih.
        </Notice>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Pengurus Harian</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Tugas pengurus</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Penugasan lintas bidang yang tersimpan di basis data organisasi dan tercatat pada jejak audit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-medium text-muted">
            <Database size={12} /> Data organisasi
          </span>
          {canManage ? (
            <Btn variant="primary" icon={<Plus size={15} />} onClick={() => { setErr(null); setCreateOpen(true); }}>
              Tugas baru
            </Btn>
          ) : null}
        </div>
      </header>

      {!canManage ? (
        <div className="mb-4">
          <Notice tone="info" title="Akses baca">
            Akun Anda dapat melihat daftar tugas, tetapi perubahan tugas dan delegasi hanya dapat dilakukan oleh Ketua atau Administrator Organisasi.
          </Notice>
        </div>
      ) : null}
      {err ? <p className="mb-4 rounded-sb-sm border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]" role="alert">{err}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tugas terbuka" value={open.length} note={`${tasks.length} tugas tersimpan`} tone="info" icon={<Circle size={17} />} />
        <StatCard label="Terlambat" value={late.length} note={late.length ? "Perlu tindak lanjut" : "Tidak ada yang lewat tenggat"} tone={late.length ? "danger" : "success"} icon={<AlertTriangle size={17} />} />
        <StatCard label="Urgensi tinggi" value={open.filter((t) => t.priority === "tinggi").length} note="Prioritas tinggi & belum selesai" tone="warning" icon={<CalendarClock size={17} />} />
        <StatCard label="Selesai" value={completed.length} note="Tugas yang telah ditutup" tone="success" icon={<CheckCircle2 size={17} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          label="Filter tugas"
          value={filter}
          onChange={setFilter}
          options={[
            { key: "terbuka", label: "Terbuka", count: open.length },
            { key: "terlambat", label: "Terlambat", count: late.length },
            { key: "selesai", label: "Selesai", count: completed.length },
            { key: "semua", label: "Semua", count: tasks.length },
          ]}
        />
        <SearchBox placeholder="Cari tugas atau penanggung jawab…" className="w-full sm:w-[320px]" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Daftar tugas" subtitle="Status dan tenggat diambil langsung dari data organisasi" action={<Badge tone="neutral">{list.length} baris</Badge>} />
        <div className="sb-scroll">
          <table className="sb-table min-w-[840px]">
            <thead>
              <tr><th>Tugas</th><th>Bidang</th><th>Penanggung jawab</th><th>Tenggat</th><th>Prioritas</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody>
              {list.map((task) => {
                const dueIn = task.dueDate ? daysUntil(task.dueDate) : null;
                const status = displayStatus(task);
                const canAdvance = canManage && task.status !== "selesai" && task.status !== "dibatalkan";
                return (
                  <tr key={task.id}>
                    <td className="font-medium text-ink">
                      {task.title}
                      <div className="mt-0.5 font-mono text-[10px] text-muted2">{task.referenceNo}</div>
                      {task.programCode ? <div className="mt-0.5 font-mono text-[10px] text-muted2">{task.programCode}</div> : null}
                    </td>
                    <td className="text-muted">{task.fieldName}</td>
                    <td className="text-ink2">{task.assigneeLabel || "Belum ditentukan"}</td>
                    <td className="whitespace-nowrap text-muted">
                      {task.dueDate ? formatDateID(task.dueDate, "short") : "Belum ditetapkan"}
                      {task.dueDate ? (
                        <div className={`text-[10.5px] ${dueIn !== null && dueIn < 0 ? "text-[var(--sb-danger)]" : "text-muted2"}`}>
                          {task.status === "selesai" ? "selesai" : dueIn !== null && dueIn < 0 ? `lewat ${Math.abs(dueIn)} hari` : dueIn === 0 ? "hari ini" : `${dueIn} hari lagi`}
                        </div>
                      ) : null}
                    </td>
                    <td><Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void cycle(task)}
                        disabled={!canAdvance || pending}
                        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-[11.5px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-70"
                        title={canAdvance ? "Ubah status tugas" : "Status tidak dapat diubah"}
                      >
                        {status === "selesai" ? <CheckCircle2 size={13} className="text-[var(--sb-success)]" />
                          : status === "proses" ? <Loader2 size={13} className="text-[var(--sb-info)]" />
                          : status === "terlambat" ? <AlertTriangle size={13} className="text-[var(--sb-danger)]" />
                          : <Circle size={13} className="text-muted2" />}
                        {statusLabel[status]}
                      </button>
                    </td>
                    <td className="text-right">
                      {canManage && task.status !== "selesai" && task.status !== "dibatalkan" ? (
                        <button
                          type="button"
                          onClick={() => { setAssignOpen(task.id); setAssignee(task.assigneeLabel); setAssigneeUserId(task.assignedToUserId ?? ""); setDueDate(task.dueDate ?? ""); setErr(null); }}
                          disabled={pending}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                          title="Delegasikan ulang"
                        >
                          <UserPlus size={13} /> Delegasi
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 ? (
          q ? <NoRows q={q} /> : (
            <div className="px-4 py-8 text-center text-[12.5px] text-muted">
              Belum ada tugas tersimpan pada organisasi. Gunakan "Tugas baru" untuk membuat penugasan pertama.
            </div>
          )
        ) : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Beban per bidang" subtitle="Tugas yang belum ditutup" />
          <ul className="divide-y divide-line">
            {FIELDS.map((field) => {
              const count = tasks.filter((task) => task.fieldKey === field.slug && task.status !== "selesai" && task.status !== "dibatalkan").length;
              return (
                <li key={field.fieldId} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-[12.5px] text-ink">{field.shortName}</span>
                  <div className="flex items-center gap-2">
                    <Link href={field.appHref} className="text-[11px] font-semibold text-primary-700">Buka</Link>
                    <Badge tone={count ? "info" : "success"}>{count} terbuka</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Terkait program" subtitle="Program yang memiliki penugasan" />
          {programTasks.length ? (
            <ul className="divide-y divide-line">
              {[...new Set(programTasks.map((task) => task.programCode).filter(Boolean))].map((code) => {
                const count = programTasks.filter((task) => task.programCode === code && task.status !== "selesai" && task.status !== "dibatalkan").length;
                return (
                  <li key={code} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <span className="min-w-0 font-mono text-[11.5px] text-ink">{code}</span>
                    <Badge tone={count ? "warning" : "success"}>{count} terbuka</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-[12px] text-muted">Belum ada tugas yang ditautkan ke program.</p>
          )}
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tugas baru"
        description="Penugasan disimpan ke database organisasi dan dapat ditindaklanjuti dari aplikasi bidang."
        footer={<><Btn variant="ghost" onClick={() => setCreateOpen(false)} disabled={pending}>Batal</Btn><Btn variant="primary" onClick={() => void create()} loading={pending}>Simpan tugas</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Judul tugas" required>
            {(id) => <TextInput id={id} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Menyusun draf laporan kegiatan" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bidang">
              {(id) => (
                <Select id={id} value={form.fieldKey} onChange={(e) => setForm({ ...form, fieldKey: e.target.value })}>
                  {FIELDS.map((field) => <option key={field.slug} value={field.slug}>{field.shortName}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Tautkan ke anggota aktif">
              {(id) => (
                <Select id={id} value={form.assigneeUserId} onChange={(e) => setForm({ ...form, assigneeUserId: e.target.value })}>
                  <option value="">Tidak ditautkan ke akun</option>
                  {assignees.map((person) => (
                    <option key={person.userId} value={person.userId}>
                      {person.name}{person.memberNumber ? ` · ${person.memberNumber}` : ""}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Penanggung jawab manual" hint="Opsional bila tidak memilih akun anggota">
              {(id) => <TextInput id={id} value={form.assigneeLabel} onChange={(e) => setForm({ ...form, assigneeLabel: e.target.value })} placeholder="Nama atau pihak eksternal" />}
            </Field>
            <Field label="Tenggat" required>
              {(id) => <TextInput id={id} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />}
            </Field>
            <Field label="Prioritas">
              {(id) => (
                <Select id={id} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                  <option value="tinggi">Tinggi</option>
                  <option value="sedang">Sedang</option>
                  <option value="rendah">Rendah</option>
                </Select>
              )}
            </Field>
          </div>
          {assigneeLoadError ? <p className="text-[10.5px] text-[var(--sb-warning)]">Daftar akun anggota aktif belum dapat dimuat. Penanggung jawab manual tidak akan ditautkan ke akun.</p> : null}
          {err ? <p className="text-[11.5px] font-medium text-[var(--sb-danger)]" role="alert">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        open={!!target}
        onClose={() => setAssignOpen(null)}
        title="Delegasikan tugas"
        description={target?.title}
        footer={<><Btn variant="ghost" onClick={() => setAssignOpen(null)} disabled={pending}>Batal</Btn><Btn variant="primary" onClick={() => void saveAssign()} loading={pending}>Simpan delegasi</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Tautkan ke anggota aktif">
            {(id) => (
              <Select id={id} value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
                <option value="">Tidak ditautkan ke akun</option>
                {assignees.map((person) => (
                  <option key={person.userId} value={person.userId}>
                    {person.name}{person.memberNumber ? ` · ${person.memberNumber}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Penanggung jawab manual" hint="Opsional bila tidak memilih akun anggota">
            {(id) => <TextInput id={id} value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Nama atau pihak eksternal" />}
          </Field>
          <Field label="Tenggat baru" required>
            {(id) => <TextInput id={id} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
          {err ? <p className="text-[11.5px] font-medium text-[var(--sb-danger)]" role="alert">{err}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
