import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";

/**
 * Launcher shell for the shared /app pages (beranda, peta bidang, notifikasi,
 * cari, cepat). Operational areas live in the sibling (area) group and mount
 * their own shells, so a page never renders two nested sidebars.
 */
export default async function LauncherLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  return (
    <CoreShell
      identity={identity}
      activeApp="launcher"
      nav={[
        { label: "Jelajahi", items: [
          { label: "Beranda aplikasi", href: "/app" },
          { label: "Peta bidang", href: "/app/bidang" },
          { label: "Notifikasi", href: "/app/notifikasi" },
          { label: "Cari", href: "/app/cari" },
        ] },
        { label: "Aplikasi", items: [
          { label: "Pengurus", href: "/app/pengurus" },
          { label: "Sekretariat", href: "/app/sekretariat" },
          { label: "Keuangan", href: "/app/keuangan" },
          { label: "Portal Anggota", href: "/app/anggota" },
          { label: "POS", href: "/app/pos" },
          { label: "Studio", href: "/studio" },
        ] },
      ]}
    >
      {children}
    </CoreShell>
  );
}
