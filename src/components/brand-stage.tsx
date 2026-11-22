"use client";

import { useEffect, useState } from "react";

/**
 * Opening stage, carried over from the previous production site.
 *
 * Structure and copy are the old site's: a centred vertical lock-up of the
 * wordmark, a thin 110px progress rule, and "Menyiapkan ruang tumbuh Anda…".
 * The old build held it until the client hydrated; here it is a short,
 * deterministic reveal (~1.1s) that ends on its own, is skipped when the user
 * prefers reduced motion, and never blocks interaction — a demo must not feel
 * like it is stuck behind a splash screen.
 */
export function BrandStage() {
  const [phase, setPhase] = useState<"hidden" | "shown" | "leaving">("hidden");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    // Only the first page view of the session gets the stage, not every route.
    if (sessionStorage.getItem("sb_stage_seen") === "1") return;
    sessionStorage.setItem("sb_stage_seen", "1");

    setPhase("shown");
    const t1 = setTimeout(() => setPhase("leaving"), 950);
    const t2 = setTimeout(() => setPhase("hidden"), 1420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`brand-stage ${phase === "leaving" ? "brand-stage-leaving pointer-events-none" : ""}`}
      // Decorative: the page behind it is already interactive.
      aria-hidden="true"
    >
      <div className="brand-stage-content">
        <div className="brand-reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/vertical.webp"
            alt=""
            width={700}
            height={700}
            className="brand-wordmark"
            decoding="async"
          />
        </div>
        <span className="brand-progress" aria-hidden />
        <p>Menyiapkan ruang tumbuh Anda…</p>
      </div>
    </div>
  );
}
