import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * Reference artwork uses a modern geometric sans. Self-hosted by next/font so
 * there is no external request at runtime and no layout shift.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

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
  themeColor: "#1e4e1f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
