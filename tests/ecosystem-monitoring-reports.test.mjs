import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import vm from "node:vm";

function loadModule(entryPoint) {
  const bundle = build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
  });
  return bundle.then((result) => {
    const commonjs = { exports: {} };
    vm.runInNewContext(result.outputFiles[0].text, {
      module: commonjs,
      exports: commonjs.exports,
    });
    return commonjs.exports;
  });
}

const [reporting, monitoring, permissions, verification, programEvaluation, meetingCycle] = await Promise.all([
  loadModule("src/lib/enterprise-reporting.ts"),
  loadModule("src/lib/enterprise-monitoring.ts"),
  loadModule("src/features/identity/access-policy.ts"),
  loadModule("src/lib/enterprise/task-verification.ts"),
  loadModule("src/lib/program-evaluation.ts"),
  loadModule("src/lib/meeting-cycle.ts"),
]);

const principal = (role, overrides = {}) => ({
  accountId: role + "-account",
  userId: role + "-workspace",
  email: role + "@example.test",
  displayName: role,
  fullName: role,
  role,
  memberId: role === "anggota" ? "member-1" : null,
  position: "",
  programIds: role === "koordinator" ? ["1"] : [],
  ...overrides,
});

const plain = (value) => JSON.parse(JSON.stringify(value));

const row = (id, kind, data = {}, created = "2026-11-07T00:00:00.000Z") => ({
  id,
  kind,
  data,
  created,
  updated: created,
});

const records = [
  row("member-1", "anggota", { name: "Anggota satu", status: "Aktif", verification: "Terverifikasi", consent: "Terdokumentasi" }),
  row("member-2", "anggota", { name: "Anggota dua", status: "Aktif", verification: "Perlu verifikasi", consent: "Belum dikonfirmasi" }),
  row("activity-1", "kegiatan", { name: "Pelatihan", date: "2026-11-09", status: "Direncanakan", location: "Aula" }),
  row("activity-2", "kegiatan", { name: "Kegiatan internal", date: "2026-11-03", status: "Perlu verifikasi", location: "Balai" }),
  row("task-1", "tindaklanjut", { name: "Selesaikan proposal", dueDate: "2026-11-05", programId: "1", status: "Berjalan", pic: "Koordinator" }),
  row("task-2", "tindaklanjut", { name: "Tugas di program lain", dueDate: "2026-11-05", programId: "2", status: "Berjalan" }),
  row("program-report-1", "laporan_program", { name: "Perkembangan program 1", programId: "1", date: "2026-11-06", period: "November 2026", status: "Terkendala", progress: "Pemetaan peserta sudah dilakukan.", blockers: "Distribusi bibit terlambat.", supportNeeded: "Koordinasi pemasok.", nextSteps: "Jadwalkan ulang distribusi." }),
  row("program-report-2", "laporan_program", { name: "Perkembangan program 2", programId: "2", date: "2026-11-06", period: "November 2026", status: "Berjalan", progress: "Pendataan berlangsung." }),
  row("cash-1", "kas", { name: "Pembelian bibit", date: "2026-11-04", amount: 250000, type: "Pengeluaran", fund: "Program" }),
  row("asset-1", "aset", { name: "Pompa air", quantity: 1, condition: "Perlu perawatan", status: "Aktif" }),
  row("draft-1", "publikasi", { name: "Kabar kegiatan", date: "2026-11-06", status: "Draf", fileId: "image-1", publicationPermission: "Belum dikonfirmasi" }),
];

test("the report center exposes only report groups covered by the current role", () => {
  const memberGroups = reporting.getVisibleReportGroups(principal("anggota")).map((group) => group.id);
  assert.deepEqual(plain(memberGroups), ["operasional", "keanggotaan"]);

  const coordinatorGroups = reporting.getVisibleReportGroups(principal("koordinator")).map((group) => group.id);
  assert.deepEqual(plain(coordinatorGroups), ["operasional", "usaha"]);
  const coordinatorBusiness = reporting.selectReportRows([
    ...records,
    row("business-1", "usaha", { name: "Kajian usaha program 5", programId: "5", status: "Kajian kelayakan" }),
    row("business-other", "usaha", { name: "Kajian usaha program 2", programId: "2", status: "Pemetaan" }),
  ], principal("koordinator", { programIds: ["1", "5"] }), "usaha");
  assert.deepEqual(plain(coordinatorBusiness.map((item) => item.id)), ["business-1"], "Coordinator business reports remain limited to assigned programs");

  const financeGroups = reporting.getVisibleReportGroups(principal("bendahara")).map((group) => group.id);
  assert.ok(financeGroups.includes("keuangan"));
  assert.ok(financeGroups.includes("usaha"));
  assert.ok(financeGroups.includes("keanggotaan"), "Treasury has read-only administrative reporting access");
  const memberReport = reporting.selectReportRows(records, principal("bendahara"), "keanggotaan");
  assert.equal(memberReport[0]?.data.phone, undefined, "Personal contact details remain redacted in treasury reports");
  assert.equal(memberReport[0]?.data.potential, undefined, "Member needs remain redacted in treasury reports");

  const adminGroups = reporting.getVisibleReportGroups(principal("admin")).map((group) => group.id);
  assert.deepEqual(plain(adminGroups), [], "Technical administrator does not receive organizational reports");
});

test("member reports contain only the member's own records and readable activities", () => {
  const user = principal("anggota");
  const membership = reporting.selectReportRows(records, user, "keanggotaan");
  assert.deepEqual(plain(membership.map((item) => item.id)), ["member-1"]);
  const operations = reporting.selectReportRows(records, user, "operasional");
  assert.deepEqual(plain(operations.map((item) => item.id)), ["activity-1"]);
  assert.ok(!operations.some((item) => item.data.name === "Kegiatan internal"));
  assert.deepEqual(plain(reporting.selectReportRows(records, user, "keuangan")), []);
});

test("coordinator report rows are limited to assigned program IDs", () => {
  const user = principal("koordinator");
  const tasks = reporting.selectReportRows(records, user, "operasional");
  assert.deepEqual(plain(tasks.map((item) => item.id)), ["task-1", "program-report-1"]);
  assert.equal(permissions.canReadKind(principal("koordinator"), "laporan_program"), true);
  assert.equal(permissions.canWriteKind(principal("koordinator"), "laporan_program"), true);
  assert.equal(permissions.canReadRecord(principal("koordinator"), { id: "program-report-2", kind: "laporan_program", data: { programId: "2" } }), false);
  assert.equal(permissions.canReadKind(principal("sekretaris"), "laporan_program"), true);
  assert.equal(permissions.canWriteKind(principal("sekretaris"), "laporan_program"), false);
  assert.equal(permissions.canWriteKind(principal("ketua"), "tindaklanjut"), false);
});

test("period filters use the activity or due date and keep all-period reports available", () => {
  const user = principal("ketua");
  const november = reporting.selectReportRows(records, user, "operasional", "2026-11");
  assert.equal(november.length, 6);
  const october = reporting.selectReportRows(records, user, "operasional", "2026-10");
  assert.equal(october.length, 0);
});

test("membership reporting aggregates status without including personal information in the summary", () => {
  const rows = reporting.selectReportRows(records, principal("ketua"), "keanggotaan");
  const summary = reporting.summarizeReportRows(rows);
  assert.equal(summary.reduce((total, item) => total + item.count, 0), rows.length);
  assert.ok(summary.some((item) => item.status === "Aktif" && item.count === 2));
});

test("monitoring metrics are role-scoped and finance data is withheld from members", () => {
  const memberSnapshot = monitoring.buildEnterpriseMonitoring(
    records,
    [],
    principal("anggota"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(memberSnapshot.membership.total, 1);
  assert.equal(memberSnapshot.finance, null);
  assert.equal(memberSnapshot.administration, null);
  assert.equal(memberSnapshot.business, null);
  assert.equal(memberSnapshot.publication, null);
  assert.equal(memberSnapshot.visibleRecords, 2);
});

test("technical administrator cannot inspect business monitoring signals", () => {
  const adminSnapshot = monitoring.buildEnterpriseMonitoring(
    records,
    [],
    principal("admin"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(adminSnapshot.membership, null);
  assert.equal(adminSnapshot.operational, null);
  assert.equal(adminSnapshot.finance, null);
  assert.equal(adminSnapshot.business, null);
  assert.equal(adminSnapshot.publication, null);
  assert.equal(adminSnapshot.visibleRecords, 0);
});

test("coordinator monitoring omits non-assigned program activity", () => {
  const snapshot = monitoring.buildEnterpriseMonitoring(
    records,
    [],
    principal("koordinator"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(snapshot.operational.openTasks, 1);
  assert.equal(snapshot.membership, null);
  assert.equal(snapshot.finance, null);
});


test("task result handoff requires real evidence and a leadership decision", () => {
  const submit = {
    role: "koordinator",
    previousVerification: "Belum diajukan",
    previousStatus: "Berjalan",
    verification: "Menunggu verifikasi",
    status: "Selesai",
    completionEvidence: "Distribusi bibit terlaksana pada tanggal yang tercatat.",
    attachmentId: "",
    reviewNote: "",
  };
  assert.equal(verification.taskVerificationError(submit), null);
  assert.match(
    verification.taskVerificationError({ ...submit, completionEvidence: "" }) || "",
    /hasil pelaksanaan atau lampirkan bukti/,
  );
  assert.match(
    verification.taskVerificationError({ ...submit, status: "Berjalan" }) || "",
    /Selesaikan pekerjaan terlebih dahulu/,
  );
});

test("only the Secretariat can verify a completed task result", () => {
  const pending = {
    role: "sekretaris",
    previousVerification: "Menunggu verifikasi",
    previousStatus: "Selesai",
    verification: "Terverifikasi",
    status: "Selesai",
    completionEvidence: "Hasil pelaksanaan sudah diperiksa.",
    attachmentId: "",
    reviewNote: "",
  };
  assert.equal(verification.taskVerificationError(pending), null);
  for (const role of ["admin", "ketua", "koordinator"]) {
    assert.match(
      verification.taskVerificationError({ ...pending, role }) || "",
      /Hanya Sekretariat/,
    );
  }
});

test("requesting correction requires a reason and reopens the task", () => {
  const review = {
    role: "sekretaris",
    previousVerification: "Menunggu verifikasi",
    previousStatus: "Selesai",
    verification: "Perlu perbaikan",
    status: "Berjalan",
    completionEvidence: "Hasil awal perlu dilengkapi.",
    attachmentId: "",
    reviewNote: "Lampirkan berita acara dan uraian jumlah peserta.",
  };
  assert.equal(verification.taskVerificationError(review), null);
  assert.match(
    verification.taskVerificationError({ ...review, reviewNote: "" }) || "",
    /Tuliskan alasan/,
  );
  assert.match(
    verification.taskVerificationError({ ...review, status: "Selesai" }) || "",
    /status pekerjaan menjadi Berjalan/,
  );
});

test("coordinators cannot alter reviewer notes or reopen an already verified result", () => {
  const base = {
    role: "koordinator",
    previousVerification: "Menunggu verifikasi",
    previousStatus: "Selesai",
    previousReviewNote: "Perjelas dokumen hasil.",
    verification: "Menunggu verifikasi",
    status: "Selesai",
    completionEvidence: "Hasil sudah dilengkapi.",
    reviewNote: "Saya mengubah keputusan",
  };
  assert.match(
    verification.taskVerificationError(base) || "",
    /Catatan pemeriksaan hanya dapat diubah/,
  );
    /dibuka kembali melalui pemeriksaan Sekretariat/,
    verification.taskVerificationError({
      ...base,
      previousVerification: "Terverifikasi",
      previousReviewNote: "",
      reviewNote: "",
    }) || "",
    /dibuka kembali melalui pemeriksaan Sekretariat/,
  );
});

test("new task records cannot be marked complete without a verification submission", () => {
  const error = verification.taskVerificationError({
    role: "koordinator",
    previousVerification: "",
    previousStatus: "",
    verification: "Belum diajukan",
    status: "Selesai",
    completionEvidence: "",
    attachmentId: "",
    reviewNote: "",
  });
  assert.match(error || "", /diajukan untuk verifikasi/);
});

test("monitoring exposes actionable ownership, deadline, verification and blocked-program counts", () => {
  const expanded = [
    ...records,
    row("task-pending-review", "tindaklanjut", {
      name: "Hasil menunggu pemeriksaan", programId: "1", status: "Selesai",
      verification: "Menunggu verifikasi", completionEvidence: "Kegiatan terlaksana.",
    }),
    row("task-legacy-completed", "tindaklanjut", {
      name: "Pekerjaan lama", programId: "1", status: "Selesai",
      verification: "Belum diajukan",
    }),
    row("task-needs-correction", "tindaklanjut", {
      name: "Perbaiki laporan", programId: "1", status: "Berjalan", pic: "Koordinator",
      dueDate: "2026-11-12", verification: "Perlu perbaikan",
      reviewNote: "Lengkapi dokumen hasil.",
    }),
    row("task-no-owner-or-date", "tindaklanjut", {
      name: "Tugas tanpa penanggung jawab", programId: "1", status: "Belum dimulai",
    }),
    row("program-blocked", "laporan_program", {
      name: "Laporan kendala", programId: "3", date: "2026-11-07",
      status: "Terkendala", progress: "Menunggu bahan.",
    }),
  ];
  const snapshot = monitoring.buildEnterpriseMonitoring(
    expanded,
    [],
    principal("ketua"),
    new Date("2026-11-07T04:00:00.000Z"),
  );
  assert.equal(snapshot.operational.tasksWithoutAssignee, 2);
  assert.equal(snapshot.operational.tasksWithoutDueDate, 1);
  assert.equal(snapshot.operational.tasksAwaitingVerification, 1);
  assert.equal(snapshot.operational.tasksNeedingCorrection, 1);
  assert.equal(snapshot.operational.completedWithoutVerification, 2);
  assert.equal(snapshot.operational.blockedPrograms, 2);
  assert.ok(snapshot.issues.some((issue) => issue.title === "Hasil tugas menunggu verifikasi"));
  assert.ok(snapshot.issues.some((issue) => issue.title === "Hasil tugas perlu perbaikan"));
});


test("program evaluation compares actual reports without inventing numerical progress", () => {
  const expanded = [
    ...records,
    row("program-report-older", "laporan_program", {
      name: "Laporan sebelumnya", programId: "1", date: "2026-10-15",
      status: "Terkendala", progress: "Pemetaan peserta sudah dilakukan.",
      target: "Daftar peserta terverifikasi.", achievement: "Sebagian peserta terdata.",
    }),
    row("task-awaiting-verification", "tindaklanjut", {
      name: "Hasil tugas menunggu pengesahan", programId: "1", status: "Selesai",
      verification: "Menunggu verifikasi", completionEvidence: "Pelatihan terlaksana.",
    }),
    row("task-program-1-no-pic", "tindaklanjut", {
      name: "Jadwalkan pertemuan", programId: "1", status: "Berjalan",
      dueDate: "2026-11-12", verification: "Belum diajukan",
    }),
  ];
  const evaluations = programEvaluation.buildProgramEvaluations(
    expanded,
    principal("ketua"),
    "2026-11",
  );
  const first = evaluations.find((item) => item.programId === "1");
  const noReport = evaluations.find((item) => item.programId === "3");
  assert.equal(evaluations.length, 9);
  assert.equal(first.latest.id, "program-report-1");
  assert.equal(first.previous.id, "program-report-older");
  assert.equal(first.hasReportInPeriod, true);
  assert.equal(first.unchangedProgress, true);
  assert.equal(first.blocked, true);
  assert.equal(first.target, "");
  assert.equal(first.achievement, "");
  assert.equal(first.tasksWithoutPic, 1);
  assert.equal(first.tasksAwaitingVerification, 1);
  assert.equal(noReport.latest, null);
  assert.equal(noReport.reportCount, 0);
});

test("period evaluation keeps the latest prior report visible and asks for an update without calling it stalled", () => {
  const expanded = [
    ...records,
    row("program-report-older", "laporan_program", {
      name: "Laporan sebelumnya", programId: "1", date: "2026-10-15",
      status: "Terkendala", progress: "Pemetaan peserta sudah dilakukan.",
    }),
  ];
  const evaluations = programEvaluation.buildProgramEvaluations(
    expanded,
    principal("ketua"),
    "2026-12",
  );
  const first = evaluations.find((item) => item.programId === "1");
  assert.equal(first.latest.id, "program-report-1");
  assert.equal(first.hasReportInPeriod, false);
  const priorities = programEvaluation.buildMeetingPriorities(evaluations);
  assert.ok(priorities.some((item) => item.title === "Minta pembaruan untuk periode terpilih" && item.programId === "1"));
  assert.ok(priorities.some((item) => item.title === "Minta laporan dasar program" && item.programId === "3"));
  assert.ok(priorities.some((item) => item.title === "Putuskan penanganan kendala program" && item.programId === "1"));
});

test("meeting agenda carries task review and missing-accountability decisions with source records", () => {
  const expanded = [
    ...records,
    row("task-awaiting-verification", "tindaklanjut", {
      name: "Hasil tugas menunggu pengesahan", programId: "1", status: "Selesai",
      verification: "Menunggu verifikasi", completionEvidence: "Pelatihan terlaksana.",
    }),
    row("task-no-pic", "tindaklanjut", {
      name: "Tugas tanpa pelaksana", programId: "1", status: "Berjalan",
    }),
  ];
  const evaluations = programEvaluation.buildProgramEvaluations(expanded, principal("ketua"));
  const agenda = programEvaluation.buildMeetingPriorities(evaluations);
  assert.ok(agenda.some((item) => item.title === "Verifikasi hasil tugas" && item.task?.id === "task-awaiting-verification"));
  assert.ok(agenda.some((item) => item.title === "Tetapkan pelaksana tugas" && item.task?.id === "task-no-pic"));
  assert.ok(agenda.some((item) => item.title === "Tetapkan tenggat tugas" && item.task?.id === "task-no-pic"));
  assert.deepEqual(
    plain(agenda.map((item) => item.priority).slice(0, 2)),
    ["Tinggi", "Tinggi"],
  );
});

test("coordinator program evaluation is restricted to assigned programs and their source records", () => {
  const evaluations = programEvaluation.buildProgramEvaluations(
    records,
    principal("koordinator"),
  );
  assert.deepEqual(plain(evaluations.map((item) => item.programId)), ["1"]);
  assert.ok(evaluations[0].latest?.id === "program-report-1");
  assert.ok(!programEvaluation.buildMeetingPriorities(evaluations).some((item) => item.programId === "2"));
});


test("meeting decisions are parsed one per line and receive stable source references", () => {
  const decisions = meetingCycle.parseMeetingActions(
    "1. Tetapkan jadwal pelatihan\n- Verifikasi daftar anggota\n• Hubungi penyuluh\n\n4) Siapkan notulen evaluasi",
  );
  assert.deepEqual(plain(decisions), [
    "Tetapkan jadwal pelatihan",
    "Verifikasi daftar anggota",
    "Hubungi penyuluh",
    "Siapkan notulen evaluasi",
  ]);
  const marker = meetingCycle.meetingActionSourceMarker("meeting-abc", 1);
  assert.equal(marker, "Sumber rapat: meeting-abc · Keputusan #2:");
  assert.deepEqual(
    plain(meetingCycle.parseMeetingTaskReference(marker + " Hubungi penyuluh")),
    { meetingId: "meeting-abc", decisionNumber: 2, marker },
  );
  assert.equal(meetingCycle.parseMeetingTaskReference("Tugas tanpa sumber rapat"), null);
});

test("existing meeting decisions can only be retained in order with new actions appended", () => {
  const original = "Atur jadwal\nVerifikasi peserta";
  assert.equal(
    meetingCycle.decisionsPreserveExistingOrder(original, "Atur jadwal\nVerifikasi peserta\nHubungi penyuluh"),
    true,
  );
  assert.equal(
    meetingCycle.decisionsPreserveExistingOrder(original, "Verifikasi peserta\nAtur jadwal\nHubungi penyuluh"),
    false,
  );
  assert.equal(
    meetingCycle.decisionsPreserveExistingOrder(original, "Atur jadwal"),
    false,
  );
  assert.equal(
    meetingCycle.decisionsPreserveExistingOrder(original, "Atur jadwal\nVerifikasi peserta diubah"),
    false,
  );
});

test("meeting decision evaluations require a dated leadership review and a reason", () => {
  const review = {
    role: "sekretaris",
    previousStatus: "Belum dievaluasi",
    previousMeeting: "",
    previousDate: "",
    previousNote: "",
    status: "Sebagian terlaksana",
    meeting: "Rapat evaluasi November",
    date: "2026-11-30",
    note: "Satu keputusan selesai; jadwal pelatihan menunggu penyuluh.",
  };
  assert.equal(meetingCycle.meetingReviewError(review), null);
  assert.match(meetingCycle.meetingReviewError({ ...review, role: "admin" }) || "", /Sekretariat/);
  assert.match(
    meetingCycle.meetingReviewError({ ...review, role: "ketua" }) || "",
    /Sekretariat/,
  );
  assert.match(
    meetingCycle.meetingReviewError({ ...review, meeting: "" }) || "",
    /judul atau nomor rapat/,
  );
  assert.match(
    meetingCycle.meetingReviewError({ ...review, note: "" }) || "",
    /hasil evaluasi/,
  );
  assert.match(
    meetingCycle.meetingReviewError({ ...review, date: "2026-02-31" }) || "",
    /tanggal rapat evaluasi yang valid/,
  );
  assert.equal(
    meetingCycle.meetingReviewError({
      role: "koordinator",
      previousStatus: "Belum dievaluasi",
      previousMeeting: "",
      previousDate: "",
      previousNote: "",
      status: "Belum dievaluasi",
      meeting: "",
      date: "",
      note: "",
    }),
    null,
  );
});
