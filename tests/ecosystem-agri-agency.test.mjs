import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateProgramActivation,
  interpretMeasure,
  reconcileMassBalance,
  resolveAssuranceState,
  validateMarketObservation,
  validateTraceabilityEvent,
} from "../src/features/agriculture/domain.mjs";

test("empty records and measured zero remain different states", () => {
  assert.deepEqual(interpretMeasure(), {
    state: "not_collected",
    value: null,
    label: "Belum ada data",
  });
  assert.deepEqual(interpretMeasure({ state: "measured", value: 0 }), {
    state: "measured",
    value: 0,
    label: "Terukur: 0",
  });
  assert.equal(interpretMeasure({ state: "pending" }).label, "Menunggu pengukuran");
  assert.equal(interpretMeasure({ state: "not_applicable" }).state, "needs_correction");
});

test("external verification cannot be claimed without issuer, reference, date and evidence", () => {
  const rejected = resolveAssuranceState({ status: "externally_verified", today: "2026-11-08" });
  assert.equal(rejected.state, "needs_correction");
  assert.equal(rejected.valid, false);
  assert.equal(rejected.issues.length, 4);

  const accepted = resolveAssuranceState({
    status: "externally_verified",
    issuer: "Lembaga penerbit",
    externalReference: "CERT-001",
    verifiedAt: "2026-10-30",
    evidenceId: "private-file-001",
    expiresOn: "2027-10-30",
    today: "2026-11-08",
  });
  assert.equal(accepted.state, "externally_verified");
  assert.equal(accepted.valid, true);
});

test("expired external evidence is not reported as currently verified", () => {
  const result = resolveAssuranceState({
    status: "externally_verified",
    issuer: "Issuer",
    externalReference: "REF-1",
    verifiedAt: "2025-01-01",
    evidenceId: "DOC-1",
    expiresOn: "2026-01-01",
    today: "2026-11-08",
  });
  assert.equal(result.state, "expired");
  assert.equal(result.valid, false);
});

test("program activation is blocked until real mandate and delivery controls are complete", () => {
  const empty = evaluateProgramActivation({});
  assert.equal(empty.canActivate, false);
  assert.ok(empty.missing.length >= 8);

  const ready = evaluateProgramActivation({
    mandate: { status: "signed", documentId: "agreement-1" },
    counterpart: { confirmed: true, name: "Partner focal point" },
    scope: { locationIds: ["village-1"], description: "Program coffee producer services" },
    eligibility: { approved: true, ruleVersion: "eligibility-v1" },
    budget: { status: "approved", currency: "IDR" },
    indicators: [{ approved: true, code: "OUT-01", unit: "farmers", method: "verified enrolment register" }],
    dataProtection: { reviewed: true, purpose: "program delivery", sharingScope: "partner aggregate reports" },
    safeguarding: { reviewed: true, ownerId: "safeguarding-officer", reportingChannel: "restricted case form" },
    deliveryTeamIds: ["coordinator-1"],
    evidencePlan: { approved: true, reportingDates: ["2026-12-01"] },
  });
  assert.equal(ready.canActivate, true);
});

test("mass balance reconciles only like-for-like product forms and reports variance", () => {
  const valid = reconcileMassBalance({
    opening: 100, received: 50, producedIn: 0, shipped: 80, losses: 5,
    closing: 65, unit: "kg", productForm: "green_coffee", locationId: "warehouse-1",
  });
  assert.equal(valid.state, "reconciled");
  assert.equal(valid.expectedClosing, 65);
  const variance = reconcileMassBalance({
    opening: 100, received: 50, producedIn: 0, shipped: 80, losses: 5,
    closing: 70, unit: "kg", productForm: "green_coffee", locationId: "warehouse-1",
  });
  assert.equal(variance.state, "variance");
  assert.equal(variance.variance, 5);
  assert.equal(reconcileMassBalance({}).state, "incomplete");
});

test("market observations distinguish a buyer offer from actual realised sales", () => {
  const offer = validateMarketObservation({
    kind: "buyer_offer", sourceName: "Buyer A", sourceReference: "QUOTE-1",
    observedAt: "2026-11-08", value: 85000, currency: "IDR", unit: "kg",
    grade: "Arabica grade 1", deliveryPoint: "warehouse", validUntil: "2026-11-15",
  });
  assert.equal(offer.valid, true);
  const realised = validateMarketObservation({
    kind: "realised_sale", sourceName: "Buyer A", sourceReference: "INV-1",
    observedAt: "2026-11-08", value: 82000, currency: "IDR", unit: "kg",
    grade: "Arabica grade 1", deliveryPoint: "warehouse",
  });
  assert.equal(realised.valid, false);
  assert.ok(realised.issues.some((issue) => issue.includes("kontrak")));
});

test("traceability transformation must link both input and output lots", () => {
  const missing = validateTraceabilityEvent({
    eventId: "EV-1", eventType: "transformed", occurredAt: "2026-11-08T10:00:00+07:00",
    actorId: "operator-1", locationId: "mill-1", commodityCode: "COFFEE",
    productForm: "green_coffee", quantity: 90, unit: "kg", lotIds: ["lot-1"],
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.issues.some((issue) => issue.includes("lot masukan")));
  const valid = validateTraceabilityEvent({
    eventId: "EV-2", eventType: "transformed", occurredAt: "2026-11-08T10:00:00+07:00",
    actorId: "operator-1", locationId: "mill-1", commodityCode: "COFFEE",
    productForm: "green_coffee", quantity: 90, unit: "kg",
    lotIds: ["lot-1", "lot-2"], inputLotIds: ["cherry-1"], outputLotIds: ["green-1"],
  });
  assert.equal(valid.valid, true);
});
