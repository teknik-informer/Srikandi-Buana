import { cookies } from "next/headers";
import { dashboardGroups } from "@/lib/navigation-config";
import { getAuthenticatedUser } from "@/lib/auth";
import { canReadSection } from "@/lib/permissions";
import RoleWorkspace from "../../_components/access/role-workspace";
import { safeReturn } from "@/lib/auth";
import { modules } from "@/lib/srikandi";
import { redirect, notFound } from "next/navigation";
import EnterpriseWorkspace from "../../_components/enterprise-workspace";
import Workspace from "../../_components/workspace";
export async function generateMetadata({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const id = section?.[0] || "ringkasan";
  const item = dashboardGroups.flatMap((g) => g.items).find((i) => i.id === id);
  return {
    title: (item?.label || "Ringkasan Operasional") + " | Ruang kerja Srikandi Buana",
    robots: { index: false, follow: false },
  };
}
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  if ((section?.length || 0) > 1) notFound();
  const allowed = [
    ...Object.keys(modules),
    "portal", "pengajuan", "enterprise",
    "akun",
    "akun-saya",
    "ringkasan",
    "program",
    "dokumen",
    "panduan",
    "pesan",
    "pengaturan",
    "laporan",
    "kehadiran",
    "sumber",
  ];
  if (section?.[0] === "profil") redirect("/profil");
  if (section?.[0] && !allowed.includes(section[0])) notFound();
  const admin = await getAuthenticatedUser();
  if (!admin)
    redirect(
      "/masuk?return_to=" + encodeURIComponent(safeReturn("/dashboard" + (section?.length ? "/" + section[0] : ""))),
    );
  const defaultSidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  const active = section?.[0] || "ringkasan";
  if (!canReadSection(admin, active))
    return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold">Akses dibatasi</h1>
        <p className="my-4">Halaman ini berada di luar penugasan Anda.</p>
        <a href="/dashboard" className="underline">
          Kembali ke ruang kerja
        </a>
      </main>
    );
  if (["portal","pengajuan","enterprise"].includes(active)) return <EnterpriseWorkspace user={admin} section={active} defaultSidebarOpen={defaultSidebarOpen} />;
  return admin.role === "admin" ? (
    <Workspace section={active} principal={admin} defaultSidebarOpen={defaultSidebarOpen} />
  ) : (
    <RoleWorkspace user={admin} section={active} defaultSidebarOpen={defaultSidebarOpen} />
  );
}
