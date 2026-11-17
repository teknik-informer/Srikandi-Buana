"use client";
import UserAvatar from "./access/user-avatar";
import { useProfileIdentity } from "@/hooks/use-profile-identity";
import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { navigationMatches } from "@/lib/navigation-config";
import { platformApplications } from "@/features/platform/application-registry";
import { roles, type Principal } from "@/lib/permissions";
import { getVisibleEnterpriseDashboardsForUser, getVisibleEnterpriseUtilities } from "@/features/enterprise/registry";
import {
  ArrowUpRight,
  ChevronDown,
  BookOpen,
  Grid2X2,
  LayoutDashboard,
  ChartNoAxesCombined,
  Globe2,
  Leaf,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
type ApplicationNavigation = {
  id: string;
  label: string;
  href: string;
  description: string;
  Icon: typeof Grid2X2;
  items: readonly { id: string; label: string; description: string; href: string }[];
};

function getApplicationNavigation(user: Principal, fullAccess: boolean, includeCatalog: boolean): ApplicationNavigation[] {
  const workspaces = getVisibleEnterpriseDashboardsForUser(user, fullAccess, includeCatalog);
  const features = (id: string) => workspaces.find((workspace) => workspace.id === id)?.features ?? [];
  const utilities = getVisibleEnterpriseUtilities(user.role, fullAccess);
  const projectFeatures = features("projects");
  const pointOfSaleFeatures = features("pos");
  const select = (items: ApplicationNavigation["items"], ids: string[]) => items.filter((item) => ids.includes(item.id));
  const icons: Record<string, typeof Grid2X2> = {
    "platform-core": LockKeyhole,
    organization: Network,
    agriculture: Leaf,
    business: Wallet,
    "bi-analytics": ChartNoAxesCombined,
    "public-partnership": Globe2,
  };
  const modulesByApplication: Record<string, ApplicationNavigation["items"]> = {
    "platform-core": utilities,
    organization: [...features("hrm"), ...select(projectFeatures, ["surat-resmi", "surat", "sumber", "kelembagaan", "register", "transkripsi", "dokumen"])],
    agriculture: [...select(projectFeatures, ["program", "pertanian", "laporan_program", "tindaklanjut", "kegiatan", "alsintan", "survei"]), ...select(pointOfSaleFeatures, ["lotkopi"])],
    business: [...features("accounting"), ...select(projectFeatures, ["usaha", "pengajuan", "enterprise"]), ...select(pointOfSaleFeatures, ["penjualan"])],
    "bi-analytics": features("analytics"),
    "public-partnership": features("crm"),
  };
  return platformApplications
    .map((application) => ({
      id: application.id,
      label: application.name,
      href: application.route,
      description: application.description,
      Icon: icons[application.id] ?? Grid2X2,
      items: modulesByApplication[application.id] ?? [],
    }))
    .filter((application) => application.items.length > 0);
}

export default function DashboardNavigation({ section, user, architectFullAccess = false, qaPreviewEnabled = false, searchQuery = "" }: { section: string; user: Principal; architectFullAccess?: boolean; qaPreviewEnabled?: boolean; searchQuery?: string }) {
  const identity = useProfileIdentity(user);
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const allApplications = getApplicationNavigation(user, architectFullAccess, user.role === "admin");
  const activeApplication = allApplications.find((application) =>
    application.href.split("/").pop() === section || application.items.some((item) => item.id === section),
  );
  const [expanded, setExpanded] = useState(activeApplication?.id || "");
  const query = searchQuery.trim();
  useEffect(() => {
    setExpanded(activeApplication?.id || "");
  }, [section, activeApplication?.id]);
  const applications = allApplications
    .map((application) => ({
      ...application,
      items: application.items.filter((item) => navigationMatches(item, query)),
    }))
    .filter((application) =>
      !query || application.items.length > 0
      || (application.label + " " + application.description).toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID")),
    );
  function toggle(id: string) {
    if (state === "collapsed" && !isMobile) {
      setOpen(true);
      setExpanded(id);
    } else setExpanded((current) => (current === id ? "" : id));
  }
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="workspace-sidebar-brand p-5">
        <Link href="/dashboard" aria-label="Srikandi Buana beranda">
          <BrandLogo />
        </Link>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() => setOpenMobile(false)}
            aria-label="Tutup navigasi"
          >
            <X />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={section === "ringkasan"} tooltip="Beranda">
                <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                  <LayoutDashboard />
                  <span>{user.role === "anggota" ? "Dashboard Anggota" : "Pusat Aplikasi"}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>APLIKASI TERPADU</SidebarGroupLabel>
          <SidebarMenu>
            {applications.map((application) => {
              const Icon = application.Icon;
              const shown = !!query || expanded === application.id;
              const active = application.href.split("/").pop() === section
                || application.items.some((item) => item.id === section);
              return (
                <SidebarMenuItem key={application.id} className="dashboard-category">
                  <SidebarMenuButton
                    tooltip={application.label}
                    aria-expanded={shown && (state !== "collapsed" || isMobile)}
                    aria-controls={"application-navigation-" + application.id}
                    isActive={active}
                    onClick={() => toggle(application.id)}
                  >
                    <Icon />
                    <span className="dashboard-category-label">{application.label}</span>
                    <span className="dashboard-category-count">{application.items.length}</span>
                    <ChevronDown className={shown ? "dashboard-category-chevron expanded" : "dashboard-category-chevron"} />
                  </SidebarMenuButton>
                  {shown && (state !== "collapsed" || isMobile) && (
                    <SidebarMenuSub id={"application-navigation-" + application.id}>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={application.href.split("/").pop() === section}>
                          <Link href={application.href} onClick={() => setOpenMobile(false)} aria-current={application.href.split("/").pop() === section ? "page" : undefined}>
                            <span className="dashboard-sub-dot" />
                            <span>Ringkasan aplikasi</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {application.items.map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton asChild isActive={section === item.id}>
                            <Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={section === item.id ? "page" : undefined}>
                              <span className="dashboard-sub-dot" />
                              <span>{user.role === "anggota" && item.id === "anggota" ? "Data saya" : item.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          {!applications.length && (
            <div className="dashboard-nav-empty">
              <Search size={20} />
              <p>{query ? "Menu belum ditemukan." : "Belum ada aplikasi yang ditugaskan."}</p>
            </div>
          )}
        </SidebarGroup>
        <div className="dashboard-nav-shortcut">
          <span>AKSES CEPAT</span>
          <Link href="/dashboard/panduan" onClick={() => setOpenMobile(false)} aria-current={section === "panduan" ? "page" : undefined}>
            <BookOpen size={14} /> Pusat Bantuan
          </Link>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            Lihat situs publik <ArrowUpRight size={14} />
          </Link>
          {user.role === "admin" && qaPreviewEnabled && (
            <Link href="/dashboard/qa-test-center" onClick={() => setOpenMobile(false)} aria-current={section === "qa-test-center" ? "page" : undefined}>
              QA Test Center <ShieldCheck size={14} />
            </Link>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="account">
          <UserAvatar user={identity} className="size-9" />
          <div className="min-w-0 flex-1">
            <strong className="block truncate">{identity.displayName || user.email}</strong>
            <small>{user.role === "admin" ? "Administrator Sistem · Akses Penuh" : roles[user.role]}</small>
          </div>
          <ShieldCheck size={17} />
        </div>
        <div className="sidebar-account-actions">
          <Button variant="ghost" asChild className="min-h-11 sidebar-account-link">
            <Link href="/dashboard/akun-saya" onClick={() => setOpenMobile(false)} title="Pengaturan" aria-label="Pengaturan akun">
              <Settings size={16} />
              <span>Pengaturan</span>
            </Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
