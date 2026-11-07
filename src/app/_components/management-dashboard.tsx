"use client";
import { WorkspaceDialogContent as DialogContent } from "./workspace-dialog";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRecordMutation } from "@/hooks/use-record-mutation";
import {
  buildManagementInsights,
  filterAgenda,
  recordHref,
  taskIsOpen,
  taskStatus,
  taskStatuses,
  validDate,
} from "@/lib/management-insights";
import {
  canReadSection,
  canWriteKind,
  canWriteRecord,
  roles,
  type Principal,
} from "@/lib/permissions";
import {
  dateID,
  modules,
  programs,
  rupiah,
  type Data,
  type Row,
} from "@/lib/srikandi";
import { canDiscardChanges, markFormSaved } from "@/lib/unsaved-changes";
import { Progress } from "@/components/ui/progress";
import { getVisibleEnterpriseDashboards } from "@/features/enterprise/registry";
import {
  WorkspaceMetric,
  WorkspaceSearch,
  WorkspaceEmptyState,
  StatusBadge,
} from "./workspace-ui";
import type { WorkspaceAudit, WorkspaceFile } from "@/lib/workspace-types";

type Props = {
  rows: Row[];
  files: WorkspaceFile[];
  user: Principal;
  loading: boolean;
  error: string;
  onSaved: () => Promise<void>;
  audit?: WorkspaceAudit[];
};
export default function ManagementDashboard({
  rows,
  files,
  user,
  loading,
  error,
  onSaved,
  audit = [],
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [range, setRange] = useState("30");
  const [taskLimit, setTaskLimit] = useState(12);
  const [editor, setEditor] = useState<Row | "new" | null>(null);
  const {
    busy,
    error: mutationError,
    clearError,
    mutate,
  } = useRecordMutation(onSaved);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setTaskLimit(12), [query, assignee]);
  const view = buildManagementInsights(rows, files, user, now);
  const taskAccess = canReadSection(user, "tindaklanjut");
  const visibleDashboards = getVisibleEnterpriseDashboards(user.role);
  const canCreate =
    canWriteKind(user, "tindaklanjut") &&
    (user.role !== "koordinator" || user.programIds.length > 0);
  const qualityAccess = user.role !== "anggota";
  const matches = (text: string) =>
    text
      .toLocaleLowerCase("id-ID")
      .includes(query.trim().toLocaleLowerCase("id-ID"));
  const tasks = view.tasks.filter(
    (row) =>
      matches(
        String(row.data.name || "") +
          " " +
          String(row.data.pic || "") +
          " " +
          String(row.data.notes || ""),
      ) &&
      (assignee === "all" ||
        (assignee === "unassigned"
          ? !String(row.data.pic || "").trim()
          : String(row.data.pic || "").trim() === assignee)),
  );
  const agenda = filterAgenda(view.agenda, view.today, Number(range)).filter(
    (item) =>
      matches(
        String(item.row.data.name || "") +
          " " +
          String(item.row.data.location || ""),
      ),
  );
  const issues = view.issues.filter((issue) =>
    matches(
      issue.title +
        " " +
        issue.detail +
        " " +
        String(issue.row.data.name || ""),
    ),
  );
  const completed = view.tasks.filter(
    (row) => taskStatus(row) === "Selesai",
  ).length;
  const openEditor = (row: Row | "new") => {
    clearError();
    setEditor(row);
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Data;
    const row = editor === "new" ? null : editor;
    if (
      await mutate(row ? "PUT" : "POST", {
        kind: "tindaklanjut",
        id: row?.id,
        expectedUpdated: row?.updated,
        data,
      })
    ) {
      markFormSaved(form);
      setEditor(null);
    }
  }
  async function changeStatus(row: Row, status: string) {
    if (!canWriteRecord(user, row) || busy) return;
    await mutate("PUT", {
      id: row.id,
      kind: row.kind,
      expectedUpdated: row.updated,
      data: { ...row.data, status },
    });
  }
  if (loading)
    return (
      <div
        className="grid gap-4 sm:grid-cols-2"
        aria-label="Memuat ringkasan operasional"
      >
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64 sm:col-span-2" />
      </div>
    );
  if (error)
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Ringkasan Operasional menunggu data berhasil dimuat. Gunakan tombol coba lagi
          di atas.
        </CardContent>
      </Card>
    );
  const stats = [
    {
      title: taskAccess ? "Tugas aktif" : "Agenda mendatang",
      value: taskAccess
        ? view.tasks.filter(taskIsOpen).length
        : view.agenda.length,
      note: taskAccess
        ? view.overdue.length +
          " melewati tenggat · " +
          view.dueToday.length +
          " jatuh tempo hari ini"
        : "Kegiatan yang dapat Anda lihat",
      icon: ClipboardList,
    },
    {
      title: canReadSection(user, "anggota")
        ? "Catatan anggota"
        : "Program tercatat",
      value: canReadSection(user, "anggota") ? view.members : view.programs,
      note: "Mengikuti lingkup akses Anda",
      icon: ShieldCheck,
    },
    {
      title: view.cashAvailable ? "Saldo kas tercatat" : "Agenda hari ini",
      value: view.cashAvailable
        ? view.balance === null
          ? "Perlu diperiksa"
          : rupiah(view.balance)
        : view.agenda.filter((item) => item.date === view.today).length,
      note: view.cashAvailable
        ? view.cashTotalUnsafe
          ? "Total melampaui batas perhitungan yang aman"
          : view.cashInvalid
            ? String(view.cashInvalid) +
              " transaksi belum valid; saldo belum dihitung"
            : "Pemasukan dikurangi pengeluaran tercatat"
        : "Berdasarkan tanggal yang sudah ditetapkan",
      icon: view.cashAvailable ? Wallet : CalendarDays,
    },
    ...(qualityAccess
      ? [
          {
            title: "Perlu pemeriksaan",
            value: view.attentionRecords,
            note: "Catatan dengan pengingat kelengkapan",
            icon: FileCheck2,
          },
        ]
      : []),
  ];
  return (
    <div className="management-dashboard workspace-page min-w-0">
      <Card className="management-intro overflow-hidden" size="sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Badge variant="outline">
              <CheckCircle2 className="size-3.5" />
              RINGKASAN OPERASIONAL
            </Badge>
            <CardTitle className="text-xl sm:text-2xl">
              Selamat bekerja, {user.displayName}.
            </CardTitle>
            <CardDescription>
              {roles[user.role]} · {dateID(view.today)} · Semua ringkasan
              mengikuti hak akses Anda.
            </CardDescription>
          </div>
          {canCreate && (
            <Button onClick={() => openEditor("new")} className="shrink-0">
              <Plus data-icon="inline-start" />
              Tambah tugas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Mulai dari pekerjaan yang perlu perhatian. Tenggat, prioritas, dan
            pengingat disusun dari catatan kelompok yang tersedia.
          </p>
        </CardContent>
      </Card>
      <div
        className={
          "grid gap-3 sm:grid-cols-2 " +
          (qualityAccess ? "xl:grid-cols-4" : "xl:grid-cols-3")
        }
      >
        {stats.map((stat) => (
          <WorkspaceMetric
            key={stat.title}
            title={stat.title}
            value={stat.value}
            note={stat.note}
            icon={stat.icon}
          />
        ))}
      </div>
      <section aria-labelledby="workspace-dashboards-title" className="space-y-3">
        <div>
          <h2 id="workspace-dashboards-title" className="text-sm font-semibold">Akses tujuh dashboard</h2>
          <p className="mt-1 text-xs text-muted-foreground">Pilih ruang kerja sesuai tugas dan kewenangan akun Anda. Menu yang tersedia mengikuti hak akses.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {visibleDashboards.map((dashboard) => (
            <Card key={dashboard.id} className="flex h-full flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{dashboard.label}</CardTitle>
                <CardDescription className="min-h-10">{dashboard.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {dashboard.features.slice(0, 4).map((feature) => (
                    <Link
                      key={feature.id}
                      href={feature.href}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {feature.label}
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <span className="text-xs text-muted-foreground">{dashboard.features.length} menu</span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={dashboard.href}>Buka dashboard <ArrowUpRight className="size-3.5" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {mutationError && !editor && (
        <Alert variant="destructive">
          <AlertTitle>Perubahan belum selesai</AlertTitle>
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="overview" className="min-w-0 gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList
            variant="line"
            aria-label="Bagian ringkasan operasional"
            className="h-auto min-h-10"
          >
            <TabsTrigger value="overview">Ikhtisar</TabsTrigger>
            {taskAccess && <TabsTrigger value="tasks">Papan tugas</TabsTrigger>}
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {qualityAccess && (
              <TabsTrigger value="quality">Kualitas data</TabsTrigger>
            )}
          </TabsList>
        </div>
        <WorkspaceSearch
          label="Cari catatan dalam ringkasan operasional"
          placeholder="Cari tugas, penanggung jawab, kegiatan, atau pengingat…"
          value={query}
          onChange={setQuery}
        />
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Prioritas hari ini</CardTitle>
                <CardDescription>
                  Tugas aktif yang lewat tenggat atau jatuh tempo hari ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...view.overdue, ...view.dueToday]
                  .filter((row) => matches(String(row.data.name || "")))
                  .slice(0, 6)
                  .map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">
                          {String(row.data.name)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateID(String(row.data.dueDate))} ·{" "}
                          {String(
                            row.data.pic || "Penanggung jawab belum ditetapkan",
                          )}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {String(row.data.dueDate) < view.today
                            ? "Lewat tenggat"
                            : "Hari ini"}
                        </Badge>
                      </div>
                      {canWriteRecord(user, row) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditor(row)}
                        >
                          Tinjau
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={recordHref(row)}>Lihat</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                {![...view.overdue, ...view.dueToday].some((row) =>
                  matches(String(row.data.name || "")),
                ) && (
                  <p className="py-4 text-sm text-muted-foreground">
                    {query
                      ? "Tidak ada prioritas yang cocok."
                      : "Tidak ada tugas aktif bertenggat hari ini atau sebelumnya. Tugas tanpa tanggal tenggat tetap bisa diperiksa melalui papan tugas."}
                  </p>
                )}
                {taskAccess && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between gap-3 text-sm">
                      <span>Tugas selesai</span>
                      <strong>
                        {completed} / {view.tasks.length}
                      </strong>
                    </div>
                    <Progress
                      value={
                        view.tasks.length
                          ? Math.round((completed / view.tasks.length) * 100)
                          : 0
                      }
                      aria-valuenow={
                        view.tasks.length
                          ? Math.round((completed / view.tasks.length) * 100)
                          : 0
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Tugas berstatus selesai dari seluruh tugas yang terlihat"
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Status diperbarui oleh pengurus, bukan disimpulkan
                      otomatis.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Agenda terdekat</CardTitle>
                <CardDescription>
                  Kegiatan dan tenggat berikutnya sesuai catatan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {agenda.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={recordHref(item.row)}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">
                        {String(item.row.data.name)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateID(item.date)} · {item.type}
                      </p>
                    </div>
                    <ArrowUpRight className="ml-auto size-4 shrink-0" />
                  </Link>
                ))}
                {!agenda.length && (
                  <p className="py-4 text-sm text-muted-foreground">
                    Belum ada agenda dalam rentang yang dipilih
                    {query ? " yang sesuai pencarian" : ""}.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {["kegiatan", "anggota", "dokumen", "laporan", "akun-saya"]
                    .filter((id) => canReadSection(user, id))
                    .map((id) => (
                      <Button key={id} variant="outline" size="sm" asChild>
                        <Link href={"/dashboard/" + id}>
                          {
                            (
                              {
                                kegiatan: "Kegiatan",
                                anggota:
                                  user.role === "anggota"
                                    ? "Data saya"
                                    : "Anggota",
                                dokumen: "Arsip",
                                laporan: "Laporan Kas",
                                "akun-saya": "Akun saya",
                              } as Record<string, string>
                            )[id]
                          }
                        </Link>
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {audit.length > 0 && user.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Aktivitas terbaru</CardTitle>
                <CardDescription>
                  Perubahan yang tercatat pada ruang kerja.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {audit.slice(0, 4).map((entry, index) => (
                  <div key={index} className="min-w-0 rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {entry.action} · {dateID(entry.created)}
                    </p>
                    <p className="mt-1 text-sm break-words">{entry.title}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {taskAccess && (
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <NativeSelect
                aria-label="Saring penanggung jawab tugas"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              >
                <NativeSelectOption value="all">
                  Semua penanggung jawab
                </NativeSelectOption>
                <NativeSelectOption value="unassigned">
                  Belum ditetapkan
                </NativeSelectOption>
                {[
                  ...new Set(
                    view.tasks
                      .map((row) => String(row.data.pic || "").trim())
                      .filter(Boolean),
                  ),
                ]
                  .sort()
                  .map((name) => (
                    <NativeSelectOption value={name} key={name}>
                      {name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <p className="text-sm text-muted-foreground">
                {tasks.length} tugas sesuai filter · perubahan status disimpan
                ke database.
              </p>
            </div>
            <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {taskStatuses.map((status) => {
                const column = tasks.filter(
                  (row) => taskStatus(row) === status,
                );
                return (
                  <Card key={status} className="min-w-0">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{status}</CardTitle>
                        <Badge variant="secondary">{column.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {column.slice(0, taskLimit).map((row) => (
                        <div
                          key={row.id}
                          className="space-y-3 rounded-lg border p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              value={row.data.priority || "Normal"}
                            />
                            {taskIsOpen(row) &&
                              validDate(row.data.dueDate) &&
                              row.data.dueDate < view.today && (
                                <StatusBadge value="Lewat tenggat" />
                              )}
                          </div>
                          <p className="text-sm font-medium break-words">
                            {String(row.data.name)}
                          </p>
                          <p className="text-xs text-muted-foreground break-words">
                            {String(
                              row.data.pic ||
                                "Penanggung jawab belum ditetapkan",
                            )}
                            <br />
                            {validDate(row.data.dueDate)
                              ? dateID(row.data.dueDate)
                              : "Tenggat belum ditetapkan"}
                          </p>
                          {row.data.programId && (
                            <p className="text-xs text-muted-foreground">
                              Program {String(row.data.programId)}
                            </p>
                          )}
                          {canWriteRecord(user, row) ? (
                            <>
                              <NativeSelect
                                className="w-full"
                                aria-label={
                                  "Status tugas " + String(row.data.name)
                                }
                                disabled={busy}
                                value={taskStatus(row)}
                                onChange={(event) =>
                                  void changeStatus(row, event.target.value)
                                }
                              >
                                {taskStatuses.map((value) => (
                                  <NativeSelectOption key={value}>
                                    {value}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                              <Button
                                className="w-full"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => openEditor(row)}
                              >
                                Detail & sunting
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={recordHref(row)}>Lihat detail</Link>
                            </Button>
                          )}
                        </div>
                      ))}
                      {!column.length && (
                        <p className="py-4 text-xs text-muted-foreground">
                          Tidak ada tugas pada status ini.
                        </p>
                      )}
                      {column.length > taskLimit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTaskLimit((limit) => limit + 12)}
                        >
                          Tampilkan lebih banyak
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {!canCreate && user.role === "koordinator" && (
              <p className="text-sm text-muted-foreground">
                Penugasan program diperlukan sebelum Anda dapat menambah tugas.
                Hubungi administrator.
              </p>
            )}
          </TabsContent>
        )}
        <TabsContent value="agenda" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Agenda & tenggat</h2>
              <p className="text-sm text-muted-foreground">
                Menggunakan tanggal yang ditetapkan, bukan menebak periode
                relatif.
              </p>
            </div>
            <NativeSelect
              aria-label="Rentang agenda"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <NativeSelectOption value="7">7 hari</NativeSelectOption>
              <NativeSelectOption value="30">30 hari</NativeSelectOption>
              <NativeSelectOption value="0">Semua mendatang</NativeSelectOption>
            </NativeSelect>
          </div>
          <Card>
            <CardContent className="divide-y pt-2">
              {agenda.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {dateID(item.date)} · {item.type}
                    </p>
                    <p className="mt-1 font-medium break-words">
                      {String(item.row.data.name)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground break-words">
                      {String(
                        item.row.data.location ||
                          item.row.data.pic ||
                          "Detail belum ditetapkan",
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={recordHref(item.row)}>Buka catatan</Link>
                  </Button>
                </div>
              ))}
              {!agenda.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada agenda yang cocok. Catat kegiatan atau tetapkan
                  tenggat tugas melalui modul yang tersedia.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {qualityAccess && (
          <TabsContent value="quality" className="space-y-4">
            <div>
              <h2 className="font-semibold">Pemeriksaan kelengkapan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pengingat berbasis aturan untuk membantu pemeriksaan manual.
                Bukan pengesahan otomatis atas kebenaran data.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {issues.slice(0, taskLimit * 2).map((issue) => (
                <Card key={issue.id}>
                  <CardHeader className="gap-2">
                    <Badge variant="outline" className="w-fit">
                      {issue.severity === "warning"
                        ? "Perlu diperiksa"
                        : "Pengingat"}
                    </Badge>
                    <CardTitle className="text-sm">{issue.title}</CardTitle>
                    <CardDescription className="break-words">
                      {String(
                        issue.row.data.name ||
                          modules[issue.row.kind]?.title ||
                          "Catatan",
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {issue.detail}
                    </p>
                    {issue.row.kind === "tindaklanjut" &&
                    canWriteRecord(user, issue.row) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(issue.row)}
                      >
                        Atur tugas
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={recordHref(issue.row)}>
                          Periksa catatan
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {issues.length > taskLimit * 2 && (
              <Button
                variant="outline"
                onClick={() => setTaskLimit((limit) => limit + 12)}
              >
                Tampilkan pengingat lainnya
              </Button>
            )}
            {!issues.length && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {query
                    ? "Tidak ada pengingat yang cocok."
                    : "Tidak ada temuan dari aturan pemeriksaan saat ini. Tetap periksa keabsahan bukti dan data secara manual."}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !busy && canDiscardChanges()) setEditor(null);
        }}
      >
        <DialogContent className="workspace-dialog max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editor === "new" ? "Tambah tugas" : "Detail & sunting tugas"}
            </DialogTitle>
            <DialogDescription>
              Tentukan tindakan, penanggung jawab, prioritas, dan tanggal
              tenggat yang disepakati.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <form
              key={editor === "new" ? "new" : editor.id}
              onSubmit={save}
              data-unsaved="false"
              onChange={(event) => {
                event.currentTarget.dataset.unsaved = "true";
              }}
            >
              <fieldset disabled={busy} className="min-w-0">
                <FieldGroup>
                  {modules.tindaklanjut.fields.map((field) => {
                    const value =
                      editor === "new"
                        ? field.key === "programId" &&
                          user.role === "koordinator"
                          ? user.programIds[0]
                          : ""
                        : String(editor.data[field.key] ?? "");
                    const options =
                      field.key === "programId" && user.role === "koordinator"
                        ? user.programIds
                        : field.options;
                    return (
                      <Field key={field.key}>
                        <FieldLabel htmlFor={"smart-task-" + field.key}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </FieldLabel>
                        {options ? (
                          <NativeSelect
                            id={"smart-task-" + field.key}
                            name={field.key}
                            defaultValue={value || options[0]}
                            required={
                              field.required ||
                              (field.key === "programId" &&
                                user.role === "koordinator")
                            }
                          >
                            {options.map((option) => (
                              <NativeSelectOption value={option} key={option}>
                                {field.key === "programId"
                                  ? option
                                    ? option +
                                      " · " +
                                      (programs.find(
                                        (program) => program.id === option,
                                      )?.name || "Program")
                                    : "Tidak dihubungkan ke program"
                                  : option}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            id={"smart-task-" + field.key}
                            name={field.key}
                            defaultValue={value}
                            required={field.required}
                            maxLength={5000}
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={"smart-task-" + field.key}
                            name={field.key}
                            type={field.type || "text"}
                            defaultValue={value}
                            required={field.required}
                            maxLength={field.key === "name" ? 200 : 5000}
                          />
                        )}
                      </Field>
                    );
                  })}
                </FieldGroup>
              </fieldset>
              {mutationError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Tugas belum tersimpan</AlertTitle>
                  <AlertDescription>{mutationError}</AlertDescription>
                </Alert>
              )}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (canDiscardChanges()) setEditor(null);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Menyimpan…" : "Simpan tugas"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
