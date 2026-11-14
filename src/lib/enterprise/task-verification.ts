export const taskVerificationStatuses = [
  "Belum diajukan",
  "Menunggu verifikasi",
  "Terverifikasi",
  "Perlu perbaikan",
] as const;

export type TaskVerificationStatus = (typeof taskVerificationStatuses)[number];

export type TaskVerificationInput = {
  role: string;
  previousVerification?: string;
  previousStatus?: string;
  previousReviewNote?: string;
  verification: string;
  status: string;
  completionEvidence?: string;
  attachmentId?: string;
  reviewNote?: string;
};

/**
 * Enforce the hand-off between execution and leadership review.
 * Coordinators submit results; the Secretariat performs the administrative
 * verification. The Chair approves report packages rather than each task row.
 */
export function taskVerificationError(input: TaskVerificationInput): string | null {
  const reviewer = input.role === "sekretaris";
  const valid = taskVerificationStatuses.includes(
    input.verification as TaskVerificationStatus,
  );
  if (!valid) return "Status verifikasi hasil tidak valid.";

  if (!reviewer) {
    if (input.previousVerification === "Terverifikasi") {
      return "Tugas yang sudah diverifikasi hanya dapat dibuka kembali melalui pemeriksaan Sekretariat.";
    }
    if (["Terverifikasi", "Perlu perbaikan"].includes(input.verification)) {
      return "Hanya Sekretariat yang dapat mengesahkan hasil atau meminta perbaikan.";
    }
    if ((input.reviewNote || "") !== (input.previousReviewNote || "")) {
      return "Catatan pemeriksaan hanya dapat diubah oleh Sekretariat.";
    }
  }

  const hasEvidence =
    Boolean((input.completionEvidence || "").trim()) ||
    Boolean((input.attachmentId || "").trim());

  if (input.verification === "Menunggu verifikasi" || input.verification === "Terverifikasi") {
    if (input.status !== "Selesai") {
      return "Selesaikan pekerjaan terlebih dahulu sebelum mengajukan hasil untuk verifikasi.";
    }
    if (!hasEvidence) {
      return "Isi hasil pelaksanaan atau lampirkan bukti sebelum mengajukan verifikasi.";
    }
  }

  if (input.verification === "Terverifikasi" && !reviewer) {
    return "Hanya Sekretariat yang dapat mengesahkan hasil.";
  }

  if (input.verification === "Perlu perbaikan") {
    if (input.status === "Selesai") {
      return "Ubah status pekerjaan menjadi Berjalan sebelum meminta perbaikan.";
    }
    if (!(input.reviewNote || "").trim()) {
      return "Tuliskan alasan dan arahan perbaikan agar pelaksana mengetahui tindakan berikutnya.";
    }
  }

  // Keep pre-existing completed records readable during the transition.
  // New work cannot be marked complete without submitting its result.
  if (
    input.status === "Selesai" &&
    input.verification === "Belum diajukan" &&
    input.previousStatus !== "Selesai"
  ) {
    return "Hasil harus diajukan untuk verifikasi sebelum tugas dapat ditandai selesai.";
  }

  return null;
}
