import { cookies } from "next/headers";
import { dashboardGroups } from "@/lib/navigation-config";
import { getAuthenticatedUser } from "@/lib/auth";
import { canReadSection, isArchitectFullAccess } from "@/lib/permissions";
import RoleWorkspace from "../../_components/access/role-workspace";
import { safeReturn } from "@/lib/auth";
import { modules } from "@/lib/srikandi";
import { dashboardRouteIds, dashboardSectionIds, getEnterpriseDashboardById, getEnterpriseFeature, getVisibleEnterpriseDashboardsForUser } from "@/features/enterprise/registry";
import { redirect, notFound } from "next/navigation";
import EnterpriseWorkspace from "../../_components/enterprise-workspace";
import Workspace from "../../_components/workspace";
import WorkspaceShell from "../../_components/workspace-shell";
import NotificationCenter from "../../_components/notification-center";
import {CommerceWorkspace,AccountingWorkspace} from "../../_components/ecosystem-workspace";
import EnterpriseDashboardOverview from "../../_components/enterprise-dashboard-overview";
import ExternalAccessWorkspace from "../../_components/external-access-workspace";
import AgricultureWorkspace from "../../_components/agriculture-workspace";
import ApplicationHub from "../../_components/application-hub";
import BusinessIntelligenceWorkspace from "../../_components/business-intelligence-workspace";
import PlatformModuleCenter from "../../_components/platform-module-center";
import Inbox from "../../_components/inbox";
import MemberAudienceDashboard from "../../_components/member-audience-dashboard";
import OfficialLetterWorkspace from "../../_components/official-letter-workspace";
import { getSiteSettings } from "@/lib/site-settings";
import { isArchitectQaPreview } from "@/features/shared/qa-preview.mjs";
import ArchitectQaTestCenter from "../../_components/architect-qa-test-center";
import QaMemberLab from "../../_components/qa-member-lab";
import HrmAttendanceWorkspace from "../../_components/hrm-attendance-workspace";
export async function generateMetadata({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const id = section?.[0] || "ringkasan";
  const dashboard = getEnterpriseDashboardById(id);
  const item = id === "qa-test-center" ? { label: "QA Test Center" } : id === "qa-members" ? { label: "Laboratorium Anggota QA" } : dashboard ? { label: dashboard.label } : getEnterpriseFeature(id) || dashboardGroups.flatMap((g) => g.items).find((i) => i.id === id);
  return {
    title: (item?.label || "Pusat Kendali") + " | Ruang kerja Srikandi Buana",
    robots: { index: false, follow: false },
  };
}
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  if ((section?.length || 0) > 1) notFound();
  const allowed = new Set([...Object.keys(modules), ...dashboardSectionIds, ...dashboardRouteIds, "ringkasan", "qa-test-center", "qa-members"]);
  if (section?.[0] === "profil") redirect("/profil");
  const legacyDashboardRedirects: Record<string, string> = {
    kehadiran: "/dashboard/presensi",
    management: "/dashboard/ecosystem",
    administration: "/dashboard/system",
    commerce: "/dashboard/finance",
  };
  if (section?.[0] && legacyDashboardRedirects[section[0]]) redirect(legacyDashboardRedirects[section[0]]);
  if (section?.[0] && !allowed.has(section[0])) notFound();
  const admin = await getAuthenticatedUser();
  if (!admin)
    redirect(
      "/masuk?return_to=" + encodeURIComponent(safeReturn("/dashboard" + (section?.length ? "/" + section[0] : ""))),
    );
  const defaultSidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  const active = section?.[0] || "ringkasan";
  if (active === "qa-members") {
    if (admin.role !== "admin" || !isArchitectQaPreview(process.env)) return notFound();
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="Laboratorium Anggota QA" defaultSidebarOpen={defaultSidebarOpen}><QaMemberLab /></WorkspaceShell>;
  }
  if (active === "qa-test-center") {
    if (admin.role !== "admin" || !isArchitectQaPreview(process.env)) return notFound();
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="QA Test Center" defaultSidebarOpen={defaultSidebarOpen}><ArchitectQaTestCenter user={admin} /></WorkspaceShell>;
  }
  if (active === "presensi" || active === "presensi-saya") {
    if (!canReadSection(admin, active)) return <main className="max-w-xl mx-auto p-8"><h1 className="text-2xl font-semibold">Akses dibatasi</h1><p className="my-4">Halaman presensi berada di luar kewenangan akun ini.</p><a href="/dashboard" className="underline">Kembali ke ruang kerja</a></main>;
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title={active === "presensi-saya" ? "Presensi Saya" : "Smart Attendance Management"} defaultSidebarOpen={defaultSidebarOpen}>
      <HrmAttendanceWorkspace user={admin} />
    </WorkspaceShell>;
  }
  if (active === "ringkasan") {
    const isMember = admin.role === "anggota";
    return (
      <WorkspaceShell
        user={admin}
        section={active}
        title={isMember ? "Dashboard Anggota" : "Pusat Aplikasi"}
        defaultSidebarOpen={defaultSidebarOpen}
       qaPreviewEnabled={isArchitectQaPreview(process.env)}>
        {isMember
          ? <MemberAudienceDashboard user={admin} />
          : <ApplicationHub dashboards={getVisibleEnterpriseDashboardsForUser(admin, isArchitectFullAccess(admin), admin.role === "admin")} displayName={admin.displayName || admin.fullName} canOpenPlatformCore={admin.role === "admin" && (isArchitectFullAccess(admin) || canReadSection(admin, "module-center"))} />}
      </WorkspaceShell>
    );
  }
  const dashboardDefinition = getEnterpriseDashboardById(active);
  const visibleDashboard = dashboardDefinition
    ? getVisibleEnterpriseDashboardsForUser(admin, isArchitectFullAccess(admin), admin.role === "admin").find((dashboard) => dashboard.id === active)
    : undefined;
  if (dashboardDefinition ? !visibleDashboard : !canReadSection(admin, active))
    return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold">Akses dibatasi</h1>
        <p className="my-4">Halaman ini berada di luar penugasan Anda.</p>
        <a href="/dashboard" className="underline">
          Kembali ke ruang kerja
        </a>
      </main>
    );
  if (active === "module-center" && admin.role === "admin") {
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="Pusat Modul & Platform" defaultSidebarOpen={defaultSidebarOpen}>
      <PlatformModuleCenter user={admin} />
    </WorkspaceShell>;
  }
  if (dashboardDefinition && visibleDashboard?.catalogOnly) {
    return (
      <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title={dashboardDefinition.label} defaultSidebarOpen={defaultSidebarOpen}>
        <main className="workspace-page">
          <section className="max-w-3xl space-y-3 rounded-2xl border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Katalog modul</p>
            <h1 className="text-2xl font-semibold tracking-tight">{dashboardDefinition.label}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{dashboardDefinition.description}</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Modul ini terdaftar pada platform, tetapi akun Administrator Sistem belum diberi akses operasional terhadap datanya.
              Pengelolaan teknis platform tidak otomatis memberikan kewenangan membaca, mengubah, atau menyetujui data organisasi.
            </p>
            <a href="/dashboard" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Kembali ke Pusat Aplikasi
            </a>
          </section>
        </main>
      </WorkspaceShell>
    );
  }
  if (dashboardDefinition && visibleDashboard?.accessOnly) {
    return (
      <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title={dashboardDefinition.label} defaultSidebarOpen={defaultSidebarOpen}>
        <main className="workspace-page">
          <section className="max-w-3xl space-y-3 rounded-2xl border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Akses aplikasi ditetapkan</p>
            <h1 className="text-2xl font-semibold tracking-tight">{dashboardDefinition.label}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{dashboardDefinition.description}</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Akun ini dapat membuka ruang aplikasi, tetapi belum memiliki izin fitur untuk membaca atau mengubah data di dalamnya.
              Penetapan akses aplikasi tidak menggantikan role organisasi, kewenangan persetujuan, maupun penugasan program.
            </p>
            <a href="/dashboard" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Kembali ke Pusat Aplikasi
            </a>
          </section>
        </main>
      </WorkspaceShell>
    );
  }
  if (dashboardDefinition?.id === "analytics" && visibleDashboard) {
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title={dashboardDefinition.label} defaultSidebarOpen={defaultSidebarOpen}>
      <BusinessIntelligenceWorkspace user={admin} />
    </WorkspaceShell>;
  }
  if (dashboardDefinition && visibleDashboard) {
    return (
      <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title={dashboardDefinition.label} defaultSidebarOpen={defaultSidebarOpen}>
        <EnterpriseDashboardOverview dashboard={visibleDashboard} user={admin} />
      </WorkspaceShell>
    );
  }
  if (active === "pertanian") {
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="Pengelolaan Pertanian" defaultSidebarOpen={defaultSidebarOpen}>
      <AgricultureWorkspace role={admin.role} programIds={admin.programIds} />
    </WorkspaceShell>;
  }
  if (active === "surat-resmi") {
    const settings = await getSiteSettings();
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="Penyusunan Surat Resmi" defaultSidebarOpen={defaultSidebarOpen}>
      <OfficialLetterWorkspace role={admin.role} settings={{ address: settings.address, email: settings.email, phone: settings.phone }} />
    </WorkspaceShell>;
  }
  if (active === "akses-eksternal") {
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="Akses Pemerintah & Mitra" defaultSidebarOpen={defaultSidebarOpen}>
      <ExternalAccessWorkspace />
    </WorkspaceShell>;
  }
  if (["notifikasi", "penjualan", "akuntansi"].includes(active)) {
    const title = active === "notifikasi" ? "Pusat Notifikasi" : active === "penjualan" ? "Katalog dan Pemesanan" : "Akuntansi dan Buku Besar";
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title={title} defaultSidebarOpen={defaultSidebarOpen}>
      {active === "notifikasi" ? <NotificationCenter /> : active === "penjualan" ? <CommerceWorkspace role={admin.role} /> : <AccountingWorkspace role={admin.role} />}
    </WorkspaceShell>;
  }
  if (active === "pesan" && ["admin", "ketua", "sekretaris"].includes(admin.role)) {
    return <WorkspaceShell user={admin} qaPreviewEnabled={isArchitectQaPreview(process.env)} section={active} title="Pesan pengunjung" defaultSidebarOpen={defaultSidebarOpen}>
      <Inbox />
    </WorkspaceShell>;
  }
  if ((admin.role === "ketua" && active === "akun") || (admin.role === "admin" && active === "pengaturan")) {
    return <Workspace section={active} principal={admin} defaultSidebarOpen={defaultSidebarOpen} />;
  }
  if (["portal","pengajuan","enterprise"].includes(active)) return <EnterpriseWorkspace user={admin} section={active} defaultSidebarOpen={defaultSidebarOpen} />;
  return admin.role === "admin" ? (
    <Workspace section={active} principal={admin} defaultSidebarOpen={defaultSidebarOpen} />
  ) : (
    <RoleWorkspace user={admin} section={active} defaultSidebarOpen={defaultSidebarOpen} />
  );
}
