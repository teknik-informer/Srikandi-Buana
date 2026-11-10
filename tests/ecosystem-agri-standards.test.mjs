import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCertificateRecord,
  evaluateStandardControl,
  selectStandardVersion,
} from "../src/features/agriculture/standards.mjs";

test("standard assessment selects the version effective on the inspection date", () => {
  const versions = [
    { issuer: "Rainforest Alliance", version: "v1.4", sourceUrl: "https://example.test/old", effectiveFrom: "2025-01-01", replacedOn: "2026-03-01", status: "superseded" },
    { issuer: "Rainforest Alliance", version: "v1.5", sourceUrl: "https://example.test/current", effectiveFrom: "2026-03-01", status: "published" },
  ];
  assert.equal(selectStandardVersion(versions, "2026-02-28").selected.version, "v1.4");
  assert.equal(selectStandardVersion(versions, "2026-03-01").selected.version, "v1.5");
});

test("standard control cannot be marked not applicable without a reviewed reason", () => {
  const control = { controlId: "SC-01", standardVersionId: "RA-v1.5", applies: false };
  assert.equal(evaluateStandardControl(control).state, "applicability_unverified");
  assert.equal(evaluateStandardControl({
    ...control,
    applicabilityReason: "Commodity/process outside the control scope",
    applicabilityReviewedBy: "quality-officer",
    applicabilityReviewedAt: "2026-11-08",
  }).state, "not_applicable");
});

test("an internally verified control is not treated as externally audited or certified", () => {
  const result = evaluateStandardControl(
    { controlId: "SC-02", standardVersionId: "RA-v1.5", applies: true },
    { status: "internally_verified", verifierId: "internal-reviewer", verifiedAt: "2026-11-08", evidenceId: "evidence-1" },
  );
  assert.equal(result.state, "internally_verified");
  assert.equal(result.claimable, false);
});

test("certificate record requires independent issuer verification and scope", () => {
  const incomplete = evaluateCertificateRecord({}, "2026-11-08");
  assert.equal(incomplete.state, "incomplete_record");
  const active = evaluateCertificateRecord({
    scheme: "Example scheme", issuer: "Accredited certification body",
    certificateNumber: "CERT-001", scope: "Defined sites and coffee supply chain",
    validFrom: "2026-01-01", validUntil: "2027-01-01", status: "active",
    evidenceId: "certificate-file", issuerVerificationReference: "issuer-check-001",
    issuerVerifiedBy: "compliance-reviewer", issuerVerifiedAt: "2026-11-08",
  }, "2026-11-08");
  assert.equal(active.state, "active_certificate_recorded");
  assert.equal(active.claimable, false);
});
