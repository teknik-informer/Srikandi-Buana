import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/styles/presets/srikandi.css", "utf8");

function blockFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(escaped + "\\s*\\{([\\s\\S]*?)\\n\\}"));
  assert.ok(match, "Missing theme block: " + selector);
  return match[1];
}

function parseTokens(block, selector) {
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\\s*(oklch\\([^;]+\\));/g)]
      .map((match) => [match[1], match[2]]),
  );
  assert.ok(Object.keys(tokens).length > 20, "Theme token extraction failed for " + selector);
  return tokens;
}

function linearSrgbFromOklch(L, C, hue) {
  const angle = (hue * Math.PI) / 180;
  const a = C * Math.cos(angle);
  const b = C * Math.sin(angle);
  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function inSrgbGamut(channels) {
  return channels.every((value) => value >= -1e-7 && value <= 1 + 1e-7);
}

function toSrgb(token, name) {
  const match = token.match(/^oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)$/);
  assert.ok(match, "Unsupported color syntax for " + name + ": " + token);
  const [L, requestedC, hue] = match.slice(1).map(Number);

  // CSS Color 4 gamut mapping reduces chroma while preserving lightness and hue.
  let C = requestedC;
  let linear = linearSrgbFromOklch(L, C, hue);
  if (!inSrgbGamut(linear)) {
    let low = 0;
    let high = C;
    for (let i = 0; i < 28; i += 1) {
      const middle = (low + high) / 2;
      const candidate = linearSrgbFromOklch(L, middle, hue);
      if (inSrgbGamut(candidate)) {
        low = middle;
        linear = candidate;
      } else {
        high = middle;
      }
    }
  }

  const gamma = (value) => {
    const clipped = Math.max(0, Math.min(1, value));
    return clipped <= 0.0031308
      ? 12.92 * clipped
      : 1.055 * clipped ** (1 / 2.4) - 0.055;
  };
  return linear.map(gamma);
}

function luminance(rgb) {
  const linear = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const pairDefinitions = [
  { label: "Body text", foreground: "foreground", background: "background", minimum: 4.5 },
  { label: "Card text", foreground: "card-foreground", background: "card", minimum: 4.5 },
  { label: "Popover text", foreground: "popover-foreground", background: "popover", minimum: 4.5 },
  { label: "Primary action text", foreground: "primary-foreground", background: "primary", minimum: 4.5 },
  { label: "Secondary action text", foreground: "secondary-foreground", background: "secondary", minimum: 4.5 },
  { label: "Muted text", foreground: "muted-foreground", background: "muted", minimum: 4.5 },
  { label: "Accent text", foreground: "accent-foreground", background: "accent", minimum: 4.5 },
  { label: "Destructive text", foreground: "destructive", background: "background", minimum: 4.5 },
  { label: "Sidebar text", foreground: "sidebar-foreground", background: "sidebar", minimum: 4.5 },
  { label: "Sidebar primary action", foreground: "sidebar-primary-foreground", background: "sidebar-primary", minimum: 4.5 },
  { label: "Sidebar accent text", foreground: "sidebar-accent-foreground", background: "sidebar-accent", minimum: 4.5 },
  { label: "Main border / background", foreground: "border", background: "background", minimum: 3 },
  { label: "Main border / card", foreground: "border", background: "card", minimum: 3 },
  { label: "Input boundary / background", foreground: "input", background: "background", minimum: 3 },
  { label: "Input boundary / card", foreground: "input", background: "card", minimum: 3 },
  { label: "Focus ring / background", foreground: "ring", background: "background", minimum: 3 },
  { label: "Focus ring / card", foreground: "ring", background: "card", minimum: 3 },
  { label: "Sidebar border", foreground: "sidebar-border", background: "sidebar", minimum: 3 },
  { label: "Sidebar focus ring", foreground: "sidebar-ring", background: "sidebar", minimum: 3 },
  ...[1, 2, 3, 4, 5].flatMap((index) => [
    { label: "Chart " + index + " / background", foreground: "chart-" + index, background: "background", minimum: 3 },
    { label: "Chart " + index + " / card", foreground: "chart-" + index, background: "card", minimum: 3 },
  ]),
];

let failed = 0;
for (const [mode, selector] of [
  ["light", ':root[data-theme-preset="srikandi"]'],
  ["dark", '.dark:root[data-theme-preset="srikandi"]'],
]) {
  const tokens = parseTokens(blockFor(selector), selector);
  console.log("\\nSrikandi " + mode + " palette");
  for (const pair of pairDefinitions) {
    const foreground = tokens[pair.foreground];
    const background = tokens[pair.background];
    assert.ok(foreground, "Missing token --" + pair.foreground + " in " + mode);
    assert.ok(background, "Missing token --" + pair.background + " in " + mode);
    const ratio = contrastRatio(
      toSrgb(foreground, pair.foreground),
      toSrgb(background, pair.background),
    );
    const passed = ratio >= pair.minimum;
    if (!passed) failed += 1;
    console.log(
      (passed ? "PASS " : "FAIL ") +
      pair.label +
      ": " + ratio.toFixed(2) +
      ":1 (minimum " + pair.minimum.toFixed(1) + ":1)",
    );
  }
}

assert.equal(failed, 0, failed + " theme contrast pair(s) failed.");
console.log("\\nPASS: all Srikandi light/dark text, control, focus, sidebar and chart contrast pairs meet their configured WCAG thresholds.");
