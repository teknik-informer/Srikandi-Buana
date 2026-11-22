import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Srikandi Buana — Perempuan tani, penggerak kemandirian",
    template: "%s · Srikandi Buana",
  },
  description:
    "Kelompok Wanita Tani Srikandi Buana, Desa Ngadimulyo, Kedu, Temanggung. Profil, program, pelatihan, produk anggota, dan layanan organisasi.",
  metadataBase: new URL("https://srikandi-buana-v9.vercel.app"),
  openGraph: {
    title: "Srikandi Buana — Perempuan tani, penggerak kemandirian",
    description:
      "Ekonomi desa yang tumbuh dari kebun, kelas, dan kerja bersama. Kenali Srikandi Buana, Temanggung.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#38571a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
