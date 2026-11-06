import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import LogoutButton from "../_components/access/logout-button";
export const metadata = { title: "Keluar akun | Srikandi Buana", robots: { index: false, follow: false } };
export default function Logout() {
  return (
    <main className="logout-page workspace-fallback">
      <BrandLogo />
      <h1>Keluar dari ruang kerja?</h1>
      <p>Sesi akun pada perangkat ini akan diakhiri. Anda dapat masuk kembali kapan saja.</p>
      <LogoutButton />
      <Link href="/dashboard">Kembali ke dashboard</Link>
    </main>
  );
}
