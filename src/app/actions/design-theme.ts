"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireRoles } from "@/lib/session";
import {
  DESIGN_THEME_PRESETS,
  isHexColor,
  normalizeDesignTheme,
  validateDesignTheme,
  type DesignThemeSettings,
} from "@/lib/design-theme-schema";

export interface SaveDesignThemeState {
  ok: boolean;
  message: string;
}

export async function saveDesignTheme(
  _previous: SaveDesignThemeState,
  formData: FormData,
): Promise<SaveDesignThemeState> {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);
  const raw = String(formData.get("settings_json") ?? "");

  if (!raw || raw.length > 12_000) {
    return { ok: false, message: "Konfigurasi tema tidak valid atau terlalu besar." };
  }

  let theme: DesignThemeSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, message: "Konfigurasi tema harus berupa objek pengaturan yang valid." };
    }
    const source = parsed as { presetId?: unknown; radius?: unknown; colors?: unknown };
    const sourceColors = source.colors;
    if (!sourceColors || typeof sourceColors !== "object" || Array.isArray(sourceColors)) {
      return { ok: false, message: "Palet warna tema tidak lengkap." };
    }
    const colors = sourceColors as Record<string, unknown>;
    const requiredColors = ["primary", "accent", "canvas", "surface", "card", "border", "ink", "muted"] as const;
    if (requiredColors.some((key) => !isHexColor(colors[key]))) {
      return { ok: false, message: "Setiap warna harus menggunakan format HEX enam digit." };
    }
    if (source.radius !== "sharp" && source.radius !== "balanced" && source.radius !== "soft") {
      return { ok: false, message: "Karakter sudut komponen tidak valid." };
    }
    if (typeof source.presetId !== "string" ||
        (source.presetId !== "custom" && !DESIGN_THEME_PRESETS.some((preset) => preset.presetId === source.presetId))) {
      return { ok: false, message: "Preset tema tidak dikenal. Pilih salah satu preset yang tersedia." };
    }
    theme = normalizeDesignTheme(parsed);
  } catch {
    return { ok: false, message: "Konfigurasi tema tidak dapat dibaca. Periksa kembali isinya." };
  }

  const invalid = validateDesignTheme(theme);
  if (invalid) return { ok: false, message: invalid };

  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH existing AS MATERIALIZED (
        SELECT setting_value
        FROM v9.system_settings
        WHERE organization_id = ${identity.organizationId}
          AND setting_key = 'design_theme'
      ),
      saved AS (
        INSERT INTO v9.system_settings
          (organization_id, setting_key, setting_value, visibility, updated_by, updated_at)
        VALUES
          (${identity.organizationId}, 'design_theme', ${JSON.stringify(theme)}::jsonb, 'public', ${identity.userId}, now())
        ON CONFLICT (organization_id, setting_key)
        DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          visibility = 'public',
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING organization_id, setting_value
      ),
      audit AS (
        INSERT INTO v9.audit_events
          (organization_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
        SELECT
          saved.organization_id,
          ${identity.userId},
          'design_theme.settings.updated',
          'system_setting',
          'design_theme',
          (SELECT setting_value FROM existing),
          saved.setting_value
        FROM saved
        RETURNING id
      )
      SELECT saved.setting_value
      FROM saved
      CROSS JOIN audit
    `;

    if (!rowsFromResult<{ setting_value: unknown }>(result).length) {
      return { ok: false, message: "Tema belum tersimpan. Perubahan sebelumnya tetap berlaku." };
    }
  } catch (error) {
    const errorType = error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)
      ? error.name
      : "UnknownError";
    console.error("[design-theme] Save failed", errorType);
    return { ok: false, message: "Tema gagal disimpan. Tidak ada perubahan yang dinyatakan berhasil." };
  }

  revalidateTag("v9-public-design-theme", "max");
  revalidatePath("/", "layout");
  revalidatePath("/studio/tema");
  return { ok: true, message: "Tema berhasil disimpan dan akan diterapkan pada seluruh tampilan aplikasi." };
}
