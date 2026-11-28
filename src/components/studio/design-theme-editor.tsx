"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { CheckCircle2, History, Palette, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveDesignTheme, type SaveDesignThemeState } from "@/app/actions/design-theme";
import {
  buildDesignThemeCssVariables,
  createThemeFromPreset,
  DESIGN_THEME_PRESETS,
  type DesignThemeColors,
  type DesignThemeRadius,
  type DesignThemeSettings,
} from "@/lib/design-theme-schema";
import type { DesignThemeHistoryItem } from "@/lib/design-theme";

const EMPTY_RESULT: SaveDesignThemeState = { ok: false, message: "" };

const COLOR_FIELDS: Array<{ key: keyof DesignThemeColors; label: string; description: string }> = [
  { key: "primary", label: "Warna utama", description: "Tombol aksi, tautan aktif, dan navigasi" },
  { key: "accent", label: "Warna aksen", description: "Sorotan, indikator, dan elemen penekanan" },
  { key: "canvas", label: "Latar halaman", description: "Permukaan dasar semua halaman" },
  { key: "surface", label: "Latar sekunder", description: "Panel, bidang pencarian, dan area pendukung" },
  { key: "card", label: "Latar kartu", description: "Kartu, dialog, dan bidang konten" },
  { key: "border", label: "Garis pembatas", description: "Tabel, input, dan pemisah komponen" },
  { key: "ink", label: "Teks utama", description: "Judul dan teks dengan prioritas tertinggi" },
  { key: "muted", label: "Teks sekunder", description: "Keterangan, label, dan informasi pendukung" },
];

const RADIUS_OPTIONS: Array<{ value: DesignThemeRadius; label: string; description: string }> = [
  { value: "sharp", label: "Tegas", description: "10 px · tampilan institusional" },
  { value: "balanced", label: "Seimbang", description: "16 px · proporsi standar" },
  { value: "soft", label: "Lembut", description: "20 px · tampilan lebih ramah" },
];

function ColorControl({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white px-3 py-3">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        aria-label={label}
        className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted">{description}</span>
      </span>
      <code className="font-mono text-[10.5px] font-semibold uppercase text-muted2">{value}</code>
    </label>
  );
}

export function DesignThemeEditor({
  initialTheme,
  history,
}: {
  initialTheme: DesignThemeSettings;
  history: DesignThemeHistoryItem[];
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<DesignThemeSettings>(initialTheme);
  const [result, action, pending] = useActionState(saveDesignTheme, EMPTY_RESULT);

  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    if (result.ok) router.refresh();
  }, [result.ok, router]);

  function patchColor(key: keyof DesignThemeColors, value: string) {
    setTheme((current) => ({
      ...current,
      presetId: "custom",
      presetName: "Tema khusus",
      colors: { ...current.colors, [key]: value },
    }));
  }

  function choosePreset(presetId: string) {
    setTheme(createThemeFromPreset(presetId));
  }

  function chooseRadius(radius: DesignThemeRadius) {
    setTheme((current) => ({ ...current, radius }));
  }

  const previewStyle = buildDesignThemeCssVariables(theme) as CSSProperties;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Palette size={16} className="text-primary" /> Preset identitas visual
            </div>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
              Mulai dari preset yang telah disiapkan, lalu sesuaikan paletnya. Perubahan tidak menyunting stylesheet sumber dan dapat dikembalikan ke preset awal.
            </p>
          </div>
          <button type="button" onClick={() => choosePreset("srikandi")} className="sb-btn sb-btn-outline">
            <RotateCcw size={13} /> Kembalikan default
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {DESIGN_THEME_PRESETS.map((preset) => {
            const active = theme.presetId === preset.presetId;
            return (
              <button
                key={preset.presetId}
                type="button"
                onClick={() => choosePreset(preset.presetId)}
                aria-pressed={active}
                className={active ? "rounded-xl border border-primary bg-primary-50 p-3 text-left ring-1 ring-primary/20" : "rounded-xl border border-line bg-paper p-3 text-left hover:border-primary/40"}
              >
                <span className="mb-3 flex items-center gap-1.5">
                  {[preset.colors.primary, preset.colors.accent, preset.colors.canvas, preset.colors.ink].map((color, index) => (
                    <span key={index} className="h-5 flex-1 rounded-md border border-black/5" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="block text-[11.5px] font-semibold text-ink">{preset.presetName}</span>
                <span className="mt-1 block text-[10px] text-muted">{active ? "Preset aktif" : "Terapkan preset"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <div className="text-[13px] font-semibold text-ink">Palet warna organisasi</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">Gunakan pemilih warna untuk mengubah token secara langsung. Nilai disimpan sebagai HEX enam digit dan diterapkan pada tampilan publik serta dashboard.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <ColorControl
                key={field.key}
                label={field.label}
                description={field.description}
                value={theme.colors[field.key]}
                onChange={(value) => patchColor(field.key, value)}
              />
            ))}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="text-[12px] font-semibold text-ink">Karakter sudut komponen</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">Mengatur radius kartu dan kontrol melalui token global, bukan sekadar contoh di halaman editor.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseRadius(option.value)}
                  aria-pressed={theme.radius === option.value}
                  className={theme.radius === option.value ? "rounded-xl border border-primary bg-primary-50 p-3 text-left" : "rounded-xl border border-line bg-paper p-3 text-left"}
                >
                  <span className="block text-[11.5px] font-semibold text-ink">{option.label}</span>
                  <span className="mt-1 block text-[10px] text-muted">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-semibold text-ink">Pratinjau langsung</div>
              <span className="rounded-full border border-line px-2.5 py-1 text-[9.5px] font-semibold text-muted2">Belum disimpan</span>
            </div>
            <div style={previewStyle} className="mt-3 overflow-hidden rounded-[var(--sb-radius)] border border-line bg-canvas p-3 text-ink">
              <div className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-sm)] bg-card px-3 py-2 shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md" style={{ backgroundColor: theme.colors.primary }} />
                  <span className="text-[10px] font-bold">Srikandi Buana</span>
                </span>
                <span className="rounded-full px-2 py-1 text-[9px] font-semibold" style={{ backgroundColor: theme.colors.accent, color: theme.colors.ink }}>Anggota</span>
              </div>
              <div className="mt-3 rounded-[var(--sb-radius)] bg-card p-4 shadow-sm">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.colors.primary }}>Ruang kerja organisasi</div>
                <div className="mt-1 text-[17px] font-bold leading-tight">Bersama tumbuh, bersama berdaya.</div>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: theme.colors.muted }}>Pratinjau token untuk kartu, teks, latar, dan aksi utama.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full px-3 py-1.5 text-[9px] font-semibold text-white" style={{ backgroundColor: theme.colors.primary }}>Simpan perubahan</span>
                  <span className="rounded-full border px-3 py-1.5 text-[9px] font-semibold" style={{ borderColor: theme.colors.border }}>Lihat detail</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.colors.surface }}>
                  <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-surface2 px-3 py-2 text-[10px] leading-relaxed text-muted">
              Pratinjau bersifat lokal sampai tombol simpan ditekan. Perubahan yang tersimpan diterapkan oleh root layout untuk semua halaman.
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <ShieldCheck size={15} className="text-success" /> Pemeriksaan aksesibilitas
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Server memeriksa kontras teks utama dan sekunder pada latar serta kontras tombol utama terhadap teks putih. Kombinasi yang tidak memenuhi rasio WCAG AA 4,5:1 ditolak sebelum tersimpan.
            </p>
          </div>
        </section>
      </div>

      <form action={action} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <input type="hidden" name="settings_json" value={JSON.stringify(theme)} readOnly />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">Terapkan sistem desain</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">Simpan hanya setelah memeriksa pratinjau. Setiap perubahan dicatat pada audit organisasi dan dapat ditelusuri.</p>
          </div>
          <button type="submit" disabled={pending} className="sb-btn sb-btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? <span className="animate-pulse">Menyimpan…</span> : <><Save size={14} /> Simpan dan terapkan</>}
          </button>
        </div>
        {result.message ? (
          <div role="status" className={result.ok ? "mt-3 flex items-start gap-2 rounded-xl bg-success-bg px-3 py-2.5 text-[11px] text-success" : "mt-3 flex items-start gap-2 rounded-xl bg-warning-bg px-3 py-2.5 text-[11px] text-warning"}>
            {result.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <ShieldCheck size={14} className="mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        ) : null}
      </form>

      <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <History size={15} /> Riwayat perubahan tema
        </div>
        <p className="mt-1 text-[10.5px] text-muted">Delapan perubahan terakhir dari jejak audit organisasi.</p>
        {history.length ? (
          <div className="mt-3 divide-y divide-line">
            {history.map((item, index) => (
              <div key={item.changedAt + "-" + index} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-[11px] font-medium text-ink">{item.presetName}</span>
                <span className="text-[10px] tabular-nums text-muted2">{item.changedAt} WIB</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-surface2 px-3 py-3 text-[10.5px] text-muted">Belum ada perubahan tema yang dicatat. Tema bawaan tetap aktif sampai perubahan pertama disimpan.</div>
        )}
      </section>
    </div>
  );
}
