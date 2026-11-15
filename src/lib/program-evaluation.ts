import { canReadRecord, type Principal } from "./permissions";
import { programs, type Row } from "./srikandi";
import { validDate } from "./management-insights";

export type ProgramEvaluation = {
  programId: string;
  programName: string;
  goal: string;
  latest: Row | null;
  previous: Row | null;
  reportCount: number;
  hasReportInPeriod: boolean;
  unchangedProgress: boolean;
  blocked: boolean;
  target: string;
  achievement: string;
  openTasks: Row[];
  programTasks: Row[];
  tasksWithoutPic: number;
  tasksWithoutDueDate: number;
  tasksAwaitingVerification: number;
  tasksNeedingCorrection: number;
};

export type MeetingPriority = {
  id: string;
  programId: string;
  programName: string;
  title: string;
  detail: string;
  source: Row | null;
  task: Row | null;
  priority: "Tinggi" | "Sedang" | "Normal";
  reason: string;
};

function recordDate(row: Row): string {
  if (validDate(row.data.date)) return row.data.date;
  if (validDate(row.data.dueDate)) return row.data.dueDate;
  for (const value of [row.updated, row.created]) {
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
      return new Date(value).toISOString().slice(0, 10);
    }
  }
  return "";
}

function reportBeforeMonthEnd(row: Row, month: string): boolean {
  if (!month) return true;
  const end = new Date(month + "-01T00:00:00.000Z");
  end.setUTCMonth(end.getUTCMonth() + 1);
  const endDate = end.toISOString().slice(0, 10);
  const date = recordDate(row);
  return Boolean(date) && date < endDate;
}

function normalize(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

export function buildProgramEvaluations(
  input: Row[],
  user: Principal,
  month = "",
): ProgramEvaluation[] {
  const rows = input.filter((row) => canReadRecord(user, row));
  const readablePrograms = programs.filter((program) =>
    canReadRecord(user, {
      id: program.id,
      kind: "program",
      data: { programId: program.id },
    }),
  );
  const reports = rows
    .filter((row) => row.kind === "laporan_program" && reportBeforeMonthEnd(row, month))
    .sort((a, b) => recordDate(b).localeCompare(recordDate(a)) || b.updated.localeCompare(a.updated));
  const tasks = rows.filter((row) => row.kind === "tindaklanjut");

  return readablePrograms.map((program) => {
    const programReports = reports.filter(
      (row) => String(row.data.programId || "") === program.id,
    );
    const latest = programReports[0] || null;
    const previous = programReports[1] || null;
    const openTasks = tasks.filter(
      (row) =>
        String(row.data.programId || "") === program.id &&
        !["Selesai", "Ditunda"].includes(String(row.data.status)),
    );
    const previousProgress = normalize(previous?.data.progress);
    const latestProgress = normalize(latest?.data.progress);
    const hasReportInPeriod = Boolean(
      latest &&
      (!month || recordDate(latest).startsWith(month)),
    );

    return {
      programId: program.id,
      programName: program.name,
      goal: program.goal,
      latest,
      previous,
      reportCount: programReports.length,
      hasReportInPeriod,
      unchangedProgress: Boolean(
        latest && previous && latestProgress &&
        latestProgress === previousProgress &&
        String(latest.data.status || "") === String(previous.data.status || ""),
      ),
      blocked: Boolean(
        latest &&
        (latest.data.status === "Terkendala" ||
          String(latest.data.blockers || "").trim()),
      ),
      target: String(latest?.data.target || ""),
      achievement: String(latest?.data.achievement || ""),
      openTasks,
      programTasks: tasks.filter((row) => String(row.data.programId || "") === program.id),
      tasksWithoutPic: openTasks.filter((row) => !String(row.data.pic || "").trim()).length,
      tasksWithoutDueDate: openTasks.filter((row) => !validDate(row.data.dueDate)).length,
      tasksAwaitingVerification: tasks.filter(
        (row) =>
          String(row.data.programId || "") === program.id &&
          row.data.status === "Selesai" &&
          row.data.verification === "Menunggu verifikasi",
      ).length,
      tasksNeedingCorrection: tasks.filter(
        (row) =>
          String(row.data.programId || "") === program.id &&
          row.data.verification === "Perlu perbaikan",
      ).length,
    };
  });
}

export function buildMeetingPriorities(
  evaluations: ProgramEvaluation[],
): MeetingPriority[] {
  const priorities: MeetingPriority[] = [];
  for (const item of evaluations) {
    const report = item.latest;
    if (!report) {
      priorities.push({
        id: item.programId + ":no-report",
        programId: item.programId,
        programName: item.programName,
        title: "Minta laporan dasar program",
        detail: "Belum ada laporan perkembangan yang dapat ditinjau.",
        source: null,
        task: null,
        priority: "Normal",
        reason: "Informasi belum tersedia; jangan menyimpulkan program tidak berjalan.",
      });
    } else if (!item.hasReportInPeriod) {
      priorities.push({
        id: report.id + ":period-report",
        programId: item.programId,
        programName: item.programName,
        title: "Minta pembaruan untuk periode terpilih",
        detail: "Laporan terakhir tercatat pada " + recordDate(report) + ".",
        source: report,
        task: null,
        priority: "Normal",
        reason: "Belum ada laporan dalam periode yang dipilih; kondisi terbaru perlu dikonfirmasi.",
      });
    }
    if (report && item.blocked) {
      priorities.push({
        id: report.id + ":blocked",
        programId: item.programId,
        programName: item.programName,
        title: "Putuskan penanganan kendala program",
        detail: String(report.data.blockers || report.data.progress || "Laporan menyatakan program terkendala."),
        source: report,
        task: null,
        priority: "Tinggi",
        reason: String(report.data.supportNeeded || "Tetapkan keputusan, dukungan, atau penanggung jawab."),
      });
    } else if (report && String(report.data.supportNeeded || "").trim()) {
      priorities.push({
        id: report.id + ":support",
        programId: item.programId,
        programName: item.programName,
        title: "Tentukan dukungan yang diminta",
        detail: String(report.data.supportNeeded),
        source: report,
        task: null,
        priority: "Sedang",
        reason: String(report.data.nextSteps || "Catat keputusan rapat dan tindak lanjutnya."),
      });
    }
    if (item.unchangedProgress && report) {
      priorities.push({
        id: report.id + ":unchanged",
        programId: item.programId,
        programName: item.programName,
        title: "Tinjau uraian perkembangan yang belum berubah",
        detail: "Uraian perkembangan sama dengan laporan sebelumnya. Verifikasi apakah memang belum ada perubahan atau perlu penjelasan tambahan.",
        source: report,
        task: null,
        priority: "Sedang",
        reason: "Perbandingan teks laporan, bukan kesimpulan bahwa pekerjaan tidak dilakukan.",
      });
    }
    for (const task of item.openTasks) {
      if (!String(task.data.pic || "").trim()) {
        priorities.push({
          id: task.id + ":pic",
          programId: item.programId,
          programName: item.programName,
          title: "Tetapkan pelaksana tugas",
          detail: String(task.data.name || "Tugas tanpa judul"),
          source: report,
          task,
          priority: "Tinggi",
          reason: "Tugas terbuka belum memiliki penanggung jawab.",
        });
      }
      if (!validDate(task.data.dueDate)) {
        priorities.push({
          id: task.id + ":due",
          programId: item.programId,
          programName: item.programName,
          title: "Tetapkan tenggat tugas",
          detail: String(task.data.name || "Tugas tanpa judul"),
          source: report,
          task,
          priority: "Sedang",
          reason: "Tenggat belum ditetapkan berdasarkan keputusan pengurus.",
        });
      }
    }
    for (const task of item.programTasks.filter((row) => row.data.verification === "Perlu perbaikan")) {
      priorities.push({
        id: task.id + ":correction",
        programId: item.programId,
        programName: item.programName,
        title: "Bahas hasil tugas yang perlu perbaikan",
        detail: String(task.data.name || "Tugas tanpa judul") + " · " + String(task.data.reviewNote || "Belum ada catatan pemeriksaan."),
        source: report,
        task,
        priority: "Tinggi",
        reason: "Tetapkan tindakan koreksi dan bukti yang perlu dilengkapi.",
      });
    }
    for (const task of item.programTasks.filter((row) => row.data.status === "Selesai" && row.data.verification === "Menunggu verifikasi")) {
      priorities.push({
        id: task.id + ":verification",
        programId: item.programId,
        programName: item.programName,
        title: "Verifikasi hasil tugas",
        detail: String(task.data.name || "Tugas tanpa judul"),
        source: report,
        task,
        priority: "Sedang",
        reason: "Hasil sudah diajukan dan menunggu pemeriksaan Sekretariat.",
      });
    }
  }
  const rank = { Tinggi: 0, Sedang: 1, Normal: 2 };
  return priorities.sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      a.programId.localeCompare(b.programId, "id", { numeric: true }) ||
      a.title.localeCompare(b.title, "id"),
  );
}
