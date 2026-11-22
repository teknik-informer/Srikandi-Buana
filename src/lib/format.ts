export function formatIDR(value: number, opts?: { decimals?: boolean }): string {
  const decimals = opts?.decimals ?? false;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function formatDateID(iso: string, style: "long" | "short" | "iso" = "long"): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  if (style === "iso") return iso.slice(0, 10);
  const dd = d.getUTCDate();
  const mm = MONTHS_ID[d.getUTCMonth()];
  const yy = d.getUTCFullYear();
  if (style === "short") return `${dd} ${mm.slice(0, 3)} ${yy}`;
  return `${dd} ${mm} ${yy}`;
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS_ID[d.getUTCDay()]}, ${formatDateID(iso)}`;
}

/** Demo clock — the whole ecosystem is seeded against this date so figures are stable. */
export const DEMO_TODAY = "2026-11-22";
export const DEMO_TODAY_LABEL = "Sabtu, 22 November 2026";

export function daysUntil(iso: string, from = DEMO_TODAY): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(iso + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

export function relativeID(iso: string, from = DEMO_TODAY): string {
  const diff = daysUntil(iso, from);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff === -1) return "Kemarin";
  if (diff > 1) return `${diff} hari lagi`;
  return `${Math.abs(diff)} hari lalu`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => !/^(Hj?\.?|Hj|S\.P\.|S\.Pd|S\.E|Ir\.|Dr\.|Drs\.)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function percent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}
