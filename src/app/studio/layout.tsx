import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";

const STUDIO_NAV = [
  { label: "Studio Pengelola", items: [

    { label: "Beranda Studio", href: "/studio" },
    { label: "Website Studio", href: "/studio/website" },
    { label: "Application Studio", href: "/studio/aplikasi" },
    { label: "Data & Form Builder", href: "/studio/data" },
    { label: "Dashboard Builder", href: "/studio/dashboard" },
    { label: "Workflow Builder", href: "/studio/workflow" },
  ] },
  { label: "Tata kelola", items: [
    { label: "Organization Studio", href: "/studio/organisasi" },
    { label: "Design & Theme", href: "/studio/tema" },
    { label: "Modul & Ekstensi", href: "/studio/modul" },
    { label: "Rilis & Riwayat", href: "/studio/rilis" },
  ] },
  { label: "Pintasan", items: [
    { label: "Kembali ke aplikasi", href: "/app" },
    { label: "Lihat website", href: "/" },
  ] },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  return (
    <CoreShell identity={identity} activeApp="studio" nav={STUDIO_NAV}>
      {children}
    </CoreShell>
  );
}
