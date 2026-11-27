import BrandLogo from "@/components/brand-logo";
import Link from "next/link";
import { ArrowUpRight, Leaf, ShieldCheck } from "lucide-react";
import LoginForm from "./login-form";
import "./login.css";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Masuk | Srikandi Buana",
};

export default function Login() {
  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Srikandi Buana">
        <img src="/images/pertanian-premium-v1.webp" alt="Lanskap pertanian" />
        <div className="login-story-shade" />
        <Link href="/" className="login-brand" aria-label="Srikandi Buana beranda">
          <BrandLogo priority />
        </Link>
        <div className="login-story-copy">
          <span className="login-eyebrow"><Leaf size={14} /> NGADIMULYO · KEDU · TEMANGGUNG</span>
          <h1>Tumbuh bersama.<br /><em>Berdaya bersama.</em></h1>
          <p>Ruang kerja dan layanan anggota Srikandi Buana.</p>
        </div>
        <div className="login-story-bottom">PERTANIAN · PEMBERDAYAAN · KEMANDIRIAN</div>
      </section>

      <section className="login-panel">
        <Link className="login-back" href="/">Kembali ke situs <ArrowUpRight size={15} /></Link>
        <div className="login-form-wrap">
          <span className="login-lock"><ShieldCheck size={23} /></span>
          <p className="login-eyebrow">PORTAL SRIKANDI BUANA</p>
          <h2>Selamat datang.</h2>
          <p className="login-intro">Masuk untuk melanjutkan ke ruang kerja Anda.</p>
          <LoginForm />
          <p className="login-help">Butuh bantuan akses? <Link href="/kontak">Hubungi pengelola</Link></p>
        </div>
        <footer className="login-footer">
          <span>© {new Date().getFullYear()} Srikandi Buana</span>
          <nav aria-label="Informasi legal">
            <Link href="/privasi">Privasi</Link>
            <Link href="/syarat-ketentuan">Ketentuan</Link>
          </nav>
        </footer>
      </section>
    </main>
  );
}
