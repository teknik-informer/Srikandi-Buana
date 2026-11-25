"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadSharedState, saveAction, saveSharedState } from "@/app/actions/state";
import {
  applyAction, seedState,
  type Action, type Actor, type State, type ExecResult,
} from "@/lib/reducer";
import type { JournalEntry } from "@/data/types";
import { COA as COA_CLIENT } from "@/data/coa";

/**
 * STORE KLIEN — pengikat antara layar dan dokumen bersama.
 *
 * Semua bentuk data, aksi, dan aturan bisnis tinggal di `lib/reducer.ts`.
 * Berkas ini hanya mengurus siklus hidup: memuat dokumen dari server,
 * menerapkan aksi untuk pembaruan layar seketika, lalu mengirim aksi yang
 * sama ke server. Bila pengurus lain menulis lebih dulu, server menerapkan
 * aksi kita di atas dokumen terbaru — bukan menimpanya.
 */

export * from "@/lib/reducer";
export type {
  State, Actor, Action, ExecResult, DraftJournal, SiteSettings,
} from "@/lib/reducer";

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface StoreCtx {
  state: State;
  actor: Actor;
  dispatch: React.Dispatch<Action>;
  /** Run an action and surface its message through a toast. */
  exec: (action: Action) => ExecResult;
  toast: { text: string; ok: boolean; href?: string } | null;
  clearToast: () => void;
  reset: () => void;
  ready: boolean;
  /**
   * true bila state dibaca dari server bersama — artinya perubahan terlihat
   * oleh semua pengurus di semua perangkat. false berarti lingkungan ini belum
   * punya basis data dan aplikasi berjalan lokal.
   */
  shared: boolean;
  /** Keterangan singkat bila `shared` false. */
  sharedNote: string | null;
  /** Muat ulang dari server (dipakai setelah konflik). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

/**
 * Lengkapi dokumen yang dibaca dari server.
 *
 * Dokumen state disimpan utuh sebagai JSONB. Ketika bentuknya berkembang —
 * misalnya `members` dan `activities` yang dulu konstanta statis kini menjadi
 * bagian state — baris lama di server tidak memuat kunci baru itu. Tanpa
 * langkah ini, aplikasi akan mogok membaca `undefined.filter`.
 *
 * Aturannya sederhana dan aman: data yang ada dipertahankan apa adanya; kunci
 * yang belum ada diisi dari benih. Tidak ada data pengguna yang dibuang.
 */
function normalizeState(parsed: Partial<State>): State {
  const base = seedState();
  const out: State = { ...base, ...parsed } as State;

  // Koleksi wajib array — bila bukan, jatuh ke benih.
  const arrays = [
    "journals", "letters", "notices", "approvals", "tasks", "products",
    "inventories", "documents", "lands", "partners", "programs", "bank",
    "budgets", "trainings", "enrollments", "drafts", "audit",
    "members", "activities",
  ] as const;
  for (const key of arrays) {
    const v: unknown = out[key];
    if (!Array.isArray(v)) {
      (out as unknown as Record<string, unknown>)[key] = base[key];
    }
  }
  if (typeof out.seq !== "number") out.seq = base.seq;
  if (!out.site || typeof out.site !== "object") out.site = base.site;
  return out;
}


export function StoreProvider({ actor, children }: { actor: Actor; children: ReactNode }) {
  const [state, setState] = useState<State>(() => seedState());
  const [toast, setToast] = useState<StoreCtx["toast"]>(null);
  const [ready, setReady] = useState(false);
  /**
   * Apakah data benar-benar dibagi? Dimulai dari `false` — asumsi yang aman.
   * Penanda hanya hilang setelah server menjawab bahwa dokumen bersama ada.
   * Sebelumnya nilai awalnya `true`, sehingga di lingkungan tanpa basis data
   * aplikasi tampak normal padahal tidak ada yang tersimpan ke mana pun.
   */
  const [shared, setSharedFlag] = useState(false);
  const [sharedNote, setSharedNote] = useState<string | null>("Menyambung ke data bersama…");
  const setShared = (ok: boolean, note: string | null) => {
    setSharedFlag(ok);
    setSharedNote(note);
  };
  const ref = useRef(state);
  ref.current = state;

  /**
   * Revisi dokumen bersama. `rev` dibaca bersama payload; setiap tulis membawa
   * rev yang kita pegang supaya dua pengurus tidak saling menimpa diam-diam.
   */
  const revRef = useRef(0);
  /** Sidik isi terakhir yang kita tulis/terima; mencegah tulis berulang. */
  const lastWritten = useRef<string>("");
  /**
   * Aksi yang belum berhasil mendarat di server.
   *
   * Mengirim SELURUH dokumen berarti dua pengurus yang menyunting bersamaan
   * saling menimpa: B menerima rev baru (lolos pemeriksaan rev) lalu mengirim
   * salinan lamanya sendiri — perubahan A hilang tanpa pesan apa pun. Karena
   * itu tulisan dikirim sebagai aksi, bukan sebagai keadaan, sehingga server
   * menerapkannya pada dokumen yang paling baru.
   */
  const pendingAksi = useRef<{ action: Action; base: State } | null>(null);
  /** Aksi terakhir yang dijalankan — inilah yang dikirim ke server. */
  const aksiTerakhir = useRef<Action>({ type: "reset" });
  const mengirim = useRef(false);

  /**
   * Muat state bersama dari server. Dipakai saat mount dan saat konflik.
   * Bila basis data belum dikonfigurasi, aplikasi tetap terbuka memakai seed —
   * dengan penanda `shared: false` agar antarmuka dapat mengatakannya.
   */
  const loadFromServer = useCallback(async () => {
    const res = await loadSharedState();
    if (res.ok && res.payload && typeof res.payload === "object") {
      const parsed = res.payload as Partial<State>;
      const shapeOk =
        Array.isArray(parsed.journals) &&
        Array.isArray(parsed.bank) &&
        Array.isArray(parsed.budgets) &&
        Array.isArray(parsed.trainings) &&
        Array.isArray(parsed.enrollments) &&
        typeof parsed.seq === "number";
      if (shapeOk) {
        // Lengkapi kunci yang belum ada di dokumen lama, lalu tulis balik
        // supaya semua perangkat membaca bentuk yang sama.
        const lengkap = normalizeState(parsed);
        revRef.current = res.rev;
        lastWritten.current = JSON.stringify(parsed);
        setState(lengkap);
        setShared(true, null);
        const perluTulis =
          !Array.isArray(parsed.members) || !Array.isArray(parsed.activities);
        if (perluTulis) {
          // Dokumen lama → tulis bentuk lengkap dengan rev yang baru dipegang.
          const r = await saveSharedState(lengkap, res.rev);
          if (r.ok) {
            revRef.current = r.rev;
            lastWritten.current = JSON.stringify(lengkap);
          }
        }
        return;
      }
    }
    if (res.unavailable) {
      // Tanpa basis data: mode lokal tetap berjalan, tetapi dinyatakan terus
      // terang agar tidak ada yang mengira data sudah tersiar.
      setShared(false, res.message ?? "Basis data tidak tersedia.");
      return;
    }
    if (!res.ok && !res.unavailable) {
      setShared(false, res.message ?? "Data bersama tidak dapat dimuat.");
      return;
    }
    if (res.ok && res.payload === null) {
      // Instalasi baru: dokumen belum ada. Jadikan seed sebagai isi awal
      // bersama supaya semua perangkat mulai dari data yang sama, lalu
      // perangkat ini memegang rev 1.
      const seed = ref.current;
      const r = await saveSharedState(seed, 0);
      if (r.ok) {
        revRef.current = r.rev;
        lastWritten.current = JSON.stringify(seed);
        setShared(true, null);
      } else if (r.conflict) {
        // Perangkat lain menulis lebih dulu — pakai versi mereka.
        await loadFromServer();
      } else if (r.unavailable) {
        // Basis data tidak tersedia: tetap buka dengan seed, tetapi katakan.
        setShared(false, r.message ?? "Basis data tidak tersedia.");
      } else {
        setShared(false, r.message ?? "Data awal belum dapat disimpan ke server.");
      }
      return;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadFromServer();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [loadFromServer]);

  /**
   * Kirim state ke server. Kegagalan tidak memblokir antarmuka: perubahan tetap
   * terlihat di layar ini, dan bilah status memberi tahu bahwa belum tersimpan.
   * Konflik (rev usang) memicu muat ulang agar pengguna melihat data terbaru
   * alih-alih menimpanya.
   */
  const pushToServer = useCallback(async (next: State) => {
    const json = JSON.stringify(next);
    if (json === lastWritten.current) {
      pendingAksi.current = null;
      return;
    }
    pendingAksi.current = { action: aksiTerakhir.current, base: next };

    // Satu kiriman pada satu waktu; aksi berikutnya menunggu giliran dan
    // dikirim setelah yang sebelumnya selesai.
    if (mengirim.current) return;
    mengirim.current = true;
    try {
      while (pendingAksi.current) {
        const kirim = pendingAksi.current;
        pendingAksi.current = null;

        // AKSI dikirim, bukan keadaan. Server menerapkannya pada dokumen yang
        // paling baru, sehingga pekerjaan pengurus lain tidak tertimpa.
        const res = await saveAction(kirim.action);

        if (res.ok) {
          revRef.current = res.rev;
          lastWritten.current = JSON.stringify(kirim.base);
          setShared(true, null);
          continue;
        }

        if (res.stale) {
          // Server belum mengenal aksi ini (deploy lama): kirim dokumen utuh.
          const fallback = await saveSharedState(kirim.base, revRef.current);
          if (fallback.ok) {
            revRef.current = fallback.rev;
            lastWritten.current = JSON.stringify(kirim.base);
            setShared(true, null);
          } else if (fallback.conflict) {
            setToast({ text: "Data diperbarui pengurus lain. Memuat versi terbaru…", ok: false });
            await loadFromServer();
          } else if (fallback.unavailable) {
            setShared(false, fallback.message ?? "Belum tersimpan ke server.");
          }
          continue;
        }

        if (res.unavailable) {
          setShared(false, res.message ?? "Belum tersimpan ke server.");
          continue;
        }
        setToast({ text: res.message ?? "Gagal menyimpan.", ok: false });
      }
    } finally {
      mengirim.current = false;
    }
  }, [loadFromServer]);

  const dispatch: React.Dispatch<Action> = (action) => {
    if (action.type === "reset") {
      const s = seedState();
      setState(s);
      try {
        localStorage.removeItem("sb_site_settings_v1");
        window.dispatchEvent(new CustomEvent("sb:site-settings"));
      } catch {
        /* ignore */
      }
      // "Reset" mengembalikan dokumen ke benih. Dikirim sebagai dokumen utuh
      // dengan rev terbaru; ini satu-satunya jalur yang menimpa seluruh isi.
      void (async () => {
        const r = await saveSharedState(s, revRef.current);
        if (r.ok) {
          revRef.current = r.rev;
          lastWritten.current = JSON.stringify(s);
        }
      })();
      setToast({ text: "Data operasional dikembalikan ke kondisi awal.", ok: true });
      return;
    }
    aksiTerakhir.current = action;
    setState((prev) => {
      const { state: next, result } = applyAction(prev, action);
      if (action.type !== "hydrate") {
        setToast({ text: result.message, ok: result.ok, href: result.href });
        // Setiap aksi yang berhasil disimpan ke server bersama, sehingga
        // perubahan terlihat oleh pengurus lain di perangkat lain.
        if (result.ok) void pushToServer(next);
      }
      return next;
    });
  };

  const exec = (action: Action): ExecResult => {
    const { result } = applyAction(ref.current, action);
    dispatch(action);
    return result;
  };

  const value = useMemo<StoreCtx>(
    () => ({
      state,
      actor,
      dispatch,
      exec,
      toast,
      clearToast: () => setToast(null),
      reset: () => dispatch({ type: "reset" }),
      ready,
      shared,
      sharedNote,
      refresh: loadFromServer,
    }),
    [state, actor, toast, ready, shared, sharedNote, loadFromServer],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside <StoreProvider>");
  return c;
}

/** For chrome that may render outside an app area (no provider mounted). */
export function useStoreOptional(): StoreCtx | null {
  return useContext(Ctx);
}

/* ------------------------------------------------------------------ */
/* Derived finance — same math as lib/finance.ts, but over live state. */
/* ------------------------------------------------------------------ */

export interface Balance {
  code: string;
  name: string;
  type: string;
  normal: "debit" | "kredit";
  debit: number;
  credit: number;
  balance: number;
}

export function postedJournals(s: State): JournalEntry[] {
  return s.journals.filter((j) => j.status === "diposting");
}

export function computeBalances(s: State, coa: { code: string; name: string; type: string; normal: "debit" | "kredit" }[]): Balance[] {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const j of postedJournals(s)) {
    for (const l of j.lines) {
      const cur = map.get(l.accountCode) ?? { debit: 0, credit: 0 };
      cur.debit += l.debit;
      cur.credit += l.credit;
      map.set(l.accountCode, cur);
    }
  }
  return coa.map((a) => {
    const v = map.get(a.code) ?? { debit: 0, credit: 0 };
    const balance = a.normal === "debit" ? v.debit - v.credit : v.credit - v.debit;
    return { ...a, debit: v.debit, credit: v.credit, balance };
  });
}

export function trialBalanceFrom(s: State, coa: Parameters<typeof computeBalances>[1]) {
  const rows = computeBalances(s, coa)
    .filter((r) => r.debit !== 0 || r.credit !== 0)
    .map((r) => {
      const net = r.debit - r.credit;
      return { ...r, debitCol: net > 0 ? net : 0, creditCol: net < 0 ? -net : 0 };
    });
  const totalDebit = rows.reduce((s2, r) => s2 + r.debitCol, 0);
  const totalCredit = rows.reduce((s2, r) => s2 + r.creditCol, 0);
  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

export function incomeStatementFrom(s: State, coa: Parameters<typeof computeBalances>[1]) {
  const balances = computeBalances(s, coa);
  const revenue = balances.filter((b) => b.type === "pendapatan" && b.balance !== 0);
  const expenses = balances.filter((b) => b.type === "beban" && b.balance !== 0);
  const totalRevenue = revenue.reduce((s2, b) => s2 + b.balance, 0);
  const totalExpense = expenses.reduce((s2, b) => s2 + b.balance, 0);
  return { revenue, expenses, totalRevenue, totalExpense, surplus: totalRevenue - totalExpense };
}

/** Memoised finance view over the live store, using the real COA. */
export function useFinance() {
  const { state } = useStore();
  return useMemo(() => {
    const tb = trialBalanceFrom(state, COA_CLIENT);
    const is = incomeStatementFrom(state, COA_CLIENT);
    return { tb, is };
  }, [state]);
}
