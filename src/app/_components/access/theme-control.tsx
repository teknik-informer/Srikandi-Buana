"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
type Mode = "light" | "dark" | "system";
const modes: Mode[] = ["light", "dark", "system"],
  labels = { light: "terang", dark: "gelap", system: "otomatis" };
export default function ThemeControl() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sb-theme");
      if (stored && modes.includes(stored as Mode)) setMode(stored as Mode);
    } catch {}
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", mode === "dark" || (mode === "system" && media.matches));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);
  const next = modes[(modes.indexOf(mode) + 1) % modes.length];
  return (
    <Button
      variant="ghost"
      size="icon"
      className="workspace-icon-button"
      aria-label={"Tema " + labels[mode] + ". Ganti ke " + labels[next]}
      title={"Tema " + labels[mode]}
      onClick={() => {
        setMode(next);
        try {
          localStorage.setItem("sb-theme", next);
        } catch {}
      }}
    >
      {mode === "system" ? <Monitor /> : mode === "dark" ? <Moon /> : <Sun />}
    </Button>
  );
}
