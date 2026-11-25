"use client";

import { useActionState } from "react";
import { submitJoinInterest, type JoinState } from "@/app/actions/forms";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const initial: JoinState = { ok: false, message: "" };

export function JoinForm() {
  const [state, action, pending] = useActionState(submitJoinInterest, initial);

  if (state.ok) {
    return (
      <div className="sb-card p-6">
        <CheckCircle2 className="text-[var(--sb-success)]" size={28} />
        <h2 className="mt-3 font-display text-[20px] font-semibold text-ink">Terima kasih, {state.name}.</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">{state.message}</p>
        <div className="mt-4 rounded-sb-sm border border-line bg-paper px-3 py-2 text-[12px] text-muted">
          Nomor pengajuan: <span className="font-mono font-semibold text-ink2">{state.ref}</span> · Status:{" "}
          <span className="font-semibold text-[var(--sb-warning)]">Menunggu verifikasi</span>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="sb-card space-y-4 p-5 sm:p-6" noValidate>
      <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      {state.message && !state.ok ? (
        <p role="alert" className="rounded-sb-sm border border-[#ecc9c3] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12.5px] text-[var(--sb-danger)]">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nama" className="mb-1 block text-[12px] font-semibold text-ink2">Nama lengkap <span className="text-[var(--sb-danger)]">*</span></label>
          <input id="nama" name="nama" required className="sb-input" placeholder="Nama sesuai KTP" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="telepon" className="mb-1 block text-[12px] font-semibold text-ink2">Nomor WhatsApp <span className="text-[var(--sb-danger)]">*</span></label>
          <input id="telepon" name="telepon" required className="sb-input" placeholder="08xx-xxxx-xxxx" inputMode="tel" autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alamat" className="mb-1 block text-[12px] font-semibold text-ink2">Alamat / dusun <span className="text-[var(--sb-danger)]">*</span></label>
          <input id="alamat" name="alamat" required className="sb-input" placeholder="Dusun, desa, kecamatan" autoComplete="street-address" />
        </div>
        <div>
          <label htmlFor="kegiatan" className="mb-1 block text-[12px] font-semibold text-ink2">Kegiatan yang diminati</label>
          <select id="kegiatan" name="kegiatan" className="sb-input" defaultValue="pertanian">
            <option value="pertanian">Budidaya &amp; produksi</option>
            <option value="pelatihan">Pelatihan &amp; keterampilan</option>
            <option value="usaha">Usaha &amp; pemasaran</option>
            <option value="organisasi">Kegiatan organisasi</option>
          </select>
        </div>
        <div>
          <label htmlFor="pengalaman" className="mb-1 block text-[12px] font-semibold text-ink2">Pengalaman tani</label>
          <select id="pengalaman" name="pengalaman" className="sb-input" defaultValue="1-3">
            <option value="baru">Belum berpengalaman</option>
            <option value="1-3">1–3 tahun</option>
            <option value="4-10">4–10 tahun</option>
            <option value="10+">Lebih dari 10 tahun</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="catatan" className="mb-1 block text-[12px] font-semibold text-ink2">Catatan (opsional)</label>
          <textarea id="catatan" name="catatan" rows={3} className="sb-input" placeholder="Lahan yang dimiliki, kebutuhan, atau pertanyaan" />
        </div>
      </div>
      <label className="flex items-start gap-2.5 text-[12px] text-muted">
        <input type="checkbox" name="setuju" required className="mt-0.5 h-4 w-4 accent-[var(--sb-primary)]" />
        <span>Saya menyetujui data ini diproses untuk peninjauan minat dan verifikasi keanggotaan. Saya telah membaca <Link href="/privasi" className="font-semibold text-primary-700 underline">Kebijakan Privasi</Link>.</span>
      </label>
      <button type="submit" className="sb-btn sb-btn-primary" disabled={pending} title={pending ? "Formulir sedang dikirim — tunggu sebentar." : undefined} aria-busy={pending}>
        {pending ? "Mengirim…" : "Kirim minat bergabung"}
      </button>
      <p className="text-[11px] text-muted2">* Wajib diisi. Pengajuan disimpan untuk proses verifikasi keanggotaan.</p>
    </form>
  );
}
