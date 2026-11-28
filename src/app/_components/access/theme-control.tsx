"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_PRESET_VALUES, type ThemePreset } from "@/lib/preferences/theme";

type Mode = "light" | "dark" | "system";
const modes: Mode[] = ["light", "dark", "system"],
  labels = { light: "terang", dark: "gelap", system: "otomatis" };

/*
 * Nama atribut dan cookie disalin, bukan diimpor dari preferences-config.
 * Mengimpor berkas itu menarik lib/fonts/registry, yang memuat "geist/font/*"
 * — paket yang tidak ada di dependensi proyek ini. Rantai itu tidak pernah
 * dibangun sebelumnya karena tidak ada yang mengimpornya dari klien, jadi
 * impor pertama akan mematahkan build. Nilai di bawah harus tetap sama
 * dengan PREFERENCE_REGISTRY.theme_preset bila kelak disatukan.
 */
const presetAttribute = "data-theme-preset";
const presetCookie = "theme_preset";
const presetLabels: Record<string, string> = {
  default: "Default",
  brutalist: "Brutalist",
  "soft-pop": "Soft Pop",
  tangerine: "Tangerine",
  srikandi: "Srikandi",
};

function readCookie(name: string) {
  try {
    const match = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {}
}

export default function ThemeControl() {
  const [mode, setMode] = useState<Mode>("system");
  const [preset, setPreset] = useState<ThemePreset>("srikandi");
  useEffect(() => {
    /* Skrip boot sudah memasang atribut sebelum hidrasi. Membacanya kembali di
       sini — alih-alih menebak bawaan — membuat tombol menampilkan gaya yang
       benar-benar sedang berlaku, termasuk bawaan baru. */
    const dariDom = document.documentElement.getAttribute(presetAttribute);
    if (dariDom && (THEME_PRESET_VALUES as readonly string[]).includes(dariDom)) {
      setPreset(dariDom as ThemePreset);
    }
    const modeDom = document.documentElement.getAttribute("data-theme-mode");
    try {
      const stored = localStorage.getItem("sb-theme");
      if (stored && modes.includes(stored as Mode)) setMode(stored as Mode);
      else if (modeDom && modes.includes(modeDom as Mode)) setMode(modeDom as Mode);
      else if (document.documentElement.classList.contains("dark")) setMode("dark");
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

  /* Preset hanya dipasang bila bukan default — atribut default sudah dipegang :root. */
  useEffect(() => {
    document.documentElement.setAttribute(presetAttribute, preset);
  }, [preset]);

  const next = modes[(modes.indexOf(mode) + 1) % modes.length];
  const nextPreset = THEME_PRESET_VALUES[(THEME_PRESET_VALUES.indexOf(preset) + 1) % THEME_PRESET_VALUES.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      className="workspace-icon-button"
      aria-label={"Tema " + labels[mode] + ", gaya " + presetLabels[preset] + ". Ganti ke " + labels[next]}
      title={"Tema " + labels[mode] + " · gaya " + presetLabels[preset] + " (klik kanan: ganti gaya)"}
      onClick={() => {
        setMode(next);
        try {
          localStorage.setItem("sb-theme", next);
        } catch {}
        /* Cookie yang sama dibaca theme-boot sebelum hidrasi; atribut data-theme-mode
           juga dipasang supaya perilakunya sama dengan preset. */
        document.documentElement.setAttribute("data-theme-mode", next);
        writeCookie("theme_mode", next);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setPreset(nextPreset);
        writeCookie(presetCookie, nextPreset);
      }}
    >
      {mode === "system" ? <Monitor /> : mode === "dark" ? <Moon /> : <Sun />}
    </Button>
  );
}
