"use server";

/**
 * Server action untuk state operasional bersama.
 *
 * Klien tidak lagi menyimpan salinan otoritatif di peramban. Setiap perubahan
 * dikirim ke sini, ditulis ke `v9.app_state`, lalu disiarkan ke semua klien
 * yang mendengarkan.
 */
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/session";
import { readState, writeState, type WriteResult } from "@/lib/state-store";
import { applyAction, seedState, type Action, type State } from "@/lib/reducer";

export interface LoadResult {
  ok: boolean;
  payload: unknown | null;
  rev: number;
  updatedAt: string | null;
  updatedBy: string | null;
  /** true bila basis data belum dikonfigurasi — klien jatuh ke mode lokal. */
  unavailable?: boolean;
  message?: string;
}

export async function loadSharedState(): Promise<LoadResult> {
  try {
    const row = await readState();
    if (!row) {
      return { ok: true, payload: null, rev: 0, updatedAt: null, updatedBy: null };
    }
    return {
      ok: true,
      payload: row.payload,
      rev: row.rev,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  } catch (e) {
    // Lingkungan tanpa V9_DATABASE_URL tetap harus bisa membuka aplikasi.
    // Mode lokal dipakai, dan klien menampilkan bahwa data belum tersiar.
    const message = e instanceof Error ? e.message : "basis data tidak tersedia";
    return {
      ok: false,
      payload: null,
      rev: 0,
      updatedAt: null,
      updatedBy: null,
      unavailable: true,
      message: message.includes("DATABASE_NOT_CONFIGURED") ? "Basis data belum dikonfigurasi." : "Basis data tidak dapat dihubungi.",
    };
  }
}

export interface SaveResult extends WriteResult {
  unavailable?: boolean;
  message?: string;
}

export async function saveSharedState(payload: unknown, expectedRev: number): Promise<SaveResult> {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return { ok: false, rev: expectedRev, message: "Sesi berakhir. Masuk ulang untuk menyimpan." };
    }
    const result = await writeState(payload, expectedRev, identity.name);

    // Ringkasan publik (jumlah anggota di beranda) dibangun ulang.
    revalidatePath("/");

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : "gagal menyimpan";
    return {
      ok: false,
      rev: expectedRev,
      unavailable: true,
      message: message.includes("DATABASE_NOT_CONFIGURED") ? "Basis data belum dikonfigurasi." : "Gagal menyimpan ke basis data.",
    };
  }
}


/* ─────────────────────── aksi, bukan keadaan ─────────────────────── */

export interface SaveActionResult extends WriteResult {
  /** true bila aksi ini tidak dikenal oleh server (deploy lama). */
  stale?: boolean;
  unavailable?: boolean;
  message?: string;
  /** Dokumen terbaru setelah aksi diterapkan (untuk menyegarkan layar). */
  payload?: unknown;
}

/**
 * Terapkan SATU aksi pada dokumen bersama yang paling baru.
 *
 * Mengapa aksi, bukan seluruh keadaan: bila klien mengirim salinan state-nya
 * sendiri, dua pengurus yang menyunting dalam waktu berdekatan akan saling
 * menimpa. B membaca rev terbaru (lolos pemeriksaan rev), lalu mengirim
 * dokumennya yang masih versi lama — perubahan A lenyap tanpa peringatan.
 *
 * Dengan mengirim aksinya, server membaca dokumen terkini, menerapkan aksi itu
 * di atasnya, dan menulis hasilnya. Perubahan A dan B sama-sama bertahan.
 * Reducer yang dipakai persis sama dengan yang dipakai klien, jadi aturan
 * validasi tidak bercabang.
 */
export async function saveAction(action: Action): Promise<SaveActionResult> {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return { ok: false, rev: 0, message: "Sesi berakhir. Masuk ulang untuk menyimpan." };
    }

    // Coba terapkan langsung, ulangi bila ada penulis lain di antara baca-tulis.
    for (let percobaan = 0; percobaan < 4; percobaan++) {
      const row = await readState();
      const dasar: State = row?.payload ? (row.payload as State) : seedState();

      // Jaga-jaga terhadap dokumen berisi data yang hilang.
      const aman: State = {
        ...seedState(),
        ...dasar,
      };

      const { state: hasil, result } = applyAction(aman, action);
      if (!result.ok) {
        return { ok: false, rev: row?.rev ?? 0, message: result.message };
      }

      const tulis = await writeState(hasil, row?.rev ?? 0, identity.name);
      if (tulis.ok) {
        revalidatePath("/");
        return { ok: true, rev: tulis.rev, updatedAt: tulis.updatedAt, payload: hasil };
      }
      if (!tulis.conflict) {
        return { ok: false, rev: row?.rev ?? 0, message: "Gagal menyimpan ke basis data." };
      }
      // Konflik: pengurus lain menulis di antara baca dan tulis. Ulangi.
    }

    return {
      ok: false,
      rev: 0,
      message: "Data sedang ditulis pengurus lain. Coba lagi sebentar.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "gagal menyimpan";
    return {
      ok: false,
      rev: 0,
      unavailable: true,
      message: message.includes("DATABASE_NOT_CONFIGURED") ? "Basis data belum dikonfigurasi." : "Gagal menyimpan ke basis data.",
    };
  }
}
