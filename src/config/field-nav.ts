import type { FieldDef } from "@/config/fields";

export interface FieldNavGroup {
  label: string;
  items: { label: string; href: string }[];
}

const SECTIONS: { key: string; label: string; group: string }[] = [
  { key: "", label: "Dashboard Bidang", group: "Ringkasan" },
  { key: "profil-mandat", label: "Profil & Mandat", group: "Ringkasan" },
  { key: "rencana", label: "Rencana Kerja", group: "Perencanaan" },
  { key: "kegiatan", label: "Program & Kegiatan", group: "Program & Kegiatan" },
  { key: "tugas", label: "Tugas & Kolaborasi", group: "Tugas & Tim" },
  { key: "tim", label: "Manajemen Tim", group: "Tugas & Tim" },
  { key: "data", label: "Data Operasional", group: "Data Operasional" },
  { key: "katalog", label: "Katalog Produk", group: "Produk & Persediaan" },
  { key: "persediaan", label: "Gudang & Persediaan", group: "Produk & Persediaan" },
  { key: "formulir", label: "Formulir & Pendataan", group: "Formulir" },
  { key: "pengajuan", label: "Pengajuan Keanggotaan", group: "Formulir" },
  { key: "dokumen", label: "Dokumen & Bukti", group: "Dokumen" },
  { key: "anggaran", label: "Anggaran & Realisasi", group: "Anggaran" },
  { key: "laporan", label: "Laporan & Evaluasi", group: "Laporan" },
  { key: "pengaturan", label: "Pengaturan Bidang", group: "Pengaturan" },
];

export const FIELD_SECTION_KEYS = SECTIONS.map((s) => s.key).filter(Boolean);

/** Standard set of grouped sidebar items for one bidang app (Blueprint §8.4). */
export function fieldNav(field: FieldDef): FieldNavGroup[] {
  const base = field.appHref;
  const groups = new Map<string, { label: string; href: string }[]>();
  const visibleSections = SECTIONS.filter((section) => {
    if (section.key === "pengajuan") return field.slug === "organisasi";
    if (section.key === "katalog" || section.key === "persediaan") return field.slug === "usaha";
    return true;
  });

  for (const s of visibleSections) {
    const arr = groups.get(s.group) ?? [];
    arr.push({ label: s.label, href: s.key ? `${base}/${s.key}` : base });
    groups.set(s.group, arr);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}
