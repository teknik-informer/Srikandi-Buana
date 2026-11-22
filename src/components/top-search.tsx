"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, CornerDownLeft } from "lucide-react";
import { searchAll, countHits, type SearchGroup } from "@/lib/search";

const TONE: Record<SearchGroup, string> = {
  Anggota: "bg-[#e8f2ff] text-[#1f5fa0]",
  Program: "bg-[#efe9ff] text-[#5b3fa8]",
  Produk: "bg-[#fff2e0] text-[#8a5a00]",
  Dokumen: "bg-[#e9f5ea] text-[#2c6b39]",
  Lahan: "bg-[#eaf6ec] text-[#127e2f]",
  Jurnal: "bg-[#fdeaea] text-[#a33a36]",
  Kabar: "bg-[#eef1f5] text-[#44516380]",
};

/**
 * Topbar search that actually searches.
 *
 * Before, pressing Enter navigated away and the field itself did nothing.
 * Now the field opens a panel of live results from the local index; Enter
 * opens the first hit, ⌘K/Ctrl-K focuses it from anywhere, Escape closes.
 * Only plain clicks and keys drive it — no hover, so it works on touch.
 */
export function TopSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const flat = useMemo(() => searchAll(q).flatMap((g) => g.hits), [q]);
  const groups = useMemo(() => searchAll(q), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => setCursor(0), [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <label className="relative block w-full">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c9dccd]" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={compact ? "Cari…" : "Cari anggota, program, produk, dokumen…"}
          aria-label="Cari di seluruh aplikasi"
          aria-expanded={open}
          role="combobox"
          aria-controls="topsearch-panel"
          aria-autocomplete="list"
          autoComplete="off"
          className="w-full rounded-full border border-white/20 bg-[#0d2b18]/55 py-[9px] pl-10 pr-14 text-[12.5px] text-white placeholder:text-[#c9dccd] transition focus:border-[#7ddc93] focus:bg-[#0d2b18]/75 focus:outline-none focus:ring-2 focus:ring-[#7ddc93]/25"
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
            if (e.key === "Enter") {
              e.preventDefault();
              if (flat[cursor]) go(flat[cursor].href);
              else if (q.trim()) go(`/app/cari?q=${encodeURIComponent(q.trim())}`);
            }
          }}
        />
        {q ? (
          <button
            type="button"
            onClick={() => { setQ(""); inputRef.current?.focus(); }}
            aria-label="Kosongkan pencarian"
            className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={13} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/25 px-1.5 py-0.5 font-sans text-[9.5px] text-[#c9dccd] lg:block">
            ⌘K
          </kbd>
        )}
      </label>

      {open && q.trim().length >= 2 ? (
        <div
          id="topsearch-panel"
          role="listbox"
          aria-label="Hasil pencarian"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(68dvh,460px)] overflow-y-auto rounded-[14px] border border-line bg-white shadow-[0_28px_60px_-24px_rgba(15,26,43,0.45)] animate-rise"
        >
          {flat.length ? (
            <>
              {groups.map((g) => (
                <div key={g.group} className="border-b border-line/70 py-1 last:border-0">
                  <div className="px-3.5 pb-1 pt-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted2">{g.group}</div>
                  <ul>
                    {g.hits.map((h) => {
                      const idx = flat.indexOf(h);
                      return (
                        <li key={h.group + h.label + h.href}>
                          <Link
                            href={h.href}
                            onClick={() => setOpen(false)}
                            onMouseEnter={() => setCursor(idx)}
                            className={`flex items-center gap-2.5 px-3.5 py-2 transition ${idx === cursor ? "bg-[#f2f9f3]" : ""}`}
                          >
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${TONE[h.group]}`}>{h.group}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-medium text-ink">{h.label}</span>
                              <span className="block truncate text-[10.5px] text-muted2">{h.meta}</span>
                            </span>
                            {idx === cursor ? <CornerDownLeft size={12} className="shrink-0 text-muted2" /> : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <Link
                href={`/app/cari?q=${encodeURIComponent(q.trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 border-t border-line bg-paper px-3.5 py-2.5 text-[11.5px] font-semibold text-primary-800"
              >
                Lihat semua hasil untuk “{q.trim()}”
                <span className="text-muted2">{countHits(groups)} temuan</span>
              </Link>
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-[12.5px] font-semibold text-ink">Tidak ada hasil untuk “{q.trim()}”</p>
              <p className="mt-1 text-[11px] text-muted2">Coba nama anggota, kode program, nomor jurnal, atau judul dokumen.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
