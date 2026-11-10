import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getFutureModules,
  getOperationalTemplate,
  opportunityStages,
  operationalTemplates,
  validateTemplateDraft,
} from "../src/features/agriculture/templates.mjs";

test("the opportunity lifecycle keeps ToT separate from an executed agreement", () => {
  const tot = opportunityStages.indexOf("training_of_trainers");
  const signed = opportunityStages.indexOf("agreement_signed");
  const active = opportunityStages.indexOf("active");
  assert.ok(tot >= 0 && signed > tot && active > signed);
  const template = getOperationalTemplate("program-preparation-checklist");
  assert.ok(template);
  assert.equal(template.lifecycle, "pre_agreement");
  assert.ok(template.fields.some((field) => field.key === "writtenMandateStatus"));
});

test("the ToT template records actual training and does not imply a contract or trainer certification", () => {
  const template = getOperationalTemplate("tot-session-record");
  assert.ok(template);
  assert.ok(template.fields.some((field) => field.key === "topics"));
  assert.ok(template.fields.some((field) => field.key === "trainerRecognition"));
  assert.ok(template.fields.some((field) => field.key === "trainerRecognitionEvidenceId"));
  assert.ok(!template.fields.some((field) => /national.?id|nik|rekening/i.test(field.key)));
});

test("the attendance template does not require national identity or bank information", () => {
  const template = getOperationalTemplate("tot-attendance-roster");
  assert.ok(template.fields.some((field) => field.key === "participantName"));
  assert.ok(!template.fields.some((field) => /nik|identity|birth|bank|rekening/i.test(field.key)));
});

test("ready templates validate required fields and reject unknown fields", () => {
  const invalid = validateTemplateDraft("partner-engagement-log", {});
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 4);
  const valid = validateTemplateDraft("partner-engagement-log", {
    partnerName: "Mitra Contoh",
    interactionDate: "2026-11-08",
    interactionStage: "training_of_trainers",
    summary: "Pelatihan awal dilaksanakan. Belum ada perjanjian.",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.status, "draft_validated");
  assert.equal(validateTemplateDraft("partner-engagement-log", {
    partnerName: "Mitra", interactionDate: "2026-02-30",
    interactionStage: "training_of_trainers", summary: "Catatan",
  }).valid, false);
  assert.equal(validateTemplateDraft("partner-engagement-log", {
    partnerName: "Mitra", interactionDate: "2026-11-08",
    interactionStage: "training_of_trainers", summary: "Catatan", madeUpTarget: 999,
  }).valid, false);
});

test("future modules are marked coming soon and have no clickable route", () => {
  const modules = getFutureModules();
  assert.ok(modules.length >= 10);
  assert.ok(modules.every((item) => item.status === "coming_soon"));
  assert.ok(modules.every((item) => item.route === null && item.interactive === false));
});

test("future workflow templates cannot be submitted as active operational forms", () => {
  const result = validateTemplateDraft("beneficiary-enrolment", {
    programId: "program-1", personId: "person-1", eligibilityRuleVersion: "v1",
  });
  assert.equal(result.valid, false);
  assert.equal(result.status, "coming_soon");
});

test("all template IDs and field keys are unique", () => {
  assert.equal(new Set(operationalTemplates.map((template) => template.id)).size, operationalTemplates.length);
  for (const template of operationalTemplates) {
    const keys = template.fields.map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length, template.id);
    for (const item of template.fields) {
      assert.ok(template.sections.some((section) => section.id === item.section), template.id + ":" + item.key);
    }
  }
});
