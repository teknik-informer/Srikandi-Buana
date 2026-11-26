import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const MAX_FILE_BYTES = 3 * 1024 * 1024;

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryUploadResult {
  asset_id: string;
  public_id: string;
  version: number;
  resource_type: "image" | "video" | "raw";
  format?: string;
  bytes: number;
}

export interface StoredFileAsset {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  category: string;
  scope_kind: "organization" | "field" | "self";
  scope_ref: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  cloudinary_asset_id: string;
  cloudinary_public_id: string;
  cloudinary_resource_type: "image" | "video" | "raw";
  cloudinary_delivery_type: "authenticated";
  cloudinary_version: number;
  cloudinary_format: string | null;
  status: "active" | "revoked";
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment is not configured.");
  }
  if (!/^[a-z0-9-]{2,64}$/i.test(cloudName) || !/^\d+$/.test(apiKey)) {
    throw new Error("Cloudinary environment is invalid.");
  }
  return { cloudName, apiKey, apiSecret };
}

export function sanitizeStoredFileName(value: string): string {
  const leaf = value.replace(/\\/g, "/").split("/").pop() ?? "";
  return leaf
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N} ._()\-]/gu, "_")
    .trim()
    .slice(0, 180);
}

export function resourceTypeForMime(mimeType: string): "image" | "video" | "raw" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}

export function isAllowedFile(file: File): boolean {
  const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "video/mp4",
  ]);
  return file.size > 0 && file.size <= MAX_FILE_BYTES && allowed.has(file.type);
}

export async function verifyFileSignature(file: File): Promise<Buffer> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type;
  const valid =
    (mime === "application/pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-") ||
    (mime === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) ||
    (mime === "image/webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
    (mime.startsWith("application/vnd.openxmlformats-officedocument.") && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (mime === "video/mp4" && bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp");
  if (!valid) throw new Error("Isi berkas tidak cocok dengan format yang diizinkan.");
  return bytes;
}

export async function uploadCloudinaryAsset(input: {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  organizationId: string;
  assetId: string;
}): Promise<CloudinaryUploadResult> {
  const config = getCloudinaryConfig();
  const resourceType = resourceTypeForMime(input.mimeType);
  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.bytes)], { type: input.mimeType });
  form.set("file", blob, input.fileName);
  form.set("folder", `srikandi-buana/${input.organizationId}`);
  const rawExtensionByMime: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  };
  const publicId = resourceType === "raw"
    ? `${input.assetId}.${rawExtensionByMime[input.mimeType] ?? "bin"}`
    : input.assetId;
  form.set("public_id", publicId);
  form.set("type", "authenticated");
  form.set("overwrite", "false");
  form.set("unique_filename", "false");
  form.set("use_filename", "false");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`,
      },
      body: form,
      cache: "no-store",
    },
  );
  const payload = await response.json() as CloudinaryUploadResult & { error?: { message?: string } };
  if (!response.ok || !payload.asset_id || !payload.public_id || !payload.version || payload.bytes !== input.bytes.byteLength) {
    throw new Error(payload.error?.message || "Cloudinary menolak unggahan berkas.");
  }
  return payload;
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createOpaqueShareToken(): string {
  return randomBytes(32).toString("base64url");
}

function cloudinaryUrlSignature(value: string, secret: string): string {
  const digest = createHash("sha1").update(value + secret).digest("base64");
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "").slice(0, 8);
}

/** Creates a signed delivery URL for an authenticated Cloudinary asset. */
export function getCloudinarySignedDeliveryUrl(asset: Pick<StoredFileAsset,
  "cloudinary_public_id" | "cloudinary_resource_type" | "cloudinary_delivery_type" | "cloudinary_version" | "cloudinary_format"
>): string {
  const config = getCloudinaryConfig();
  if (asset.cloudinary_delivery_type !== "authenticated") {
    throw new Error("Unsupported Cloudinary delivery type.");
  }
  const publicId = asset.cloudinary_public_id
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const rawHasExtension = asset.cloudinary_resource_type === "raw" &&
    !!asset.cloudinary_format &&
    asset.cloudinary_public_id.toLowerCase().endsWith(`.${asset.cloudinary_format.toLowerCase()}`);
  const extension = asset.cloudinary_resource_type !== "raw" && asset.cloudinary_format
    ? `.${asset.cloudinary_format}`
    : asset.cloudinary_resource_type === "raw" && asset.cloudinary_format && !rawHasExtension
      ? `.${asset.cloudinary_format}`
      : "";
  const versionPath = `v${asset.cloudinary_version}/`;
  const signingPayload = `${versionPath}${asset.cloudinary_public_id}${extension}`;
  const signature = cloudinaryUrlSignature(signingPayload, config.apiSecret);
  return `https://res.cloudinary.com/${config.cloudName}/${asset.cloudinary_resource_type}/authenticated/s--${signature}--/${versionPath}${publicId}${extension}`;
}

export async function fetchCloudinaryAsset(asset: StoredFileAsset): Promise<Response> {
  const url = getCloudinarySignedDeliveryUrl(asset);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok || !response.body) {
    throw new Error(`Cloudinary delivery failed (${response.status}).`);
  }
  return response;
}

export function attachmentDisposition(fileName: string, inline: boolean): string {
  const safeName = sanitizeStoredFileName(fileName) || "berkas";
  const fallback = safeName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "berkas";
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}
