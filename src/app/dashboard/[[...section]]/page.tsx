import { cookies } from "next/headers";
import { dashboardGroups } from "@/lib/navigation-config";
import { getAuthenticatedUser } from "@/lib/auth";
import { canReadSection } from "@/lib/permissions";
import RoleWorkspace from "../../_components/access/role-workspace";
import { safeReturn } from "@/lib/auth";
import { modules } from "@/lib/srikandi";
import { dashboardRouteIds, dashboardSectionIds, getEnterpriseDashboardById, getEnterpriseFeature, getVisibleEnterpriseDashboards } from "@/features/enterprise/registry";
import { redirect, notFound } from "next/navigation";
import EnterpriseWorkspace from "../../_components/enterprise-workspace";
import Workspace from "../../_components/workspace";
import WorkspaceShell from "../../_components/workspace-shell";
import NotificationCenter from "../../_components/notification-center";
import {CommerceWorkspace,AccountingWorkspace} from "../../_components/ecosystem-workspace";
import EnterpriseDashboardOverview from "../../_components/enterprise-dashboard-overview";
import HelpCenter from "../../_components/help-center";
export async function generateMetadata({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const id = section?.[0] || "ringkasan";
  if (id === "pengembangan" || id === "panduan") return { title: "Pusat Bantuan | Ruang kerja Srikandi Buana", robots: { index: false, follow: false } };
  const dashboard = getEnterpriseDashboardById(id);
  const item = dashboard ? { label: dashboard.label } : getEnterpriseFeature(id) || dashboardGroups.flatMap((g) => g.items).find((i) => i.id === id);
  return { title: (item?.label || "Pusat Kendali") + " | Ruang kerja Srikandi Buana", robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  if ((section?.length || 0) > 1) notFound();
  if (section?.[0] === "pengembangan") redirect("/dashboard/panduan#template");
  const allowed = new Set([...Object.keys(modules), ...dashboardSectionIds, ...dashboardRouteIds, "ringkasan", "panduan"]);
  if (section?.[0] === "profil") redirect("/profil");
  if (section?.[0] && !allowed.has(section[0])) notFound();
  const admin = await getAuthenticatedUser();
  if (!admin) redirect("/masuk?return_to=" + encodeURIComponent(safeReturn("/dashboard" + (section?.length ? "/" + section[0] : ""))));
  const defaultSidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  const active = section?.[0] || "ringkasan";
  const dashboardDefinition = getEnterpriseDashboardById(active);
  const visibleDashboard = dashboardDefinition
    ? getVisibleEnterpriseDashboards(admin.role).find((dashboard) => dashboard.id === active)
    : undefined;
  if (dashboardDefinition ? !visibleDashboard : !canReadSection(admin, active)) {
    return <main className="max-w-xl mx-auto p-8"><h1 className="text-2xl font-semibold">Akses dibatasi</h1><p className="my-4">Halaman ini berada di luar penugasan Anda.</p><a href="/dashboard" className="underline">Kembali ke ruang kerja</a></main>;
  }
  if (dashboardDefinition && visibleDashboard) {
    return <WorkspaceShell user={admin} section={active} title={dashboardDefinition.label} defaultSidebarOpen={defaultSidebarOpen}>
      <EnterpriseDashboardOverview dashboard={visibleDashboard} user={admin} />
    </WorkspaceShell>;
  }
  if (active === "panduan") return <WorkspaceShell user={admin} section={active} title="Pusat Bantuan" defaultSidebarOpen={defaultSidebarOpen}><HelpCenter role={admin.role} /></WorkspaceShell>;
  if (["notifikasi", "penjualan", "akuntansi"].includes(active)) {
    const title = active === "notifikasi" ? "Pusat Notifikasi" : active === "penjualan" ? "Katalog dan Pemesanan" : "Akuntansi dan Buku Besar";
    return <WorkspaceShell user={admin} section={active} title={title} defaultSidebarOpen={defaultSidebarOpen}>
      {active === "notifikasi" ? <NotificationCenter /> : active === "penjualan" ? <CommerceWorkspace role={admin.role} /> : <AccountingWorkspace role={admin.role} />}
    </WorkspaceShell>;
  }
  if (["portal", "pengajuan", "enterprise"].includes(active)) return <EnterpriseWorkspace user={admin} section={active} defaultSidebarOpen={defaultSidebarOpen} />;
  return admin.role === "admin"
    ? <Workspace section={active} principal={admin} defaultSidebarOpen={defaultSidebarOpen} />
    : <RoleWorkspace user={admin} section={active} defaultSidebarOpen={defaultSidebarOpen} />;
}
