/** Curated member interests that can be used for training and field participation matching. */
export const MEMBER_INTEREST_OPTIONS = [
  { key: "kopi", label: "Kopi" },
  { key: "budidaya-kopi", label: "Budidaya kopi" },
  { key: "pascapanen", label: "Pascapanen" },
  { key: "pemasaran", label: "Pemasaran" },
  { key: "kemasan", label: "Kemasan" },
  { key: "pelatihan", label: "Pelatihan" },
  { key: "akuntansi", label: "Akuntansi" },
  { key: "kebun-sayur", label: "Kebun sayur" },
  { key: "madu", label: "Madu" },
  { key: "administrasi", label: "Administrasi" },
] as const;

export type MemberInterestKey = (typeof MEMBER_INTEREST_OPTIONS)[number]["key"];
