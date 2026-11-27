import { informationPages, policyUpdated, type InformationPage } from "@/lib/information-pages";
import { contactTopics } from "@/lib/contact-topics";

export type PolicyStatus = "published" | "draft";
export type ManagedPolicyDocument = InformationPage & {
  slug: string;
  status: PolicyStatus;
  version: string;
  updatedAt: string;
};
export type PublicPolicySettings = {
  enabled: boolean;
  documents: ManagedPolicyDocument[];
  updatedAt?: string;
};

const legalIdentityDraft: ManagedPolicyDocument = {
  slug: "legalitas-identitas-situs",
  title: "Legalitas & Identitas Situs",
  description: "Identitas pengelola, keterangan kelembagaan, dan informasi legalitas yang hanya diterbitkan setelah diverifikasi.",
  category: "Identitas & legalitas",
  topic: "Informasi kelompok",
  status: "draft",
  version: "1.0",
  updatedAt: policyUpdated,
  sections: [
    {
      id: "identitas",
      title: "Identitas pengelola",
      paragraphs: [
        "Nama resmi, alamat sekretariat, dan kontak pengelola harus dicocokkan dengan dokumen atau keputusan organisasi yang berlaku sebelum halaman ini diterbitkan."
      ]
    },
    {
      id: "kelembagaan",
      title: "Status kelembagaan",
      paragraphs: [
        "Cantumkan bentuk dan status kelembagaan hanya berdasarkan dokumen pengesahan atau keterangan instansi yang berwenang. Jangan menyamakan rencana pembentukan, proses pengajuan, dan status yang telah disahkan."
      ]
    },
    {
      id: "layanan-digital",
      title: "Layanan digital dan perizinan",
      paragraphs: [
        "Nomor registrasi, perizinan, atau identitas penyelenggara sistem elektronik hanya dicantumkan setelah keberadaan dan statusnya diverifikasi. Kolom yang belum tersedia tidak boleh diisi dengan nomor perkiraan."
      ]
    }
  ]
};

export const defaultPublicPolicySettings: PublicPolicySettings = {
  enabled: true,
  documents: [
    ...Object.entries(informationPages).map(([slug, page]) => ({
      ...page,
      slug,
      status: "published" as const,
      version: "1.1",
      updatedAt: policyUpdated
    })),
    legalIdentityDraft
  ]
};

const reservedSlugs = new Set([
  "kebijakan", "peta-situs", "cari", "kontak", "masuk", "keluar", "pasang",
  "profil", "visi-misi", "program", "kemitraan", "produk", "kegiatan", "kabar",
  "galeri", "dokumen", "faq", "dashboard", "admin", "api"
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function text(value: unknown, label: string, max: number, min = 1): string {
  if (typeof value !== "string") throw new Error(label + " harus berupa teks.");
  const result = value.trim();
  if (result.length < min || result.length > max) throw new Error(label + " harus berisi " + min + "–" + max + " karakter.");
  return result;
}
function listOfText(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(label + " tidak valid.");
  return value.map((item, index) => text(item, label + " ke-" + (index + 1), maxLength));
}
export function validatePublicPolicySettings(raw: unknown): PublicPolicySettings {
  if (!record(raw) || typeof raw.enabled !== "boolean" || !Array.isArray(raw.documents)) {
    throw new Error("Struktur pengaturan kebijakan tidak valid.");
  }
  if (raw.documents.length > 40) throw new Error("Maksimal 40 dokumen kebijakan.");
  const seenSlugs = new Set<string>();
  const documents = raw.documents.map((entry, index): ManagedPolicyDocument => {
    const label = "Dokumen ke-" + (index + 1);
    if (!record(entry)) throw new Error(label + " tidak valid.");
    const slug = text(entry.slug, label + " slug", 64, 3);
    if (!slugPattern.test(slug)) throw new Error("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
    if (reservedSlugs.has(slug) && !Object.prototype.hasOwnProperty.call(informationPages, slug)) {
      throw new Error("Slug " + slug + " telah digunakan oleh halaman situs.");
    }
    if (seenSlugs.has(slug)) throw new Error("Slug dokumen tidak boleh sama.");
    seenSlugs.add(slug);
    const status = entry.status;
    if (status !== "draft" && status !== "published") throw new Error(label + " memiliki status yang tidak valid.");
    const topic = text(entry.topic, label + " topik kontak", 80);
    if (!contactTopics.includes(topic)) throw new Error("Pilih topik kontak yang tersedia untuk " + label + ".");
    if (!Array.isArray(entry.sections) || entry.sections.length < 1 || entry.sections.length > 20) {
      throw new Error(label + " harus memiliki 1–20 bagian.");
    }
    const sectionIds = new Set<string>();
    const sections = entry.sections.map((item, sectionIndex) => {
      const sectionLabel = label + ", bagian " + (sectionIndex + 1);
      if (!record(item)) throw new Error(sectionLabel + " tidak valid.");
      const id = text(item.id, sectionLabel + " ID", 48, 2);
      if (!slugPattern.test(id) || sectionIds.has(id)) throw new Error("ID bagian harus unik dan menggunakan huruf kecil, angka, atau tanda hubung.");
      sectionIds.add(id);
      const title = text(item.title, sectionLabel + " judul", 120, 2);
      const paragraphs = listOfText(item.paragraphs, sectionLabel + " paragraf", 20, 5000);
      const items = item.items === undefined ? undefined : listOfText(item.items, sectionLabel + " daftar", 30, 500);
      if (paragraphs.length === 0 && (!items || items.length === 0)) throw new Error(sectionLabel + " belum memiliki isi.");
      return { id, title, paragraphs, ...(items?.length ? { items } : {}) };
    });
    const version = typeof entry.version === "string" ? text(entry.version, label + " versi", 24, 1) : "1.0";
    const updatedAt = typeof entry.updatedAt === "string" ? text(entry.updatedAt, label + " tanggal pembaruan", 40, 1) : new Date().toISOString().slice(0, 10);
    const totalContent = sections.reduce((sum, section) => sum + section.title.length + section.paragraphs.join("").length + (section.items || []).join("").length, 0);
    if (totalContent > 30000) throw new Error(label + " terlalu panjang (maksimal 30.000 karakter).");
    return {
      slug,
      title: text(entry.title, label + " judul", 140, 3),
      description: text(entry.description, label + " ringkasan", 500, 8),
      category: text(entry.category, label + " kategori", 80, 2),
      topic,
      status,
      version,
      updatedAt,
      sections
    };
  });
  return {
    enabled: raw.enabled,
    documents,
    ...(typeof raw.updatedAt === "string" ? { updatedAt: raw.updatedAt.slice(0, 40) } : {})
  };
}

const legacySlugs = new Set(Object.keys(informationPages));
export function publicPolicyHref(slug: string): string {
  return legacySlugs.has(slug) ? "/" + slug : "/kebijakan/" + slug;
}
