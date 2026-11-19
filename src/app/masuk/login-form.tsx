"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";

export default function LoginForm() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.has("logged_out")) setNotice("Anda telah keluar.");
    else if (query.has("expired")) setNotice("Sesi berakhir. Silakan masuk kembali.");
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
          identity: form.get("identity"),
          password: form.get("password"),
          remember: form.has("remember"),
          returnTo: new URLSearchParams(location.search).get("return_to") || "/dashboard",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Gagal masuk.");
      location.assign(data.redirect);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi terputus. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit} aria-busy={busy}>
      {notice && <p role="status" className="login-session-note">{notice}</p>}
      <label htmlFor="login-identity">Email atau nomor telepon</label>
      <input id="login-identity" name="identity" type="text" autoComplete="username" placeholder="Email atau nomor telepon" maxLength={180} required disabled={busy} />
      <label htmlFor="login-password">Kata sandi</label>
      <div className="login-password">
        <input id="login-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" maxLength={128} required disabled={busy} />
        <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={visible}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <label className="login-remember"><input name="remember" type="checkbox" disabled={busy} /><span>Ingat saya</span></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="login-submit" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle className="login-spin" size={18} />Memverifikasi…</> : <>Masuk <ArrowRight size={18} /></>}
      </button>
      <p className="login-session-note"><Link href="/lupa-password">Lupa kata sandi?</Link></p>
    </form>
  );
}
