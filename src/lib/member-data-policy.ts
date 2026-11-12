export type MemberData = Record<string, unknown>;
export type ConsentRecord = { data?: unknown } | unknown;

function asObject(value: unknown): MemberData | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as MemberData
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as MemberData
    : null;
}

function normalizedName(value: unknown): string {
  return String(value ?? "").trim().normalize("NFKC").toLocaleLowerCase("id-ID");
}

/**
 * A member's summary flag is not proof by itself. The detailed consent record
 * must match the member name and explicitly record date, purpose and consent.
 */
export function hasDocumentedMemberConsent(
  memberName: string,
  records: ConsentRecord[],
): boolean {
  const expected = normalizedName(memberName);
  if (!expected) return false;
  return records.some((record) => {
    const wrapper = asObject(record);
    const data = asObject(wrapper && "data" in wrapper ? wrapper.data : record);
    return !!data
      && normalizedName(data.name) === expected
      && String(data.status) === "Setuju untuk tujuan tercatat"
      && /^\d{4}-\d{2}-\d{2}$/.test(String(data.date ?? ""))
      && !!String(data.purpose ?? "").trim();
  });
}

/**
 * Initial member records require a separate, matching consent record.
 * When consent is renewed, active membership requires verified data.
 * Withdrawing consent may be recorded, but the member must no longer remain
 * active or verified; existing identity details are retained, not rewritten.
 */
export function memberRecordPolicyError(
  data: MemberData,
  previousData?: MemberData,
): string | null {
  const consent = String(data.consent ?? "Belum dikonfirmasi");
  const status = String(data.status ?? "Perlu verifikasi");
  const verification = String(data.verification ?? "Perlu verifikasi");

  if (!previousData && consent !== "Terdokumentasi") {
    return "Catat persetujuan pendataan di menu Persetujuan Data sebelum menambahkan anggota.";
  }

  if (status === "Aktif" && consent !== "Terdokumentasi") {
    return "Anggota hanya dapat berstatus Aktif selama persetujuan pendataan masih terdokumentasi.";
  }

  if (verification === "Terverifikasi" && consent !== "Terdokumentasi") {
    return "Verifikasi data memerlukan persetujuan pendataan yang masih berlaku.";
  }

  if (status === "Aktif" && verification !== "Terverifikasi") {
    return "Verifikasi data anggota terlebih dahulu sebelum menetapkan status Aktif.";
  }

  if (previousData && consent !== "Terdokumentasi") {
    const personalFields = ["name", "dusun", "phone", "role", "potential"];
    const changed = personalFields.some((key) =>
      String(data[key] ?? "") !== String(previousData[key] ?? "")
    );
    if (changed) {
      return "Perbarui identitas hanya setelah persetujuan pendataan diperbarui. Saat persetujuan ditarik, ubah status ke Tidak aktif atau Mengundurkan diri dan simpan riwayatnya.";
    }
  }

  return null;
}

/** Account activation is stricter than keeping a historic membership record. */
export function memberAccountInvitationError(data: MemberData): string | null {
  if (String(data.consent ?? "") !== "Terdokumentasi") {
    return "Undangan akun memerlukan catatan persetujuan pendataan yang masih terdokumentasi.";
  }
  if (!hasDocumentedMemberConsent(String(data.name ?? ""), [])) {
    // The detailed consent record is verified separately by the route handler.
  }
  if (String(data.status ?? "") !== "Aktif" || String(data.verification ?? "") !== "Terverifikasi") {
    return "Verifikasi data anggota dan tetapkan status Aktif sebelum membuat undangan.";
  }
  return null;
}
