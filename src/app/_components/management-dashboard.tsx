"use client";
import { WorkspaceDialogContent as DialogContent } from "./workspace-dialog";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
  canReadRecord,
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
import { meetingActionSourceMarker, parseMeetingActions } from "@/lib/meeting-cycle";
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
  mode?: "overview" | "monitoring";
};
export default function ManagementDashboard({
  rows,
  files,
  user,
  loading,
  error,
  onSaved,
  audit = [],
  mode = "overview",
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [range, setRange] = useState("30");
  const [taskLimit, setTaskLimit] = useState(12);
  const [calendarMonthKey, setCalendarMonthKey] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const meetingTaskLocks = useRef(new Set<string>());
  const programTaskLocks = useRef(new Set<string>());
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
  // The chair creates tasks from a reviewed meeting/program report or in the
  // dedicated task workspace, not from a context-free dashboard shortcut.
  const canCreate =
    canWriteKind(user, "tindaklanjut") &&
    user.role !== "ketua" &&
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
  const activeCalendarMonth = calendarMonthKey || view.today.slice(0, 7);
  const selectedDate = selectedCalendarDate || view.today;
  const [calendarYear, calendarMonthNumber] = activeCalendarMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1));
  const monthLeadingDays = (monthStart.getUTCDay() + 6) % 7;
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1 - monthLeadingDays + index));
    return {
      date: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === calendarMonthNumber - 1,
    };
  });
  const calendarEntries = view.rows.flatMap((row) => {
    const rawDate = row.kind === "kegiatan"
      ? row.data.date
      : row.kind === "tindaklanjut"
        ? row.data.dueDate
        : null;
    if (!validDate(rawDate)) return [];
    return [{
      row,
      date: String(rawDate),
      type: row.kind === "kegiatan" ? "Kegiatan" : "Tenggat tugas",
    }];
  }).filter((item) => item.date.slice(0, 7) === activeCalendarMonth);
  const selectedCalendarEntries = calendarEntries
    .filter((item) => item.date === selectedDate)
    .sort((a, b) => a.type.localeCompare(b.type) || String(a.row.data.name || "").localeCompare(String(b.row.data.name || "")));
  const calendarMonthLabel = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1))
    .toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
  function shiftCalendarMonth(offset: number) {
    const next = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1 + offset, 1));
    const key = next.toISOString().slice(0, 7);
    setCalendarMonthKey(key);
    setSelectedCalendarDate(key + "-01");
  }
  const issues = view.issues.filter((issue) =>
    matches(
      issue.title +
        " " +
        issue.detail +
        " " +
        String(issue.row.data.name || ""),
    ),
  );

  type ActionItem = {
    id: string;
    row: Row;
    title: string;
    detail: string;
    area: string;
    urgency: number;
    label: string;
  };
  const actionArea = (kind: string) =>
    ["program", "laporan_program", "tindaklanjut", "kegiatan", "musyawarah", "kehadiran"].includes(kind)
      ? "Manajemen"
      : ["anggota", "pengurus", "persetujuan", "register", "sumber", "kelembagaan", "transkripsi", "dokumen"].includes(kind)
        ? "Administrasi"
        : ["kas", "akuntansi", "aset"].includes(kind)
          ? "Keuangan"
          : ["penjualan", "lotkopi", "usaha", "kemitraan"].includes(kind)
            ? "E-Commerce"
            : ["publikasi", "galeri", "pesan"].includes(kind)
              ? "Publikasi"
              : "Ekosistem";
  const actionByRecord = new Map<string, ActionItem>();
  const addAction = (item: ActionItem) => {
    const current = actionByRecord.get(item.row.id);
    if (!current || item.urgency < current.urgency) actionByRecord.set(item.row.id, item);
  };
  view.overdue.filter((row) => matches(String(row.data.name || ""))).forEach((row) =>
    addAction({
      id: "overdue-" + row.id, row, title: "Tugas melewati tenggat",
      detail: dateID(String(row.data.dueDate)) + " · " + String(row.data.pic || "Penanggung jawab belum ditetapkan"),
      area: "Manajemen", urgency: 0, label: "Tinjau tugas",
    }),
  );
  view.dueToday.filter((row) => matches(String(row.data.name || ""))).forEach((row) =>
    addAction({
      id: "today-" + row.id, row, title: "Tugas jatuh tempo hari ini",
      detail: String(row.data.pic || "Penanggung jawab belum ditetapkan"),
      area: "Manajemen", urgency: 1, label: "Perbarui tugas",
    }),
  );
  issues.forEach((issue) =>
    addAction({
      id: issue.id, row: issue.row, title: issue.title, detail: issue.detail,
      area: actionArea(issue.row.kind), urgency: issue.severity === "warning" ? 2 : 3,
      label: "Periksa catatan",
    }),
  );
  filterAgenda(view.agenda, view.today, 7).forEach((item) =>
    addAction({
      id: item.id, row: item.row, title: item.type === "Kegiatan" ? "Persiapan kegiatan terdekat" : "Tenggat tugas mendatang",
      detail: dateID(item.date) + " · " + String(item.row.data.location || item.row.data.pic || "Periksa kesiapan"),
      area: actionArea(item.row.kind), urgency: 4, label: "Buka catatan",
    }),
  );
  const actionItems = [...actionByRecord.values()]
    .sort((a, b) => a.urgency - b.urgency || a.id.localeCompare(b.id))
    .slice(0, 8);

  const attendanceAccess = user.role === "admin" || user.role === "sekretaris";
  const upcomingEvents = view.rows
    .filter((row) =>
      row.kind === "kegiatan" &&
      typeof row.data.date === "string" &&
      validDate(row.data.date) &&
      row.data.date >= view.today &&
      !["Selesai", "Ditunda"].includes(String(row.data.status)),
    )
    .sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)))
    .slice(0, 8)
    .map((event) => {
      const attendance = view.rows.find((row) =>
        row.kind === "kehadiran" && row.data.eventId === event.id,
      );
      const memberIds = attendance && Array.isArray(attendance.data.memberIds)
        ? attendance.data.memberIds.filter((id): id is string => typeof id === "string")
        : [];
      return { event, attendance, presentCount: memberIds.length };
    });
  const meetingFollowups = view.rows
    .filter((row) => row.kind === "musyawarah" && parseMeetingActions(row.data.followup).length > 0)
    .map((row) => {
      const sourceMarker = "Sumber rapat: " + row.id;
      const decisions = parseMeetingActions(row.data.followup);
      const decisionTasks = decisions.map((decision, index) => {
        const marker = meetingActionSourceMarker(row.id, index);
        const task = view.tasks.find((item) => String(item.data.notes || "").includes(marker));
        return { decision, marker, task };
      });
      const legacyTask = view.tasks.find((task) => {
        const notes = String(task.data.notes || "");
        return notes.includes(sourceMarker) && !notes.includes(sourceMarker + " · Keputusan ");
      });
      return {
        row,
        sourceMarker,
        decisions,
        decisionTasks,
        legacyTask,
        missingCount: legacyTask ? 0 : decisionTasks.filter((item) => !item.task).length,
      };
    })
    .sort((a, b) => String(b.row.data.date || "").localeCompare(String(a.row.data.date || "")))
    .slice(0, 8);
  const meetingDecisionTasks = view.tasks
    .filter((task) => {
      const notes = String(task.data.notes || "");
      return notes.includes("Sumber rapat: ") && notes.includes(" · Keputusan #");
    })
    .sort((a, b) => {
      const pendingA = String(a.data.meetingReviewStatus || "Belum dievaluasi") === "Belum dievaluasi" ? 0 : 1;
      const pendingB = String(b.data.meetingReviewStatus || "Belum dievaluasi") === "Belum dievaluasi" ? 0 : 1;
      return pendingA - pendingB ||
        String(a.data.dueDate || "9999-12-31").localeCompare(String(b.data.dueDate || "9999-12-31")) ||
        String(a.data.name || "").localeCompare(String(b.data.name || ""));
    });
  const pendingMeetingReviews = meetingDecisionTasks.filter(
    (task) => String(task.data.meetingReviewStatus || "Belum dievaluasi") === "Belum dievaluasi",
  );
  const programReports = view.rows
    .filter((row) => row.kind === "laporan_program")
    .map((row) => {
      const sourceMarker = "Sumber laporan program: " + row.id;
      const linkedTask = view.tasks.find((task) => String(task.data.notes || "").includes(sourceMarker));
      return { row, linkedTask, sourceMarker };
    })
    .sort((a, b) => String(b.row.data.date || "").localeCompare(String(a.row.data.date || "")))
    .slice(0, 6);
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
  async function createTaskFromMeeting(row: Row, decisions: string[]) {
    if (
      busy ||
      meetingTaskLocks.current.has(row.id) ||
      !canWriteKind(user, "tindaklanjut") ||
      !canReadRecord(user, row) ||
      !["Disepakati", "Ditindaklanjuti"].includes(String(row.data.status || ""))
    ) return;
    const actions = parseMeetingActions(decisions.join("\n"));
    if (!actions.length) return;
    const sourceMarker = "Sumber rapat: " + row.id;
    const legacyTask = view.tasks.find((task) => {
      const notes = String(task.data.notes || "");
      return notes.includes(sourceMarker) && !notes.includes(sourceMarker + " · Keputusan ");
    });
    if (legacyTask) return;
    meetingTaskLocks.current.add(row.id);
    const completedMarkers = new Set(
      view.tasks
        .map((task) => String(task.data.notes || ""))
        .filter((notes) => notes.includes(sourceMarker)),
    );
    try {
      const programId = String(row.data.programId || "");
      for (const [index, decision] of actions.entries()) {
        const marker = meetingActionSourceMarker(row.id, index);
        if ([...completedMarkers].some((notes) => notes.includes(marker))) continue;
        const saved = await mutate("POST", {
          kind: "tindaklanjut",
          data: {
            name: decision.slice(0, 200),
            period: String(row.data.date || ""),
            dueDate: "",
            priority: "Normal",
            pic: "",
            status: "Belum dimulai",
            evidence: "",
            verification: "Belum diajukan",
            completionEvidence: "",
            meetingReviewStatus: "Belum dievaluasi",
            meetingReviewMeeting: "",
            meetingReviewDate: "",
            meetingReviewNote: "",
            notes: (marker + " · Rapat: " + String(row.data.name || "Rapat") + " · Keputusan: " + decision + " · PIC dan tenggat ditetapkan pengurus setelah keputusan disepakati.").slice(0, 5000),
            ...( ["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(programId) ? { programId } : {}),
          },
        });
        if (!saved) break;
        completedMarkers.add(marker);
      }
    } finally {
      meetingTaskLocks.current.delete(row.id);
    }
  }
  async function createTaskFromProgramReport(row: Row, sourceMarker: string) {
    if (busy || programTaskLocks.current.has(row.id) || !canWriteKind(user, "tindaklanjut") || !canReadRecord(user, row)) return;
    const programId = String(row.data.programId || "");
    if (!programs.some((program) => program.id === programId)) return;
    if (view.tasks.some((task) => String(task.data.notes || "").includes(sourceMarker))) return;
    programTaskLocks.current.add(row.id);
    const blockers = String(row.data.blockers || "").trim();
    const supportNeeded = String(row.data.supportNeeded || "").trim();
    const target = String(row.data.target || "").trim();
    const achievement = String(row.data.achievement || "").trim();
    const evaluation = String(row.data.evaluation || "").trim();
    try {
      await mutate("POST", {
        kind: "tindaklanjut",
        data: {
          name: "Tindak lanjut program: " + String(row.data.name || "Laporan program"),
          period: String(row.data.period || ""),
          dueDate: "",
          priority: row.data.status === "Terkendala" ? "Tinggi" : "Normal",
          pic: "",
          status: "Belum dimulai",
          evidence: String(row.data.nextSteps || "Tinjau laporan dan sepakati langkah berikutnya."),
          notes: (sourceMarker + " · " + [target ? "Target: " + target : "", achievement ? "Capaian: " + achievement : "", evaluation ? "Evaluasi: " + evaluation : "", blockers ? "Hambatan: " + blockers : "", supportNeeded ? "Dukungan diminta: " + supportNeeded : "", "Sumber laporan dipertahankan; tetapkan pelaksana dan tenggat melalui keputusan pengurus."].filter(Boolean).join(" · ")).slice(0, 5000),
          programId,
        },
      });
    } finally {
      programTaskLocks.current.delete(row.id);
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
              {mode === "monitoring" ? "MONITORING OPERASIONAL" : "RINGKASAN OPERASIONAL"}
            </Badge>
            <CardTitle className="text-xl sm:text-2xl">
              {mode === "monitoring" ? "Pantau perkembangan operasional." : `Selamat bekerja, ${user.displayName}.`}
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
            {mode === "monitoring"
              ? "Tinjau tugas, agenda, tenggat, kualitas data, dan pengingat dari catatan operasional yang tersedia."
              : "Mulai dari pekerjaan yang perlu perhatian. Tenggat, prioritas, dan pengingat disusun dari catatan kelompok yang tersedia."}
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
      {mode === "overview" && (
      <section aria-labelledby="workspace-dashboards-title" className="space-y-3">
        <div>
          <h2 id="workspace-dashboards-title" className="text-sm font-semibold">Ruang kerja utama</h2>
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
      )}
      <section aria-labelledby="action-center-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="action-center-title" className="text-base font-semibold">Pusat Tindakan</h2>
              <Badge variant={actionItems.some((item) => item.urgency <= 1) ? "destructive" : "secondary"}>
                {actionItems.length} tindak lanjut
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Pekerjaan lintas modul yang perlu diselesaikan, diurutkan dari tenggat dan temuan data. Hanya catatan dalam hak akses Anda yang ditampilkan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {taskAccess && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/tindaklanjut">Semua tugas <ArrowUpRight className="size-3.5" /></Link>
              </Button>
            )}
            {qualityAccess && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/monitoring">Monitoring <ArrowUpRight className="size-3.5" /></Link>
              </Button>
            )}
          </div>
        </div>
        <Card>
          <CardContent className="divide-y p-0">
            {actionItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 rounded-lg border p-2 text-muted-foreground" aria-hidden="true">
                    {item.urgency <= 1 ? <CalendarDays className="size-4" /> : <FileCheck2 className="size-4" />}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium break-words">{item.title}</p>
                      <Badge variant="outline">{item.area}</Badge>
                      {item.urgency === 0 && <Badge variant="destructive">Terlambat</Badge>}
                      {item.urgency === 1 && <Badge variant="secondary">Hari ini</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground break-words">{String(item.row.data.name || modules[item.row.kind]?.title || "Catatan")} · {item.detail}</p>
                  </div>
                </div>
                {item.row.kind === "tindaklanjut" && canWriteRecord(user, item.row) ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => openEditor(item.row)}>
                    {item.label}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={recordHref(item.row)}>{item.label}</Link>
                  </Button>
                )}
              </div>
            ))}
            {!actionItems.length && (
              <div className="flex flex-col items-start gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Tidak ada tindak lanjut yang terdeteksi saat ini.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ini berarti tidak ada tenggat dekat atau temuan dari aturan pemeriksaan pada data yang dapat Anda akses, bukan jaminan bahwa seluruh pekerjaan sudah selesai.
                  </p>
                </div>
                {canCreate && (
                  <Button size="sm" onClick={() => openEditor("new")}>
                    <Plus data-icon="inline-start" /> Tambah tugas
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      {programReports.length > 0 && (
        <section aria-labelledby="program-reports-title" className="space-y-3">
          <div className="space-y-1">
            <h2 id="program-reports-title" className="text-base font-semibold">Laporan perkembangan program</h2>
            <p className="text-sm text-muted-foreground">Ringkasan laporan koordinator sesuai lingkup program yang dapat Anda akses. Kendala dan kebutuhan dukungan tetap merujuk pada laporan sumber.</p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {programReports.map(({ row, linkedTask, sourceMarker }) => {
                const program = programs.find((item) => item.id === String(row.data.programId));
                return (
                  <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{String(row.data.name || "Laporan program")}</p>
                        <StatusBadge value={String(row.data.status || "Belum ditetapkan")} />
                      </div>
                      <p className="text-xs text-muted-foreground">{program ? program.id + ". " + program.name : "Program " + String(row.data.programId || "—")} · {dateID(String(row.data.date || ""))} · {String(row.data.period || "Periode tidak disebutkan")}</p>
                      <p className="text-sm text-muted-foreground">{String(row.data.progress || "Belum ada uraian perkembangan.")}</p>
                      {!!String(row.data.target || "").trim() && <p className="text-sm"><span className="font-medium">Target periode:</span> {String(row.data.target)}</p>}
                      {!!String(row.data.achievement || "").trim() && <p className="text-sm"><span className="font-medium">Capaian:</span> {String(row.data.achievement)}</p>}
                      {!!String(row.data.evaluation || "").trim() && <p className="text-sm"><span className="font-medium">Evaluasi:</span> {String(row.data.evaluation)}</p>}
                      {!!String(row.data.nextSteps || "").trim() && <p className="text-sm"><span className="font-medium">Langkah berikutnya:</span> {String(row.data.nextSteps)}</p>}
                      {!!String(row.data.blockers || "").trim() && <p className="text-sm"><span className="font-medium">Kendala:</span> {String(row.data.blockers)}</p>}
                      {!!String(row.data.supportNeeded || "").trim() && <p className="text-sm"><span className="font-medium">Dukungan diminta:</span> {String(row.data.supportNeeded)}</p>}
                      {linkedTask && <p className="text-xs text-muted-foreground">Tugas terkait: {String(linkedTask.data.name || "Tindak lanjut")} · {String(linkedTask.data.status || "Belum dimulai")}</p>}
                    </div>
                    {linkedTask ? (
                      <Button size="sm" variant="outline" asChild><Link href={recordHref(linkedTask)}>Buka tugas <ArrowUpRight className="size-3.5" /></Link></Button>
                    ) : canWriteKind(user, "tindaklanjut") && canReadRecord(user, row) ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void createTaskFromProgramReport(row, sourceMarker)}>Buat draf tindak lanjut</Button>
                    ) : (
                      <Badge variant="secondary">Menunggu tindak lanjut pengurus</Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
      {meetingFollowups.length > 0 && (
        <section aria-labelledby="meeting-followups-title" className="space-y-3">
          <div className="space-y-1">
            <h2 id="meeting-followups-title" className="text-base font-semibold">Keputusan rapat menjadi tugas</h2>
            <p className="text-sm text-muted-foreground">Setiap baris keputusan menjadi satu draf tugas dengan tautan ke notulen asal. Pencatat notulen tidak otomatis menjadi pelaksana; PIC dan tenggat ditetapkan pengurus.</p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {meetingFollowups.map(({ row, decisions, decisionTasks, legacyTask, missingCount }) => {
                const agreed = ["Disepakati", "Ditindaklanjuti"].includes(String(row.data.status || ""));
                return (
                  <div key={row.id} className="space-y-3 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{String(row.data.name || "Rapat tanpa judul")}</p>
                          <StatusBadge value={String(row.data.status || "Rancangan")} />
                          <Badge variant="outline">{decisions.length} keputusan</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{dateID(String(row.data.date || ""))} · {String(row.data.programId || "Lintas program")}</p>
                        {!!String(row.data.decisionSummary || "").trim() && <p className="text-sm text-muted-foreground">{String(row.data.decisionSummary)}</p>}
                      </div>
                      {canWriteKind(user, "tindaklanjut") && canReadRecord(user, row) && missingCount > 0 && !legacyTask ? (
                        <Button size="sm" variant="outline" disabled={busy || !agreed} onClick={() => void createTaskFromMeeting(row, decisions)}>
                          {busy ? "Menyimpan…" : (decisions.length - missingCount) > 0 ? "Lanjutkan " + missingCount + " draf" : "Buat " + missingCount + " draf tugas"}
                        </Button>
                      ) : legacyTask ? (
                        <Badge variant="secondary">Tugas gabungan lama · periksa dan pecah manual bila diperlukan</Badge>
                      ) : missingCount === 0 ? (
                        <Badge variant="secondary">Semua keputusan sudah memiliki tugas</Badge>
                      ) : (
                        <Badge variant="secondary">{agreed ? "Menunggu pengurus" : "Menunggu keputusan disepakati"}</Badge>
                      )}
                    </div>
                    <div className="grid gap-2">
                      {decisionTasks.map(({ decision, task }, index) => (
                        <div key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm">{index + 1}. {decision}</p>
                            {task ? (
                              <p className="text-xs text-muted-foreground">
                                {String(task.data.status || "Belum dimulai")} · PIC: {String(task.data.pic || "Belum ditetapkan")} · Tenggat: {String(task.data.dueDate || "Belum ditetapkan")} · Evaluasi: {String(task.data.meetingReviewStatus || "Belum dievaluasi")}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Belum menjadi tugas</p>
                            )}
                          </div>
                          {task && <Button size="sm" variant="outline" asChild><Link href={recordHref(task)}>Buka tugas</Link></Button>}
                        </div>
                      ))}
                    </div>
                    {legacyTask && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                        <p className="text-sm">Tugas gabungan dari alur lama: {String(legacyTask.data.name || "Tindak lanjut rapat")}</p>
                        <Button size="sm" variant="outline" asChild><Link href={recordHref(legacyTask)}>Buka tugas</Link></Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
      {qualityAccess && meetingDecisionTasks.length > 0 && (
        <section aria-labelledby="meeting-decision-review-title" className="space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="meeting-decision-review-title" className="text-base font-semibold">Evaluasi pelaksanaan keputusan rapat</h2>
              <Badge variant={pendingMeetingReviews.length ? "secondary" : "outline"}>
                {pendingMeetingReviews.length} belum dievaluasi
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Setelah rapat berikutnya, Ketua atau Administrator mencatat hasil pelaksanaan, nama dan tanggal rapat evaluasi, serta keputusan lanjutan pada tugas terkait. Riwayat notulen asal tetap terhubung.
            </p>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {meetingDecisionTasks.slice(0, 10).map((task) => {
                const reviewStatus = String(task.data.meetingReviewStatus || "Belum dievaluasi");
                const canReview = ["admin", "ketua"].includes(user.role) && canWriteRecord(user, task);
                return (
                  <div key={task.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{String(task.data.name || "Keputusan rapat")}</p>
                        <StatusBadge value={reviewStatus} />
                        <StatusBadge value={String(task.data.status || "Belum dimulai")} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PIC: {String(task.data.pic || "Belum ditetapkan")} · Tenggat: {String(task.data.dueDate || "Belum ditetapkan")}
                      </p>
                      {reviewStatus !== "Belum dievaluasi" && (
                        <p className="text-xs text-muted-foreground">
                          Dievaluasi pada {String(task.data.meetingReviewMeeting || "rapat tidak disebutkan")} · {dateID(String(task.data.meetingReviewDate || ""))}
                        </p>
                      )}
                      {!!String(task.data.meetingReviewNote || "").trim() && (
                        <p className="text-sm text-muted-foreground">{String(task.data.meetingReviewNote)}</p>
                      )}
                    </div>
                    {canReview ? (
                      <Button size="sm" variant="outline" onClick={() => openEditor(task)}>Catat evaluasi</Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild><Link href={recordHref(task)}>Buka tugas</Link></Button>
                    )}
                  </div>
                );
              })}
              {meetingDecisionTasks.length > 10 && (
                <p className="p-4 text-xs text-muted-foreground">Menampilkan 10 dari {meetingDecisionTasks.length} keputusan rapat. Cari sisanya melalui menu Tugas dan Tindak Lanjut.</p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
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
            <TabsTrigger value="calendar">Kalender</TabsTrigger>
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
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/tindaklanjut">Buka daftar tugas</Link>
              </Button>
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
          {attendanceAccess && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Persiapan daftar hadir</CardTitle>
                <CardDescription>
                  Status berasal dari daftar hadir yang benar-benar tersimpan. Anggota yang belum ditandai tidak otomatis dianggap hadir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.map(({ event, attendance, presentCount }) => (
                  <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium break-words">{String(event.data.name || "Kegiatan")}</p>
                      <p className="text-xs text-muted-foreground">{dateID(String(event.data.date))} · {String(event.data.location || "Lokasi belum ditetapkan")}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={attendance ? "secondary" : "outline"}>{attendance ? "Daftar hadir tersedia" : "Daftar hadir belum dibuat"}</Badge>
                        {attendance && <span className="text-xs text-muted-foreground">{presentCount} anggota ditandai hadir</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={"/dashboard/kehadiran?eventId=" + encodeURIComponent(event.id)}>
                        {attendance ? "Perbarui kehadiran" : "Siapkan daftar hadir"}
                      </Link>
                    </Button>
                  </div>
                ))}
                {!upcomingEvents.length && (
                  <p className="py-3 text-sm text-muted-foreground">Belum ada kegiatan mendatang yang memerlukan persiapan daftar hadir.</p>
                )}
              </CardContent>
            </Card>
          )}
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
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Kalender kegiatan dan tenggat</CardTitle>
                  <CardDescription>
                    Berasal dari catatan kegiatan dan tugas yang sama. Kalender ini tidak membuat salinan jadwal terpisah.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Bulan sebelumnya" onClick={() => shiftCalendarMonth(-1)}>
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <p className="min-w-32 text-center text-sm font-semibold capitalize">{calendarMonthLabel}</p>
                  <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Bulan berikutnya" onClick={() => shiftCalendarMonth(1)}>
                    <ChevronRight aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" className="min-h-11" onClick={() => { setCalendarMonthKey(view.today.slice(0, 7)); setSelectedCalendarDate(view.today); }}>
                    Hari ini
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground" aria-hidden="true">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => <div key={day} className="py-2">{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1" role="group" aria-label="Tanggal pada kalender kegiatan">
                {calendarDays.map((day) => {
                  const count = calendarEntries.filter((item) => item.date === day.date).length;
                  const today = day.date === view.today;
                  const selected = day.date === selectedDate;
                  const label = new Date(day.date + "T12:00:00Z").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={label + (count ? ", " + count + " catatan" : ", tidak ada catatan")}
                      aria-pressed={selected}
                      onClick={() => { setSelectedCalendarDate(day.date); if (!day.inMonth) setCalendarMonthKey(day.date.slice(0, 7)); }}
                      className={"flex min-h-14 flex-col items-start justify-between rounded-lg border p-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-20 " + (selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "") + (!day.inMonth ? " text-muted-foreground/60" : "")}
                    >
                      <span className={today ? "font-bold text-primary" : "font-medium"}>{day.day}</span>
                      {count > 0 ? <Badge variant="secondary" className="max-w-full px-1.5 text-[10px]">{count} catatan</Badge> : <span className="text-[10px] text-transparent">.</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catatan pada {dateID(selectedDate)}</CardTitle>
              <CardDescription>Klik catatan untuk membuka data sumber pada modul pemiliknya.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedCalendarEntries.map((item) => (
                <Link
                  key={item.row.id}
                  href={recordHref(item.row)}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.type}</Badge>
                      <p className="text-sm font-semibold">{String(item.row.data.name || item.type)}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{String(item.row.data.pic || item.row.data.location || "Penanggung jawab/lokasi belum ditetapkan")}</p>
                  </div>
                  <ArrowUpRight size={16} className="shrink-0" aria-hidden="true" />
                </Link>
              ))}
              {!selectedCalendarEntries.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada kegiatan atau tenggat tercatat pada tanggal ini.
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
              {editor === "new"
                ? "Tentukan tindakan, penanggung jawab, prioritas, dan tanggal tenggat yang disepakati."
                : "Perbarui pelaksanaan tugas. Ketua atau Administrator juga dapat mencatat evaluasi keputusan rapat setelah rapat peninjauan."}
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
                  {modules.tindaklanjut.fields.filter((field) => !["reviewNote", "meetingReviewStatus", "meetingReviewMeeting", "meetingReviewDate", "meetingReviewNote"].includes(field.key) || ["admin", "ketua"].includes(user.role)).map((field) => {
                    const value =
                      editor === "new"
                        ? field.key === "programId" &&
                          user.role === "koordinator"
                          ? user.programIds[0]
                          : ""
                        : String(editor.data[field.key] ?? "");
                    const reviewer = user.role === "admin" || user.role === "ketua";
                    const options =
                      field.key === "programId" && user.role === "koordinator"
                        ? user.programIds
                        : field.key === "verification" && !reviewer
                          ? [...new Set(["Belum diajukan", "Menunggu verifikasi", ...(value && value !== "Belum diajukan" && value !== "Menunggu verifikasi" ? [value] : [])])]
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
