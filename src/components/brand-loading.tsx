import type { ReactNode } from "react";
import BrandLogo from "./brand-logo";

type BrandLoadingProps = {
  startup?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
};

function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" role="presentation" focusable="false">
      <rect width="64" height="64" rx="15" fill="#123d32" />
      <circle cx="44" cy="17" r="5" fill="#d2ad62" opacity=".3" />
      <g
        fill="none"
        stroke="#fff9eb"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path pathLength="1" d="M31 48V31" />
        <path pathLength="1" d="M31 39C18 40 15 31 15 24c12-1 16 6 16 15Z" />
        <path pathLength="1" d="M31 31C31 18 39 14 49 15c0 11-6 17-18 16Z" />
        <path pathLength="1" d="M18 49h28" />
      </g>
    </svg>
  );
}

export default function BrandLoading({
  startup = false,
  label = "Menyiapkan ruang tumbuh Anda…",
  hint = "Srikandi Buana · Ngadimulyo, Kedu, Temanggung",
  className = "",
  children,
}: BrandLoadingProps) {
  const classes = [
    "brand-stage",
    startup ? "brand-stage--startup" : "brand-stage--inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role={startup ? undefined : "status"}
      aria-live={startup ? undefined : "polite"}
      aria-busy={startup ? undefined : true}
    >
      <div className="brand-stage-atmosphere" aria-hidden="true">
        <span className="brand-stage-glow" />
        <span className="brand-stage-grid" />
        <span className="brand-stage-vignette" />
      </div>
      <div className="brand-stage-content">
        <div className="brand-mark-reveal" aria-hidden="true">
          <span className="brand-mark-ring" />
          <BrandMark />
        </div>
        <div className="brand-wordmark-reveal" aria-hidden="true">
          <BrandLogo priority />
        </div>
        <p className="brand-stage-eyebrow" aria-hidden="true">
          {hint}
        </p>
        <div className="brand-progress" aria-hidden="true">
          <span className="brand-progress-fill" />
          <span className="brand-progress-shine" />
        </div>
        <p className="brand-stage-label" aria-hidden={startup ? true : undefined}>
          {label}
        </p>
        {children}
      </div>
      <span className="brand-stage-baseline" aria-hidden="true" />
    </div>
  );
}
