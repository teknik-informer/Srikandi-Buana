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
          return decodeURIComponent(part.slice(prefix.length));
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
      // A failed preference write must not prevent the page from rendering.
    }
  }

  var mode = readCookie("theme_mode");
  if (validModes.indexOf(mode) === -1) {
    // Migrate the previous localStorage key without deleting the user's value.
    try {
      var legacyMode = window.localStorage.getItem("sb-theme");
      if (validModes.indexOf(legacyMode) !== -1) mode = legacyMode;
    } catch (error) {
      // Storage may be unavailable in private or restricted browsing contexts.
    }
    if (validModes.indexOf(mode) === -1) mode = "system";
    writeCookie("theme_mode", mode);
  }

  var preset = readCookie("theme_preset");
  // Bawaan situs: palet Srikandi. Cookie tetap menang bila pengunjung
  // pernah memilih gaya lain.
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

  // The hydrated ThemeControl owns ongoing system-preference subscriptions.
})();
