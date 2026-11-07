import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import QARecoveryForm from "./recovery-form";
import "../masuk/login.css";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Pemulihan Admin QA | Srikandi Buana",
};

const enabled =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "feat/enterprise-v12-foundation" &&
  process.env.ADMIN_EMAIL?.trim().toLowerCase() === "qa-admin@srikandibuana.test";

export default function QAPulihkanPage() {
  return (
    <main className="login-shell">
      <section className="login-story">
        <img src="/images/pertanian-premium-v1.webp" alt="Ilustrasi lanskap pertanian" />
        <div className="login-story-shade" />
        <div className="login-story-copy">
          <span className="login-eyebrow">LINGKUNGAN PENGUJIAN · PREVIEW</span>
          <h1>Akses QA yang aman.<br /><em>Production tetap terlindungi.</em></h1>
          <p>Halaman khusus untuk memperbarui password administrator pada lingkungan pengujian Srikandi Buana.</p>
        </div>
        <div className="login-story-bottom">
          <span>PEMULIHAN AKUN QA</span>
          <small>Tidak berlaku untuk akun Production.</small>
        </div>
      </section>

      <section className="login-panel">
        <Link className="login-back" href="/masuk">
          Kembali ke masuk <ArrowUpRight size={15} />
        </Link>
        <div className="login-form-wrap">
          <span className="login-lock"><ShieldCheck size={24} /></span>
          <p className="login-eyebrow">PEMULIHAN ADMINISTRATOR QA</p>
          <h2>Atur password QA.</h2>
          <p className="login-intro">
            Masukkan token pemulihan yang diterbitkan khusus untuk Preview, lalu tentukan password baru.
          </p>
          {enabled ? (
            <QARecoveryForm />
          ) : (
            <div className="login-error" role="status">
              Fitur pemulihan tidak tersedia pada deployment ini. Buka alamat Preview dari cabang v12.
            </div>
          )}
          <div className="login-assistance">
            <strong>Perlindungan akun</strong>
            <p>Token dibatasi waktu, permintaan dibatasi, dan sesi lama akan diakhiri setelah password diganti.</p>
            <Link href="/masuk">Halaman masuk <ArrowUpRight size={14} /></Link>
          </div>
        </div>
        <footer>© {new Date().getFullYear()} KWT Srikandi Buana <Link href="/privasi">Privasi</Link></footer>
      </section>
    </main>
  );
}
