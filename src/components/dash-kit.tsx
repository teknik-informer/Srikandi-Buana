"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, TrendingUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Activity line chart — hand-rolled SVG, no chart dependency          */
/* ------------------------------------------------------------------ */

export type Series = { key: string; label: string; color: string; points: number[] };

/**
 * Interactive, honest line chart: the range tabs re-bucket the same underlying
 * events (they never invent a second dataset) and hovering a point reveals its
 * exact value with the period label it belongs to.
 */
export function ActivityChart({
  series,
  labels,
  ranges,
  title,
  subtitle,
  icon,
}: {
  series: Series[];
  /** One label per x position, per range key. */
  labels: Record<string, string[]>;
  ranges: { key: string; label: string }[];
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  const [range, setRange] = useState(ranges[ranges.length - 1]?.key ?? "");
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/[:]/g, "");

  const W = 720, H = 240, PAD_L = 40, PAD_R = 18, PAD_T = 16, PAD_B = 32;
  const all = series.flatMap((s) => s.points);
  const peak = Math.max(...all, 1);
  // Integer series (counts per day) need a tight axis, otherwise every line
  // sits flat on the baseline. Big money-style series still round up to 50s.
  const max = peak <= 20 ? Math.max(4, Math.ceil(peak * 1.25)) : Math.ceil(peak / 50) * 50;
  const n = Math.max(...series.map((s) => s.points.length), 2);
  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1);
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);

  const path = (pts: number[]) =>
    pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = (pts: number[]) =>
    `${path(pts)} L${x(pts.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  const grid = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f)))];
  const shown = labels[range] ?? [];

  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#eaf6ec] text-[#127e2f]">{icon ?? <TrendingUp size={16} />}</span>
          <div>
            <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
            {subtitle ? <p className="text-[11px] text-muted">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-[#f4f7f2] p-0.5" role="tablist" aria-label={`Rentang ${title}`}>
          {ranges.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => { setRange(r.key); setHover(null); }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                range === r.key ? "bg-white text-[#127e2f] shadow-sm ring-1 ring-[#d7e7d6]" : "text-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative mt-1 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full max-w-full" role="img" aria-label={`${title}: ${series.map((s) => `${s.label} ${s.points.join(", ")}`).join("; ")}`}>
          <defs>
            <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color ?? "#127e2f"} stopOpacity="0.16" />
              <stop offset="100%" stopColor={series[0]?.color ?? "#127e2f"} stopOpacity="0" />
            </linearGradient>
          </defs>
          {grid.map((v) => (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#eef1ee" strokeWidth="1" />
              <text x={PAD_L - 8} y={y(v) + 3.5} textAnchor="end" fontSize="9.5" fill="#8a958a">{v}</text>
            </g>
          ))}
          {shown.map((lab, i) => (
            <text
              key={lab + i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={n > 10 ? 11 : 9.5}
              fill="#8a958a"
              // thin the axis so labels never collide on narrow screens
              opacity={n > 14 ? (i % 3 === 0 ? 1 : 0) : n > 7 ? (i % 2 === 0 ? 1 : 0) : 1}
            >
              {lab}
            </text>
          ))}

          {hover !== null ? (
            <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={H - PAD_B} stroke="#c9d4c6" strokeWidth="1" strokeDasharray="3 3" />
          ) : null}

          {series[0] ? <path d={area(series[0].points)} fill={`url(#g-${uid})`} /> : null}
          {series.map((s) => (
            <path key={s.key} d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {series.map((s) =>
            s.points.map((v, i) => (
              <circle
                key={`${s.key}-${i}`}
                cx={x(i)} cy={y(v)}
                r={hover === i ? 4.6 : 2.8}
                fill="#fff" stroke={s.color} strokeWidth="2"
              />
            )),
          )}

          {/* One hit band per x position: hovering reads every series at once,
              and nothing can be covered by a series drawn later. */}
          {shown.map((_, i) => {
            const half = (W - PAD_L - PAD_R) / Math.max(n - 1, 1) / 2;
            return (
              <rect
                key={`hit-${i}`}
                x={x(i) - half} y={PAD_T} width={Math.max(half * 2, 8)} height={H - PAD_T - PAD_B}
                fill="transparent" className="cursor-crosshair"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}
              />
            );
          })}
        </svg>

        {hover !== null ? (
          <div
            className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-[8px] border border-line bg-white px-2.5 py-1.5 shadow-[0_8px_20px_-8px_rgba(15,26,43,0.35)]"
            style={{
              left: `${Math.min(Math.max((x(hover) / W) * 100, 13), 87)}%`,
              top: "4px",
            }}
            role="status"
          >
            <div className="text-[10px] font-semibold text-muted">{shown[hover] ?? ""}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-[11.5px] leading-tight">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                <span className="font-bold tabular-nums text-ink">{s.points[hover] ?? 0}</span>
                <span className="font-medium text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut — program status                                             */
/* ------------------------------------------------------------------ */

export function DonutCard({
  title,
  total,
  centerLabel,
  headline,
  segments,
  legendNote,
}: {
  title: string;
  total: number;
  centerLabel: string;
  /** Numerator for the big number. Defaults to the first segment. */
  headline?: number;
  segments: { label: string; value: number; color: string }[];
  legendNote?: string;
}) {
  const R = 54, C = 2 * Math.PI * R;
  const num = headline ?? segments[0]?.value ?? 0;
  const pct = total > 0 ? Math.round((num / total) * 100) : 0;
  let offset = 0;

  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#eaf6ec] text-[#127e2f]">
          <TrendingUp size={16} />
        </span>
        <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
      </div>
      <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <div className="relative">
          <svg viewBox="0 0 140 140" className="h-[132px] w-[132px]" role="img" aria-label={`${title}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
            <circle cx="70" cy="70" r={R} fill="none" stroke="#eef1ee" strokeWidth="14" />
            {segments.map((s) => {
              const len = total > 0 ? (s.value / total) * C : 0;
              const el = (
                <circle
                  key={s.label}
                  cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="14"
                  strokeDasharray={`${Math.max(len - 2, 0)} ${C}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  transform="rotate(-90 70 70)"
                />
              );
              offset += len;
              return el;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-[24px] font-extrabold leading-none text-[#14351f]">{pct}%</div>
              <div className="mt-0.5 text-[10.5px] text-muted">{centerLabel}</div>
            </div>
          </div>
        </div>
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:block sm:space-y-1.5">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-ink2">{s.label}</span>
              <span className="font-semibold tabular-nums text-ink">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
      {legendNote ? <p className="mt-1 text-center text-[10px] text-muted2">{legendNote}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda timeline                                                     */
/* ------------------------------------------------------------------ */

export function AgendaCard({
  items,
  href,
  linkLabel,
}: {
  items: { time: string; title: string; place: string; color: string; href?: string }[];
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#eaf6ec] text-[#127e2f]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M8 2v4M16 2v4M3 10h18" />
            </svg>
          </span>
          <h3 className="font-display text-[15px] font-bold text-ink">Agenda Hari Ini</h3>
        </div>
        <Link href={href} className="text-[11px] font-semibold text-[#127e2f] hover:underline">{linkLabel}</Link>
      </div>
      <ol className="relative mt-3 space-y-0 overflow-hidden">
        {items.map((it, i) => (
          <li key={it.title + i} className="relative flex gap-3 pb-3 last:pb-0">
            {i < items.length - 1 && <span className="absolute left-[calc(44px+5px)] top-4 h-full w-px bg-[#e4ebe3]" aria-hidden />}
            <span className="w-[44px] shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-ink2">{it.time}</span>
            <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: it.color }} />
            <span className="min-w-0 flex-1">
              {it.href ? (
                <Link href={it.href} className="block text-[12.5px] font-semibold leading-snug text-ink hover:text-[#127e2f]">{it.title}</Link>
              ) : (
                <span className="block text-[12.5px] font-semibold leading-snug text-ink">{it.title}</span>
              )}
              <span className="block truncate text-[11px] text-muted">{it.place}</span>
            </span>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-[12px] text-muted">Tidak ada agenda tersisa untuk hari ini.</li>}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activity feed                                                */
/* ------------------------------------------------------------------ */

export function RecentCard({
  items,
  href,
  linkLabel,
  title = "Aktivitas Terbaru",
}: {
  items: { title: string; meta: string; pill: string; pillClass: string; icon: React.ReactNode; iconClass: string }[];
  href: string;
  linkLabel: string;
  title?: string;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#fdf3d2] text-[#b07c0a]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" /></svg>
          </span>
          <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#127e2f] hover:underline">
          {linkLabel} <ArrowRight size={12} />
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-[#f0f3ef]">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${it.iconClass}`}>{it.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-ink">{it.title}</span>
              <span className="block text-[10.5px] text-muted">{it.meta}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${it.pillClass}`}>{it.pill}</span>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-[12px] text-muted">Belum ada aktivitas pada periode ini.</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick access tiles                                                  */
/* ------------------------------------------------------------------ */

const TILE: Record<string, string> = {
  green: "bg-[#eaf6ec] text-[#127e2f]",
  blue: "bg-[#e8f2fd] text-[#1f6fd0]",
  violet: "bg-[#f2ecfd] text-[#6b45c9]",
  orange: "bg-[#fdf0e6] text-[#c96a17]",
  teal: "bg-[#e6f6f3] text-[#0f7f6c]",
  slate: "bg-[#eef1f6] text-[#3f5670]",
};

export function QuickAccess({
  items,
}: {
  items: { label: string; href: string; icon: React.ReactNode; tone: keyof typeof TILE }[];
}) {
  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#f2ecfd] text-[#6b45c9]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
          </svg>
        </span>
        <h3 className="font-display text-[15px] font-bold text-ink">Akses Cepat</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((it) => (
          <Link
            key={it.href + it.label}
            href={it.href}
            className={`group flex items-center gap-2 rounded-[11px] px-2.5 py-2.5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-14px_rgba(15,26,43,0.4)] ${TILE[it.tone]}`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-white/70">{it.icon}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold">{it.label}</span>
            <ArrowUpRight size={12} className="shrink-0 opacity-0 transition group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* News card with carousel                                             */
/* ------------------------------------------------------------------ */

export function NewsCard({
  items,
}: {
  items: { title: string; excerpt: string; date: string; href: string; image: string; tag: string }[];
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx] ?? items[0];
  if (!item) return null;
  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#eaf6ec] text-[#127e2f]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v8a2 2 0 0 1-2 2" /><path d="M7 9h7M7 12.5h7M7 16h4" />
            </svg>
          </span>
          <h3 className="font-display text-[15px] font-bold text-ink">Berita &amp; Informasi</h3>
        </div>
        <Link href="/kabar" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#127e2f] hover:underline">
          Lihat Semua <ArrowRight size={12} />
        </Link>
      </div>
      <div className="mt-3 flex gap-3">
        <Link href={item.href} className="block h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" className="h-full w-full object-cover" width={208} height={208} />
        </Link>
        <div className="min-w-0">
          <span className="sb-chip !py-0.5 !text-[10px]">{item.tag}</span>
          <Link href={item.href} className="mt-1 block text-[13px] font-bold leading-snug text-ink hover:text-[#127e2f]">
            {item.title}
          </Link>
          <div className="mt-0.5 text-[10.5px] text-muted2">{item.date}</div>
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">{item.excerpt}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Berita ${i + 1}`}
            aria-current={i === idx}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-[#127e2f]" : "w-1.5 bg-[#dfe6dd] hover:bg-[#c9d4c6]"}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Growth CTA — green gradient card with seedling photo                */
/* ------------------------------------------------------------------ */

export function GrowthCard({ href }: { href: string }) {
  return (
    <div className="relative overflow-hidden rounded-[16px] bg-[#1d5c26] p-4 text-white shadow-[0_18px_35px_-22px_rgba(18,61,50,0.7)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/galeri-pelatihan.jpg" alt="" aria-hidden className="absolute inset-y-0 right-0 h-full w-[52%] object-cover opacity-70" style={{ maskImage: "linear-gradient(90deg, transparent, #000 55%)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 55%)" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1d5c26] via-[#1d5c26]/90 to-transparent" aria-hidden />
      <div className="relative">
        <h3 className="font-display text-[17px] leading-tight font-extrabold">Mari Bertumbuh<br />Bersama</h3>
        <p className="mt-1.5 max-w-[24ch] text-[11.5px] leading-relaxed text-white/85">
          Bergabunglah dalam berbagai program pemberdayaan dan kemitraan.
        </p>
        <Link href={href} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-[#14351f] transition hover:bg-[#f4f8f3]">
          Jelajahi Peluang <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KPI strip                                                          */
/* ------------------------------------------------------------------ */

export type Kpi = {
  label: string;
  value: string;
  delta?: string;
  note: string;
  href: string;
  tone: "green" | "blue" | "amber" | "violet" | "teal";
  icon: React.ReactNode;
  watermark: React.ReactNode;
};

const KPI_TINT: Record<Kpi["tone"], { bg: string; ink: string; sub: string; mark: string }> = {
  green: { bg: "#eef8ef", ink: "#14532a", sub: "#3f6b48", mark: "#bfe2c4" },
  blue: { bg: "#eef5fd", ink: "#0f3f6d", sub: "#3c5f80", mark: "#bfd6ee" },
  amber: { bg: "#fdf6e8", ink: "#6d4708", sub: "#7a6231", mark: "#ecd9a6" },
  violet: { bg: "#f5f1fe", ink: "#45307f", sub: "#5e5185", mark: "#d7cbef" },
  teal: { bg: "#ecf7f8", ink: "#0d5257", sub: "#356a6d", mark: "#bde0e2" },
};

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((k) => {
        const t = KPI_TINT[k.tone];
        return (
          <Link
            key={k.label}
            href={k.href}
            className="group relative overflow-hidden rounded-[14px] border border-transparent p-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-22px_rgba(15,26,43,0.45)]"
            style={{ background: t.bg }}
          >
            <span className="pointer-events-none absolute -bottom-2 -right-1 opacity-[0.5]" style={{ color: t.mark }} aria-hidden>
              {k.watermark}
            </span>
            <div className="relative flex items-start gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: t.ink }}>
                {k.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold leading-tight" style={{ color: t.sub }}>{k.label}</div>
                <div className="mt-0.5 font-display text-[19px] font-extrabold leading-tight tabular-nums" style={{ color: t.ink }}>{k.value}</div>
                {k.delta ? (
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "#127e2f" }}>
                    <ArrowUpRight size={10} /> {k.delta}
                  </div>
                ) : null}
                <div className="text-[10px] leading-tight" style={{ color: t.sub }}>{k.note}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace profile card                                             */
/* ------------------------------------------------------------------ */

export function WorkspaceCard({ pct, label, name, role, href }: { pct: number; label: string; name: string; role: string; href: string }) {
  return (
    <div className="rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Workspace Anda</h3>
        <span className="rounded-full bg-[#eaf6ec] px-2 py-0.5 text-[10px] font-semibold text-[#127e2f]">Profil Lengkap</span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div
          className="relative grid h-[64px] w-[64px] shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#127e2f 0 ${pct}%, #e9b91c ${pct}% ${Math.min(pct + 4, 100)}%, #e8eee6 ${Math.min(pct + 4, 100)}% 100%)` }}
          role="img"
          aria-label={`Kelengkapan profil ${pct} persen`}
        >
          <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-white font-display text-[14px] font-extrabold text-[#14351f]">{pct}%</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-ink">{name}</div>
          <div className="truncate text-[10.5px] text-muted">{role} · {label}</div>
          <Link href={href} className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-semibold text-ink2 hover:border-primary-300 hover:text-primary-800">
            Lihat Profil <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero banner                                                        */
/* ------------------------------------------------------------------ */

export function HeroBanner({ name, dateLabel, ctaHref }: { name: string; dateLabel: string; ctaHref: string }) {
  return (
    <div className="relative overflow-hidden rounded-[16px] bg-[#14351f]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-dasbor.jpg"
        alt="Enam perempuan tani Srikandi Buana berdiri di kebun kopi Ngadimulyo"
        className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
        width={1584} height={672}
        decoding="async"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d2715]/95 via-[#14351f]/80 to-[#14351f]/10" aria-hidden />
      <div className="relative flex min-h-[132px] flex-col justify-center gap-1.5 px-5 py-4 sm:min-h-[150px] sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 ring-1 ring-inset ring-white/20">
            {dateLabel}
          </span>
          <span className="rounded-full bg-[#e6c56a]/20 px-2.5 py-0.5 text-[10px] font-semibold text-[#f2dda2] ring-1 ring-inset ring-[#e6c56a]/30">
            Data contoh berlabel
          </span>
        </div>
        <h1 className="mt-0.5 max-w-[22ch] font-display text-[22px] font-extrabold leading-[1.15] text-white sm:text-[27px]">
          Selamat Datang di Srikandi Buana
        </h1>
        <p className="font-display text-[12.5px] font-semibold italic text-[#e6c56a]">Bersama, Berdaya, Berjaya</p>
        <div className="mt-1.5">
          <Link href={ctaHref} className="inline-flex items-center gap-1.5 rounded-full bg-[#f2dda2] px-3.5 py-1.5 text-[11.5px] font-bold text-[#2a1f00] shadow-sm transition hover:bg-[#f7e8bb]">
            Lihat Program Kami <ArrowRight size={13} />
          </Link>
        </div>
        <span className="sr-only">{name}</span>
      </div>
    </div>
  );
}

/** Utility used by dashboards: bucket ISO dates into the last N months (demo clock). */
export function monthBuckets(items: string[], months: number) {
  const labels: string[] = [];
  const keys: string[] = [];
  const base = new Date(Date.UTC(2026, 10, 1)); // November 2026 — demo clock
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    labels.push(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getUTCMonth()]);
  }
  return {
    counts: keys.map((k) => items.filter((iso) => iso.startsWith(k)).length),
    labels,
  };
}


