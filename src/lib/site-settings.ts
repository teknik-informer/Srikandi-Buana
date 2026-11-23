"use client";

/**
 * Bridge between the store and the public footer.
 *
 * The footer has to be right on first paint (it is server-rendered), so it
 * starts from DEFAULT_SITE_SETTINGS and upgrades itself from the store once the
 * client has hydrated — exactly the way the rest of the demo avoids hydration
 * mismatches: no localStorage and no Date during render, only after mount.
 */
import { useEffect, useState } from "react";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/store";

const KEY = "sb_site_settings_v1";

/** What the studio writes: the same shape, no reducer needed on the public side. */
export function saveSiteSettings(next: SiteSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // let the footer (and any other listener) repaint without a reload
    window.dispatchEvent(new CustomEvent("sb:site-settings", { detail: next }));
  } catch {
    /* private mode: the change still applies to this session's studio */
  }
}

export function loadSiteSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...parsed,
      social: Array.isArray(parsed.social) && parsed.social.length
        ? DEFAULT_SITE_SETTINGS.social.map((base) => ({
            ...base,
            ...(parsed.social!.find((s) => s.key === base.key) ?? {}),
          }))
        : DEFAULT_SITE_SETTINGS.social,
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

/** Footer-side subscription. Returns defaults on the server, live values after mount. */
export function useSiteSettings(): SiteSettings {
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    setSite(loadSiteSettings());
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<SiteSettings>).detail;
      setSite(detail ?? loadSiteSettings());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSite(loadSiteSettings());
    };
    window.addEventListener("sb:site-settings", onUpdate as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("sb:site-settings", onUpdate as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return site;
}
