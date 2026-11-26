import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const cloudinary = read("../src/lib/cloudinary-files.ts");
const upload = read("../src/app/api/files/route.ts");
const download = read("../src/app/api/files/[id]/route.ts");
const share = read("../src/app/api/files/[id]/share/route.ts");
const shareDownload = read("../src/app/api/files/share/[token]/route.ts");
const migration = read("../db/migrations/0043_shared_cloudinary_file_service.sql");
const session = read("../src/lib/session.ts");
const appAccess = read("../src/lib/app-access.ts");
const apps = read("../src/config/apps.ts");
const manager = read("../src/app/app/(area)/berkas/page.tsx");
const previewPage = read("../src/app/app/(area)/berkas/[id]/page.tsx");
const previewClient = read("../src/components/file-preview-client.tsx");
const uploadField = read("../src/components/file-upload-field.tsx");
const shareButton = read("../src/components/file-share-button.tsx");
const secretariatActions = read("../src/app/actions/secretariat-documents.ts");
const secretariatFile = read("../src/app/api/secretariat/documents/[id]/file/route.ts");
const secretariatPage = read("../src/app/app/(area)/sekretariat/dokumen/page.tsx");

assert.match(cloudinary, /import "server-only"/);
assert.match(cloudinary, /CLOUDINARY_CLOUD_NAME/);
assert.match(cloudinary, /CLOUDINARY_API_KEY/);
assert.match(cloudinary, /CLOUDINARY_API_SECRET/);
assert.match(cloudinary, /form\.set\("type", "authenticated"\)/);
assert.match(cloudinary, /randomBytes\(32\)\.toString\("base64url"\)/);
assert.match(cloudinary, /rawExtensionByMime/);
assert.match(cloudinary, /sha1/);
assert.match(cloudinary, /MAX_FILE_BYTES = 3 \* 1024 \* 1024/);

assert.match(upload, /files:upload/);
assert.match(upload, /request\.headers\.get\("origin"\)/);
assert.match(upload, /content-length/);
assert.match(upload, /v9\.file_assets/);
assert.match(upload, /file\.uploaded/);
assert.match(download, /canReadAsset/);
assert.match(download, /Content-Disposition/);
assert.ok(download.includes("linked.revision_no !== linked.latest_revision"));

assert.match(share, /files:share/);
assert.match(share, /token_hash/);
assert.match(share, /sha256Hex\(token\)/);
assert.match(share, /expiresInDays/);
assert.ok(share.includes("link.revoked_at"));
assert.ok(share.includes("file.share_link_created"));
assert.ok(share.includes("file.revision_no <>"));
assert.ok(share.includes("AND link.id = ${shareId}::uuid"));
assert.ok(share.includes("AS exhausted"));
assert.ok(share.includes("link.expires_at::text AS expires_at"));

assert.ok(shareDownload.includes("/^[A-Za-z0-9_-]{43}$/.test(token)"));
assert.ok(shareDownload.includes("link.expires_at > now()"));
assert.ok(shareDownload.includes("link.organization_id = asset.organization_id"));
assert.ok(shareDownload.includes("file.revision_no <>"));

assert.match(migration, /CREATE TABLE IF NOT EXISTS v9\.file_assets/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS v9\.file_share_links/);
assert.match(migration, /cloudinary_delivery_type = 'authenticated'/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS asset_id/);
assert.match(migration, /ALTER COLUMN file_data DROP NOT NULL/);
assert.match(migration, /file_data IS NOT NULL OR asset_id IS NOT NULL/);

assert.match(session, /"files:\*"/);
assert.match(session, /"files:upload"/);
assert.match(apps, /key: "berkas"/);
assert.match(apps, /href: "\/app\/berkas"/);
assert.match(appAccess, /case "berkas":\s+return can\(identity, "files:read"\)/);
assert.match(appAccess, /startsWith\("\/app\/berkas"\)/);

assert.match(uploadField, /fetch\("\/api\/files"/);
assert.match(uploadField, /name=\{name\}/);
assert.match(manager, /FileUploadField/);
assert.match(manager, /FileShareButton/);
assert.ok(manager.includes("file.revision_no <>"));
assert.match(manager, /\/api\/files\/\$\{file\.id\}/);
assert.match(previewPage, /files:read/);
assert.ok(previewPage.includes("linkedDocument.revision_no !== linkedDocument.latest_revision"));
assert.match(previewClient, /target\.print\(\)/);
assert.match(shareButton, /Kelola tautan/);
assert.match(shareButton, /revokeLink/);
assert.match(shareButton, /clipboard\.writeText/);

assert.match(secretariatActions, /resolveUploadedFileAsset/);
assert.match(secretariatActions, /asset_id/);
assert.match(secretariatActions, /file_data, asset_id/);
assert.doesNotMatch(secretariatActions, /decode\(\$\{prepared/);
assert.match(secretariatFile, /fetchCloudinaryAsset/);
assert.match(secretariatFile, /asset_status !== "active"/);
assert.match(secretariatFile, /file\.base64/);
assert.match(secretariatPage, /FileUploadField/);
assert.match(secretariatPage, /FileShareButton/);
assert.ok(secretariatPage.includes('can(identity, "files:share")'));
assert.ok(secretariatPage.includes("document.file_uploaded_by === identity.userId"));
assert.ok(secretariatPage.includes("Buka / cetak"));

for (const clientSource of [uploadField, previewClient, shareButton]) {
  assert.doesNotMatch(clientSource, /CLOUDINARY_API_SECRET|CLOUDINARY_API_KEY/);
}

console.log("Cloudinary file service contract: PASS");
