"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";

const QA_EMAIL = "qa-admin@srikandibuana.test";

export default function QARecoveryForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/qa-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email: form.get("email"),
          token: form.get("token"),
          password: form.get("password"),
          confirmation: form.get("confirmation"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pemulihan password belum berhasil.");
      setSuccess(data.message || "Password administrator QA berhasil diperbarui.");
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi terputus. Periksa jaringan Anda.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="login-form" role="status">
        <p className="login-session-note">{success}</p>
        <p className="login-assistance">
          Demi keamanan, token pemulihan harus dicabut setelah proses ini.
        </p>
        <Link className="login-submit" href="/masuk">
          Lanjut ke halaman masuk <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit} aria-busy={busy} autoComplete="off">
      <label htmlFor="qa-recovery-email">Email administrator QA</label>
      <input
        id="qa-recovery-email"
        name="email"
        type="email"
        value={QA_EMAIL}
        readOnly
        aria-readonly="true"
      />

      <label htmlFor="qa-recovery-token">Token pemulihan</label>
      <input
        id="qa-recovery-token"
        name="token"
        type="password"
        placeholder="Tempel token pemulihan"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={43}
        required
        disabled={busy}
      />

      <label htmlFor="qa-recovery-password">Password baru</label>
      <input
        id="qa-recovery-password"
        name="password"
        type="password"
        placeholder="Minimal 12 karakter"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        disabled={busy}
      />

      <label htmlFor="qa-recovery-confirmation">Ulangi password baru</label>
      <input
        id="qa-recovery-confirmation"
        name="confirmation"
        type="password"
        placeholder="Masukkan ulang password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        disabled={busy}
      />

      {error && <p className="login-error" role="alert">{error}</p>}

      <button className="login-submit" type="submit" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle className="login-spin" size={18} />
            Memproses pemulihan…
          </>
        ) : (
          <>
            Simpan password baru
            <ArrowRight size={18} />
          </>
        )}
      </button>
      <p className="login-session-note">
        Token hanya digunakan melalui formulir ini. Jangan kirimkan token kepada orang lain.
      </p>
    </form>
  );
}
