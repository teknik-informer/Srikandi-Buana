/** Stop oversized multipart requests before handing bytes to FormData parser. */
export class MultipartLimitError extends Error {
  constructor(message = "Ukuran unggahan melebihi batas.", public status = 413) { super(message); this.name = "MultipartLimitError"; }
}
export async function readLimitedMultipart(request: Request, limit = 4 * 1024 * 1024): Promise<FormData> {
  const type = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data\s*;/i.test(type) || !/boundary=/i.test(type))
    throw new MultipartLimitError("Permintaan harus berupa multipart/form-data.", 400);
  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 0) throw new MultipartLimitError("Ukuran unggahan tidak valid.", 400);
    if (length > limit) throw new MultipartLimitError();
  }
  const reader = request.body?.getReader();
  if (!reader) throw new MultipartLimitError("Berkas unggahan tidak ditemukan.", 400);
  const chunks: Uint8Array[] = [];
  let used = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      used += value.byteLength;
      if (used > limit) {
        await reader.cancel();
        throw new MultipartLimitError();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const payload = new Uint8Array(used); let offset = 0;
  for (const chunk of chunks) { payload.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(payload.buffer as ArrayBuffer, { headers: { "content-type": type } }).formData();
}
