import "server-only";

import { getV9Sql, rowsFromResult } from "@/lib/db";
import { DEFAULT_PUBLIC_SITE_SETTINGS, normalizePublicSiteSettings, type PublicSiteSettings } from "@/lib/site-settings-schema";

interface SettingsRow { setting_value: unknown; }
function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
}

/** Public pages read only settings explicitly marked public for this organization. */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const sql = getV9Sql();
    const result = await sql
      \`SELECT setting_value
       FROM v9.system_settings
       WHERE organization_id = (
         SELECT id FROM v9.organizations
         WHERE slug = 'srikandi-buana' AND status = 'active'
         LIMIT 1
       )
         AND setting_key = 'public_site'
         AND visibility = 'public'
       LIMIT 1\`;
    const row = rowsFromResult<SettingsRow>(result)[0];
    return row ? normalizePublicSiteSettings(row.setting_value) : DEFAULT_PUBLIC_SITE_SETTINGS;
  } catch (reason) {
    console.warn("[public-site-settings] Defaults used", safeErrorType(reason));
    return DEFAULT_PUBLIC_SITE_SETTINGS;
  }
}
