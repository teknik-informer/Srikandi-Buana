import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/presets/srikandi.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const options = readFileSync("src/lib/preferences/theme.ts", "utf8");

assert.match(css, /label:\s*Srikandi/);
assert.match(css, /value:\s*srikandi/);
assert.match(css, /:root\[data-theme-preset="srikandi"\]/);
assert.match(css, /\.dark:root\[data-theme-preset="srikandi"\]/);

for (const token of [
  "--background:", "--foreground:", "--card:", "--card-foreground:",
  "--primary:", "--primary-foreground:", "--secondary:", "--muted:",
  "--accent:", "--accent-foreground:", "--border:", "--input:", "--ring:",
  "--chart-1:", "--chart-2:", "--chart-3:", "--chart-4:", "--chart-5:",
  "--sidebar:", "--sidebar-foreground:", "--sidebar-primary:",
  "--sidebar-primary-foreground:", "--sidebar-accent:",
  "--sidebar-accent-foreground:", "--sidebar-border:", "--sidebar-ring:",
]) {
  assert.ok(css.includes(token), `Missing token ${token}`);
}

assert.ok(globals.includes('@import "../styles/presets/srikandi.css";'));
assert.match(globals, /--primary:\s*oklch\(0\.5191 0\.1477 146\.85\)/);
assert.match(globals, /--background:\s*oklch\(0\.9847 0\.0057 264\.53\)/);
assert.match(options, /label:\s*"Srikandi"/);
assert.match(options, /value:\s*"srikandi"/);
assert.match(options, /light:\s*"oklch\(0\.5191 0\.1477 146\.85\)"/);
assert.match(options, /dark:\s*"oklch\(0\.6288 0\.1674 148\.5\)"/);

console.log("PASS Srikandi visual preset: imported, selectable, complete tokens, light/dark defaults.");
