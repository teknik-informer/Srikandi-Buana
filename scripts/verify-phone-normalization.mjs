import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";

const source = readFileSync("src/lib/phone.ts", "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm" });
const moduleUrl = "data:text/javascript;base64," + Buffer.from(compiled.code).toString("base64");
const { normalizeIndonesianMobilePhone } = await import(moduleUrl);

const cases = [
  ["081234567890", "+6281234567890"],
  ["81234567890", "+6281234567890"],
  ["6281234567890", "+6281234567890"],
  ["+6281234567890", "+6281234567890"],
  ["+62 812-3456-7890", "+6281234567890"],
  ["(0812) 3456 7890", "+6281234567890"],
  ["021123456", ""],
  ["12345", ""],
  ["", ""],
];
for (const [input, expected] of cases) {
  assert.equal(normalizeIndonesianMobilePhone(input), expected, "normalization for " + input);
}
console.log("PASS Indonesian WhatsApp normalization: 08…, 8…, 62…, +62…, separators, and invalid values.");
