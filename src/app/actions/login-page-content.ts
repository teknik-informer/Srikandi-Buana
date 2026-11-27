"use server";

import { revalidatePath } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { normalizeLoginPageContent, type LoginPageContent } from "@/lib/login-page-content";

export interface SaveLoginPageContentState { ok: boolean; message: string; }

function validateContent(content: LoginPageContent): string | null {
  const fields: Array<[string, string, number]> = [
    ["Label kembali", content.backLinkLabel, 40],
    ["Eyebrow panel", content.leftEyebrow, 80],
    ["Judul utama", content.leftTitle, 180],
    ["Deskripsi utama", content.leftDescription, 500],
    ["Eyebrow formulir", content.cardEyebrow, 80],
    ["Judul formulir", content.cardTitle, 120],
    ["Pengantar formulir", content.cardDescription, 240],
    ["Label surel", content.emailLabel, 50],
    ["Placeholder surel", content.emailPlaceholder, 100],
    ["Label kata sandi", content.passwordLabel, 50],
    ["Label tombol masuk", content.loginButtonLabel, 40],
    ["Label saat memeriksa akun", content.loginPendingLabel, 60],
    ["Catatan keamanan", content.securityNote, 300],
    ["Catatan kaki", content.footerNote, 180],
  ];
  for (const [label, value, max] of fields) {
    if (typeof value !== "string" || value.length > max) return label + " melebihi batas karakter.";
  }
  if (!content.leftTitle.trim() || !content.cardTitle.trim() ||
      !content.emailLabel.trim() || !content.passwordLabel.trim() ||
      !content.loginButtonLabel.trim()) return "Judul dan label utama halaman masuk wajib diisi.";
  if (!Array.isArray(content.highlights) || content.highlights.length > 8) return "Jumlah poin manfaat maksimal 8.";
  for (const item of content.highlights) {
    if (!item.id || typeof item.title !== "string" || !item.title.trim() || item.title.length > 90 ||
        typeof item.description !== "string" || item.description.length > 180) {
      return "Setiap poin manfaat harus memiliki judul dan keterangan yang valid.";
    }
  }
  return null;
}

export async function saveLoginPageContent(
  _previous: SaveLoginPageContentState,
  formData: FormData,
): Promise<SaveLoginPageContentState> {
  const identity = await requireIdentity("cms:publish");
  const raw = String(formData.get("content_json") ?? "");
  if (!raw || raw.length > 24_000) return { ok: false, message: "Data teks halaman masuk tidak valid atau terlalu besar." };

  let content: LoginPageContent;
  try {
    content = normalizeLoginPageContent(JSON.parse(raw));
  } catch {
    return { ok: false, message: "Data teks tidak dapat dibaca. Periksa kembali isinya." };
  }
  const invalid = validateContent(content);
  if (invalid) return { ok: false, message: invalid };

  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH existing AS MATERIALIZED (
        SELECT setting_value
        FROM v9.system_settings
        WHERE organization_id = ${identity.organizationId}
          AND setting_key = 'login_page_content'
      ),
      saved AS (
        INSERT INTO v9.system_settings
          (organization_id, setting_key, setting_value, visibility, updated_by, updated_at)
        VALUES
          (${identity.organizationId}, 'login_page_content', ${JSON.stringify(content)}::jsonb,
           'public', ${identity.userId}, now())
        ON CONFLICT (organization_id, setting_key) DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          visibility = 'public',
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING id, organization_id, setting_value
      ),
      audited AS (
        INSERT INTO v9.audit_events
          (organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
        SELECT saved.organization_id, ${identity.userId},
          'login_page_content.settings.updated', 'system_setting',
          'login_page_content',
          (SELECT setting_value FROM existing),
          saved.setting_value
        FROM saved
        RETURNING id
      )
      SELECT saved.id::text AS id
      FROM saved CROSS JOIN audited
    `;
    if (!rowsFromResult<{ id: string }>(result).length) {
      return { ok: false, message: "Teks halaman masuk belum tersimpan. Muat ulang dan coba kembali." };
    }
  } catch (reason) {
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
    console.error("[login-page-content] Save failed", errorType);
    return { ok: false, message: "Teks halaman masuk belum dapat disimpan. Data sebelumnya tetap digunakan." };
  }

  revalidatePath("/masuk");
  revalidatePath("/studio/website");
  return { ok: true, message: "Teks halaman masuk tersimpan. Perubahan berlaku pada halaman masuk setelah diperbarui." };
}
