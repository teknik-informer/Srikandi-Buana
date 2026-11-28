import "server-only";

import { getV9Sql, rowsFromResult } from "@/lib/db";
import { DEFAULT_PUBLIC_SITE_SETTINGS, normalizePublicSiteSettings, type PublicSiteSettings } from "@/lib/site-settings-schema";

interface SettingsRow { setting_key: string; setting_value: unknown; }
function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
}

/** Public pages read only settings explicitly marked public for this organization. */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const sql = getV9Sql();
    const result = await sql
      `SELECT setting_key, setting_value
       FROM v9.system_settings
       WHERE organization_id = v9.get_public_organization_id()
         AND setting_key IN ('public_site', 'public_profile_content')
         AND visibility = 'public'
       ORDER BY CASE setting_key WHEN 'public_site' THEN 0 ELSE 1 END`;
    const rows = rowsFromResult<SettingsRow>(result);
    const site = rows.find((row) => row.setting_key === "public_site");
    const profile = rows.find((row) => row.setting_key === "public_profile_content");
    return normalizePublicSiteSettings(site?.setting_value, profile?.setting_value);
  } catch (reason) {
    console.warn("[public-site-settings] Defaults used", safeErrorType(reason));
    return DEFAULT_PUBLIC_SITE_SETTINGS;
  }
}
