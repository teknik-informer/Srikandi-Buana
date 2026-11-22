import type { ReactNode } from "react";
import {
  Compass, Archive, Wallet, Users, Sprout, GraduationCap, Store, Home,
  ScanLine, SlidersHorizontal, Globe2, Handshake, FileText, CalendarDays,
  Newspaper, Images, CircleHelp, Info, Phone, ShieldCheck, Cookie, Image,
  Accessibility, TriangleAlert, LogIn, IdCard, Target, ShoppingBag, Network,
  type LucideIcon,
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
  // public mega-menu glyphs (carried over from the previous site's icon set)
  handshake: Handshake,
  file: FileText,
  calendar: CalendarDays,
  news: Newspaper,
  gallery: Images,
  help: CircleHelp,
  info: Info,
  phone: Phone,
  shield: ShieldCheck,
  cookie: Cookie,
  image: Image,
  accessibility: Accessibility,
  alert: TriangleAlert,
  login: LogIn,
  idcard: IdCard,
  target: Target,
  bag: ShoppingBag,
  structure: Network,
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

/**
 * The organisation's own artwork, not a stand-in. `/brand/wordmark.png` is the
 * horizontal lock-up used on the previous production site (green serif
 * "Srikandi", gold "BUANA", orange flame/figure mark). Proportions are fixed by
 * width + aspect-ratio so nothing shifts while the PNG decodes.
 */
export function Wordmark({
  compact = false,
  light = false,
  height = 40,
}: {
  compact?: boolean;
  light?: boolean;
  height?: number;
}) {
  if (compact) {
    return (
      <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-[11px] bg-white ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" aria-hidden className="h-[26px] w-auto" width={63} height={96} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/wordmark-alpha.png"
        alt="Srikandi Buana"
        width={1155}
        height={403}
        style={{ height, width: "auto" }}
        className={light ? "brightness-0 invert" : ""}
        decoding="async"
      />
    </span>
  );
}

/** Vertical emblem used inside the green sidebar / footer blocks. */
export function Emblem({ size = 84 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/emblem-light.png" alt="" aria-hidden width={167} height={256} style={{ height: size, width: "auto" }} decoding="async" />;
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
