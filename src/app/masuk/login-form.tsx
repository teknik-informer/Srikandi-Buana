"use client";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";
export default function LoginForm() {
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.has("logged_out")) setNotice("Anda sudah keluar. Sesi akun pada perangkat ini telah diakhiri.");
    else if (q.has("expired")) setNotice("Sesi masuk telah berakhir. Silakan masuk kembali.");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          remember: form.has("remember"),
          returnTo: new URLSearchParams(location.search).get("return_to") || "/dashboard",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Gagal masuk.");
      location.assign(data.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus. Periksa jaringan Anda.");
      setBusy(false);
    }
  }
  return (
    <form className="login-form" onSubmit={submit} aria-busy={busy}>
      {notice && (
        <p role="status" className="login-session-note">
          {notice}
        </p>
      )}
      <label htmlFor="login-email">Alamat email</label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="nama@organisasi.id"
        maxLength={180}
        required
        disabled={busy}
      />
      <label htmlFor="login-password">Password</label>
      <div className="login-password">
        <input
          id="login-password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Masukkan password Anda"
          maxLength={128}
          required
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <label className="login-remember">
        <input name="remember" type="checkbox" disabled={busy} />
        <span>Ingat saya selama 30 hari</span>
      </label>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <button className="login-submit" type="submit" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle className="login-spin" size={18} />
            Memverifikasi…
          </>
        ) : (
          <>
            Masuk ke dashboard
            <ArrowRight size={18} />
          </>
        )}
      </button>
      <p className="login-session-note">Gunakan perangkat pribadi untuk menyimpan sesi masuk.</p>
    </form>
  );
}
