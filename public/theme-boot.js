(function () {
  "use strict";

  var root = document.documentElement;
  var validModes = ["light", "dark", "system"];
  var validPresets = ["default", "brutalist", "soft-pop", "tangerine", "srikandi"];

  function readCookie(name) {
    try {
      var prefix = name + "=";
      var parts = document.cookie.split(";");
      for (var i = 0; i < parts.length; i += 1) {
        var part = parts[i].trim();
        if (part.indexOf(prefix) === 0) {
          try {
            return decodeURIComponent(part.slice(prefix.length));
          } catch (error) {
            return null;
          }
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function writeCookie(name, value) {
    try {
      var secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        name + "=" + encodeURIComponent(value) +
        "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
    } catch (error) {
      // Preference persistence must never prevent the application from rendering.
    }
  }

  var mode = readCookie("theme_mode");
  if (validModes.indexOf(mode) === -1) {
    // Migrate the legacy production preference before the first paint.
    try {
      var legacyMode = window.localStorage.getItem("sb-theme");
      if (validModes.indexOf(legacyMode) !== -1) mode = legacyMode;
    } catch (error) {
      // Storage can be blocked in private or restricted browsing contexts.
    }
    if (validModes.indexOf(mode) === -1) mode = "light";
    writeCookie("theme_mode", mode);
  }

  var preset = readCookie("theme_preset");
  if (validPresets.indexOf(preset) === -1) preset = "srikandi";

  root.setAttribute("data-theme-mode", mode);
  root.setAttribute("data-theme-preset", preset);

  function applyMode() {
    var prefersDark = false;
    if (mode === "system" && typeof window.matchMedia === "function") {
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    var isDark = mode === "dark" || prefersDark;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }

  applyMode();

  // ThemeControl owns ongoing system-preference subscriptions after hydration.
})();
