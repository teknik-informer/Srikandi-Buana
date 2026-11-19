"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import BrandLoading from "./brand-loading";

const INTRO_KEY = "sb-brand-intro-cinematic-v1";
const INTRO_DURATION = 2000;

export default function BrandStartup() {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* Storage can be unavailable; the intro still ends on its own. */
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem(INTRO_KEY)) return;
    } catch {
      /* Unavailable storage must not prevent access. */
    }
    setVisible(true);
    const timer = window.setTimeout(dismiss, INTRO_DURATION);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss]);

  if (!visible) return null;

  return (
    <BrandLoading
      startup
      label="Membuka ruang tumbuh…"
      hint="KWT SRIKANDI BUANA · NGADIMULYO, KEDU"
    >
      <button
        type="button"
        className="brand-skip"
        onClick={dismiss}
        aria-label="Lewati animasi pembuka"
      >
        Lewati <ArrowRight size={14} aria-hidden="true" />
      </button>
    </BrandLoading>
  );
}
