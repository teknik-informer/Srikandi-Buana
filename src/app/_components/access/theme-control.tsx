"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  THEME_PRESET_OPTIONS,
  THEME_PRESET_VALUES,
  type ThemePreset,
} from "@/lib/preferences/theme";

type Mode = "light" | "dark" | "system";
const modes: readonly Mode[] = ["light", "dark", "system"];
const labels: Record<Mode, string> = {
  light: "terang",
  dark: "gelap",
  system: "otomatis",
};

function readCookie(name: string): string | null {
  try {
    const prefix = name + "=";
    const entry = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string): void {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {
    // The visible session preference still applies when cookies are unavailable.
  }
}

function applyMode(mode: Mode): void {
  const root = document.documentElement;
  const prefersDark =
    mode === "system" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || prefersDark;

  root.setAttribute("data-theme-mode", mode);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

function readMode(): Mode {
  const fromRoot = document.documentElement.getAttribute("data-theme-mode");
  if (modes.includes(fromRoot as Mode)) return fromRoot as Mode;

  const fromCookie = readCookie("theme_mode");
  if (modes.includes(fromCookie as Mode)) return fromCookie as Mode;

  // Migrate the legacy key once; all new writes use the canonical cookie.
  try {
    const legacy = window.localStorage.getItem("sb-theme");
    if (modes.includes(legacy as Mode)) {
      writeCookie("theme_mode", legacy as Mode);
      return legacy as Mode;
    }
  } catch {
    // Private browsing and storage-disabled contexts use the safe default.
  }

  return "system";
}

function readPreset(): ThemePreset {
  const fromRoot = document.documentElement.getAttribute("data-theme-preset");
  if ((THEME_PRESET_VALUES as readonly string[]).includes(fromRoot ?? "")) {
    return fromRoot as ThemePreset;
  }

  const fromCookie = readCookie("theme_preset");
  if ((THEME_PRESET_VALUES as readonly string[]).includes(fromCookie ?? "")) {
    return fromCookie as ThemePreset;
  }

  return "default";
}

export default function ThemeControl() {
  const [mode, setMode] = useState<Mode>("system");
  const [preset, setPreset] = useState<ThemePreset>("default");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setMode(readMode());
    setPreset(readPreset());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyMode(mode);
    apply();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }

    media.addListener(apply);
    return () => media.removeListener(apply);
  }, [initialized, mode]);

  useEffect(() => {
    if (!initialized) return;
    document.documentElement.setAttribute("data-theme-preset", preset);
  }, [initialized, preset]);

  const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length];
  const currentPreset =
    THEME_PRESET_OPTIONS.find((option) => option.value === preset) ??
    THEME_PRESET_OPTIONS[0];

  function changeMode(): void {
    setMode(nextMode);
    writeCookie("theme_mode", nextMode);
    applyMode(nextMode);
  }

  function changePreset(value: string): void {
    if (!(THEME_PRESET_VALUES as readonly string[]).includes(value)) return;
    const nextPreset = value as ThemePreset;
    setPreset(nextPreset);
    writeCookie("theme_preset", nextPreset);
    document.documentElement.setAttribute("data-theme-preset", nextPreset);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="workspace-icon-button"
        aria-label={`Tema ${labels[mode]}. Ganti ke ${labels[nextMode]}`}
        title={`Tema ${labels[mode]} · klik untuk beralih ke ${labels[nextMode]}`}
        onClick={changeMode}
      >
        {mode === "system" ? <Monitor /> : mode === "dark" ? <Moon /> : <Sun />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="workspace-icon-button"
            aria-label={`Pilih gaya tampilan. Saat ini ${currentPreset.label}`}
            title={`Gaya tampilan: ${currentPreset.label}`}
          >
            <Palette />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-44">
          <DropdownMenuLabel>Gaya tampilan</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={preset} onValueChange={changePreset}>
            {THEME_PRESET_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
