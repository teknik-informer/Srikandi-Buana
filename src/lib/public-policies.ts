import { cache } from "react";
import { env } from "@/lib/runtime";
import { contactTopics } from "@/lib/contact-topics";
import {
  informationPages,
  policyUpdated,
  policyVersion,
  type InformationPage,
  type InformationSection,
} from "@/lib/information-pages";

export type PolicyStatus = "published" | "draft";
export type ManagedPolicy = InformationPage & {
  id: string;
  slug: string;
  status: PolicyStatus;
  version: string;
  effectiveDate: string;
  updatedAt: string;
};
export type PublicPolicySettings = {
  enabled: boolean;
  documents: ManagedPolicy[];
};

const defaultDocuments: ManagedPolicy[] = Object.entries(informationPages).map(
  ([slug, page]) => ({
    ...page,
    id: slug,
    slug,
    status: "published",
    version: policyVersion,
    effectiveDate: policyUpdated,
    updatedAt: policyUpdated,
    sections: page.sections.map((section) => ({
      ...section,
      paragraphs: [...section.paragraphs],
      ...(section.items ? { items: [...section.items] } : {}),
    })),
  }),
);

export const defaultPublicPolicySettings: PublicPolicySettings = {
  enabled: true,
  documents: defaultDocuments,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function cleanText(value: unknown, label: string, max: number, required = true) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(label + " wajib diisi.");
  if (result.length > max) throw new Error(label + " terlalu panjang (maksimal " + max + " karakter).");
  return result;
}

function safeId(value: unknown, fallback: string, label: string) {
  const id = cleanText(value || fallback, label, 90);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(label + " hanya boleh menggunakan huruf kecil, angka, dan tanda hubung.");
  }
  return id;
}

export function validatePublicPolicySettings(raw: unknown): PublicPolicySettings {
  if (!isRecord(raw)) throw new Error("Pengaturan kebijakan tidak valid.");
  if (typeof raw.enabled !== "boolean") throw new Error("Status pusat kebijakan harus aktif atau nonaktif.");
  if (!Array.isArray(raw.documents) || raw.documents.length > 40) {
    throw new Error("Dokumen kebijakan harus berupa daftar dengan maksimal 40 dokumen.");
  }

  const slugs = new Set<string>();
  const ids = new Set<string>();
  const documents = raw.documents.map((value, index): ManagedPolicy => {
    if (!isRecord(value)) throw new Error("Dokumen kebijakan nomor " + (index + 1) + " tidak valid.");
    const title = cleanText(value.title, "Judul dokumen", 150);
    const slug = safeId(value.slug || title.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), "dokumen-" + (index + 1), "Slug dokumen");
    const id = safeId(value.id || slug, slug, "ID dokumen");
    if (slugs.has(slug)) throw new Error("Slug dokumen tidak boleh sama: " + slug + ".");
    if (ids.has(id)) throw new Error("ID dokumen tidak boleh sama: " + id + ".");
    slugs.add(slug);
    ids.add(id);

    const status = value.status === "draft" ? "draft" : value.status === "published" ? "published" : null;
    if (!status) throw new Error("Status dokumen harus Draf atau Terbit.");
    const category = cleanText(value.category, "Kategori dokumen", 80);
    const description = cleanText(value.description, "Ringkasan dokumen", 500);
    const topic = cleanText(value.topic || "Informasi kelompok", "Topik tindak lanjut", 80);
    if (!contactTopics.includes(topic)) throw new Error("Topik tindak lanjut tidak tersedia pada formulir kontak.");

    if (!Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > 30) {
      throw new Error("Setiap dokumen harus memiliki 1–30 bagian.");
    }
    const sectionIds = new Set<string>();
    const sections = value.sections.map((section, sectionIndex): InformationSection => {
      if (!isRecord(section)) throw new Error("Bagian dokumen tidak valid.");
      const sectionTitle = cleanText(section.title, "Judul bagian", 150);
      const sectionId = safeId(section.id || sectionTitle.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), "bagian-" + (sectionIndex + 1), "ID bagian");
      if (sectionIds.has(sectionId)) throw new Error("ID bagian harus unik dalam satu dokumen.");
      sectionIds.add(sectionId);
      const paragraphsRaw = Array.isArray(section.paragraphs) ? section.paragraphs : [];
      const itemsRaw = Array.isArray(section.items) ? section.items : [];
      if (paragraphsRaw.length > 20 || itemsRaw.length > 30) {
        throw new Error("Satu bagian terlalu banyak paragraf atau butir.");
      }
      const paragraphs = paragraphsRaw.map((p, i) => cleanText(p, "Paragraf " + (i + 1), 5000)).filter(Boolean);
      const items = itemsRaw.map((item, i) => cleanText(item, "Butir " + (i + 1), 1000)).filter(Boolean);
      return {
        id: sectionId,
        title: sectionTitle,
        paragraphs,
        ...(items.length ? { items } : {}),
      };
    });

    const version = cleanText(value.version || policyVersion, "Versi dokumen", 30);
    const effectiveDate = cleanText(value.effectiveDate || policyUpdated, "Tanggal berlaku", 60);
    const updatedAt = cleanText(value.updatedAt || policyUpdated, "Tanggal pembaruan", 60);
    return {
      id,
      slug,
      title,
      description,
      category,
      topic,
      status,
      version,
      effectiveDate,
      updatedAt,
      sections,
    };
  });

  return { enabled: raw.enabled, documents };
}

export const getPublicPolicySettings = cache(async function getPublicPolicySettings(): Promise<PublicPolicySettings> {
  try {
    if (!env.DB) return defaultPublicPolicySettings;
    const row = await env.DB.prepare("SELECT data FROM settings WHERE key='public_policies'").first();
    if (!row) return defaultPublicPolicySettings;
    return validatePublicPolicySettings(JSON.parse(String(row.data)));
  } catch {
    return defaultPublicPolicySettings;
  }
});

export function policyHref(slug: string) {
  return Object.prototype.hasOwnProperty.call(informationPages, slug)
    ? "/" + slug
    : "/kebijakan/" + encodeURIComponent(slug);
}

export function publicPolicies(settings: PublicPolicySettings) {
  return settings.enabled
    ? settings.documents.filter((document) => document.status === "published")
    : [];
}
