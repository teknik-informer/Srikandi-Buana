import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync("src/app/(public)/public.css", "utf8");

function declarations(selector) {
  const merged = {};
  // CSS commonly groups several selectors into one declaration block.
  // Match the exact requested selector inside each comma-separated selector list.
  const blocks = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const match of blocks) {
    const selectors = match[1].trim().split(",").map((item) => item.trim());
    if (!selectors.includes(selector)) continue;
    for (const declaration of match[2].split(";")) {
      const separator = declaration.indexOf(":");
      if (separator < 0) continue;
      const key = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim().replace(/\s*!important\s*$/i, "");
      if (key && value) merged[key] = value;
    }
  }
  assert.ok(Object.keys(merged).length, "Missing public theme rule: " + selector);
  return merged;
}

function value(rule, key, selector) {
  const found = rule[key];
  assert.ok(found, "Missing " + key + " in " + selector);
  return found;
}

function hexRgb(input, name) {
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{6})$/);
  assert.ok(match, "Expected an explicit six-digit hex token for " + name + ", got " + input);
  return [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
}

function luminance(rgb) {
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background, name) {
  const a = luminance(hexRgb(foreground, name + " foreground"));
  const b = luminance(hexRgb(background, name + " background"));
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const LIGHT = ':root[data-theme-preset="srikandi"] .public-site';
const DARK = '.dark:root[data-theme-preset="srikandi"] .public-site';

const lightSite = declarations(LIGHT);
const darkSite = declarations(DARK);
const lightTop = declarations(LIGHT + " .public-topline");
const darkTop = declarations(DARK + " .public-topline");
const lightButton = declarations(LIGHT + " .pub-button");
const darkButton = declarations(DARK + " .pub-button");
const lightCream = declarations(LIGHT + " .pub-button.cream");
const darkCream = declarations(DARK + " .pub-button.cream");
const lightOutline = declarations(LIGHT + " .pub-button.outline");
const darkOutline = declarations(DARK + " .pub-button.outline");
const lightCallout = declarations(LIGHT + " .pub-cta");
const darkCallout = declarations(DARK + " .pub-cta");
const lightCalloutText = declarations(LIGHT + " .pub-cta p:not(.pub-kicker)");
const darkCalloutText = declarations(DARK + " .pub-cta p:not(.pub-kicker)");
const lightQuote = declarations(LIGHT + " .pub-quote");
const lightQuoteText = declarations(LIGHT + " .pub-quote blockquote");
const darkQuote = declarations(DARK + " .pub-quote");
const darkQuoteText = declarations(DARK + " .pub-quote blockquote");
const lightKicker = declarations(LIGHT + " .pub-kicker");
const darkKicker = declarations(DARK + " .pub-kicker");

const pairs = [
  ["Light body text", value(lightSite, "--pub-ink", LIGHT), value(lightSite, "--pub-paper", LIGHT), 4.5],
  ["Light muted text", value(lightSite, "--pub-muted", LIGHT), value(lightSite, "--pub-paper", LIGHT), 4.5],
  ["Light top line", value(lightTop, "color", "light top line"), value(lightTop, "background", "light top line"), 4.5],
  ["Light primary button", value(lightButton, "color", "light primary button"), value(lightButton, "background", "light primary button"), 4.5],
  ["Light cream button", value(lightCream, "color", "light cream button"), value(lightCream, "background", "light cream button"), 4.5],
  ["Light outline button", value(lightOutline, "color", "light outline button"), value(lightSite, "--pub-paper", LIGHT), 4.5],
  ["Light callout copy", value(lightCalloutText, "color", "light callout copy"), value(lightCallout, "background", "light callout"), 4.5],
  ["Light quote", value(lightQuoteText, "color", "light quote"), value(lightQuote, "background", "light quote"), 4.5],
  ["Light section label", value(lightKicker, "color", "light section label"), value(lightSite, "--pub-paper", LIGHT), 4.5],
  ["Light border", value(lightSite, "--pub-line", LIGHT), value(lightSite, "--pub-paper", LIGHT), 3],
  ["Light form boundary", value(lightSite, "--input", LIGHT), value(lightSite, "--pub-paper", LIGHT), 3],
  ["Light focus indicator", value(lightSite, "--ring", LIGHT), value(lightSite, "--pub-paper", LIGHT), 3],

  ["Dark body text", value(darkSite, "--pub-ink", DARK), value(darkSite, "--pub-paper", DARK), 4.5],
  ["Dark muted text", value(darkSite, "--pub-muted", DARK), value(darkSite, "--pub-paper", DARK), 4.5],
  ["Dark top line", value(darkTop, "color", "dark top line"), value(darkTop, "background", "dark top line"), 4.5],
  ["Dark primary button", value(darkButton, "color", "dark primary button"), value(darkButton, "background", "dark primary button"), 4.5],
  ["Dark cream button", value(darkCream, "color", "dark cream button"), value(darkCream, "background", "dark cream button"), 4.5],
  ["Dark outline button", value(darkOutline, "color", "dark outline button"), value(darkSite, "--pub-paper", DARK), 4.5],
  ["Dark callout copy", value(darkCalloutText, "color", "dark callout copy"), value(darkCallout, "background", "dark callout"), 4.5],
  ["Dark quote", value(darkQuoteText, "color", "dark quote"), value(darkQuote, "background", "dark quote"), 4.5],
  ["Dark section label", value(darkKicker, "color", "dark section label"), value(darkSite, "--pub-paper", DARK), 4.5],
  ["Dark border", value(darkSite, "--pub-line", DARK), value(darkSite, "--pub-paper", DARK), 3],
  ["Dark form boundary", value(darkSite, "--input", DARK), value(darkSite, "--pub-paper", DARK), 3],
  ["Dark focus indicator", value(darkSite, "--ring", DARK), value(darkSite, "--pub-paper", DARK), 3],
];

let failures = 0;
for (const [name, foreground, background, minimum] of pairs) {
  const ratio = contrast(foreground, background, name);
  const passed = ratio >= minimum;
  if (!passed) failures += 1;
  console.log((passed ? "PASS " : "FAIL ") + name + ": " + ratio.toFixed(2) + ":1 (minimum " + minimum.toFixed(1) + ":1)");
}

assert.equal(failures, 0, failures + " public palette contrast pair(s) failed.");
console.log("PASS: all 24 public Srikandi light/dark contrast pairs meet their configured WCAG thresholds.");
