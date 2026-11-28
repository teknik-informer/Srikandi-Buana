import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BrandStage } from "@/components/brand-stage";
import { getPublicDesignThemeVariables } from "@/lib/design-theme";
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
  metadataBase: new URL("https://srikandi-buana.vercel.app"),
  /**
   * Icon set carried over from the previous production site, unchanged — same
   * files, same sizes, same theme colour, so installed apps and browser tabs
   * keep the identity the organisation already published.
   */
  applicationName: "Srikandi Buana",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icons/apple-touch-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-167.png", sizes: "167x167", type: "image/png" },
    ],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#123d32" }],
  },
  openGraph: {
    title: "Srikandi Buana — Perempuan tani, penggerak kemandirian",
    description:
      "Ekonomi desa yang tumbuh dari kebun, kelas, dan kerja bersama. Kenali Srikandi Buana, Temanggung.",
    locale: "id_ID",
    type: "website",
    images: [{ url: "/social/srikandi-buana-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  other: { "apple-mobile-web-app-title": "Srikandi" },
};

export const viewport: Viewport = {
  themeColor: "#123d32",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const designThemeVariables = await getPublicDesignThemeVariables();

  return (
    <html
      lang="id"
      className={jakarta.variable}
      style={designThemeVariables as React.CSSProperties}
    >
      <body className="font-sans">
        <BrandStage />
        {children}
      </body>
    </html>
  );
}
