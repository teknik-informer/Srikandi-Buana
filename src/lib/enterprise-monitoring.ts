import { canReadKind, canReadSection, type Principal } from "./permissions";
import {
  buildManagementInsights,
  taskIsOpen,
  validDate,
} from "./management-insights";
import type { Row } from "./srikandi";
import type { WorkspaceFile } from "./workspace-types";
import { buildMeetingPriorities, buildProgramEvaluations } from "./program-evaluation";

const count = (rows: Row[], predicate: (row: Row) => boolean) =>
  rows.filter(predicate).length;

export function buildEnterpriseMonitoring(
  input: Row[],
  files: WorkspaceFile[],
  user: Principal,
  now = new Date(),
) {
  // buildManagementInsights reapplies record ownership and program scope before
  // deriving any monitoring metric or quality finding.
  const insights = buildManagementInsights(input, files, user, now);
  const rows = insights.rows;
  const ofKind = (kind: string) => rows.filter((row) => row.kind === kind);
  const today = insights.today;
  const programEvaluations = buildProgramEvaluations(rows, user);
  const meetingPriorities = buildMeetingPriorities(programEvaluations);

  const members = ofKind("anggota");
  const tasks = ofKind("tindaklanjut");
  const activities = ofKind("kegiatan");
  const docs = [
    ...ofKind("register"),
    ...ofKind("kelembagaan"),
    ...ofKind("transkripsi"),
    ...ofKind("dokumen"),
  ];
  const assets = ofKind("aset");
  const lots = ofKind("lotkopi");
  const publications = ofKind("publikasi");
  const gallery = ofKind("galeri");
  const cash = ofKind("kas");

  const lastUpdate = rows
    .map((row) => row.updated || row.created)
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;

  const openTasks = tasks.filter(taskIsOpen);
  const blockedProgramIds = new Set(
    ofKind("laporan_program")
      .filter((row) => row.data.status === "Terkendala")
      .map((row) => String(row.data.programId || row.id)),
  );

  const operational = {
    programs: ofKind("program").length,
    openTasks: openTasks.length,
    tasksWithoutAssignee: count(openTasks, (row) => !String(row.data.pic || "").trim()),
    tasksWithoutDueDate: count(openTasks, (row) => !validDate(row.data.dueDate)),
    tasksAwaitingVerification: count(
      tasks,
      (row) => row.data.status === "Selesai" && row.data.verification === "Menunggu verifikasi",
    ),
    tasksNeedingCorrection: count(tasks, (row) => row.data.verification === "Perlu perbaikan"),
    completedWithoutVerification: count(
      tasks,
      (row) => row.data.status === "Selesai" && row.data.verification !== "Terverifikasi",
    ),
    blockedPrograms: blockedProgramIds.size,
    overdueTasks: insights.overdue.length,
    dueToday: insights.dueToday.length,
    upcomingActivities: count(
      activities,
      (row) =>
        validDate(row.data.date) &&
        row.data.date >= today &&
        !["Selesai", "Ditunda"].includes(String(row.data.status)),
    ),
    unresolvedPastActivities: count(
      activities,
      (row) =>
        validDate(row.data.date) &&
        row.data.date < today &&
        !["Selesai", "Ditunda"].includes(String(row.data.status)),
    ),
  };

  const membership = {
    total: members.length,
    active: count(members, (row) => row.data.status === "Aktif"),
    needsVerification: count(
      members,
      (row) => row.data.verification !== "Terverifikasi",
    ),
    consentNeedsReview: count(
      members,
      (row) => row.data.consent !== "Terdokumentasi",
    ),
  };

  const administration = {
    documents: docs.length,
    needsReview: count(
      docs,
      (row) =>
        ["Perlu verifikasi", "Perlu perbaikan", "Perlu pembaruan", "Belum diperiksa"].includes(
          String(row.data.status),
        ),
    ),
    missingAttachments: count(
      docs,
      (row) => Boolean(row.data.attachmentId) &&
        !files.some((file) => file.id === String(row.data.attachmentId) && !file.deleted_at),
    ),
  };

  const finance = insights.cashAvailable
    ? {
        transactions: cash.length,
        missingEvidence: count(cash, (row) => !String(row.data.attachmentId || "").trim()),
        invalidTransactions: insights.cashInvalid,
        balance: insights.balance,
        balanceSafe: !insights.cashTotalUnsafe && !insights.cashInvalid,
      }
    : null;

  const business = {
    assets: assets.length,
    assetsNeedAttention: count(
      assets,
      (row) => ["Perlu perawatan", "Rusak", "Perlu verifikasi"].includes(String(row.data.condition)),
    ),
    lots: lots.length,
    lotsOnHold: count(
      lots,
      (row) => ["Menunggu pemeriksaan", "Ditahan", "Ditolak"].includes(String(row.data.status)),
    ),
    businessPlans: ofKind("usaha").length,
    partnerships: ofKind("kemitraan").length,
  };

  const publication = {
    content: publications.length,
    drafts: count(publications, (row) => row.data.status === "Draf"),
    published: count(publications, (row) => row.data.status === "Terbit"),
    galleryItems: gallery.length,
    permissionNeedsReview: count(
      [...publications, ...gallery],
      (row) =>
        Boolean(row.data.fileId) &&
        row.data.publicationPermission !== "Dikonfirmasi" &&
        row.data.publicationPermission !== "Setuju sesuai lingkup tercatat",
    ),
  };

  return {
    today,
    visibleRecords: rows.length,
    latestUpdate: lastUpdate,
    qualityFindings: insights.issues.length,
    warningFindings: insights.issues.filter((issue) => issue.severity === "warning").length,
    infoFindings: insights.issues.filter((issue) => issue.severity === "info").length,
    issues: insights.issues,
    programEvaluations,
    meetingPriorities,
    operational: canReadSection(user, "kegiatan") ||
      canReadSection(user, "tindaklanjut") ||
      canReadSection(user, "program") ? operational : null,
    membership: canReadSection(user, "anggota") ? membership : null,
    administration: ["register", "kelembagaan", "transkripsi", "dokumen"].some((kind) => canReadKind(user, kind))
      ? administration
      : null,
    finance,
    business: ["aset", "lotkopi", "usaha", "kemitraan"].some((kind) => canReadKind(user, kind))
      ? business
      : null,
    publication: ["publikasi", "galeri"].some((kind) => canReadKind(user, kind))
      ? publication
      : null,
  };
}
