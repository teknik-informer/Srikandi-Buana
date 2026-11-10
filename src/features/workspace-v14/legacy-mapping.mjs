const PARTNER_STAGES = new Set([
  "reference", "initial_contact", "training_of_trainers", "documents_pending",
  "proposal_received", "proposal_preparation", "proposal_submitted", "negotiation",
  "agreement_signed", "ready_for_activation", "active", "completed", "declined", "paused",
]);

const dateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};

const isoDate = (value) => {
  const date = dateOnly(value);
  return date ? date + "T00:00:00.000Z" : null;
};

const text = (value, max = 5000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const json = (value) => JSON.stringify(value && typeof value === "object" ? value : {});

export function mapLegacyRecordToV14(kind, raw) {
  const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  if (kind === "anggota") {
    const consent = data.dataConsent === "Setuju" ? "granted"
      : data.dataConsent === "Tidak setuju" ? "declined"
      : data.dataConsent === "Perlu penjelasan" ? "needs_clarification"
      : "not_requested";
    const verified = data.verification === "Terverifikasi";
    const active = consent === "granted" && verified && data.status === "Aktif";
    return {
      domain: "member_profiles",
      values: {
        displayName: text(data.name, 180) || "Nama belum diverifikasi",
        preferredName: text(data.preferredName, 160) || null,
        village: text(data.village || data.dusun, 180) || null,
        phone: text(data.phone, 40) || null,
        membershipStatus: active ? "active" : data.status === "Tidak aktif" ? "inactive" : "pending_verification",
        identityVerificationStatus: verified ? "verified" : "not_collected",
        dataConsentStatus: consent,
        dataNoticeVersion: text(data.dataNoticeVersion, 80) || null,
        photoConsentStatus: data.photoConsent === "Setuju sesuai tujuan" ? "granted" : data.photoConsent === "Tidak setuju" ? "declined" : "not_requested",
        profileData: data,
      },
    };
  }

  if (kind === "kemitraan") {
    const stage = PARTNER_STAGES.has(String(data.relationshipStage || data.interactionStage))
      ? String(data.relationshipStage || data.interactionStage) : "reference";
    return {
      domain: "partner_organizations",
      values: {
        displayName: text(data.partnerName || data.name, 180) || "Mitra belum diverifikasi",
        website: text(data.officialWebsite, 500) || null,
        relationshipStage: stage,
        relationshipStatus: "pre_agreement",
        officialContactConfirmed: data.counterpartConfirmed === "Ya",
        contactData: data,
      },
    };
  }

  if (kind === "program") {
    return {
      domain: "programmes",
      values: {
        name: text(data.name, 220) || text(data.programId, 120) || "Program belum diverifikasi",
        programmeCode: text(data.programId, 120) || null,
        purpose: text(data.notes, 5000) || null,
        lifecycleStatus: "preparation",
        agreementStatus: "not_received",
        metadata: data,
      },
    };
  }

  if (kind === "kegiatan") {
    const status = data.status === "Selesai" ? "completed"
      : data.status === "Berjalan" ? "in_progress"
      : data.status === "Dibatalkan" ? "cancelled"
      : data.status === "Ditunda" ? "postponed"
      : data.status === "Terjadwal" ? "scheduled"
      : "planned";
    const startsAt = isoDate(String(data.date || ""));
    const endsDate = dateOnly(String(data.endDate || ""));
    return {
      domain: "activities",
      values: {
        title: text(data.name, 220) || "Kegiatan tanpa judul",
        activityType: text(data.formPreset, 80) || "other",
        description: text(data.description || data.topics || "", 5000),
        startsAt,
        endsAt: endsDate ? endsDate + "T23:59:59.000Z" : null,
        location: text(data.location, 240) || null,
        status,
        resultSummary: text(data.result || data.learningNotes || "", 5000) || null,
        evidence: [data.fileId, data.attachmentId, data.attendanceEvidenceId, data.photoEvidenceId, data.reportEvidenceId]
          .filter((value) => typeof value === "string" && value.trim() !== ""),
        metadata: data,
      },
    };
  }

  if (kind === "tindaklanjut") {
    const status = data.status === "Selesai" ? "completed"
      : data.status === "Berjalan" ? "in_progress"
      : data.status === "Menunggu verifikasi" ? "waiting_review"
      : data.status === "Terhambat" || data.status === "Ditunda" ? "blocked"
      : "not_started";
    return {
      domain: "tasks",
      values: {
        title: text(data.name, 240) || "Tugas tanpa judul",
        description: text(data.notes || data.reason, 5000),
        priority: data.priority === "Tinggi" ? "high" : data.priority === "Mendesak" ? "urgent" : data.priority === "Rendah" ? "low" : "normal",
        status,
        dueAt: isoDate(String(data.dueDate || "")),
        completedAt: status === "completed" ? isoDate(String(data.completedAt || data.dueDate || "")) : null,
        completionSummary: text(data.completionEvidence || data.actualResult, 5000) || null,
        evidence: [data.attachmentId, data.evidenceId].filter((value) => typeof value === "string" && value.trim() !== ""),
        metadata: data,
      },
    };
  }

  if (kind === "register") {
    const status = data.documentStatus === "Diminta" ? "requested"
      : data.documentStatus === "Dijanjikan" ? "promised"
      : data.documentStatus === "Diterima" ? "received"
      : data.documentStatus === "Tidak berlaku" ? "withdrawn"
      : "version_review";
    return {
      domain: "documents",
      values: {
        title: text(data.documentTitle || data.name, 240) || "Dokumen tanpa judul",
        documentType: text(data.documentType, 80) || "other",
        sourceParty: text(data.partnerName || data.sourcePerson, 180) || null,
        sourceVersion: text(data.versionOrDate, 120) || null,
        documentStatus: status,
        verificationStatus: "unverified",
        privateFileId: text(data.fileId || data.attachmentId, 180) || null,
        mimeType: text(data.mime, 120) || null,
        metadata: data,
      },
    };
  }

  return null;
}

export const v14LegacyDate = dateOnly;
