"use client";

/**
 * Kerangka Website Studio — empat area kerja dalam tab tingkat atas.
 *
 * Sebelumnya kelima tugas (pengaturan, statistik, komposisi, registry block,
 * mega menu) ditumpuk vertikal sehingga halaman mencapai ~3.000 px dan tidak
 * ada penanda posisi. Setiap tab kini memuat satu pekerjaan saja, sehingga
 * pengurus tidak perlu menggulir untuk berpindah konteks.
 *
 * Tab di sini bukan dekorasi: ia memisahkan tiga jenis objek yang berbeda —
 * *pengaturan situs* (dokumen tunggal), *halaman* (daftar + komposisi), *block*
 * (katalog referensi), dan *menu* (navigasi). Mencampurnya dalam satu aliran
 * membuat daftar referensi bersaing dengan formulir yang sedang diisi.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { SlidersHorizontal, Layers, Blocks, Menu, ShoppingBag } from "lucide-react";

type TabKey = "pengaturan" | "halaman" | "katalog" | "block" | "menu";

const TABS: {
  key: TabKey;
  label: string;
  hint: string;
  Icon: typeof SlidersHorizontal;
}[] = [
  { key: "pengaturan", label: "Pengaturan", hint: "Identitas & footer", Icon: SlidersHorizontal },
  { key: "halaman", label: "Halaman", hint: "Komposisi block", Icon: Layers },
  { key: "katalog", label: "Katalog", hint: "Produk & harga", Icon: ShoppingBag },
  { key: "block", label: "Block", hint: "Katalog terdaftar", Icon: Blocks },
  { key: "menu", label: "Menu", hint: "Navigasi utama", Icon: Menu },
];

export function StudioTabs({
  pengaturan,
  halaman,
  katalog,
  block,
  menu,
  badges,
}: {
  pengaturan: ReactNode;
  halaman: ReactNode;
  katalog: ReactNode;
  block: ReactNode;
  menu: ReactNode;
  badges?: Partial<Record<TabKey, string>>;
}) {
  const [tab, setTab] = useState<TabKey>("pengaturan");

  const panels: Record<TabKey, ReactNode> = { pengaturan, halaman, katalog, block, menu };

  return (
    <div>
      {/* ── tab bar: satu baris, ikon + label + keterangan singkat ───────── */}
      <div
        role="tablist"
        aria-label="Area kerja Website Studio"
        className="mb-4 flex flex-wrap gap-1.5 rounded-[12px] border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(16,40,28,0.04)]"
      >
        {TABS.map(({ key, label, hint, Icon }) => {
          const active = tab === key;
          const badge = badges?.[key];
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`tabpanel-${key}`}
              id={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`group flex min-w-[calc(50%-0.375rem)] flex-1 items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition sm:min-w-0 sm:px-3 ${
                active
                  ? "bg-primary text-white shadow-[0_1px_3px_rgba(12,58,36,0.28)]"
                  : "text-ink2 hover:bg-surface2"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-[7px] ${
                  active ? "bg-white/15 text-white" : "bg-surface2 text-muted group-hover:text-ink2"
                }`}
              >
                <Icon size={14} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="block truncate text-[12.5px] font-semibold leading-tight">{label}</span>
                  {badge ? (
                    <span
                      className={`rounded-full px-1.5 py-px text-[9.5px] font-bold ${
                        active ? "bg-white/20 text-white" : "bg-surface2 text-muted"
                      }`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`mt-0.5 block truncate text-[10.5px] leading-tight ${
                    active ? "text-primary-100" : "text-muted2"
                  }`}
                >
                  {hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── panel ─────────────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="min-h-[420px]"
      >
        {panels[tab]}
      </div>
    </div>
  );
}
