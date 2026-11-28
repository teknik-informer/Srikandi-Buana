import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "src/app/app/(area)/berkas/page.tsx"), "utf8");

assert.match(
  source,
  /COALESCE\(asset\.mime_type,\s*'application\/octet-stream'\)\s+AS mime_type/i,
  "The file listing query must select MIME type and provide a safe fallback.",
);
assert.match(
  source,
  /const mimeType = file\.mime_type \|\| "application\/octet-stream"/,
  "File rendering must normalize missing MIME metadata before using string methods.",
);
assert.match(source, /mimeType\.startsWith\("image\/"\)/, "Image previews and print eligibility must use the normalized MIME type.");

console.log("File center MIME selection and null-safe rendering contract: PASS");
