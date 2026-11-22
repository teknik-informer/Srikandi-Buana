import type { ReactNode } from "react";
import {
  Compass, Archive, Wallet, Users, Sprout, GraduationCap, Store, Home,
  ScanLine, SlidersHorizontal, Globe2, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  compass: Compass,
  archive: Archive,
  wallet: Wallet,
  users: Users,
  sprout: Sprout,
  graduation: GraduationCap,
  store: Store,
  home: Home,
  scan: ScanLine,
  sliders: SlidersHorizontal,
  globe: Globe2,
};

export function AppIcon({
  name,
  size = 18,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = MAP[name] ?? Globe2;
  return <Icon size={size} strokeWidth={1.9} className={className} aria-hidden />;
}

export function IconBox({ name, tone = "primary" }: { name: string; tone?: "primary" | "accent" }) {
  const bg = tone === "accent" ? "bg-[var(--sb-accent-100)] text-[var(--sb-accent-700)]" : "bg-primary-100 text-primary-800";
  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] ${bg}`}>
      <AppIcon name={name} size={17} />
    </span>
  );
}

export function Wordmark({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-primary text-primary-50 shadow-sm">
        {/* Srikandi-inspired mark: three rising rice stalks */}
        <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden>
          <path d="M18 27V13" stroke="#f1f7e7" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 17c-3.4-.6-5.6-2.9-6-6.4 3.3.3 5.6 2.6 6 6.4Z" fill="#a3c37c" />
          <path d="M18 21.5c3.4-.6 5.6-2.9 6-6.4-3.3.3-5.6 2.6-6 6.4Z" fill="#d58400" />
          <path d="M18 25c-3.4-.6-5.6-2.9-6-6.4 3.3.3 5.6 2.6 6 6.4Z" fill="#a3c37c" />
          <path d="M12.5 28h11" stroke="#f1f7e7" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className={`block font-display text-[17px] font-semibold tracking-tight ${light ? "text-primary-50" : "text-ink"}`}>
            Srikandi Buana
          </span>
          <span className={`block text-[9.5px] font-bold uppercase tracking-[0.22em] ${light ? "text-primary-300" : "text-muted"}`}>
            Temanggung
          </span>
        </span>
      )}
    </span>
  );
}

export function FieldMark({ icon, accent }: { icon: string; accent: string }): ReactNode {
  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-[11px] text-white shadow-sm"
      style={{ backgroundColor: accent }}
    >
      <AppIcon name={icon} size={19} />
    </span>
  );
}
