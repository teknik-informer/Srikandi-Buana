import sharp from "sharp";
export async function sanitizeUploadedImage(bytes: ArrayBuffer, mime: string): Promise<ArrayBuffer> {
  try {
    const image = sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== (mime === "image/png" ? "png" : "jpeg") || (metadata.pages ?? 1) > 1) throw Error("invalid image");
    const rotated = image.rotate();
    // Re-encode rather than copy EXIF/location metadata into public images.
    const encoded = await (mime === "image/png" ? rotated.png() : rotated.jpeg({ quality: 90 })).toBuffer();
    if (encoded.byteLength > 3 * 1024 * 1024) throw Error("processed size");
    return Uint8Array.from(encoded).buffer;
  } catch {
    throw Error("Foto tidak dapat dibaca atau terlalu besar setelah diproses. Gunakan JPG/PNG statis maksimal 3 MB dan 40 megapiksel.");
  }
}
