import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync('src/app/globals.css', 'utf8');
const loading = readFileSync('src/components/brand-loading.tsx', 'utf8');
const startup = readFileSync('src/components/brand-startup.tsx', 'utf8');
const rootLoading = readFileSync('src/app/loading.tsx', 'utf8');

for (const name of [
  'brand-curtain-out',
  'brand-line-drop',
  'brand-hero-in',
  'brand-hero-settle',
  'brand-halo-in',
  'brand-sweep',
  'brand-progress-fill',
  'brand-rise',
]) {
  assert.match(css, new RegExp(`@keyframes\\s+${name}\\{`), `missing keyframe ${name}`);
}
for (const removed of ['brand-mark-in', 'brand-mark-draw', 'brand-ring-in', 'brand-reveal', 'brand-emblem-in', 'brand-wordmark-in']) {
  assert(!css.includes(removed), `obsolete plant mark animation remains: ${removed}`);
}
assert(css.includes('.brand-stage--startup{position:fixed;inset:0;min-height:100dvh;z-index:1000;pointer-events:none'));
assert(css.includes('.brand-stage--startup .brand-skip{pointer-events:auto}'));
assert(css.includes('.brand-stage--full{min-height:100dvh}'));
assert(css.includes('@media(prefers-reduced-motion:reduce){.brand-stage--startup{display:none}'));

assert(loading.includes('/brand/vertical.webp'), 'official stacked logo must drive the intro');
assert(!loading.includes('<svg'), 'no invented plant SVG in the brand loader');
assert(!loading.includes('pathLength'), 'no invented drawn mark in the brand loader');
assert(loading.includes('role={startup ? undefined : "status"}'));
assert(loading.includes('aria-live={startup ? undefined : "polite"}'));
assert(loading.includes('className="brand-progress-fill"'));

assert(startup.includes('sessionStorage.getItem(INTRO_KEY)'));
assert(startup.includes('sessionStorage.setItem(INTRO_KEY, "1")'));
assert(startup.includes('matchMedia("(prefers-reduced-motion: reduce)")'));
assert(startup.includes('event.key === "Escape"'));
assert(startup.includes('setTimeout(dismiss, INTRO_DURATION)'));
assert(startup.includes('aria-label="Lewati animasi pembuka"'));
assert(rootLoading.includes('brand-stage--full'));

console.log('PASS brand motion: official vertical logo, cinematic intro, staged loading, skip/reduced-motion fallbacks and session guard.');
