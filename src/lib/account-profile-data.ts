export type EducationEntry = { institution: string; level: string; field: string; startYear: string; endYear: string; description: string };
export type ExperienceEntry = { organization: string; title: string; location: string; startDate: string; endDate: string; current: boolean; description: string };
export type LanguageEntry = { language: string; proficiency: string };
export type CertificationEntry = { name: string; issuer: string; year: string; description: string };
export type ProfileAddress = {
  street: string; rt: string; rw: string;
  provinceCode: string; provinceName: string;
  regencyCode: string; regencyName: string;
  districtCode: string; districtName: string;
  villageCode: string; villageName: string;
  postalCode: string;
};
export type AccountCV = {
  personal: { preferredName: string; birthPlace: string; birthDate: string; gender: string; nationality: string };
  contact: { phone: string; secondaryPhone: string; emailSecondary: string; whatsapp: string; website: string; linkedin: string };
  address: ProfileAddress;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  volunteer: ExperienceEntry[];
  skills: string[];
  hobbies: string[];
  languages: LanguageEntry[];
  certifications: CertificationEntry[];
};
export type PrivateProfileInput = {
  nik: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  nikConsent: boolean;
  bankConsent: boolean;
};
export type PrivateProfileSummary = {
  hasNik: boolean;
  nikMasked: string;
  nikConsent: boolean;
  hasBankAccount: boolean;
  bankName: string;
  accountHolder: string;
  accountNumberMasked: string;
  bankConsent: boolean;
};

export const emptyAddress: ProfileAddress = {
  street: "", rt: "", rw: "",
  provinceCode: "", provinceName: "",
  regencyCode: "", regencyName: "",
  districtCode: "", districtName: "",
  villageCode: "", villageName: "",
  postalCode: "",
};
export const emptyAccountCV: AccountCV = {
  personal: { preferredName: "", birthPlace: "", birthDate: "", gender: "", nationality: "Indonesia" },
  contact: { phone: "", secondaryPhone: "", emailSecondary: "", whatsapp: "", website: "", linkedin: "" },
  address: emptyAddress,
  summary: "",
  education: [],
  experience: [],
  volunteer: [],
  skills: [],
  hobbies: [],
  languages: [],
  certifications: [],
};
export const emptyPrivateProfile: PrivateProfileInput = {
  nik: "", bankName: "", accountHolder: "", accountNumber: "",
  nikConsent: false, bankConsent: false,
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max: number, label: string) => {
  if (typeof value !== "string") return "";
  const result = value.normalize("NFC").trim().replace(/\r/g, "");
  if (result.length > max) throw new Error(label + " maksimal " + max + " karakter.");
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(result)) throw new Error(label + " mengandung karakter yang tidak diizinkan.");
  return result;
};
const list = <T>(value: unknown, max: number, label: string, map: (item: unknown) => T): T[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) throw new Error(label + " tidak valid atau melebihi batas.");
  return value.map(map);
};
const year = (value: unknown, label: string) => {
  const result = text(value, 4, label);
  if (result && !/^\d{4}$/.test(result)) throw new Error(label + " harus berupa tahun empat digit.");
  if (result && (Number(result) < 1900 || Number(result) > new Date().getFullYear() + 10)) throw new Error(label + " berada di luar rentang yang wajar.");
  return result;
};
const date = (value: unknown, label: string) => {
  const result = text(value, 10, label);
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0,10) !== result)) {
    throw new Error(label + " tidak valid.");
  }
  return result;
};
const url = (value: unknown, label: string) => {
  const result = text(value, 300, label);
  if (!result) return "";
  let parsed: URL;
  try { parsed = new URL(result); } catch { throw new Error(label + " harus menggunakan URL lengkap."); }
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(label + " harus berupa tautan web yang valid.");
  return parsed.toString();
};

export function normalizeAccountCV(value: unknown, fallbackPhone = ""): AccountCV {
  const raw = record(value);
  const personal = record(raw.personal);
  const contact = record(raw.contact);
  const address = record(raw.address);
  const education = list(raw.education, 12, "Riwayat pendidikan", item => {
    const row = record(item);
    return {
      institution: text(row.institution, 140, "Nama institusi"),
      level: text(row.level, 60, "Jenjang pendidikan"),
      field: text(row.field, 120, "Jurusan / bidang"),
      startYear: year(row.startYear, "Tahun mulai pendidikan"),
      endYear: year(row.endYear, "Tahun selesai pendidikan"),
      description: text(row.description, 700, "Keterangan pendidikan"),
    };
  });
  const experienceMap = (item: unknown): ExperienceEntry => {
    const row = record(item);
    return {
      organization: text(row.organization, 140, "Nama instansi / organisasi"),
      title: text(row.title, 120, "Jabatan / posisi"),
      location: text(row.location, 120, "Lokasi pengalaman"),
      startDate: date(row.startDate, "Tanggal mulai pengalaman"),
      endDate: date(row.endDate, "Tanggal selesai pengalaman"),
      current: row.current === true,
      description: text(row.description, 900, "Uraian pengalaman"),
    };
  };
  const experience = list(raw.experience, 20, "Pengalaman kerja", experienceMap);
  const volunteer = list(raw.volunteer, 20, "Pengalaman organisasi", experienceMap);
  const languages = list(raw.languages, 12, "Bahasa", item => {
    const row = record(item);
    const proficiency = text(row.proficiency, 40, "Tingkat kemampuan bahasa");
    if (proficiency && !["Dasar", "Menengah", "Mahir", "Penutur asli"].includes(proficiency)) throw new Error("Tingkat kemampuan bahasa tidak valid.");
    return { language: text(row.language, 80, "Nama bahasa"), proficiency };
  });
  const certifications = list(raw.certifications, 20, "Sertifikasi dan pelatihan", item => {
    const row = record(item);
    return {
      name: text(row.name, 140, "Nama sertifikasi / pelatihan"),
      issuer: text(row.issuer, 140, "Penyelenggara sertifikasi"),
      year: year(row.year, "Tahun sertifikasi"),
      description: text(row.description, 700, "Keterangan sertifikasi"),
    };
  });
  const splitTags = (items: unknown, label: string, max: number) => {
    const values = Array.isArray(items) ? items : typeof items === "string" ? items.split(",") : [];
    if (values.length > max) throw new Error(label + " maksimal " + max + " item.");
    return [...new Set(values.map(item => text(item, 80, label)).filter(Boolean))];
  };
  const phone = text(contact.phone ?? fallbackPhone, 30, "Nomor telepon");
  if (phone && !/^\+?[0-9 ()-]{7,25}$/.test(phone)) throw new Error("Nomor telepon utama tidak valid.");
  const secondaryPhone = text(contact.secondaryPhone, 30, "Nomor telepon alternatif");
  if (secondaryPhone && !/^\+?[0-9 ()-]{7,25}$/.test(secondaryPhone)) throw new Error("Nomor telepon alternatif tidak valid.");
  const emailSecondary = text(contact.emailSecondary, 180, "Email alternatif");
  if (emailSecondary && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSecondary)) throw new Error("Email alternatif tidak valid.");
  const profileAddress: ProfileAddress = {
    street: text(address.street, 240, "Jalan / alamat detail"),
    rt: text(address.rt, 3, "RT"),
    rw: text(address.rw, 3, "RW"),
    provinceCode: text(address.provinceCode, 20, "Kode provinsi"),
    provinceName: text(address.provinceName, 100, "Provinsi"),
    regencyCode: text(address.regencyCode, 24, "Kode kabupaten/kota"),
    regencyName: text(address.regencyName, 120, "Kabupaten / kota"),
    districtCode: text(address.districtCode, 28, "Kode kecamatan"),
    districtName: text(address.districtName, 120, "Kecamatan"),
    villageCode: text(address.villageCode, 32, "Kode desa/kelurahan"),
    villageName: text(address.villageName, 120, "Desa / kelurahan"),
    postalCode: text(address.postalCode, 8, "Kode pos"),
  };
  for (const [code,label] of [
    [profileAddress.regencyCode,"Kabupaten/kota"],
    [profileAddress.districtCode,"Kecamatan"],
    [profileAddress.villageCode,"Desa/kelurahan"],
  ] as const) if (code && !profileAddress.provinceCode) throw new Error("Pilih provinsi sebelum " + label + ".");
  if (profileAddress.districtCode && !profileAddress.regencyCode) throw new Error("Pilih kabupaten/kota sebelum kecamatan.");
  if (profileAddress.villageCode && !profileAddress.districtCode) throw new Error("Pilih kecamatan sebelum desa/kelurahan.");
  if (profileAddress.postalCode && !/^\d{5}$/.test(profileAddress.postalCode)) throw new Error("Kode pos harus lima digit.");
  if (profileAddress.rt && !/^\d{1,3}$/.test(profileAddress.rt)) throw new Error("RT harus berupa angka.");
  if (profileAddress.rw && !/^\d{1,3}$/.test(profileAddress.rw)) throw new Error("RW harus berupa angka.");
  return {
    personal: {
      preferredName: text(personal.preferredName, 80, "Nama panggilan"),
      birthPlace: text(personal.birthPlace, 100, "Tempat lahir"),
      birthDate: date(personal.birthDate, "Tanggal lahir"),
      gender: text(personal.gender, 30, "Jenis kelamin"),
      nationality: text(personal.nationality || "Indonesia", 80, "Kewarganegaraan"),
    },
    contact: {
      phone,
      secondaryPhone,
      emailSecondary,
      whatsapp: text(contact.whatsapp, 30, "WhatsApp"),
      website: url(contact.website, "Website / portofolio"),
      linkedin: url(contact.linkedin, "Profil LinkedIn"),
    },
    address: profileAddress,
    summary: text(raw.summary, 1600, "Ringkasan profil"),
    education,
    experience,
    volunteer,
    skills: splitTags(raw.skills, "Keahlian", 30),
    hobbies: splitTags(raw.hobbies, "Hobi / minat", 20),
    languages,
    certifications,
  };
}

export function normalizePrivateProfileInput(value: unknown) {
  const raw = record(value);
  const nik = text(raw.nik, 16, "NIK");
  const bankName = text(raw.bankName, 100, "Nama bank");
  const accountHolder = text(raw.accountHolder, 100, "Nama pemilik rekening");
  const accountNumber = text(raw.accountNumber, 24, "Nomor rekening");
  if (nik && !/^\d{16}$/.test(nik)) throw new Error("NIK harus 16 digit angka.");
  if (accountNumber && !/^\d{6,24}$/.test(accountNumber)) throw new Error("Nomor rekening harus 6–24 digit angka.");
  if (accountNumber && (!bankName || !accountHolder)) throw new Error("Nama bank dan nama pemilik wajib diisi bila nomor rekening diisi.");
  return {
    nik,
    bankName,
    accountHolder,
    accountNumber,
    nikConsent: raw.nikConsent === true,
    bankConsent: raw.bankConsent === true,
  };
}


/**
 * A deliberately minimized, non-sensitive snapshot for authorized member-facing
 * workflows. Never include NIK, bank account, birth date, gender, personal email,
 * phone, website, LinkedIn, or raw free-text CV narratives in this projection.
 * Domain modules may use these signals to prepare a review, never to auto-approve
 * a programme, asset allocation, loan, salary, allowance, or payment.
 */
export function deriveMemberOperationalProfile(cv: AccountCV) {
  return {
    schemaVersion: 1,
    preferredName: cv.personal.preferredName,
    skills: cv.skills,
    education: cv.education.map(({ level, field, startYear, endYear }) => ({
      level, field, startYear, endYear,
    })),
    experience: cv.experience.map(({ organization, title, current, startDate, endDate }) => ({
      organization, title, current, startDate, endDate,
    })),
    volunteer: cv.volunteer.map(({ organization, title, current, startDate, endDate }) => ({
      organization, title, current, startDate, endDate,
    })),
    languages: cv.languages,
    certifications: cv.certifications.map(({ name, issuer, year }) => ({ name, issuer, year })),
    interests: cv.hobbies,
  };
}
