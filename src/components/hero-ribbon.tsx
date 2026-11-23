/**
 * The frame that closes the landing hero.
 *
 * The reference artwork does not box the photograph in a card. The image runs
 * edge to edge and the page is opened out of a green field whose top edge
 * sweeps up into a crest, underlined by a broad gold ribbon and a thinner
 * hairline that floats above it. Three curves, one silhouette — that is what
 * reads as a crafted cover instead of a photo with a border.
 *
 * Everything is one SVG. The paths share a single wave so the three bands stay
 * locked together at any width; `preserveAspectRatio="none"` stretches the
 * geometry, which changes the amplitude per breakpoint but never breaks the
 * silhouette. Pure vector, no runtime gradients over photos — it renders the
 * same in the app, on a phone and in a sandboxed preview.
 */

/* The wave the whole frame is built on. Crest sits right of centre, so the
   ribbon lifts toward the photograph's brightest side and settles under the
   copy. */
const CREST = "M0 104 C 260 96, 430 40, 700 44 C 960 48, 1130 92, 1440 78";

/** Same wave, shifted up by `lift` units — used for the gold bands. */
function lifted(y0: number) {
  // the control points carry the shape; shifting every y preserves it exactly
  return `M0 ${104 - y0} C 260 ${96 - y0}, 430 ${40 - y0}, 700 ${44 - y0} C 960 ${48 - y0}, 1130 ${92 - y0}, 1440 ${78 - y0}`;
}

export function HeroRibbon({ id = "hero" }: { id?: string }) {
  const green = `${id}-green`;
  const gold = `${id}-gold`;
  const sheen = `${id}-sheen`;

  return (
    <div className="pointer-events-none relative z-10 mt-auto select-none" aria-hidden>
      <svg
        viewBox="0 0 1440 150"
        preserveAspectRatio="none"
        className="block h-[104px] w-full sm:h-[132px] lg:h-[164px]"
      >
        <defs>
          <linearGradient id={green} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#256b39" />
            <stop offset="0.45" stopColor="#14502a" />
            <stop offset="1" stopColor="#0a2f19" />
          </linearGradient>
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b8871f" />
            <stop offset="0.14" stopColor="#e3bc5c" />
            <stop offset="0.42" stopColor="#f7e6ae" />
            <stop offset="0.72" stopColor="#e2ba58" />
            <stop offset="1" stopColor="#a87a1a" />
          </linearGradient>
          <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.30" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gold hairline, floating clear of the ribbon */}
        <path
          d={`${lifted(44)} L1440 150 L0 150 Z`}
          fill="#efd69a"
          opacity="0.55"
        />

        {/* the ribbon itself — a solid gold band riding the wave */}
        <path d={`${lifted(26)} L1440 150 L0 150 Z`} fill={`url(#${gold})`} />

        {/* green field, its top edge tucked just inside the ribbon */}
        <path d={`${CREST} L1440 150 L0 150 Z`} fill={`url(#${green})`} />

        {/* a soft sheen along the green's crest so the fold reads as a surface */}
        <path d={`${CREST} L1440 150 L0 150 Z`} fill={`url(#${sheen})`} opacity="0.45" />

        {/* warm bounce light where the gold meets the green — this is the
            detail that makes the fold feel cut rather than stacked */}
        <path d={CREST} fill="none" stroke="#f6e3ac" strokeWidth="8" opacity="0.22" />
        <path d={CREST} fill="none" stroke="#e8c266" strokeWidth="2.4" opacity="0.95" />
      </svg>
    </div>
  );
}
