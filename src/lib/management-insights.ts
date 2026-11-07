import {
  canReadRecord,
  canReadSection,
  visibleRecord,
  type Principal,
} from "./permissions";
import { modules, type Row } from "./srikandi";
import type { WorkspaceFile } from "./workspace-types";

export const taskStatuses = [
  "Belum dimulai",
  "Berjalan",
  "Selesai",
  "Ditunda",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type ManagementIssue = {
  id: string;
  row: Row;
  title: string;
  detail: string;
  severity: "warning" | "info";
};
export type AgendaItem = {
  id: string;
  row: Row;
  date: string;
  type: "Kegiatan" | "Tenggat tugas";
};
export function jakartaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function taskStatus(row: Row): TaskStatus {
  return taskStatuses.includes(row.data.status as TaskStatus)
    ? (row.data.status as TaskStatus)
    : "Belum dimulai";
}
export function taskIsOpen(row: Row) {
  return !["Selesai", "Ditunda"].includes(taskStatus(row));
}
export function recordHref(row: Row) {
  return (
    "/dashboard/" +
    row.kind +
    "?cari=" +
    encodeURIComponent(String(row.data.name || ""))
  );
}
export function buildManagementInsights(
  input: Row[],
  files: WorkspaceFile[],
  user: Principal,
  now = new Date(),
) {
  // Re-apply scope before deriving counts, search results, or reminders.
  const rows = input
    .filter((row) => canReadRecord(user, row))
    .map((row) => visibleRecord(user, row) as Row);
  const today = jakartaDate(now);
  const tasks = rows
    .filter((row) => row.kind === "tindaklanjut")
    .sort((a, b) => {
      const dueA = validDate(a.data.dueDate) ? a.data.dueDate : "9999-12-31";
      const dueB = validDate(b.data.dueDate) ? b.data.dueDate : "9999-12-31";
      return (
        dueA.localeCompare(dueB) ||
        Number(b.data.priority === "Tinggi") -
          Number(a.data.priority === "Tinggi") ||
        a.id.localeCompare(b.id)
      );
    });
  const openTasks = tasks.filter(taskIsOpen);
  const overdue = openTasks.filter(
    (row) => validDate(row.data.dueDate) && row.data.dueDate < today,
  );
  const dueToday = openTasks.filter((row) => row.data.dueDate === today);
  const agenda: AgendaItem[] = [
    ...rows
      .filter(
        (row) =>
          row.kind === "kegiatan" &&
          validDate(row.data.date) &&
          row.data.date >= today &&
          !["Selesai", "Ditunda"].includes(String(row.data.status)),
      )
      .map((row) => ({
        id: "event-" + row.id,
        row,
        date: String(row.data.date),
        type: "Kegiatan" as const,
      })),
    ...openTasks
      .filter((row) => validDate(row.data.dueDate) && row.data.dueDate >= today)
      .map((row) => ({
        id: "task-" + row.id,
        row,
        date: String(row.data.dueDate),
        type: "Tenggat tugas" as const,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const issues: ManagementIssue[] = [];
  const add = (
    row: Row,
    key: string,
    title: string,
    detail: string,
    severity: ManagementIssue["severity"] = "warning",
  ) => issues.push({ id: row.id + "-" + key, row, title, detail, severity });
  if (user.role !== "anggota") {
    const availableFiles = new Set(
      files.filter((file) => !file.deleted_at).map((file) => file.id),
    );
    for (const row of rows) {
      const missing =
        modules[row.kind]?.fields.filter(
          (field) =>
            field.required && !String(row.data[field.key] ?? "").trim(),
        ) || [];
      if (missing.length)
        add(
          row,
          "required",
          "Data wajib belum lengkap",
          missing.map((field) => field.label).join(", "),
        );
      const invalidNumbers =
        modules[row.kind]?.fields.filter(
          (field) =>
            ["number", "decimal"].includes(field.type || "") &&
            String(row.data[field.key] ?? "").trim() &&
            (!Number.isFinite(Number(row.data[field.key])) ||
              Number(row.data[field.key]) < 0 ||
              Number(row.data[field.key]) > 1e12 ||
              (field.type === "number" &&
                !Number.isSafeInteger(Number(row.data[field.key]))) ||
              (field.key === "amount" && Number(row.data[field.key]) === 0)),
        ) || [];
      if (invalidNumbers.length)
        add(
          row,
          "number",
          "Nilai angka perlu diperiksa",
          invalidNumbers.map((field) => field.label).join(", "),
        );
      const invalidDates =
        modules[row.kind]?.fields.filter(
          (field) =>
            field.type === "date" &&
            row.data[field.key] &&
            !validDate(row.data[field.key]),
        ) || [];
      if (invalidDates.length)
        add(
          row,
          "invalid-date",
          "Tanggal tidak valid",
          invalidDates.map((field) => field.label).join(", "),
        );
      if (row.kind === "anggota" && row.data.verification !== "Terverifikasi")
        add(
          row,
          "verification",
          "Verifikasi anggota belum selesai",
          "Periksa identitas dan status melalui menu Keanggotaan.",
        );
      if (row.kind === "anggota" && row.data.consent !== "Terdokumentasi")
        add(
          row,
          "consent",
          "Persetujuan pendataan perlu diperiksa",
          "Pastikan bukti persetujuan benar-benar tersedia.",
          "info",
        );
      if (
        row.kind === "tindaklanjut" &&
        taskIsOpen(row) &&
        !validDate(row.data.dueDate)
      )
        add(
          row,
          "date",
          "Tugas belum memiliki tanggal tenggat",
          "Periode relatif tidak dianggap sebagai tanggal jatuh tempo.",
          "info",
        );
      if (
        ["tindaklanjut", "kegiatan"].includes(row.kind) &&
        !["Selesai", "Ditunda"].includes(String(row.data.status)) &&
        !String(row.data.pic || "").trim()
      )
        add(
          row,
          "pic",
          "Penanggung jawab belum ditetapkan",
          "Tetapkan pelaksana melalui keputusan pengurus.",
          "info",
        );
      if (
        row.kind === "kegiatan" &&
        validDate(row.data.date) &&
        row.data.date < today &&
        !["Selesai", "Ditunda"].includes(String(row.data.status))
      )
        add(
          row,
          "past",
          "Tanggal kegiatan telah lewat",
          "Periksa hasil kegiatan dan perbarui status berdasarkan pelaksanaan.",
        );
      if (row.kind === "kas" && !String(row.data.attachmentId || "").trim())
        add(
          row,
          "evidence",
          "Transaksi belum dilampiri bukti",
          "Tinjau bukti pendukung; transaksi tidak diubah secara otomatis.",
          "info",
        );
      if (row.kind === "laporan_program") {
        const blockers = String(row.data.blockers || "").trim();
        const support = String(row.data.supportNeeded || "").trim();
        if (row.data.status === "Terkendala" || blockers || support)
          add(
            row,
            "program-report",
            row.data.status === "Terkendala" ? "Program dilaporkan terkendala" : "Laporan program meminta perhatian",
            [blockers ? "Kendala: " + blockers : "", support ? "Dukungan: " + support : ""].filter(Boolean).join(" · ") || "Tinjau perkembangan dan langkah berikutnya.",
            row.data.status === "Terkendala" ? "warning" : "info",
          );
      }
      for (const key of ["attachmentId", "fileId"]) {
        const id = String(row.data[key] || "");
        if (id && !availableFiles.has(id))
          add(
            row,
            key,
            "Lampiran tidak tersedia",
            "Periksa apakah berkas masih tersedia di arsip.",
          );
      }
    }
    const names = new Map<string, Row[]>();
    for (const row of rows.filter((record) => record.kind === "anggota")) {
      const name = String(row.data.name || "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("id-ID");
      if (name) names.set(name, [...(names.get(name) || []), row]);
    }
    for (const group of names.values())
      if (group.length > 1)
        add(
          group[0],
          "duplicate-name",
          "Nama anggota tercatat lebih dari sekali",
          String(group.length) +
            " catatan bernama sama. Periksa sebelum menyimpulkan duplikasi; tidak ada penggabungan otomatis.",
          "info",
        );
  }
  const cash = rows.filter((row) => row.kind === "kas");
  const cashAvailable = canReadSection(user, "kas");
  const cashInvalid = cash.filter(
    (row) =>
      !Number.isFinite(Number(row.data.amount)) ||
      Number(row.data.amount) <= 0 ||
      !Number.isSafeInteger(Number(row.data.amount)) ||
      Number(row.data.amount) > 1e12 ||
      !["Pemasukan", "Pengeluaran"].includes(String(row.data.type)),
  ).length;
  let exactBalance = BigInt(0);
  if (!cashInvalid)
    for (const row of cash) {
      const amount = BigInt(Number(row.data.amount));
      exactBalance += row.data.type === "Pemasukan" ? amount : -amount;
    }
  const cashTotalUnsafe =
    exactBalance > BigInt(Number.MAX_SAFE_INTEGER) ||
    exactBalance < -BigInt(Number.MAX_SAFE_INTEGER);
  if (cashTotalUnsafe && cash[0])
    add(
      cash[0],
      "total",
      "Jumlah kas melampaui batas perhitungan",
      "Periksa buku kas; angka ringkasan tidak ditampilkan agar tidak kehilangan ketelitian.",
    );
  return {
    today,
    rows,
    tasks,
    overdue,
    dueToday,
    agenda,
    issues,
    cashAvailable,
    cashInvalid: cashAvailable ? cashInvalid : 0,
    cashTotalUnsafe: cashAvailable && cashTotalUnsafe,
    balance:
      cashAvailable && !cashInvalid && !cashTotalUnsafe
        ? Number(exactBalance)
        : null,
    members: rows.filter((row) => row.kind === "anggota").length,
    programs: rows.filter((row) => row.kind === "program").length,
    attentionRecords: new Set(issues.map((issue) => issue.row.id)).size,
  };
}
export function filterAgenda(items: AgendaItem[], today: string, days: number) {
  if (!days) return items;
  const end = new Date(today + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + days - 1);
  return items.filter((item) => item.date <= end.toISOString().slice(0, 10));
}
