import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("public photo delivery requires an explicit consent record", () => {
  const schema = read("src/lib/srikandi.ts");
  const records = read("src/app/api/records/route.ts");
  const media = read("src/app/media/[id]/route.ts");
  const publicContent = read("src/lib/public-content.ts");

  assert.ok(schema.includes('key:"publicationPermission",label:"Izin publikasi foto sampul"'));
  assert.ok(records.includes("body.kind==='galeri'&&data.status==='Terbit'&&data.publicationPermission!=='Dikonfirmasi'"));
  assert.ok(records.includes("body.kind==='publikasi'&&data.status==='Terbit'&&data.fileId&&data.publicationPermission!=='Dikonfirmasi'"));
  assert.ok(media.includes("json_extract(r.data,'$.publicationPermission')='Dikonfirmasi'"));
  assert.ok(publicContent.includes("json_extract(r.data,'$.publicationPermission')='Dikonfirmasi'"));
  assert.ok(publicContent.includes("d.publicationPermission==='Dikonfirmasi'"));
});

test("gallery media library keeps images private until publication", () => {
  const workspace = read("src/app/_components/workspace.tsx");
  const manager = read("src/app/_components/file-manager.tsx");
  assert.ok(workspace.includes('<FileManager files={files} onChange={load} loading={loading} loadError={error} mode="images" />'));
  assert.ok(manager.includes('mode?: "archive" | "images"'));
  assert.ok(manager.includes('["image/png", "image/jpeg"].includes(f.mime)'));
  assert.ok(manager.includes('&preview=1'));
  assert.ok(manager.includes("Foto tetap privat sampai dipakai pada konten terbit"));
});
