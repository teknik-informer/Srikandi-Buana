import "server-only";
import { cache } from "react";
import { env } from "@/lib/runtime";
import { defaultPublicPolicySettings, validatePublicPolicySettings } from "@/lib/public-policies";

export const getPublicPolicySettings = cache(async function getPublicPolicySettings() {
  if (!env.DB) return defaultPublicPolicySettings;
  try {
    const row = await env.DB.prepare("SELECT data FROM settings WHERE key='public-policies'").first();
    if (!row?.data) return defaultPublicPolicySettings;
    return validatePublicPolicySettings(JSON.parse(String(row.data)));
  } catch {
    return defaultPublicPolicySettings;
  }
});

export async function getPublishedPolicy(slug: string) {
  const settings = await getPublicPolicySettings();
  if (!settings.enabled) return null;
  return settings.documents.find(document => document.slug === slug && document.status === "published") || null;
}
