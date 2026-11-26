"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireRoles } from "@/lib/session";
import { normalizePublicSiteSettings, type PublicSiteSettings, type SiteMenuGroup, type SiteFooterGroup } from "@/lib/site-settings-schema";

export interface SaveSiteSettingsState { ok: boolean; message: string; }
function validHref(value: string): boolean {
  const href = value.trim();
  return (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) ||
    /^https:\/\/[^\s]+$/i.test(href) ||
    /^mailto:[^\s@]+@[^\s@]+$/i.test(href) ||
    /^tel:\+?[0-9-]{6,20}$/i.test(href);
}

function validateSettings(settings: PublicSiteSettings): string | null {
  const textFields: Array<[string, string, number]> = [
    ["Nama situs", settings.identity.siteName, 100],
    ["Tagline", settings.identity.tagline, 180],
    ["Eyebrow beranda", settings.hero.eyebrow, 100],
    ["Label tombol utama", settings.hero.primaryLabel, 80],
    ["Label tombol kedua", settings.hero.secondaryLabel, 80],
    ["Logo", settings.identity.logoUrl, 500],
    ["Nama kredit", settings.identity.creditName, 100],
    ["Baris kredit", settings.identity.creditLine, 240],
    ["Judul utama", settings.hero.title, 140],
    ["Subjudul", settings.hero.subtitle, 180],
    ["Deskripsi utama", settings.hero.description, 700],
    ["Teks pengumuman", settings.announcement.text, 300],
    ["Alamat email", settings.contact.email, 254],
    ["Nomor telepon", settings.contact.phone, 30],
    ["Nomor WhatsApp", settings.contact.whatsapp, 30],
    ["Alamat sekretariat", settings.contact.address, 500],
    ["Tagline navigasi", settings.navigation.tagline, 160],
    ["Jam layanan", settings.contact.officeHours, 180],
    ["Teks hak cipta", settings.footer.copyrightText, 180],
  ];
  for (const [label, value, max] of textFields) {
    if (typeof value !== "string" || value.length > max) return label + " melebihi batas karakter.";
  }
  if (settings.identity.siteName.trim().length < 2) return "Nama situs wajib diisi.";
  if (Object.values(settings.features).some((value) => typeof value !== "boolean") ||
      Object.values(settings.home).some((value) => typeof value !== "boolean")) {
    return "Status pengaktifan fitur dan bagian beranda harus berupa pilihan aktif/nonaktif.";
  }
  if ([settings.navigation.showSearch, settings.navigation.showContact, settings.navigation.showLogin,
       settings.footer.showSocial, settings.footer.showCredit, settings.footer.showCopyright,
       settings.announcement.enabled].some((value) => typeof value !== "boolean")) {
    return "Pengaturan tampilan situs tidak valid.";
  }
  if (!validHref(settings.identity.logoUrl)) return "Alamat logo harus berupa path situs atau URL HTTPS.";
  if (settings.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact.email)) return "Format email situs tidak valid.";
  if (!validHref(settings.hero.primaryHref) || !validHref(settings.hero.secondaryHref)) return "Tautan tombol beranda tidak valid.";
  if (!Array.isArray(settings.navigation.groups) || settings.navigation.groups.length > 16) return "Jumlah kelompok menu tidak valid.";
  if (!Array.isArray(settings.footer.groups) || settings.footer.groups.length > 12) return "Jumlah kelompok footer tidak valid.";
  if (!Array.isArray(settings.socials) || settings.socials.length > 12) return "Jumlah kanal sosial tidak valid.";

  const menuGroups = settings.navigation.groups as SiteMenuGroup[];
  const footerGroups = settings.footer.groups as SiteFooterGroup[];
  const allItems = [
    ...menuGroups.flatMap((group) => (group.columns ?? []).flatMap((column) => column.items ?? [])),
    ...footerGroups.flatMap((group) => group.items ?? []),
  ];
  if (allItems.length > 180) return "Jumlah tautan situs melebihi batas.";
  for (const group of menuGroups) {
    if (!group.feature || !validHref(group.feature.href) ||
        typeof group.feature.title !== "string" || group.feature.title.length > 120 ||
        typeof group.feature.body !== "string" || group.feature.body.length > 240) {
      return "Konten panel kelompok menu tidak valid.";
    }
  }
  for (const link of allItems) {
    if (typeof link.label !== "string" || !link.label.trim() || link.label.length > 80) return "Label tautan wajib diisi dan maksimal 80 karakter.";
    if (typeof link.href !== "string" || !validHref(link.href)) return "Tautan " + link.label + " tidak valid.";
    if (typeof link.desc !== "string" || link.desc.length > 180) return "Deskripsi " + link.label + " terlalu panjang.";
  }
  const allowedPlatforms = new Set(["instagram", "youtube", "facebook", "whatsapp", "tiktok", "email"]);
  for (const social of settings.socials) {
    if (!allowedPlatforms.has(social.platform) || !social.href || !validHref(social.href)) return "Alamat atau jenis salah satu kanal sosial tidak valid.";
  }
  return null;
}

export async function savePublicSiteSettings(
  _previous: SaveSiteSettingsState,
  formData: FormData,
): Promise<SaveSiteSettingsState> {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);
  const raw = String(formData.get("settings_json") ?? "");
  if (!raw || raw.length > 120_000) return { ok: false, message: "Data pengaturan tidak valid atau terlalu besar." };

  let settings: PublicSiteSettings;
  try {
    settings = normalizePublicSiteSettings(JSON.parse(raw));
  } catch {
    return { ok: false, message: "Pengaturan tidak dapat dibaca. Periksa kembali isinya." };
  }
  const invalid = validateSettings(settings);
  if (invalid) return { ok: false, message: invalid };

  try {
    const sql = getV9Sql();
    const result = await sql
      \`WITH existing AS MATERIALIZED (
         SELECT setting_value
         FROM v9.system_settings
         WHERE organization_id = \${identity.organizationId}
           AND setting_key = 'public_site'
         LIMIT 1
       ),
       saved AS (
         INSERT INTO v9.system_settings (
           organization_id, setting_key, setting_value, visibility, updated_by, updated_at
         )
         VALUES (
           \${identity.organizationId},
           'public_site',
           \${JSON.stringify(settings)}::jsonb,
           'public',
           \${identity.userId},
           now()
         )
         ON CONFLICT (organization_id, setting_key)
         DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           visibility = 'public',
           updated_by = EXCLUDED.updated_by,
           updated_at = now()
         RETURNING id, organization_id, setting_value
       ),
       audit AS (
         INSERT INTO v9.audit_events (
           organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state
         )
         SELECT
           saved.organization_id,
           \${identity.userId},
           'public_site.settings.updated',
           'system_setting',
           'public_site',
           existing.setting_value,
           saved.setting_value
         FROM saved
         LEFT JOIN existing ON true
         RETURNING id
       )
       SELECT saved.id::text AS id
       FROM saved
       INNER JOIN audit ON true\`;
    if (!rowsFromResult<{ id: string }>(result).length) {
      return { ok: false, message: "Pengaturan belum tersimpan. Muat ulang dan coba kembali." };
    }
  } catch (reason) {
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
    console.error("[public-site-settings] Save failed", errorType);
    return { ok: false, message: "Pengaturan situs belum dapat disimpan. Data sebelumnya tetap digunakan." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/studio/website");
  return { ok: true, message: "Pengaturan situs tersimpan dan berlaku untuk pengunjung setelah halaman diperbarui." };
}
