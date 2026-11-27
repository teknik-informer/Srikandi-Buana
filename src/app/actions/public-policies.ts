"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireRoles } from "@/lib/session";
import { normalizePublicPolicySettings, type PublicPolicySettings } from "@/lib/public-policies";

export interface SavePublicPoliciesState { ok: boolean; message: string; }

function validatePolicies(settings: PublicPolicySettings): string | null {
  if (typeof settings.enabled !== "boolean") return "Status fitur kebijakan tidak valid.";
  if (!Array.isArray(settings.documents) || settings.documents.length > 24) return "Jumlah dokumen kebijakan melebihi batas.";
  const ids = new Set<string>();
  const slugs = new Set<string>();
  let textLength = 0;
  for (const document of settings.documents) {
    if (!document.id || ids.has(document.id)) return "ID dokumen kebijakan harus unik.";
    ids.add(document.id);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.slug) || slugs.has(document.slug)) {
      return "Slug URL wajib unik dan hanya berisi huruf kecil, angka, serta tanda hubung.";
    }
    slugs.add(document.slug);
    if (!document.title.trim() || document.title.length > 140 ||
        document.category.length > 80 || document.summary.length > 700 ||
        !document.version.trim() || document.version.length > 30) {
      return "Judul, kategori, ringkasan, atau versi salah satu dokumen tidak valid.";
    }
    if (document.effectiveDate && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(document.effectiveDate)) {
      return "Tanggal berlaku harus menggunakan format YYYY-MM-DD.";
    }
    if (!["draft", "published", "inactive"].includes(document.status)) return "Status dokumen tidak valid.";
    if (!Array.isArray(document.sections) || document.sections.length > 30) return "Jumlah bagian dokumen melebihi batas.";
    const sectionIds = new Set<string>();
    for (const section of document.sections) {
      if (!section.id || sectionIds.has(section.id) || !section.heading.trim() ||
          section.heading.length > 120 || typeof section.body !== "string" || section.body.length > 15000) {
        return "Judul atau isi salah satu bagian dokumen tidak valid.";
      }
      sectionIds.add(section.id);
      textLength += section.body.length;
    }
    if (document.status === "published" && document.sections.length === 0) {
      return "Dokumen berstatus Terbit harus memiliki sedikitnya satu bagian isi.";
    }
    textLength += document.title.length + document.summary.length;
  }
  if (textLength > 240000) return "Total isi dokumen kebijakan melebihi batas penyimpanan.";
  return null;
}

export async function savePublicPolicies(
  _previous: SavePublicPoliciesState,
  formData: FormData,
): Promise<SavePublicPoliciesState> {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);
  const raw = String(formData.get("policies_json") ?? "");
  if (!raw || raw.length > 360000) return { ok: false, message: "Data kebijakan tidak valid atau terlalu besar." };

  let settings: PublicPolicySettings;
  try {
    settings = normalizePublicPolicySettings(JSON.parse(raw));
  } catch {
    return { ok: false, message: "Dokumen kebijakan tidak dapat dibaca. Periksa kembali isinya." };
  }
  const invalid = validatePolicies(settings);
  if (invalid) return { ok: false, message: invalid };

  try {
    const sql = getV9Sql();
    const result = await sql`WITH existing AS MATERIALIZED (
        SELECT setting_value
        FROM v9.system_settings
        WHERE organization_id = ${identity.organizationId}
          AND setting_key = 'public_policies'
        LIMIT 1
      ),
      saved AS (
        INSERT INTO v9.system_settings (
          organization_id, setting_key, setting_value, visibility, updated_by, updated_at
        )
        VALUES (
          ${identity.organizationId},
          'public_policies',
          ${JSON.stringify(settings)}::jsonb,
          'public',
          ${identity.userId},
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
        SELECT saved.organization_id, ${identity.userId},
          'public_policies.settings.updated', 'system_setting', 'public_policies',
          existing.setting_value, saved.setting_value
        FROM saved
        LEFT JOIN existing ON true
        RETURNING id
      )
      SELECT saved.id::text AS id
      FROM saved
      INNER JOIN audit ON true`;
    if (!rowsFromResult<{ id: string }>(result).length) {
      return { ok: false, message: "Dokumen belum tersimpan. Muat ulang dan coba kembali." };
    }
  } catch (reason) {
    const errorName = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
    console.error("[public-policies] Save failed", errorName);
    return { ok: false, message: "Kebijakan belum dapat disimpan. Data sebelumnya tetap digunakan." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/kebijakan");
  revalidatePath("/studio/website");
  return { ok: true, message: "Dokumen kebijakan tersimpan. Perubahan publik berlaku setelah halaman diperbarui." };
}
