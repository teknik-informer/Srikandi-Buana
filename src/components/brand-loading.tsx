import type { ReactNode } from "react";

type BrandLoadingProps = {
  startup?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
};

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
        <div className="brand-hero-reveal" aria-hidden="true">
          <span className="brand-hero-halo" />
          <img
            className="brand-hero-logo"
            src="/brand/vertical.webp"
            width={700}
            height={700}
            alt=""
            fetchPriority="high"
          />
        </div>
        {!startup && <span className="sr-only">Srikandi Buana</span>}
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
