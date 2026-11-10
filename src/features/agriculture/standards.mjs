import { isValidDay } from "./domain.mjs";

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * Selects the published standard version effective on a specific date.
 * A version that is now superseded can remain the correct historical version
 * for an assessment performed before its replacement date.
 */
export function selectStandardVersion(versions = [], asOfDate) {
  if (!isValidDay(asOfDate)) {
    return { state: "invalid_date", selected: null, candidates: [] };
  }
  const candidates = versions.filter((item) => {
    if (!nonEmpty(item.issuer) || !nonEmpty(item.version) || !nonEmpty(item.sourceUrl)) return false;
    if (!isValidDay(item.effectiveFrom) || item.effectiveFrom > asOfDate) return false;
    if (item.replacedOn && (!isValidDay(item.replacedOn) || item.replacedOn <= asOfDate)) return false;
    if (item.status && !["published", "superseded"].includes(item.status)) return false;
    return true;
  }).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  if (candidates.length === 0) {
    return { state: "no_effective_version", selected: null, candidates: [] };
  }
  if (candidates.length > 1 && candidates[0].effectiveFrom === candidates[1].effectiveFrom
    && candidates[0].version !== candidates[1].version) {
    return { state: "ambiguous_versions", selected: null, candidates };
  }
  return { state: "selected", selected: candidates[0], candidates };
}

/**
 * Resolves an internal control assessment without converting it into an
 * external certificate claim.
 */
export function evaluateStandardControl(control = {}, assessment = null) {
  if (!nonEmpty(control.controlId) || !nonEmpty(control.standardVersionId)) {
    return { state: "needs_correction", issue: "Kontrol harus ditautkan ke versi standar." };
  }
  if (control.applies === false) {
    if (!nonEmpty(control.applicabilityReason) || !nonEmpty(control.applicabilityReviewedBy)
      || !isValidDay(control.applicabilityReviewedAt)) {
      return { state: "applicability_unverified", issue: "Keputusan tidak berlaku memerlukan alasan dan pemeriksa." };
    }
    return { state: "not_applicable", claimable: false };
  }
  if (control.applies !== true) {
    return { state: "applicability_unresolved", claimable: false };
  }
  if (!assessment) return { state: "not_assessed", claimable: false };
  if (assessment.status === "needs_correction") {
    return { state: "needs_correction", claimable: false };
  }
  if (assessment.status === "corrective_action_open") {
    return { state: "corrective_action_open", claimable: false };
  }
  if (assessment.status === "in_progress" || assessment.status === "submitted") {
    return { state: assessment.status, claimable: false };
  }
  if (assessment.status === "internally_verified") {
    if (!nonEmpty(assessment.verifierId) || !isValidDay(assessment.verifiedAt)
      || !nonEmpty(assessment.evidenceId)) {
      return { state: "needs_correction", claimable: false, issue: "Verifikasi internal memerlukan pemeriksa, tanggal dan bukti." };
    }
    return { state: "internally_verified", claimable: false };
  }
  if (assessment.status === "externally_verified") {
    if (!nonEmpty(assessment.externalIssuer) || !nonEmpty(assessment.externalReference)
      || !isValidDay(assessment.externalVerifiedAt) || !nonEmpty(assessment.externalEvidenceId)) {
      return { state: "needs_correction", claimable: false, issue: "Pemeriksaan eksternal memerlukan penerbit, referensi, tanggal dan bukti." };
    }
    return { state: "external_assessment_recorded", claimable: false };
  }
  return { state: "needs_correction", claimable: false, issue: "Status penilaian tidak dikenal." };
}

/**
 * A certificate is only displayed as an externally verified certificate
 * record after the organisation records who checked its issuer/source.
 * This application does not issue a certificate or confer certification.
 */
export function evaluateCertificateRecord(certificate = {}, asOfDate) {
  if (!isValidDay(asOfDate)) return { state: "invalid_date", claimable: false };
  const required = [
    ["scheme", "Nama skema wajib dicatat."],
    ["issuer", "Penerbit/Certification Body wajib dicatat."],
    ["certificateNumber", "Nomor sertifikat wajib dicatat."],
    ["scope", "Ruang lingkup wajib dicatat."],
    ["validFrom", "Tanggal mulai berlaku wajib dicatat."],
    ["validUntil", "Tanggal akhir berlaku wajib dicatat."],
    ["evidenceId", "Bukti sertifikat wajib ditautkan."],
    ["issuerVerificationReference", "Referensi pemeriksaan kepada penerbit wajib dicatat."],
    ["issuerVerifiedBy", "Petugas yang memeriksa sumber penerbit wajib dicatat."],
  ];
  const missing = required.filter(([key]) => !nonEmpty(certificate[key])).map(([, label]) => label);
  if (missing.length) return { state: "incomplete_record", claimable: false, missing };
  if (!isValidDay(certificate.validFrom) || !isValidDay(certificate.validUntil)
    || certificate.validUntil < certificate.validFrom) {
    return { state: "invalid_validity_period", claimable: false };
  }
  if (!isValidDay(certificate.issuerVerifiedAt)) {
    return { state: "issuer_check_date_missing", claimable: false };
  }
  if (certificate.status === "suspended" || certificate.status === "withdrawn") {
    return { state: certificate.status, claimable: false };
  }
  if (certificate.validUntil < asOfDate) return { state: "expired", claimable: false };
  if (certificate.validFrom > asOfDate) return { state: "not_yet_valid", claimable: false };
  if (certificate.status !== "active") return { state: "status_unconfirmed", claimable: false };
  return {
    state: "active_certificate_recorded",
    claimable: false,
    notice: "Catatan sertifikat aktif telah direkam; klaim publik tetap mengikuti pemeriksaan penerbit dan ruang lingkup produk/situs.",
  };
}
