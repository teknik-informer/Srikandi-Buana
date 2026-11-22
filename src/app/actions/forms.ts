"use server";

/**
 * Demo server actions.
 * Real validation happens server-side (blueprint §16.1: server schema is
 * authoritative). Persistence is intentionally omitted in the demo build;
 * the repository layer that will call PostgreSQL replaces the marked block.
 */

export interface JoinState {
  ok: boolean;
  message: string;
  name?: string;
  ref?: string;
}

export async function submitJoinInterest(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const nama = String(formData.get("nama") ?? "").trim();
  const telepon = String(formData.get("telepon") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const setuju = formData.get("setuju");

  if (nama.length < 3) return { ok: false, message: "Nama minimal 3 karakter." };
  if (!/^[0-9+\-\s()]{8,20}$/.test(telepon)) return { ok: false, message: "Nomor WhatsApp tidak valid." };
  if (alamat.length < 5) return { ok: false, message: "Alamat terlalu singkat." };
  if (!setuju) return { ok: false, message: "Persetujuan pemrosesan data wajib dicentang." };

  // ── DEMO PERSISTENCE BOUNDARY ─────────────────────────────────────────────
  // In production this calls Organization domain service:
  //   await organization.submitJoinInterest({ ... })
  // which writes to `membership_interest` and emits an approval task.
  const ref = `MGB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return {
    ok: true,
    name: nama.split(" ")[0],
    ref,
    message:
      "Minat bergabung Anda tercatat. Bidang Organisasi & Keanggotaan akan menghubungi Anda dalam 5 hari kerja untuk verifikasi.",
  };
}
