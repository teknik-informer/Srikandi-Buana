import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getIdentity, can } from "@/lib/session";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import {
  MAX_FILE_BYTES, getCloudinaryConfig, isAllowedFile, sanitizeStoredFileName, sha256Hex,
  uploadCloudinaryAsset, verifyFileSignature,
} from "@/lib/cloudinary-files";

export const runtime = "nodejs";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET() {
  const identity = await getIdentity();
  if (!identity || !can(identity, "files:upload")) {
    return fail("Akses pemeriksaan penyimpanan tidak diizinkan.", 403);
  }

  try {
    getCloudinaryConfig();
    return NextResponse.json({ ready: true }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const invalidConfiguration =
      error instanceof Error && error.message.includes("invalid");
    return NextResponse.json({
      ready: false,
      code: invalidConfiguration ? "invalid_configuration" : "not_configured",
      error: "Layanan penyimpanan belum siap. Administrator perlu memeriksa konfigurasi Cloudinary.",
    }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}

export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity || !can(identity, "files:upload")) return fail("Akses unggah tidak diizinkan.", 403);
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return fail("Permintaan lintas situs ditolak.", 403);
  }

  let phase: "validation" | "cloudinary_upload" | "database_persist" = "validation";
  let cloudinaryUploaded = false;

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_FILE_BYTES + 128 * 1024) {
      return fail("Ukuran permintaan melebihi batas unggahan 3 MiB.", 413);
    }
    const form = await request.formData();
    const submitted = form.get("file");
    if (!(submitted instanceof File)) return fail("Pilih satu berkas untuk diunggah.", 400);
    const fileName = sanitizeStoredFileName(submitted.name);
    if (!fileName || !isAllowedFile(submitted)) {
      return fail("Format tidak didukung atau ukuran melebihi 3 MiB.", 400);
    }

    const scope = String(form.get("scope_kind") ?? "self");
    if (!["self", "field", "organization"].includes(scope)) return fail("Lingkup berkas tidak valid.", 400);
    if (scope === "organization" && !can(identity, "files:manage")) {
      return fail("Hanya pengelola organisasi yang dapat mengunggah berkas lingkup organisasi.", 403);
    }
    if (scope === "field" && !identity.field) {
      return fail("Akun ini tidak memiliki lingkup bidang aktif.", 403);
    }

    const category = String(form.get("category") ?? "general").trim().slice(0, 60) || "general";
    const bytes = await verifyFileSignature(submitted);
    if (bytes.byteLength > MAX_FILE_BYTES) return fail("Ukuran berkas melebihi 3 MiB.", 400);

    const id = randomUUID();
    phase = "cloudinary_upload";
    const cloudinary = await uploadCloudinaryAsset({
      bytes,
      fileName,
      mimeType: submitted.type,
      organizationId: identity.organizationId,
      assetId: id,
    });
    cloudinaryUploaded = true;
    phase = "database_persist";
    const sql = getV9Sql();
    const inserted = await sql`
      WITH asset AS (
        INSERT INTO v9.file_assets (
          id, organization_id, uploaded_by, category, scope_kind, scope_ref,
          file_name, mime_type, size_bytes, sha256, cloudinary_asset_id,
          cloudinary_public_id, cloudinary_resource_type, cloudinary_delivery_type,
          cloudinary_version, cloudinary_format
        )
        VALUES (
          ${id}, ${identity.organizationId}, ${identity.userId}, ${category},
          ${scope}, ${scope === "field" ? identity.field ?? null : null},
          ${fileName}, ${submitted.type}, ${bytes.byteLength}, ${sha256Hex(bytes)},
          ${cloudinary.asset_id}, ${cloudinary.public_id}, ${cloudinary.resource_type},
          'authenticated', ${cloudinary.version}, ${cloudinary.format ?? null}
        )
        RETURNING id, file_name, mime_type, size_bytes, created_at
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT ${identity.organizationId}, ${identity.userId}, 'file.uploaded',
          'file_asset', asset.id::text,
          jsonb_build_object('file_name', asset.file_name, 'mime_type', asset.mime_type,
            'size_bytes', asset.size_bytes, 'scope_kind', ${scope}::text, 'category', ${category}::text)
        FROM asset
        RETURNING id
      )
      SELECT asset.id::text AS id, asset.file_name, asset.mime_type, asset.size_bytes
      FROM asset INNER JOIN audit ON true
    `;
    const row = rowsFromResult<{ id: string; file_name: string; mime_type: string; size_bytes: number }>(inserted)[0];
    if (!row) return fail("Berkas tersimpan di Cloudinary, tetapi pencatatan metadata gagal. Hubungi administrator.", 502);

    return NextResponse.json({ ...row, message: "Berkas berhasil diunggah." }, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const candidateCode =
      error && typeof error === "object" && "code" in error ? error.code : null;
    const databaseCode =
      typeof candidateCode === "string" && /^[A-Z0-9]{5}$/.test(candidateCode)
        ? candidateCode
        : null;
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error("[file-upload] Upload failed", {
      phase,
      errorType,
      databaseCode: databaseCode ?? "unavailable",
      cloudinaryUploaded,
    });
    if (cloudinaryUploaded && phase === "database_persist") {
      return fail(
        "Berkas sudah diterima penyimpanan Cloudinary, tetapi metadata aplikasi belum tersimpan. Jangan unggah ulang berkas yang sama; administrator perlu memulihkan pencatatannya.",
        502,
      );
    }
    return fail(error instanceof Error && error.message.includes("not configured")
      ? "Layanan penyimpanan belum dikonfigurasi oleh administrator."
      : "Unggahan gagal pada tahap pengiriman ke penyimpanan. Periksa berkas dan koneksi, lalu coba kembali.", 502);
  }
}
