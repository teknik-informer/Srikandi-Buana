import { requestJSON } from "./request-json";
import { createCSV } from "./csv";
export type Message = {
  id: string; name: string; contact: string; topic: string; message: string; status: string; created: string;
  consent_version?: string | null; consented_at?: string | null;
};
export type MessagePage = { messages: Message[]; total: number; page: number; pages: number; counts: Record<string, number> };
export async function fetchMessagePage({ page, limit, status, query, signal }: {
  page: number; limit: number; status: string; query: string; signal?: AbortSignal;
}): Promise<MessagePage> {
  if (signal?.aborted) throw Error("Permintaan dibatalkan.");
  const params = new URLSearchParams({ page: String(page), limit: String(limit), status, q: query.trim() });
  const { response, data } = await requestJSON<MessagePage & { error?: string }>("/api/messages?" + params, { cache: "no-store", signal });
  if (!response.ok) throw Error(data?.error || "Pesan belum dapat dimuat. Coba lagi.");
  const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
  if (!data || !Array.isArray(data.messages) || !integer(data.total) || !integer(data.page) || data.page < 1 ||
    !integer(data.pages) || data.pages < 1 || data.page > data.pages ||
    data.messages.length > limit || data.pages !== Math.max(1, Math.ceil(data.total / limit)) ||
    data.page !== Math.min(page, data.pages) || !data.counts || typeof data.counts !== "object" ||
    !data.messages.every((m: unknown) => m && typeof m === "object" &&
      ["id", "name", "contact", "topic", "message", "status", "created"].every((key) => typeof (m as Record<string, unknown>)[key] === "string")))
    throw Error("Respons pesan belum lengkap. Muat ulang sebelum melanjutkan.");
  const counts: Record<string, number> = {};
  for (const key of ["Baru", "Dibaca", "Ditindaklanjuti"]) counts[key] = integer(data.counts[key]) ? data.counts[key] : 0;
  return { messages: data.messages, total: data.total, page: data.page, pages: data.pages, counts };
}
export async function exportMessages(status: string, query: string, signal?: AbortSignal) {
  const first = await fetchMessagePage({ page: 1, limit: 100, status, query, signal });
  const unique = new Map(first.messages.map((m) => [m.id, m]));
  for (let page = 2; page <= first.pages; page++) {
    const next = await fetchMessagePage({ page, limit: 100, status, query, signal });
    if (next.page !== page || next.total !== first.total || next.pages !== first.pages)
      throw Error("Daftar pesan berubah selama ekspor. Muat ulang lalu ekspor kembali.");
    for (const message of next.messages) unique.set(message.id, message);
  }
  if (unique.size !== first.total) throw Error("Ekspor belum lengkap. Muat ulang lalu coba kembali.");
  return { count: unique.size, csv: createCSV([
    ["Nama", "Kontak", "Topik", "Pesan", "Status", "Tanggal"],
    ...[...unique.values()].map((m) => [m.name, m.contact, m.topic, m.message, m.status, m.created]),
  ]) };
}
