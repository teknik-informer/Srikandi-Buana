export type SecretariatTemplateCode =
  | "TPL-SK"
  | "TPL-UND"
  | "TPL-KEL"
  | "TPL-NOT"
  | "TPL-LAP"
  | "TPL-SPR";

export type SecretariatDocumentCategory = "SK" | "Laporan" | "SOP" | "Surat" | "Notulen" | "Publikasi";

export interface SecretariatTemplateField {
  key: string;
  label: string;
  type: "text" | "date" | "time" | "textarea";
  required: boolean;
  maxLength: number;
  placeholder: string;
  rows?: number;
}

export interface SecretariatTemplateSection {
  title: string;
  fields: string[];
}

export interface SecretariatTemplateDefinition {
  code: SecretariatTemplateCode;
  name: string;
  purpose: string;
  category: SecretariatDocumentCategory;
  documentHeading: string;
  fields: SecretariatTemplateField[];
  sections: SecretariatTemplateSection[];
}

export interface GeneratedDocumentField {
  key: string;
  label: string;
  value: string;
  type: SecretariatTemplateField["type"];
}

export interface GeneratedDocumentContent {
  version: 1;
  templateCode: SecretariatTemplateCode;
  templateName: string;
  documentHeading: string;
  title: string;
  documentNumber: string | null;
  documentDate: string;
  ownerLabel: string;
  organization: {
    legalName: string;
    shortName: string;
    address: string | null;
  };
  source?: {
    kind: "meeting" | "minutes" | "letter" | "field_activity" | "field_program";
    id: string;
    reference: string | null;
    fieldKey?: string | null;
  };
  groups: Array<{
    title: string;
    fields: GeneratedDocumentField[];
  }>;
}

export const SECRETARIAT_TEMPLATES: SecretariatTemplateDefinition[] = [
  {
    code: "TPL-SK",
    name: "Surat keputusan",
    purpose: "Penetapan pengurus, bidang, atau kepanitiaan",
    category: "SK",
    documentHeading: "SURAT KEPUTUSAN",
    fields: [
      { key: "tentang", label: "Tentang", type: "text", required: true, maxLength: 240, placeholder: "Pokok penetapan keputusan" },
      { key: "menimbang", label: "Menimbang", type: "textarea", required: true, maxLength: 3000, rows: 3, placeholder: "Uraikan alasan dan pertimbangan penerbitan keputusan." },
      { key: "mengingat", label: "Mengingat", type: "textarea", required: false, maxLength: 3000, rows: 3, placeholder: "Dasar atau ketentuan yang benar-benar menjadi rujukan." },
      { key: "menetapkan", label: "Isi penetapan", type: "textarea", required: true, maxLength: 4000, rows: 5, placeholder: "Tuliskan keputusan, penanggung jawab, masa tugas, atau ketentuan yang ditetapkan." },
      { key: "ditetapkan_di", label: "Tempat penetapan", type: "text", required: true, maxLength: 120, placeholder: "Tempat penetapan" },
      { key: "penandatangan", label: "Nama penandatangan", type: "text", required: true, maxLength: 160, placeholder: "Nama sesuai kewenangan" },
      { key: "jabatan_penandatangan", label: "Jabatan penandatangan", type: "text", required: true, maxLength: 120, placeholder: "Jabatan resmi penandatangan" },
    ],
    sections: [
      { title: "Pokok keputusan", fields: ["tentang"] },
      { title: "Pertimbangan dan dasar", fields: ["menimbang", "mengingat"] },
      { title: "Isi keputusan", fields: ["menetapkan"] },
      { title: "Pengesahan", fields: ["ditetapkan_di", "penandatangan", "jabatan_penandatangan"] },
    ],
  },
  {
    code: "TPL-UND",
    name: "Undangan rapat",
    purpose: "Mengundang pengurus atau anggota untuk menghadiri rapat",
    category: "Surat",
    documentHeading: "SURAT UNDANGAN",
    fields: [
      { key: "penerima", label: "Kepada / penerima", type: "text", required: true, maxLength: 200, placeholder: "Nama, jabatan, atau kelompok penerima" },
      { key: "perihal", label: "Perihal", type: "text", required: true, maxLength: 240, placeholder: "Undangan rapat ..." },
      { key: "nama_agenda", label: "Nama rapat / agenda", type: "text", required: true, maxLength: 240, placeholder: "Nama rapat atau kegiatan" },
      { key: "hari_tanggal", label: "Tanggal pelaksanaan", type: "date", required: true, maxLength: 10, placeholder: "" },
      { key: "waktu", label: "Waktu", type: "text", required: true, maxLength: 120, placeholder: "Mis. 09.00 WIB sampai selesai" },
      { key: "tempat", label: "Tempat", type: "text", required: true, maxLength: 240, placeholder: "Lokasi rapat" },
      { key: "agenda_pembahasan", label: "Agenda pembahasan", type: "textarea", required: true, maxLength: 3000, rows: 4, placeholder: "Tuliskan pokok pembahasan, satu butir per baris." },
      { key: "catatan", label: "Catatan tambahan", type: "textarea", required: false, maxLength: 1200, rows: 2, placeholder: "Keterangan yang perlu diketahui penerima." },
      { key: "penandatangan", label: "Nama penandatangan", type: "text", required: true, maxLength: 160, placeholder: "Nama penandatangan" },
      { key: "jabatan_penandatangan", label: "Jabatan penandatangan", type: "text", required: true, maxLength: 120, placeholder: "Jabatan" },
    ],
    sections: [
      { title: "Tujuan undangan", fields: ["penerima", "perihal"] },
      { title: "Waktu dan tempat", fields: ["nama_agenda", "hari_tanggal", "waktu", "tempat"] },
      { title: "Agenda pembahasan", fields: ["agenda_pembahasan", "catatan"] },
      { title: "Penandatangan", fields: ["penandatangan", "jabatan_penandatangan"] },
    ],
  },
  {
    code: "TPL-KEL",
    name: "Surat keluar resmi",
    purpose: "Korespondensi kepada pemerintah, mitra, lembaga, atau pihak lain",
    category: "Surat",
    documentHeading: "SURAT RESMI",
    fields: [
      { key: "tujuan", label: "Tujuan surat", type: "text", required: true, maxLength: 200, placeholder: "Nama instansi atau penerima" },
      { key: "alamat_tujuan", label: "Alamat tujuan", type: "textarea", required: false, maxLength: 500, rows: 2, placeholder: "Alamat penerima, jika diperlukan." },
      { key: "perihal", label: "Perihal", type: "text", required: true, maxLength: 240, placeholder: "Pokok surat" },
      { key: "salam_pembuka", label: "Salam pembuka", type: "textarea", required: false, maxLength: 500, rows: 2, placeholder: "Contoh: Dengan hormat," },
      { key: "isi_surat", label: "Isi surat", type: "textarea", required: true, maxLength: 5000, rows: 8, placeholder: "Tuliskan isi surat secara lengkap dan jelas." },
      { key: "lampiran", label: "Lampiran", type: "text", required: false, maxLength: 160, placeholder: "Mis. 1 berkas atau nihil" },
      { key: "penandatangan", label: "Nama penandatangan", type: "text", required: true, maxLength: 160, placeholder: "Nama penandatangan" },
      { key: "jabatan_penandatangan", label: "Jabatan penandatangan", type: "text", required: true, maxLength: 120, placeholder: "Jabatan" },
    ],
    sections: [
      { title: "Tujuan surat", fields: ["tujuan", "alamat_tujuan"] },
      { title: "Perihal dan isi", fields: ["perihal", "salam_pembuka", "isi_surat", "lampiran"] },
      { title: "Penandatangan", fields: ["penandatangan", "jabatan_penandatangan"] },
    ],
  },
  {
    code: "TPL-NOT",
    name: "Notulen rapat",
    purpose: "Pencatatan jalannya rapat, pembahasan, keputusan, dan tindak lanjut",
    category: "Notulen",
    documentHeading: "NOTULEN RAPAT",
    fields: [
      { key: "nama_rapat", label: "Nama rapat", type: "text", required: true, maxLength: 240, placeholder: "Nama rapat" },
      { key: "tanggal_rapat", label: "Tanggal rapat", type: "date", required: true, maxLength: 10, placeholder: "" },
      { key: "waktu_rapat", label: "Waktu", type: "text", required: true, maxLength: 120, placeholder: "Waktu mulai dan selesai" },
      { key: "tempat_rapat", label: "Tempat", type: "text", required: true, maxLength: 240, placeholder: "Lokasi rapat" },
      { key: "pimpinan_rapat", label: "Pimpinan rapat", type: "text", required: true, maxLength: 160, placeholder: "Nama pimpinan rapat" },
      { key: "notulis", label: "Notulis", type: "text", required: true, maxLength: 160, placeholder: "Nama pencatat rapat" },
      { key: "peserta", label: "Peserta", type: "textarea", required: true, maxLength: 2500, rows: 3, placeholder: "Nama peserta atau rujukan daftar hadir." },
      { key: "agenda", label: "Agenda", type: "textarea", required: true, maxLength: 2500, rows: 3, placeholder: "Pokok agenda rapat." },
      { key: "pembahasan", label: "Ringkasan pembahasan", type: "textarea", required: true, maxLength: 5000, rows: 6, placeholder: "Catat pembahasan secara ringkas dan objektif." },
      { key: "keputusan", label: "Keputusan rapat", type: "textarea", required: true, maxLength: 4000, rows: 5, placeholder: "Tuliskan keputusan yang benar-benar disepakati." },
      { key: "tindak_lanjut", label: "Tindak lanjut", type: "textarea", required: false, maxLength: 3000, rows: 3, placeholder: "Tugas, penanggung jawab, dan tenggat jika sudah disepakati." },
    ],
    sections: [
      { title: "Identitas rapat", fields: ["nama_rapat", "tanggal_rapat", "waktu_rapat", "tempat_rapat"] },
      { title: "Pimpinan dan peserta", fields: ["pimpinan_rapat", "notulis", "peserta"] },
      { title: "Agenda dan pembahasan", fields: ["agenda", "pembahasan"] },
      { title: "Keputusan dan tindak lanjut", fields: ["keputusan", "tindak_lanjut"] },
    ],
  },
  {
    code: "TPL-LAP",
    name: "Laporan kegiatan",
    purpose: "Pencatatan pelaksanaan kegiatan dan hasil yang dapat dipertanggungjawabkan",
    category: "Laporan",
    documentHeading: "LAPORAN KEGIATAN",
    fields: [
      { key: "nama_kegiatan", label: "Nama kegiatan", type: "text", required: true, maxLength: 240, placeholder: "Nama kegiatan" },
      { key: "program", label: "Program / bidang terkait", type: "text", required: false, maxLength: 240, placeholder: "Program atau bidang, bila ada" },
      { key: "periode_kegiatan", label: "Tanggal / periode kegiatan", type: "text", required: true, maxLength: 120, placeholder: "Tanggal kegiatan atau rentang periode laporan" },
      { key: "tempat_kegiatan", label: "Tempat", type: "text", required: false, maxLength: 240, placeholder: "Lokasi kegiatan bila tersedia" },
      { key: "jumlah_peserta", label: "Jumlah peserta", type: "text", required: false, maxLength: 80, placeholder: "Isi sesuai daftar hadir yang tervalidasi" },
      { key: "tujuan", label: "Tujuan", type: "textarea", required: true, maxLength: 2500, rows: 3, placeholder: "Tujuan pelaksanaan kegiatan." },
      { key: "kegiatan_tercatat", label: "Daftar kegiatan yang tercatat", type: "textarea", required: false, maxLength: 5000, rows: 5, placeholder: "Daftar aktivitas dari register beserta tanggal dan statusnya. Ini bukan pengganti verifikasi pelaksanaan." },
      { key: "catatan_agenda", label: "Catatan awal pada agenda", type: "textarea", required: false, maxLength: 3000, rows: 3, placeholder: "Keterangan yang tersimpan ketika kegiatan dijadwalkan, bila ada." },
      { key: "pelaksanaan", label: "Uraian pelaksanaan aktual", type: "textarea", required: true, maxLength: 5000, rows: 6, placeholder: "Tuliskan pelaksanaan yang benar-benar terjadi setelah diverifikasi." },
      { key: "hasil", label: "Hasil / capaian", type: "textarea", required: true, maxLength: 4000, rows: 5, placeholder: "Catat hasil yang dapat dibuktikan." },
      { key: "kendala", label: "Kendala", type: "textarea", required: false, maxLength: 2500, rows: 3, placeholder: "Kendala yang ditemukan, jika ada." },
      { key: "tindak_lanjut", label: "Tindak lanjut", type: "textarea", required: false, maxLength: 2500, rows: 3, placeholder: "Rencana tindak lanjut." },
      { key: "penyusun", label: "Disusun oleh", type: "text", required: true, maxLength: 160, placeholder: "Nama penyusun laporan" },
      { key: "jabatan_penyusun", label: "Jabatan", type: "text", required: true, maxLength: 120, placeholder: "Jabatan penyusun" },
    ],
    sections: [
      { title: "Identitas kegiatan", fields: ["nama_kegiatan", "program", "periode_kegiatan", "tempat_kegiatan", "jumlah_peserta"] },
      { title: "Catatan sumber operasional", fields: ["kegiatan_tercatat", "catatan_agenda"] },
      { title: "Tujuan dan pelaksanaan aktual", fields: ["tujuan", "pelaksanaan"] },
      { title: "Hasil, kendala, dan tindak lanjut", fields: ["hasil", "kendala", "tindak_lanjut"] },
      { title: "Penyusun", fields: ["penyusun", "jabatan_penyusun"] },
    ],
  },
  {
    code: "TPL-SPR",
    name: "Permohonan narasumber",
    purpose: "Permohonan narasumber atau pendamping kegiatan kepada pihak luar",
    category: "Surat",
    documentHeading: "SURAT PERMOHONAN NARASUMBER",
    fields: [
      { key: "tujuan", label: "Kepada / instansi tujuan", type: "text", required: true, maxLength: 200, placeholder: "Nama instansi atau pihak yang dituju" },
      { key: "nama_kegiatan", label: "Nama kegiatan", type: "text", required: true, maxLength: 240, placeholder: "Nama kegiatan" },
      { key: "tanggal_kegiatan", label: "Tanggal kegiatan", type: "date", required: true, maxLength: 10, placeholder: "" },
      { key: "waktu", label: "Waktu", type: "text", required: true, maxLength: 120, placeholder: "Waktu kegiatan" },
      { key: "tempat", label: "Tempat", type: "text", required: true, maxLength: 240, placeholder: "Lokasi kegiatan" },
      { key: "narasumber", label: "Narasumber yang dimohon", type: "text", required: false, maxLength: 200, placeholder: "Nama atau kompetensi narasumber yang diharapkan" },
      { key: "materi", label: "Materi / tujuan permohonan", type: "textarea", required: true, maxLength: 3500, rows: 5, placeholder: "Jelaskan materi dan alasan kebutuhan narasumber." },
      { key: "kontak_pic", label: "Kontak penanggung jawab", type: "text", required: true, maxLength: 180, placeholder: "Nama dan nomor kontak yang dapat dihubungi" },
      { key: "penandatangan", label: "Nama penandatangan", type: "text", required: true, maxLength: 160, placeholder: "Nama penandatangan" },
      { key: "jabatan_penandatangan", label: "Jabatan penandatangan", type: "text", required: true, maxLength: 120, placeholder: "Jabatan" },
    ],
    sections: [
      { title: "Tujuan permohonan", fields: ["tujuan"] },
      { title: "Rencana kegiatan", fields: ["nama_kegiatan", "tanggal_kegiatan", "waktu", "tempat", "narasumber"] },
      { title: "Materi dan penanggung jawab", fields: ["materi", "kontak_pic"] },
      { title: "Penandatangan", fields: ["penandatangan", "jabatan_penandatangan"] },
    ],
  },
];

export function getSecretariatTemplate(code: string): SecretariatTemplateDefinition | null {
  return SECRETARIAT_TEMPLATES.find((template) => template.code === code) ?? null;
}
