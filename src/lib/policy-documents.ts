import { cache } from "react";
import { env } from "@/lib/runtime";
import { informationPages, policyUpdated } from "@/lib/information-pages";

export type PolicyStatus = "draft" | "published" | "inactive";
export type PolicySection = { id: string; title: string; paragraphs: string[]; items?: string[] };
export type PolicyDocument = {
  slug: string;
  title: string;
  description: string;
  category: string;
  topic: string;
  status: PolicyStatus;
  version: string;
  effectiveDate: string;
  updatedAt: string;
  sections: PolicySection[];
};

const legalNotice: PolicyDocument = {
  slug: "legalitas",
  title: "Legalitas & Identitas Situs",
  description: "Identitas pengelola, status dokumen kelembagaan, dan informasi kepatuhan penyelenggaraan situs Srikandi Buana.",
  category: "Legalitas situs",
  topic: "Informasi kelompok",
  status: "published",
  version: "1.0",
  effectiveDate: "2026-11-27",
  updatedAt: "2026-11-27",
  sections: [
    { id: "operator", title: "Identitas pengelola situs", paragraphs: [
      "Situs ini dikelola oleh Kelompok Wanita Tani Srikandi Buana, Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung, Jawa Tengah, Indonesia.",
      "Alamat wilayah di atas merupakan identitas wilayah kelompok dan tidak dengan sendirinya merupakan alamat kantor atau sekretariat. Alamat sekretariat, alamat surat-menyurat, nama penanggung jawab formal, dan kontak hukum hanya dicantumkan setelah diverifikasi serta disahkan oleh pengelola."
    ]},
    { id: "kelembagaan", title: "Status kelembagaan dan dokumen organisasi", paragraphs: [
      "Status, bentuk, dan kewenangan hukum organisasi mengikuti dokumen pembentukan, keputusan musyawarah, surat keputusan, atau pencatatan resmi yang benar-benar dimiliki dan masih berlaku.",
      "Situs ini tidak menyatakan bahwa KWT Srikandi Buana telah berbadan hukum, memiliki akta notaris, NIB, NPWP organisasi, nomor AHU, atau sertifikat tertentu. Nomor dan status tersebut tidak dicantumkan sebelum ada bukti resmi yang diperiksa.",
      "Dokumen rancangan, formulir, dan materi pengembangan yang dipublikasikan bukan pengganti AD/ART yang disahkan atau bukti pengesahan badan hukum."
    ]},
    { id: "pse", title: "Penyelenggaraan Sistem Elektronik (PSE)", paragraphs: [
      "Situs dan aplikasi Srikandi Buana merupakan layanan elektronik yang dikelola untuk informasi kelompok dan administrasi anggota. Kewajiban pendaftaran PSE Lingkup Privat perlu dinilai berdasarkan fungsi layanan yang benar-benar dioperasikan, kategori penyelenggara, dan ketentuan yang berlaku.",
      "Status pendaftaran PSE Lingkup Privat pada halaman ini: belum diverifikasi. Nomor tanda daftar PSE: belum dicantumkan. Pengelola tidak mengklaim situs ini telah terdaftar sebelum bukti pendaftaran resmi tersedia.",
      "Rujukan pemeriksaan meliputi PP Nomor 71 Tahun 2019 serta Permenkominfo Nomor 5 Tahun 2020 sebagaimana diubah dengan Permenkominfo Nomor 10 Tahun 2021. Pengelola harus memeriksa ketentuan terkini melalui portal resmi Komdigi sebelum menetapkan status kepatuhan."
    ]},
    { id: "infrastruktur", title: "Domain, hosting, dan layanan pendukung", paragraphs: [
      "Aplikasi menggunakan layanan infrastruktur pihak ketiga untuk hosting dan basis data. Kebijakan privasi menjelaskan kategori data yang diproses dan penyedia yang digunakan sejauh telah diketahui pengelola.",
      "Nama domain, status kepemilikan atau penguasaan domain, detail lokasi pemrosesan, dan daftar subprosesor dapat diperbarui setelah pemeriksaan pada akun penyedia layanan."
    ]},
    { id: "fungsi", title: "Ruang lingkup dan batas informasi", paragraphs: [
      "Informasi pada situs disediakan untuk keperluan komunikasi, transparansi, dan administrasi kelompok. Publikasi di situs bukan pernyataan atau jaminan pengesahan pemerintah, sertifikasi, izin usaha, kemitraan, pendanaan, atau hasil produksi.",
      "Logo, nama, dan penyebutan lembaga mitra tidak berarti adanya kerja sama resmi tanpa dokumen atau persetujuan yang dapat diverifikasi. Pengunjung diminta membaca status setiap dokumen dan materi."
    ]},
    { id: "perubahan", title: "Pembaruan identitas dan bukti legalitas", paragraphs: [
      "Pengelola memperbarui halaman ini ketika terdapat perubahan identitas, keputusan organisasi, nomor registrasi, penguasaan domain, atau dokumen kepatuhan yang telah diverifikasi.",
      "Untuk koreksi atau permintaan bukti, gunakan kanal kontak resmi pada situs. Jangan mengirim password, OTP, atau salinan dokumen identitas yang tidak diperlukan."
    ]}
  ]
};

const additionalDocs: PolicyDocument[] = [
  legalNotice,
  {
    slug: "kebijakan-keamanan",
    title: "Kebijakan Keamanan Informasi",
    description: "Prinsip perlindungan akun, dokumen internal, dan penanganan insiden keamanan.",
    category: "Tata kelola informasi",
    topic: "Laporan keamanan",
    status: "published",
    version: "1.0",
    effectiveDate: "2026-11-27",
    updatedAt: "2026-11-27",
    sections: [
      { id: "lingkup", title: "Ruang lingkup", paragraphs: [
        "Kebijakan ini menjelaskan praktik pengamanan yang diterapkan pada akun, ruang kerja anggota dan pengurus, data administrasi, dan dokumen yang dikelola melalui situs."
      ]},
      { id: "akses", title: "Pengendalian akses", paragraphs: [
        "Akses diberikan berdasarkan peran dan kebutuhan tugas. Pengguna wajib menjaga password, tidak berbagi akun, memakai perangkat yang aman, dan keluar setelah menggunakan perangkat bersama.",
        "Administrator perlu meninjau akun serta hak akses ketika terjadi pergantian tugas, penghentian keanggotaan, atau indikasi penyalahgunaan."
      ]},
      { id: "dokumen", title: "Penanganan dokumen dan data", paragraphs: [
        "Data pribadi, bukti transaksi, notulen, daftar hadir, dan arsip internal tidak boleh dipublikasikan kecuali terdapat tujuan, kewenangan, dan dasar yang sesuai.",
        "Pengguna hanya boleh mengunduh, membagikan, atau mencetak dokumen sesuai hak akses dan tujuan administrasi."
      ]},
      { id: "insiden", title: "Pelaporan insiden", paragraphs: [
        "Laporkan akun yang diduga diambil alih, tautan mencurigakan, kebocoran data, atau akses tidak sah melalui formulir pengaduan dengan topik Laporan keamanan.",
        "Sertakan waktu kejadian, halaman atau akun terdampak, dan uraian seperlunya. Jangan menyebarkan ulang data yang diduga bocor atau mengirim password dan OTP."
      ]},
      { id: "batas", title: "Batas jaminan", paragraphs: [
        "Pengelola menerapkan pengamanan yang wajar dan terus meninjau praktiknya. Tidak ada layanan internet yang dapat menjamin keamanan mutlak; pengguna perlu segera melapor ketika menemukan indikasi risiko."
      ]}
    ]
  },
  {
    slug: "penyangkalan",
    title: "Pernyataan Penyangkalan",
    description: "Batas penggunaan informasi, rancangan program, data publikasi, dan rujukan pihak ketiga.",
    category: "Tata kelola informasi",
    topic: "Koreksi informasi",
    status: "published",
    version: "1.0",
    effectiveDate: "2026-11-27",
    updatedAt: "2026-11-27",
    sections: [
      { id: "umum", title: "Informasi umum", paragraphs: [
        "Materi situs disediakan sebagai informasi organisasi dan komunikasi kelompok. Pengelola berupaya menjaga ketepatan informasi, tetapi pengunjung tetap perlu memeriksa tanggal, status, sumber, serta konteks setiap materi."
      ]},
      { id: "rancangan", title: "Rancangan dan rencana", paragraphs: [
        "Rencana program, kebutuhan pendanaan, peluang usaha, dan penjajakan kemitraan tidak merupakan jaminan pelaksanaan, pendanaan, keuntungan, sertifikasi, atau persetujuan pihak lain.",
        "Status rancangan, usulan, dalam verifikasi, disetujui, dan selesai harus dibedakan sebagaimana tercantum pada materi terkait."
      ]},
      { id: "pihak-ketiga", title: "Pihak ketiga dan tautan luar", paragraphs: [
        "Penyebutan lembaga, merek, penyedia teknologi, atau tautan luar ditujukan untuk identifikasi dan referensi. Penyebutan tidak dengan sendirinya berarti dukungan, afiliasi, atau kemitraan resmi.",
        "Layanan pihak ketiga memiliki kebijakan, keamanan, dan ketentuan sendiri. Pengunjung perlu meninjau ketentuan tersebut sebelum menyerahkan informasi."
      ]},
      { id: "perubahan", title: "Koreksi", paragraphs: [
        "Laporkan kesalahan informasi melalui kanal koreksi. Pengelola dapat memperbaiki, memberi catatan, membatasi, atau menarik materi setelah peninjauan."
      ]}
    ]
  }
];

export const corePolicySlugs = new Set([
  ...Object.keys(informationPages),
  ...additionalDocs.map((doc) => doc.slug)
]);

function defaultDocuments(): PolicyDocument[] {
  const existing = Object.entries(informationPages).map(([slug, page]) => ({
    slug,
    title: page.title,
    description: page.description,
    category: page.category,
    topic: page.topic,
    status: "published" as const,
    version: slug === "privasi" || slug === "syarat-ketentuan" || slug === "kebijakan-cookie" ? "1.1" : "1.0",
    effectiveDate: "2026-11-02",
    updatedAt: "2026-11-02",
    sections: page.sections
  }));
  return [...existing, ...additionalDocs];
}

const fallbackDocuments = defaultDocuments();

function cleanText(value: unknown, max: number, label: string, required = true): string {
  if (typeof value !== "string") throw new Error(label + " harus berupa teks.");
  const result = value.trim();
  if (required && !result) throw new Error(label + " wajib diisi.");
  if (result.length > max) throw new Error(label + " melebihi " + max + " karakter.");
  return result;
}

export function validatePolicyDocuments(raw: unknown): PolicyDocument[] {
  if (!Array.isArray(raw) || raw.length > 40) throw new Error("Daftar dokumen tidak valid.");
  const slugs = new Set<string>();
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Dokumen nomor " + (index + 1) + " tidak valid.");
    const doc = entry as Record<string, unknown>;
    const slug = cleanText(doc.slug, 80, "Slug dokumen");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
    if (slugs.has(slug)) throw new Error("Slug dokumen tidak boleh duplikat.");
    slugs.add(slug);
    const status = doc.status;
    if (status !== "draft" && status !== "published" && status !== "inactive") throw new Error("Status dokumen tidak dikenal.");
    if (!Array.isArray(doc.sections) || doc.sections.length < 1 || doc.sections.length > 30) throw new Error("Setiap dokumen harus memiliki 1–30 bagian.");
    const sectionIds = new Set<string>();
    const sections = doc.sections.map((rawSection, sectionIndex) => {
      if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) throw new Error("Bagian dokumen tidak valid.");
      const section = rawSection as Record<string, unknown>;
      const id = cleanText(section.id, 80, "ID bagian");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || sectionIds.has(id)) throw new Error("ID bagian harus unik dan menggunakan format slug.");
      sectionIds.add(id);
      if (!Array.isArray(section.paragraphs) || section.paragraphs.length > 12) throw new Error("Maksimal 12 paragraf per bagian.");
      const paragraphs = section.paragraphs.map((p) => cleanText(p, 5000, "Paragraf", false)).filter(Boolean);
      const itemsRaw = section.items === undefined ? [] : section.items;
      if (!Array.isArray(itemsRaw) || itemsRaw.length > 20) throw new Error("Maksimal 20 butir per bagian.");
      const items = itemsRaw.map((item) => cleanText(item, 1000, "Butir daftar", false)).filter(Boolean);
      if (!paragraphs.length && !items.length) throw new Error("Bagian " + (sectionIndex + 1) + " harus berisi paragraf atau butir.");
      return {
        id,
        title: cleanText(section.title, 180, "Judul bagian"),
        paragraphs,
        ...(items.length ? { items } : {})
      };
    });
    const category = cleanText(doc.category, 80, "Kategori");
    if (!["Privasi & penggunaan", "Tata kelola informasi", "Layanan & bantuan", "Legalitas situs"].includes(category)) throw new Error("Kategori dokumen tidak dikenal.");
    const version = cleanText(doc.version, 24, "Versi");
    const effectiveDate = cleanText(doc.effectiveDate, 10, "Tanggal berlaku");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || Number.isNaN(Date.parse(effectiveDate))) throw new Error("Tanggal berlaku harus menggunakan format YYYY-MM-DD.");
    const updatedAt = cleanText(doc.updatedAt, 10, "Tanggal pembaruan");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt) || Number.isNaN(Date.parse(updatedAt))) throw new Error("Tanggal pembaruan harus menggunakan format YYYY-MM-DD.");
    return {
      slug,
      title: cleanText(doc.title, 180, "Judul dokumen"),
      description: cleanText(doc.description, 500, "Ringkasan dokumen"),
      category,
      topic: cleanText(doc.topic, 100, "Topik formulir"),
      status,
      version,
      effectiveDate,
      updatedAt,
      sections
    };
  });
}

export const getPolicyDocuments = cache(async function getPolicyDocuments(): Promise<PolicyDocument[]> {
  try {
    if (!env.DB) return fallbackDocuments;
    const row = await env.DB.prepare("SELECT data FROM settings WHERE key='legal-documents'").first();
    if (!row?.data) return fallbackDocuments;
    return validatePolicyDocuments(JSON.parse(String(row.data)));
  } catch {
    return fallbackDocuments;
  }
});

export async function getPublicPolicyDocuments(): Promise<PolicyDocument[]> {
  return (await getPolicyDocuments()).filter((doc) => doc.status === "published");
}

export async function getPublicPolicyDocument(slug: string): Promise<PolicyDocument | null> {
  const documents = await getPublicPolicyDocuments();
  return documents.find((doc) => doc.slug === slug) ?? null;
}

export const policyUpdatedLabel = policyUpdated;
