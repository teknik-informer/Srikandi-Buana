import { redirect } from "next/navigation";
import { requireIdentity } from "@/lib/session";
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

const SECRETARY_STUDIO_NAV = [
  { label: "Publikasi", items: [
    { label: "Website Studio", href: "/studio/website" },
  ] },
  { label: "Pintasan", items: [
    { label: "Kembali ke Sekretariat", href: "/app/sekretariat" },
    { label: "Lihat website", href: "/" },
  ] },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity();
  const isAdministrator = identity.roleKey === "platform_admin" || identity.roleKey === "organization_admin";
  const isSecretary = identity.roleKey === "secretary";
  if (!isAdministrator && !isSecretary) redirect("/app");
  const nav = isSecretary ? SECRETARY_STUDIO_NAV : STUDIO_NAV;
  return (
    <CoreShell identity={identity} activeApp="studio" nav={nav}>
      {children}
    </CoreShell>
  );
}
