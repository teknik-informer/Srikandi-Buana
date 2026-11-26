/**
 * Boot script that applies saved display preferences before hydration.
 *
 * Runs early in <head> so the correct data attributes and the dark class are
 * on <html> before the first paint. Without it, a reader who chose the
 * Srikandi preset (or dark mode) sees the default palette for a moment on
 * every load, then a flip.
 *
 * The registry here is deliberately small and written out by hand. The full
 * PREFERENCE_REGISTRY in lib/preferences/preferences-config cannot be
 * imported into the root layout: that module imports lib/fonts/registry,
 * which imports `geist/font/*` — a package that is not in package.json.
 * Importing it from the layout would break the build. Keep the keys,
 * defaults and attribute names below in sync with preferences-config.ts.
 */

const THEME_MODE_VALUES = ["light", "dark", "system"] as const;
const THEME_PRESET_VALUES = ["default", "brutalist", "soft-pop", "tangerine", "srikandi"] as const;

const BOOT_REGISTRY = [
  {
    key: "theme_mode",
    attribute: "data-theme-mode",
    values: THEME_MODE_VALUES,
    defaultValue: "light",
  },
  {
    key: "theme_preset",
    attribute: "data-theme-preset",
    values: THEME_PRESET_VALUES,
    defaultValue: "srikandi",
  },
] as const;

export function ThemeBootScript() {
  const registry = JSON.stringify(BOOT_REGISTRY);

  const code = `
    (function () {
      try {
        var root = document.documentElement;
        var REGISTRY = ${registry};

        function readCookie(name) {
          var match = document.cookie.split("; ").find(function (c) {
            return c.startsWith(name + "=");
          });
          return match ? decodeURIComponent(match.split("=")[1]) : null;
        }

        function readPreference(definition) {
          var value = readCookie(definition.key);
          return definition.values.indexOf(value) >= 0 ? value : definition.defaultValue;
        }

        var resolved = {};

        for (var i = 0; i < REGISTRY.length; i++) {
          var definition = REGISTRY[i];
          var value = readPreference(definition);
          resolved[definition.attribute] = value;
          root.setAttribute(definition.attribute, value);
        }

        var mode = resolved["data-theme-mode"] || "light";
        var prefersDark =
          window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        var isDark = mode === "dark" || (mode === "system" && prefersDark);

        root.classList.toggle("dark", isDark);
        root.style.colorScheme = isDark ? "dark" : "light";
      } catch (error) {
        console.warn("ThemeBootScript error:", error);
      }
    })();
  `;

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration boot script */
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
