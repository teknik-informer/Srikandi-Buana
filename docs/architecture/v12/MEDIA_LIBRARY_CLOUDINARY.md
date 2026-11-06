# Media Library & Cloudinary Integration — v12

## Storage ownership

- PostgreSQL/Neon remains the source of truth for file metadata, owner scope, uploader, publication state, and references.
- The current private archive remains on the existing `file_objects`/`files` path until a separately reviewed storage migration is approved.
- Cloudinary is provisioned as an image/video delivery and transformation layer, not a replacement for authorization or the current document archive.
- Never place Cloudinary API secret, signed upload secret, or Admin API credentials in browser code or `NEXT_PUBLIC_*`.

## Cloudinary account preflight (6 Nov 2026)

- The connected Cloudinary account is on the Free plan.
- Current usage reports 2 resources, 2.7 MB storage, 2 transformations, 0 bandwidth and 25 monthly credits.
- The account's first assets are sample images. No assets under `srikandi-buana` were found before folder provisioning.
- Created empty folders: `srikandi-buana/public/brand`, `public/gallery`, `public/products`, `public/news`, and `private/profiles`.
- Folder paths are organizational only; a `private` folder name does not make a Cloudinary delivery URL private.

## Required upload architecture

1. Browser requests a short-lived signed upload intent from a same-origin server endpoint.
2. Server authenticates the session, checks role and owner scope, validates resource type, allowed formats, size and destination folder.
3. Server creates a narrowly scoped signature; API secret stays server-only.
4. Browser uploads directly to Cloudinary using signed parameters. Public assets use approved public folders; profile/private media uses authenticated delivery or a signed access URL.
5. Browser submits the resulting asset ID/public ID to a server confirmation endpoint.
6. Server verifies the asset with Cloudinary Admin API and checks folder, resource type, dimensions, byte size, format, access type and ownership metadata.
7. Server writes a Neon metadata row only after verification. Failed confirmation must not create a published reference.
8. Public delivery is allowed only for explicitly published content. Private media requires the application's owner/role checks.

## Metadata contract

Persist provider, asset_id, public_id, resource_type, delivery_type, format, bytes, width, height, secure_url (public assets only), owner, uploader_id, visibility, status, created_at, and linked entity/reference. Keep original document binaries out of public delivery.

## Safety and release gates

- Validate file signatures and image decoding, not extension alone.
- Allowlist JPG, PNG, WebP and AVIF for image workflows; document types use a separate allowlist.
- Apply byte and pixel caps before processing.
- Do not use public upload delivery for confidential member documents or profile photos.
- Use idempotency keys for upload confirmation and cleanup for unreferenced assets.
- Keep the current private archive available until migration is verified and old references are backfilled.
- [ ] Cloudinary cloud identity matches the intended app environment.
- [ ] Server-only credentials exist as Vercel Secret values, separately for Preview and Production.
- [ ] Signed upload and verification endpoints pass integration tests.
- [ ] Private profile media cannot be fetched anonymously.
- [ ] Unpublished gallery/product images are not publicly delivered.
- [ ] Upload size, pixel limits, MIME/signature, role and tenant checks pass.
- [ ] Deletion/rename/restore do not orphan published references.
- [ ] Rollback retains the existing Neon private archive and file references.
