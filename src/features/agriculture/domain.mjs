export const recordStates = Object.freeze({
  NOT_RECORDED: "not_recorded",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  NEEDS_CORRECTION: "needs_correction",
  INTERNALLY_VERIFIED: "internally_verified",
  EXTERNALLY_VERIFIED: "externally_verified",
  EXPIRED: "expired",
  NOT_APPLICABLE: "not_applicable",
  WITHHELD: "withheld",
});

export const marketObservationKinds = Object.freeze([
  "global_benchmark",
  "national_reference",
  "local_market_quote",
  "buyer_offer",
  "farm_gate_quote",
  "realised_sale",
]);

export const traceabilityEventTypes = Object.freeze([
  "harvested",
  "delivered",
  "weighed",
  "quality_checked",
  "accepted",
  "rejected",
  "stored",
  "transformed",
  "packed",
  "dispatched",
  "received",
  "sold",
  "paid",
]);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/;

export function isValidDay(value) {
  return typeof value === "string"
    && ISO_DAY.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function isValidTimestamp(value) {
  return typeof value === "string"
    && ISO_TIMESTAMP.test(value)
    && Number.isFinite(Date.parse(value));
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Converts a candidate status into a conservative assurance state.
 * External verification can only be asserted with an issuer, reference,
 * verifier date and evidence pointer. Internal approval is never external
 * certification.
 */
export function resolveAssuranceState(input = {}) {
  const status = input.status || recordStates.NOT_RECORDED;
  const today = isValidDay(input.today) ? input.today : new Date().toISOString().slice(0, 10);

  if (status === recordStates.NOT_APPLICABLE) {
    return nonEmpty(input.reason)
      ? { state: recordStates.NOT_APPLICABLE, valid: true, reason: input.reason.trim() }
      : { state: recordStates.NEEDS_CORRECTION, valid: false, issue: "Alasan tidak berlaku wajib dicatat." };
  }

  if (status === recordStates.WITHHELD) {
    return nonEmpty(input.reason)
      ? { state: recordStates.WITHHELD, valid: true, reason: input.reason.trim() }
      : { state: recordStates.NEEDS_CORRECTION, valid: false, issue: "Alasan pembatasan data wajib dicatat." };
  }

  if (status === recordStates.EXTERNALLY_VERIFIED) {
    const required = [
      ["issuer", "Penerbit atau lembaga verifikator eksternal wajib dicatat."],
      ["externalReference", "Nomor atau referensi eksternal wajib dicatat."],
      ["verifiedAt", "Tanggal verifikasi eksternal wajib dicatat."],
      ["evidenceId", "Bukti resmi wajib ditautkan."],
    ];
    const missing = required.filter(([key]) => !nonEmpty(input[key])).map(([, message]) => message);
    if (!isValidDay(input.verifiedAt) && !isValidTimestamp(input.verifiedAt)) {
      missing.push("Tanggal verifikasi eksternal harus berupa tanggal yang valid.");
    }
    if (input.expiresOn && !isValidDay(input.expiresOn)) {
      missing.push("Tanggal kedaluwarsa eksternal tidak valid.");
    }
    if (missing.length) {
      return { state: recordStates.NEEDS_CORRECTION, valid: false, issues: missing };
    }
    if (input.expiresOn && input.expiresOn < today) {
      return { state: recordStates.EXPIRED, valid: false, issue: "Bukti eksternal sudah melewati tanggal berlaku." };
    }
    return { state: recordStates.EXTERNALLY_VERIFIED, valid: true };
  }

  if (status === recordStates.INTERNALLY_VERIFIED) {
    const missing = [];
    if (!nonEmpty(input.verifierId)) missing.push("Pemeriksa internal wajib dicatat.");
    if (!isValidDay(input.verifiedAt) && !isValidTimestamp(input.verifiedAt)) {
      missing.push("Tanggal pemeriksaan internal harus berupa tanggal yang valid.");
    }
    if (!nonEmpty(input.evidenceId)) missing.push("Bukti pendukung wajib ditautkan.");
    return missing.length
      ? { state: recordStates.NEEDS_CORRECTION, valid: false, issues: missing }
      : { state: recordStates.INTERNALLY_VERIFIED, valid: true };
  }

  if (Object.values(recordStates).includes(status)) {
    return { state: status, valid: status !== recordStates.NEEDS_CORRECTION };
  }
  return { state: recordStates.NEEDS_CORRECTION, valid: false, issue: "Status assurance tidak dikenal." };
}

/**
 * A count must preserve the distinction between an actual zero and no data.
 * The caller must pass the collection state from the source workflow.
 */
export function interpretMeasure(input = {}) {
  const state = input.state || "not_collected";
  if (state === "measured") {
    if (!Number.isFinite(input.value)) {
      return { state: "needs_correction", value: null, label: "Perlu koreksi", issue: "Nilai hasil pengukuran tidak valid." };
    }
    return { state: "measured", value: input.value, label: input.value === 0 ? "Terukur: 0" : "Terukur" };
  }
  if (state === "not_applicable") {
    return nonEmpty(input.reason)
      ? { state, value: null, label: "Tidak berlaku", reason: input.reason }
      : { state: "needs_correction", value: null, label: "Perlu alasan", issue: "Alasan tidak berlaku wajib dicatat." };
  }
  if (state === "withheld") {
    return nonEmpty(input.reason)
      ? { state, value: null, label: "Dibatasi", reason: input.reason }
      : { state: "needs_correction", value: null, label: "Perlu alasan", issue: "Alasan pembatasan data wajib dicatat." };
  }
  if (state === "pending") return { state, value: null, label: "Menunggu pengukuran" };
  return { state: "not_collected", value: null, label: "Belum ada data" };
}

/**
 * A program is not active simply because a draft or offer exists.
 * All nine activation gates must be explicitly satisfied.
 */
export function evaluateProgramActivation(program = {}) {
  const missing = [];
  if (program.mandate?.status !== "signed" || !nonEmpty(program.mandate?.documentId)) {
    missing.push({ key: "mandate", label: "Surat penawaran/perjanjian/mandat tertulis belum dikonfirmasi dan diarsipkan." });
  }
  if (program.counterpart?.confirmed !== true || !nonEmpty(program.counterpart?.name)) {
    missing.push({ key: "counterpart", label: "Narahubung resmi mitra belum dikonfirmasi." });
  }
  if (!Array.isArray(program.scope?.locationIds) || program.scope.locationIds.length === 0
    || !nonEmpty(program.scope?.description)) {
    missing.push({ key: "scope", label: "Lokasi dan ruang lingkup program belum ditetapkan." });
  }
  if (program.eligibility?.approved !== true || !nonEmpty(program.eligibility?.ruleVersion)) {
    missing.push({ key: "eligibility", label: "Kriteria penerima manfaat belum ditinjau dan disahkan." });
  }
  if (program.budget?.status !== "approved" || !nonEmpty(program.budget?.currency)) {
    missing.push({ key: "budget", label: "Anggaran, mata uang dan pembatasan dana belum disahkan." });
  }
  if (!Array.isArray(program.indicators) || program.indicators.length === 0
    || !program.indicators.every((indicator) => indicator.approved === true
      && nonEmpty(indicator.code) && nonEmpty(indicator.unit) && nonEmpty(indicator.method))) {
    missing.push({ key: "results_framework", label: "Kerangka hasil dan definisi indikator belum lengkap/disetujui." });
  }
  if (program.dataProtection?.reviewed !== true
    || !nonEmpty(program.dataProtection?.purpose)
    || !nonEmpty(program.dataProtection?.sharingScope)) {
    missing.push({ key: "data_protection", label: "Tujuan pendataan dan lingkup pembagian data belum ditinjau." });
  }
  if (program.safeguarding?.reviewed !== true
    || !nonEmpty(program.safeguarding?.ownerId)
    || !nonEmpty(program.safeguarding?.reportingChannel)) {
    missing.push({ key: "safeguarding", label: "Penanggung jawab dan saluran pengaduan/perlindungan belum ditetapkan." });
  }
  if (!Array.isArray(program.deliveryTeamIds) || program.deliveryTeamIds.length === 0) {
    missing.push({ key: "delivery_team", label: "Tim pelaksana program belum ditugaskan." });
  }
  if (program.evidencePlan?.approved !== true || !Array.isArray(program.evidencePlan?.reportingDates)
    || program.evidencePlan.reportingDates.length === 0) {
    missing.push({ key: "evidence_plan", label: "Rencana bukti, jadwal monitoring dan tenggat laporan belum disetujui." });
  }

  return {
    canActivate: missing.length === 0,
    state: missing.length === 0 ? "ready_for_authorised_activation" : "preparation_incomplete",
    missing,
    message: missing.length === 0
      ? "Persyaratan administrasi awal lengkap; aktivasi tetap memerlukan persetujuan pejabat berwenang."
      : "Program belum boleh ditandai aktif. Lengkapi persyaratan yang tercantum.",
  };
}

/**
 * Mass balance is evaluated within one product form, unit, site and time window.
 * Transformations require separate input/output records; never add kilograms
 * of cherry to kilograms of green beans in the same equation.
 */
export function reconcileMassBalance(input = {}) {
  const keys = ["opening", "received", "producedIn", "shipped", "losses", "closing"];
  const missing = keys.filter((key) => !validNonNegativeNumber(input[key]));
  if (!nonEmpty(input.unit) || !nonEmpty(input.productForm) || !nonEmpty(input.locationId)) {
    missing.push("unit/productForm/locationId");
  }
  if (missing.length) {
    return { state: "incomplete", valid: false, missing };
  }
  const expectedClosing = input.opening + input.received + input.producedIn - input.shipped - input.losses;
  const variance = input.closing - expectedClosing;
  const tolerance = Number.isFinite(input.tolerance) && input.tolerance >= 0 ? input.tolerance : 0.000001;
  return {
    state: Math.abs(variance) <= tolerance ? "reconciled" : "variance",
    valid: Math.abs(variance) <= tolerance,
    expectedClosing,
    actualClosing: input.closing,
    variance,
    unit: input.unit,
    productForm: input.productForm,
    locationId: input.locationId,
  };
}

export function validateMarketObservation(input = {}) {
  const issues = [];
  if (!marketObservationKinds.includes(input.kind)) issues.push("Jenis data pasar tidak dikenal.");
  if (!nonEmpty(input.sourceName) || !nonEmpty(input.sourceReference)) issues.push("Sumber dan referensi sumber wajib dicatat.");
  if (!isValidTimestamp(input.observedAt) && !isValidDay(input.observedAt)) issues.push("Tanggal dan waktu pengamatan tidak valid.");
  if (!validNonNegativeNumber(input.value) || input.value === 0) issues.push("Harga harus berupa angka positif.");
  if (!/^[A-Z]{3}$/.test(String(input.currency || ""))) issues.push("Mata uang wajib menggunakan kode ISO tiga huruf.");
  if (!nonEmpty(input.unit) || !nonEmpty(input.grade) || !nonEmpty(input.deliveryPoint)) {
    issues.push("Satuan, mutu/grade dan titik penyerahan wajib dicatat.");
  }
  if (input.kind === "buyer_offer" && !isValidDay(input.validUntil)) {
    issues.push("Penawaran pembeli harus memiliki tanggal akhir berlaku.");
  }
  if (input.kind === "realised_sale" && !nonEmpty(input.evidenceId)) {
    issues.push("Harga realisasi wajib ditautkan ke kontrak, faktur atau bukti pembayaran.");
  }
  return { valid: issues.length === 0, issues };
}

/**
 * Validates the minimum event envelope for a traceability event. The event
 * remains a source statement until a receiving/quality authority verifies it.
 */
export function validateTraceabilityEvent(input = {}) {
  const issues = [];
  if (!nonEmpty(input.eventId)) issues.push("ID peristiwa wajib unik.");
  if (!traceabilityEventTypes.includes(input.eventType)) issues.push("Jenis peristiwa tidak dikenal.");
  if (!isValidTimestamp(input.occurredAt)) issues.push("Waktu kejadian wajib menggunakan timestamp yang valid.");
  if (!nonEmpty(input.actorId) || !nonEmpty(input.locationId)) issues.push("Pelaku dan lokasi peristiwa wajib dicatat.");
  if (!nonEmpty(input.commodityCode) || !nonEmpty(input.productForm)) issues.push("Komoditas dan bentuk produk wajib dicatat.");
  if (!validNonNegativeNumber(input.quantity) || input.quantity === 0 || !nonEmpty(input.unit)) {
    issues.push("Kuantitas positif dan satuan wajib dicatat.");
  }
  if (!Array.isArray(input.lotIds) || input.lotIds.length === 0) issues.push("Sedikitnya satu ID lot wajib ditautkan.");
  if (input.eventType === "transformed"
    && (!Array.isArray(input.inputLotIds) || input.inputLotIds.length === 0
      || !Array.isArray(input.outputLotIds) || input.outputLotIds.length === 0)) {
    issues.push("Perubahan produk harus menautkan lot masukan dan lot keluaran.");
  }
  return { valid: issues.length === 0, issues };
}
