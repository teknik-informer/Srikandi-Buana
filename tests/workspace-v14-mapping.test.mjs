import { test } from "node:test";
import assert from "node:assert/strict";
import { mapLegacyRecordToV14, v14LegacyDate } from "../src/features/workspace-v14/legacy-mapping.mjs";

test("legacy member status never becomes active without recorded consent and verification", () => {
  const oldMember = mapLegacyRecordToV14("anggota", {
    name: "Anggota Uji",
    status: "Aktif",
    verification: "Terverifikasi",
  });
  assert.equal(oldMember.domain, "member_profiles");
  assert.equal(oldMember.values.membershipStatus, "pending_verification");
  assert.equal(oldMember.values.dataConsentStatus, "not_requested");

  const consented = mapLegacyRecordToV14("anggota", {
    name: "Anggota Uji",
    status: "Aktif",
    verification: "Terverifikasi",
    dataConsent: "Setuju",
  });
  assert.equal(consented.values.membershipStatus, "active");
  assert.equal(consented.values.dataConsentStatus, "granted");
});

test("partner records stay pre-agreement even when legacy text includes an active stage", () => {
  const mapped = mapLegacyRecordToV14("kemitraan", {
    partnerName: "Mitra Uji",
    relationshipStage: "active",
    counterpartConfirmed: "Ya",
    formPreset: "program-preparation-checklist",
  });
  assert.equal(mapped.domain, "partner_organizations");
  assert.equal(mapped.values.relationshipStage, "active");
  assert.equal(mapped.values.relationshipStatus, "pre_agreement");
  assert.equal(mapped.values.displayName, "Mitra Uji");
});

test("legacy programme records never create approved or active programme status", () => {
  const mapped = mapLegacyRecordToV14("program", {
    programId: "program-kopi",
    name: "Program Kopi",
    status: "Berjalan",
    notes: "Rencana kerja lama",
  });
  assert.equal(mapped.domain, "programmes");
  assert.equal(mapped.values.lifecycleStatus, "preparation");
  assert.equal(mapped.values.agreementStatus, "not_received");
});

test("activities and tasks preserve explicit real statuses without fabricating results", () => {
  const activity = mapLegacyRecordToV14("kegiatan", {
    name: "ToT",
    date: "2026-11-08",
    endDate: "2026-11-09",
    status: "Selesai",
  });
  assert.equal(activity.domain, "activities");
  assert.equal(activity.values.status, "completed");
  assert.equal(activity.values.startsAt, "2026-11-08T00:00:00.000Z");
  assert.deepEqual(activity.values.evidence, []);

  const task = mapLegacyRecordToV14("tindaklanjut", {
    name: "Tindak lanjut ToT",
    status: "Belum dimulai",
    dueDate: "2026-11-20",
  });
  assert.equal(task.domain, "tasks");
  assert.equal(task.values.status, "not_started");
  assert.equal(task.values.completionSummary, null);
  assert.equal(task.values.completedAt, null);
});

test("documents remain unverified even if their old display status says source review", () => {
  const mapped = mapLegacyRecordToV14("register", {
    documentTitle: "Dokumen Mitra",
    documentType: "MoU/PKS/Perjanjian",
    documentStatus: "Diverifikasi keaslian/sumber",
    fileId: "private-file-1",
  });
  assert.equal(mapped.domain, "documents");
  assert.equal(mapped.values.documentStatus, "version_review");
  assert.equal(mapped.values.verificationStatus, "unverified");
  assert.equal(mapped.values.privateFileId, "private-file-1");
});

test("invalid dates and unsupported legacy kinds remain unmapped", () => {
  assert.equal(v14LegacyDate("2026-02-30"), null);
  assert.equal(v14LegacyDate("2026-11-08"), "2026-11-08");
  assert.equal(mapLegacyRecordToV14("kehadiran", {}), null);
  assert.equal(mapLegacyRecordToV14("kas", {}), null);
});
