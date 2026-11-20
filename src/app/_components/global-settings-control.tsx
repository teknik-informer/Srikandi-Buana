"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREFERENCE_DEFAULTS, PREFERENCE_REGISTRY, type PreferenceKey, type PreferenceValueMap } from "@/lib/preferences/preferences-config";
import { applyPreference } from "@/lib/preferences/preference-runtime";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { THEME_PRESET_OPTIONS } from "@/lib/preferences/theme";
import { fontOptions } from "@/lib/fonts/registry";

const options: { key: PreferenceKey; label: string; values: { value: string; label: string }[] }[] = [
  { key: "theme_mode", label: "Mode tampilan", values: [{ value: "light", label: "Terang" }, { value: "dark", label: "Gelap" }, { value: "system", label: "Ikuti perangkat" }] },
  { key: "theme_preset", label: "Palet warna", values: THEME_PRESET_OPTIONS.map((item) => ({ value: item.value, label: item.label })) },
  { key: "font", label: "Tipografi", values: fontOptions.map(({ key, label }) => ({ value: key, label })) },
  { key: "content_layout", label: "Lebar konten", values: [{ value: "centered", label: "Terpusat" }, { value: "full-width", label: "Lebar penuh" }] },
  { key: "navbar_style", label: "Perilaku header", values: [{ value: "sticky", label: "Tetap di atas" }, { value: "scroll", label: "Mengikuti halaman" }] },
  { key: "sidebar_variant", label: "Tampilan navigasi", values: [{ value: "sidebar", label: "Standar" }, { value: "inset", label: "Inset" }, { value: "floating", label: "Mengambang" }] },
  { key: "sidebar_collapsible", label: "Navigasi saat diciutkan", values: [{ value: "icon", label: "Ikon" }, { value: "offcanvas", label: "Sembunyi penuh" }] },
];

export default function GlobalSettingsControl() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PreferenceValueMap>({ ...PREFERENCE_DEFAULTS });

  useEffect(() => {
    const root = document.documentElement;
    const next = { ...PREFERENCE_DEFAULTS };
    (Object.keys(PREFERENCE_REGISTRY) as PreferenceKey[]).forEach((key) => {
      const raw = root.getAttribute(PREFERENCE_REGISTRY[key].attribute);
      const allowed = PREFERENCE_REGISTRY[key].values as readonly string[];
      if (raw && allowed.includes(raw)) next[key] = raw as never;
    });
    setValues(next);
  }, []);

  function update<K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]) {
    applyPreference(key, value);
    setValues((current) => ({ ...current, [key]: value }));
    void persistPreference(key, value);
  }

  function reset() {
    (Object.keys(PREFERENCE_DEFAULTS) as PreferenceKey[]).forEach((key) => {
      update(key, PREFERENCE_DEFAULTS[key] as never);
    });
  }

  return (
    <div className="global-settings-control">
      <Button type="button" variant="ghost" size="icon" className="workspace-icon-button" aria-label="Pengaturan tampilan" title="Pengaturan tampilan" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Settings2 />
      </Button>
      {open && (
        <section className="global-settings-panel" aria-label="Pengaturan tampilan aplikasi">
          <div className="global-settings-heading">
            <div><strong>Pengaturan tampilan</strong><span>Berlaku di seluruh ruang kerja pada browser ini</span></div>
            <Button type="button" variant="ghost" size="icon" aria-label="Tutup pengaturan" onClick={() => setOpen(false)}><X /></Button>
          </div>
          <div className="global-settings-fields">
            {options.map((item) => (
              <label className="global-settings-field" key={item.key}>
                <span>{item.label}</span>
                <select value={values[item.key]} onChange={(event) => update(item.key, event.target.value as never)}>
                  {item.values.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="global-settings-footer">
            <span>Preferensi tersimpan otomatis pada browser ini.</span>
            <Button type="button" variant="outline" size="sm" onClick={reset}><RotateCcw /> Pulihkan standar</Button>
          </div>
        </section>
      )}
    </div>
  );
}
