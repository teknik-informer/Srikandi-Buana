import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const schema = read("../src/lib/design-theme-schema.ts");
const service = read("../src/lib/design-theme.ts");
const action = read("../src/app/actions/design-theme.ts");
const editor = read("../src/components/studio/design-theme-editor.tsx");
const studioPage = read("../src/app/studio/tema/page.tsx");
const rootLayout = read("../src/app/layout.tsx");
const css = read("../src/app/globals.css");

assert.match(schema, /DESIGN_THEME_PRESETS/);
for (const presetId of ["srikandi", "forest-gold", "emerald-clean", "blue-institutional", "earth-modern"]) {
  assert.ok(schema.includes('presetId: "' + presetId + '"'), "Missing theme preset: " + presetId);
}
assert.match(schema, /normalizeDesignTheme/);
assert.match(schema, /validateDesignTheme/);
assert.match(schema, /contrastRatio/);
assert.match(schema, /contrastRatio\(.*< 4\.5\)/s);

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
for (const presetId of ["srikandi", "forest-gold", "emerald-clean", "blue-institutional", "earth-modern"]) {
  const start = schema.indexOf('presetId: "' + presetId + '"');
  const end = schema.indexOf("\n  },", start);
  assert.ok(start >= 0 && end > start, "Could not parse preset " + presetId);
  const block = schema.slice(start, end);
  const color = (key) => {
    const match = new RegExp(key + ': "(#[0-9a-f]{6})"', "i").exec(block);
    assert.ok(match, "Missing " + key + " in preset " + presetId);
    return match[1];
  };
  const primary = color("primary");
  const accent = color("accent");
  const canvas = color("canvas");
  const surface = color("surface");
  const card = color("card");
  const ink = color("ink");
  const muted = color("muted");
  const checks = [
    ["white on primary", "#ffffff", primary],
    ["ink on canvas", ink, canvas],
    ["ink on card", ink, card],
    ["ink on surface", ink, surface],
    ["muted on canvas", muted, canvas],
    ["muted on card", muted, card],
    ["muted on surface", muted, surface],
    ["accent with ink", accent, ink],
  ];
  for (const [label, first, second] of checks) {
    assert.ok(contrast(first, second) >= 4.5, presetId + " fails WCAG contrast: " + label);
  }
}

assert.match(service, /setting_key = 'design_theme'/);
assert.match(service, /v9\.audit_events/);
assert.match(service, /design_theme\.settings\.updated/);
assert.match(service, /unstable_cache/);
assert.match(service, /setting\.visibility = 'public'/);
assert.match(service, /v9-public-design-theme/);

assert.match(action, /requireRoles\(\["platform_admin", "organization_admin"\]\)/);
assert.match(action, /isHexColor/);
assert.match(action, /validateDesignTheme/);
assert.match(action, /ON CONFLICT \(organization_id, setting_key\)/);
assert.match(action, /design_theme\.settings\.updated/);
assert.match(action, /revalidateTag/);
assert.match(action, /settings_json/);

assert.match(editor, /useActionState/);
assert.match(editor, /DESIGN_THEME_PRESETS/);
assert.match(editor, /type="color"/);
assert.match(editor, /name="settings_json"/);
assert.match(editor, /Riwayat perubahan tema/);
assert.match(editor, /Pratinjau langsung/);
assert.match(studioPage, /getDesignThemeSettings/);
assert.match(studioPage, /getDesignThemeHistory/);
assert.match(studioPage, /DesignThemeEditor/);
assert.match(studioPage, /requireRoles\(\["platform_admin", "organization_admin"\]\)/);

assert.match(rootLayout, /getPublicDesignThemeVariables/);
assert.match(rootLayout, /style=\{designThemeVariables as React\.CSSProperties\}/);
for (const token of ["--sb-primary", "--sb-accent", "--sb-canvas", "--sb-surface-2", "--sb-radius"]) {
  assert.ok(css.includes(token), "Missing root CSS token: " + token);
}

console.log("Design Theme Manager contract and preset contrast checks: PASS");
