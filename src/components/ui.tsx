import Link from "next/link";
import type { ReactNode } from "react";
import { TONE_STYLES, toneForStatus, type Tone } from "@/lib/tone";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`sb-card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <div className="text-[14.5px] font-semibold text-ink">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[12.5px] text-muted">{subtitle}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold ${TONE_STYLES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={toneForStatus(status)}>{status}</Badge>;
}

export function StatCard({
  label,
  value,
  note,
  tone = "neutral",
  href,
  icon,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  href?: string;
  /** Optional glyph — the reference dashboard shows a large soft icon per card. */
  icon?: ReactNode;
}) {
  /* Pastel tinted card, matching the reference dashboard's stat strip. */
  const TINT: Record<string, { bg: string; icon: string; value: string }> = {
    success: { bg: "var(--sb-tint-green)", icon: "var(--sb-primary-700)", value: "var(--sb-primary-900)" },
    info: { bg: "var(--sb-tint-blue)", icon: "#1d6fa5", value: "#12405e" },
    warning: { bg: "var(--sb-tint-amber)", icon: "#7a5210", value: "#5e3f0c" },
    accent: { bg: "var(--sb-tint-violet)", icon: "#6b45c9", value: "#412a86" },
    danger: { bg: "var(--sb-tint-rose)", icon: "var(--sb-danger)", value: "#7d1a14" },
    neutral: { bg: "var(--sb-surface-2)", icon: "var(--sb-muted)", value: "var(--sb-ink)" },
  };
  const t = TINT[tone] ?? TINT.neutral;
  const body = (
    <div
      className="sb-card relative h-full overflow-hidden border-0 px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-lg)]"
      style={{ background: t.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: t.icon }}>{label}</div>
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70"
          style={{ color: t.icon }}
          aria-hidden
        >
          {icon ?? <span className="block h-2 w-2 rounded-full" style={{ background: t.icon }} />}
        </span>
      </div>
      <div className="mt-1 font-display text-[27px] leading-[1.05] font-extrabold" style={{ color: t.value }}>{value}</div>
      {note ? <div className="mt-1 text-[11.5px] text-[var(--sb-ink-2)]/75">{note}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        {eyebrow ? <div className="sb-label mb-1.5">{eyebrow}</div> : null}
        <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sb-sm border border-dashed border-line-strong bg-paper px-6 py-10 text-center">
      {icon ? <div className="mb-2 text-muted2">{icon}</div> : null}
      <div className="font-display text-[16px] font-semibold text-ink">{title}</div>
      <p className="mt-1 max-w-sm text-[12.5px] text-muted">{body}</p>
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-sb-sm border px-3.5 py-3 text-[13px] ${TONE_STYLES[tone]}`}>
      {title ? <div className="mb-0.5 font-semibold">{title}</div> : null}
      <div className="opacity-95">{children}</div>
    </div>
  );
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "accent" | "danger" }) {
  const color =
    tone === "danger" ? "bg-[var(--sb-danger)]" : tone === "accent" ? "bg-[var(--sb-accent)]" : "bg-[var(--sb-primary-500)]";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-surface2">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="text-[11.5px] font-semibold text-muted tabular-nums">{value}%</span>
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const init = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-800"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {init}
    </span>
  );
}

export function Tabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <nav className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-line pb-px">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-[13px] font-semibold transition ${
              isActive
                ? "border-primary-600 text-primary-800"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-[19px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}
