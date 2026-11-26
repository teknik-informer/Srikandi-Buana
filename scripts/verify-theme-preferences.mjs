import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const bootSource = fs.readFileSync("public/theme-boot.js", "utf8");
const controlSource = fs.readFileSync("src/app/_components/access/theme-control.tsx", "utf8");
const layoutSource = fs.readFileSync("src/app/layout.tsx", "utf8");
const preferenceConfig = fs.readFileSync("src/lib/preferences/preferences-config.ts", "utf8");
const themeConfig = fs.readFileSync("src/lib/preferences/theme.ts", "utf8");

function createBrowser({ cookie = "", legacyMode = null, prefersDark = false, storageBlocked = false } = {}) {
  const cookies = new Map();
  for (const item of cookie.split(";")) {
    const part = item.trim();
    if (!part) continue;
    const separator = part.indexOf("=");
    if (separator > -1) cookies.set(part.slice(0, separator), part.slice(separator + 1));
  }

  const attributes = new Map();
  const classes = new Set();
  const listeners = new Set();
  const media = {
    matches: prefersDark,
    addEventListener(_event, callback) { listeners.add(callback); },
    removeEventListener(_event, callback) { listeners.delete(callback); },
    addListener(callback) { listeners.add(callback); },
    removeListener(callback) { listeners.delete(callback); },
  };
  const root = {
    style: {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) { return classes.has(name); },
    },
  };
  const document = {
    documentElement: root,
    get cookie() {
      return [...cookies.entries()].map(([name, value]) => name + "=" + value).join("; ");
    },
    set cookie(value) {
      const pair = String(value).split(";")[0];
      const separator = pair.indexOf("=");
      if (separator > -1) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    },
  };
  const window = {
    location: { protocol: "https:" },
    matchMedia() { return media; },
    localStorage: {
      getItem(name) {
        if (storageBlocked) throw new Error("Storage access denied");
        return name === "sb-theme" ? legacyMode : null;
      },
    },
  };

  vm.runInNewContext(bootSource, { document, window, encodeURIComponent, decodeURIComponent });
  return {
    root,
    attributes,
    classes,
    cookies,
    listeners,
    media,
  };
}

test("early bootstrap applies a valid dark mode and Srikandi preset", () => {
  const browser = createBrowser({ cookie: "theme_mode=dark; theme_preset=srikandi" });
  assert.equal(browser.attributes.get("data-theme-mode"), "dark");
  assert.equal(browser.attributes.get("data-theme-preset"), "srikandi");
  assert.equal(browser.classes.has("dark"), true);
  assert.equal(browser.root.style.colorScheme, "dark");
});

test("system mode follows the operating-system color preference without reload", () => {
  const browser = createBrowser({ cookie: "theme_mode=system; theme_preset=default", prefersDark: true });
  assert.equal(browser.classes.has("dark"), true);
  assert.equal(browser.listeners.size, 1);
  browser.media.matches = false;
  for (const listener of browser.listeners) listener();
  assert.equal(browser.classes.has("dark"), false);
  assert.equal(browser.root.style.colorScheme, "light");
});

test("legacy sb-theme preference is migrated to the canonical cookie", () => {
  const browser = createBrowser({ legacyMode: "dark" });
  assert.equal(browser.attributes.get("data-theme-mode"), "dark");
  assert.equal(browser.cookies.get("theme_mode"), "dark");
  assert.equal(browser.classes.has("dark"), true);
});

test("unknown cookie values safely fall back to system mode and the default preset", () => {
  const browser = createBrowser({
    cookie: "theme_mode=neon; theme_preset=unrecognized",
    prefersDark: false,
  });
  assert.equal(browser.attributes.get("data-theme-mode"), "system");
  assert.equal(browser.attributes.get("data-theme-preset"), "default");
  assert.equal(browser.classes.has("dark"), false);
});

test("bootstrap still renders when browser storage is blocked", () => {
  const browser = createBrowser({ storageBlocked: true, prefersDark: true });
  assert.equal(browser.attributes.get("data-theme-mode"), "system");
  assert.equal(browser.attributes.get("data-theme-preset"), "default");
  assert.equal(browser.classes.has("dark"), true);
});

test("preset picker is an explicit accessible radio menu, not a right-click gesture", () => {
  assert.match(controlSource, /DropdownMenuRadioGroup/);
  assert.match(controlSource, /DropdownMenuRadioItem/);
  assert.ok(controlSource.includes("Pilih gaya tampilan. Saat ini"));
  assert.doesNotMatch(controlSource, /onContextMenu/);
  assert.match(controlSource, /writeCookie\("theme_preset", nextPreset\)/);
  assert.match(controlSource, /writeCookie\("theme_mode", nextMode\)/);
});

test("bootstrap is loaded before hydration and preset registry matches its allow-list", () => {
  assert.match(layoutSource, /<Script src="\/theme-boot\.js" strategy="beforeInteractive" \/>/);
  assert.match(preferenceConfig, /theme_mode:[\s\S]*?defaultValue: "system"/);

  const bootPresets = bootSource.match(/var validPresets = \[([^\]]+)\]/)?.[1]
    ?.match(/"([^"]+)"/g)?.map((value) => value.slice(1, -1));
  const registeredPresets = [...themeConfig.matchAll(/value: "([^"]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(bootPresets, registeredPresets);
});
