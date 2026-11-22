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
      <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] bg-white shadow-sm ring-1 ring-black/5">
        {/* Srikandi-inspired mark: rising stalk with leaves — white tile, green stems */}
        <svg viewBox="0 0 36 36" className="h-10 w-10" aria-hidden>
          <path d="M18 27.5V12.5" stroke="#127e2f" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M18 17.5c-3.3-.5-5.5-2.8-5.9-6.3 3.3.3 5.5 2.5 5.9 6.3Z" fill="#4fbf6e" />
          <path d="M18 22c3.3-.5 5.5-2.8 5.9-6.3-3.3.3-5.5 2.5-5.9 6.3Z" fill="#127e2f" />
          <circle cx="18" cy="10.6" r="2.2" fill="#f0b429" />
          <path d="M12.5 28h11" stroke="#127e2f" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className={`block font-display text-[17px] font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>
            Srikandi Buana
          </span>
          <span className={`block text-[9px] font-semibold uppercase tracking-[0.2em] ${light ? "text-primary-200/90" : "text-muted"}`}>
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
