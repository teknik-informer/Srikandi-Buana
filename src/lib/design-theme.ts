import "server-only";

import { unstable_cache } from "next/cache";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import {
  buildDesignThemeCssVariables,
  DEFAULT_DESIGN_THEME,
  normalizeDesignTheme,
  type DesignThemeSettings,
  type DesignThemeHistoryItem,
} from "@/lib/design-theme-schema";

interface ThemeSettingRow {
  setting_value: unknown;
}


export async function getDesignThemeSettings(organizationId: string): Promise<DesignThemeSettings> {
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT setting_value
      FROM v9.system_settings
      WHERE organization_id = ${organizationId}
        AND setting_key = 'design_theme'
        AND visibility IN ('public', 'internal')
      LIMIT 1
    `;
    const row = rowsFromResult<ThemeSettingRow>(result)[0];
    return row ? normalizeDesignTheme(row.setting_value) : DEFAULT_DESIGN_THEME;
  } catch (error) {
    console.error("[design-theme] Settings read failed", error instanceof Error ? error.name : "UnknownError");
    throw new Error("Pengaturan tema organisasi tidak dapat dibaca.");
  }
}

export async function getDesignThemeHistory(organizationId: string): Promise<DesignThemeHistoryItem[]> {
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        to_char(occurred_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI') AS changed_at,
        COALESCE(after_state->>'presetName', 'Tema khusus') AS preset_name
      FROM v9.audit_events
      WHERE organization_id = ${organizationId}
        AND action = 'design_theme.settings.updated'
        AND entity_type = 'system_setting'
        AND entity_id = 'design_theme'
      ORDER BY occurred_at DESC
      LIMIT 8
    `;
    return rowsFromResult<{ changed_at: string; preset_name: string }>(result).map((row) => ({
      changedAt: row.changed_at,
      presetName: row.preset_name,
    }));
  } catch {
    return [];
  }
}

const getCachedPublicThemeVariables = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const sql = getV9Sql();
      const result = await sql`
        SELECT setting_value
        FROM v9.system_settings AS setting
        INNER JOIN v9.organizations AS organization
          ON organization.id = setting.organization_id
        WHERE organization.slug = 'srikandi-buana'
          AND organization.status = 'active'
          AND setting.setting_key = 'design_theme'
          AND setting.visibility = 'public'
        ORDER BY setting.updated_at DESC
        LIMIT 1
      `;
      const row = rowsFromResult<ThemeSettingRow>(result)[0];
      return buildDesignThemeCssVariables(row ? normalizeDesignTheme(row.setting_value) : DEFAULT_DESIGN_THEME);
    } catch {
      return buildDesignThemeCssVariables(DEFAULT_DESIGN_THEME);
    }
  },
  ["v9-public-design-theme-v1"],
  { revalidate: 60, tags: ["v9-public-design-theme"] },
);

/** Public-safe design tokens applied once by the root layout to every surface. */
export async function getPublicDesignThemeVariables(): Promise<Record<string, string>> {
  return getCachedPublicThemeVariables();
}
