export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "accent";

export const TONE_STYLES: Record<Tone, string> = {
  success: "bg-[var(--sb-success-bg)] text-[var(--sb-success)] border-[#cfe3cd]",
  warning: "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)] border-[#f0dcae]",
  danger: "bg-[var(--sb-danger-bg)] text-[var(--sb-danger)] border-[#ecc9c3]",
  info: "bg-[var(--sb-info-bg)] text-[var(--sb-info)] border-[#c8ddeb]",
  accent: "bg-[var(--sb-accent-100)] text-[var(--sb-accent-700)] border-[#eed9a6]",
  neutral: "bg-[var(--sb-surface-2)] text-[var(--sb-ink-2)] border-[var(--sb-border)]",
};

export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (/(selesai|disetujui|lunas|diposting|aktif|hadir|lulus|published|terverifikasi|sesuai|masuk)/.test(s)) return "success";
  if (/(menunggu|diajukan|draft|proses|perencanaan|reviu|review|pending|terbatas)/.test(s)) return "warning";
  if (/(ditolak|batal|gagal|dibatalkan|tidak|kurang|telat)/.test(s)) return "danger";
  if (/(berjalan|berlangsung|terjadwal|fix|terkirim)/.test(s)) return "info";
  return "neutral";
}
