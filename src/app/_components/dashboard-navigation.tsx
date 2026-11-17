"use client";
import UserAvatar from "./access/user-avatar";
import { useProfileIdentity } from "@/hooks/use-profile-identity";
import { WorkspaceDialogContent as DialogContent } from "./workspace-dialog";
import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { enterpriseDashboards, getVisibleEnterpriseDashboardsForUser, getVisibleEnterpriseUtilities } from "@/features/enterprise/registry";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  BookOpen,
  Files,
  FileText,
  Grid2X2,
  LayoutDashboard,
  Layers3,
  ChartNoAxesCombined,
  Globe2,
  Leaf,
  LockKeyhole,
  Network,
  MessagesSquare,
  ShoppingBag,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import LogoutButton from "./access/logout-button";
type ApplicationLaunch = { id: string; label: string; href: string; description: string; Icon: typeof Grid2X2 };

function getApplicationLaunches(user: Principal): ApplicationLaunch[] {
  // The verified root Administrator Sistem always sees the complete canonical app catalog,
  // even when a module is disabled for ordinary workspace roles or has no legacy feature list.
  if (user.role === "admin") {
    const icons: Record<string, typeof Grid2X2> = {
      "platform-core": LockKeyhole,
      organization: Network,
      agriculture: Leaf,
      business: Wallet,
      "bi-analytics": ChartNoAxesCombined,
      "public-partnership": Globe2,
    };
    return platformApplications.map((application) => ({
      id: application.id,
      label: application.name,
      href: application.route,
      description: application.description,
      Icon: icons[application.id] ?? Grid2X2,
    }));
  }
  const dashboards = getVisibleEnterpriseDashboardsForUser(user, false, false);
  const byId = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]));
  const utilities = getVisibleEnterpriseUtilities(user.role, false);
  const launches: ApplicationLaunch[] = [];
  const core = platformApplications.find((application) => application.id === "platform-core");
  if (core && utilities.some((item) => item.id === "module-center")) {
    launches.push({ id: core.id, label: core.name, href: core.route, description: core.description, Icon: LockKeyhole });
  }
  const organization = platformApplications.find((application) => application.id === "organization");
  if (organization && byId.get("hrm")?.features.length) {
    launches.push({ id: organization.id, label: organization.name, href: organization.route, description: organization.description, Icon: Network });
  }
  const agriculture = platformApplications.find((application) => application.id === "agriculture");
  const agricultureWorkspace = byId.get("projects");
  if (agriculture && agricultureWorkspace?.features.some((feature) => feature.id === "pertanian")) {
    launches.push({ id: agriculture.id, label: agriculture.name, href: agriculture.route, description: agriculture.description, Icon: Leaf });
  }
  const business = platformApplications.find((application) => application.id === "business");
  const businessWorkspace = byId.get("accounting")?.features.length ? byId.get("accounting") : byId.get("pos");
  if (business && businessWorkspace?.features.length) {
    launches.push({ id: business.id, label: business.name, href: businessWorkspace.href, description: business.description, Icon: Wallet });
  }
  const analytics = platformApplications.find((application) => application.id === "bi-analytics");
  if (analytics && byId.get("analytics")?.features.length) {
    launches.push({ id: analytics.id, label: analytics.name, href: analytics.route, description: analytics.description, Icon: ChartNoAxesCombined });
  }
  const publicPartnership = platformApplications.find((application) => application.id === "public-partnership");
  const publicWorkspace = byId.get("crm");
  if (publicPartnership && publicWorkspace?.features.some((feature) => ["publikasi", "galeri", "pesan", "kemitraan", "akses-eksternal"].includes(feature.id))) {
    launches.push({ id: publicPartnership.id, label: publicPartnership.name, href: publicPartnership.route, description: publicPartnership.description, Icon: Globe2 });
  }
  return launches;
}

const dashboardIcons: Record<string, typeof Grid2X2> = {
  hrm: BriefcaseBusiness,
  analytics: Activity,
  accounting: Wallet,
  crm: MessagesSquare,
  projects: Grid2X2,
  pos: ShoppingBag,
};
export default function DashboardNavigation({ section, user, architectFullAccess = false, qaPreviewEnabled = false }: { section: string; user: Principal; architectFullAccess?: boolean; qaPreviewEnabled?: boolean }) {
  const identity = useProfileIdentity(user);
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const active = enterpriseDashboards.find((dashboard) => dashboard.id === section || dashboard.features.some((feature) => feature.id === section));
  const [expanded, setExpanded] = useState(active?.id || ""),
    [query, setQuery] = useState("");
  useEffect(() => {
    setExpanded(active?.id || "");
    setQuery("");
  }, [section, active?.id]);
  const applicationLaunches = getApplicationLaunches(user);
  const groups = getVisibleEnterpriseDashboardsForUser(user, architectFullAccess, user.role === "admin")
    .map((pillar) => ({
      ...pillar,
      items: pillar.features.filter((feature) => navigationMatches(feature, query)),
    }))
    .filter((pillar) => pillar.items.length || pillar.accessOnly);
  const utilities = getVisibleEnterpriseUtilities(user.role, architectFullAccess)
    .filter((item) => navigationMatches(item, query));
  function toggle(id: string) {
    if (state === "collapsed" && !isMobile) {
      setOpen(true);
      setExpanded(id);
    } else setExpanded((current) => (current === id ? "" : id));
  }
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="workspace-sidebar-brand p-5">
        <Link href="/dashboard" aria-label="Srikandi Buana beranda" className="workspace-sidebar-brand-link">
          <BrandLogo />
        </Link>
        <div className="dashboard-menu-search">
          <label htmlFor="dashboard-menu-query" className="sr-only">
            Cari menu dashboard
          </label>
          <div className="dashboard-nav-search">
            <Search size={14} aria-hidden="true" />
            <Input
              id="dashboard-menu-query"
              placeholder="Cari halaman…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari halaman dashboard"
            />
            {query && (
              <button type="button" aria-label="Hapus pencarian menu" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>
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
            {utilities.map((item) => {
              const Icon = item.id === "monitoring" ? Activity : item.id === "module-center" ? Layers3 : FileText;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild isActive={section === item.id} tooltip={item.label}>
                    <Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={section === item.id ? "page" : undefined}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        {applicationLaunches.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>APLIKASI UTAMA</SidebarGroupLabel>
            <SidebarMenu>
              {applicationLaunches.map((application) => {
                const Icon = application.Icon;
                const active = section === application.href.split("/").pop();
                return (
                  <SidebarMenuItem key={application.id}>
                    <SidebarMenuButton asChild isActive={active} tooltip={application.label}>
                      <Link href={application.href} onClick={() => setOpenMobile(false)} aria-current={active ? "page" : undefined}>
                        <Icon />
                        <span>{application.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>MODUL OPERASIONAL</SidebarGroupLabel>
          <SidebarMenu>
            {groups.map((group) => {
              const Icon = dashboardIcons[group.id] ?? Grid2X2;
              const shown = !!query || expanded === group.id;
              return (
                <SidebarMenuItem key={group.id} className="dashboard-category">
                  <SidebarMenuButton
                    tooltip={group.label}
                    aria-expanded={shown && (state !== "collapsed" || isMobile)}
                    aria-controls={"dashboard-category-" + group.id}
                    isActive={active?.id === group.id}
                    onClick={() => toggle(group.id)}
                  >
                    <Icon />
                    <span className="dashboard-category-label">{group.label}</span>
                    <span className="dashboard-category-count">{group.items.length}</span>
                    <ChevronDown
                      className={shown ? "dashboard-category-chevron expanded" : "dashboard-category-chevron"}
                    />
                  </SidebarMenuButton>
                  {shown && (state !== "collapsed" || isMobile) && (
                    <SidebarMenuSub id={"dashboard-category-" + group.id}>
                      {!group.items.some((item) => item.href === group.href) && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={section === group.id}>
                          <Link
                            href={group.href}
                            onClick={() => setOpenMobile(false)}
                            aria-current={section === group.id ? "page" : undefined}
                          >
                            <span className="dashboard-sub-dot" />
                            <span>Ringkasan {group.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      )}
                      {group.items.map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton asChild isActive={section === item.id}>
                            <Link
                              href={item.href}
                              onClick={() => setOpenMobile(false)}
                              aria-current={section === item.id ? "page" : undefined}
                            >
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
          {!groups.length && (
            <div className="dashboard-nav-empty">
              <Search size={20} />
              <p>Menu belum ditemukan.</p>
              <button onClick={() => setQuery("")}>Tampilkan semua kategori</button>
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
          {["admin", "ketua", "sekretaris"].includes(user.role) && (
            <Link href="/dashboard/sumber" onClick={() => setOpenMobile(false)} aria-current={section === "sumber" ? "page" : undefined}>
              Dokumen sumber <Files size={14} />
            </Link>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className="workspace-sidebar-footer p-4">
        <div className="account">
          <UserAvatar user={identity} className="size-9" />
          <div className="min-w-0 flex-1">
            <strong className="block truncate">{identity.displayName || user.email}</strong>
            <small>{user.role === "admin" ? "Administrator Sistem · Akses Penuh" : roles[user.role]}</small>
          </div>
          <ShieldCheck size={17} />
        </div>
        <div className="sidebar-account-actions">
          <Button variant="ghost" asChild className="min-h-11">
            <Link href="/dashboard/akun-saya" onClick={() => setOpenMobile(false)}>
              Akun saya
            </Link>
          </Button>
          <LogoutButton compact />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export function DashboardMegaMenu({
  section,
  user,
  compact = false,
  architectFullAccess = false,
}: {
  section: string;
  user: Principal;
  compact?: boolean;
  architectFullAccess?: boolean;
}) {
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [section]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const applicationLaunches = getApplicationLaunches(user).filter((application) =>
    !query.trim() || (application.label + " " + application.description).toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID")),
  );
  const groups = getVisibleEnterpriseDashboardsForUser(user, architectFullAccess, user.role === "admin")
    .map((pillar) => ({ ...pillar, items: pillar.features.filter((feature) => navigationMatches(feature, query)) }))
    .filter((pillar) => pillar.items.length);
  const utilities = getVisibleEnterpriseUtilities(user.role, architectFullAccess)
    .filter((item) => navigationMatches(item, query));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        onClick={() => setOpen(true)}
        className={compact ? "dashboard-app-menu workspace-icon-button" : "dashboard-app-menu"}
        aria-label="Cari menu aplikasi"
        title="Cari menu · Ctrl/⌘ K"
      >
        <Search data-icon="inline-start" />
        {!compact && (
          <>
            Cari menu<kbd>⌘ K</kbd>
          </>
        )}
      </Button></DialogTrigger>
        <DialogContent showCloseButton={false} className="workspace-dialog dashboard-mega-dialog sm:max-w-5xl" onOpenAutoFocus={(e) => { e.preventDefault(); searchInput.current?.focus(); }}>
          <DialogClose className="dashboard-mega-close" aria-label="Tutup menu aplikasi">
            <X size={18} />
          </DialogClose>
          <DialogTitle>Navigasi aplikasi</DialogTitle>
          <DialogDescription>
            Pilih modul operasional di dalam enam aplikasi utama: Platform Core, Organization, Agriculture, Business, BI & Analytics, serta Public & Partnership.
          </DialogDescription>
          <div className="dashboard-mega-search">
            <Search size={17} />
            <Input
              ref={searchInput}
              aria-label="Cari fitur aplikasi"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari publikasi, laporan, anggota…"
            />
          </div>
          {applicationLaunches.length > 0 && (
            <section className="dashboard-mega-shortcuts" aria-label="Aplikasi utama">
              <p>APLIKASI UTAMA</p>
              <div>
                {applicationLaunches.map((application) => {
                  const Icon = application.Icon;
                  const active = section === application.href.split("/").pop();
                  return (
                    <Link href={application.href} key={application.id} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}>
                      <Icon size={17} aria-hidden="true" />
                      <span>
                        <strong>{application.label}</strong>
                        <small>{application.description}</small>
                      </span>
                      <ArrowUpRight size={14} />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          {utilities.length > 0 && (
            <section className="dashboard-mega-shortcuts" aria-label="Akses cepat">
              <p>AKSES CEPAT</p>
              <div>
                {utilities.map((item) => {
                  const Icon = item.id === "monitoring" ? Activity : item.id === "module-center" ? Layers3 : FileText;
                  return (
                    <Link href={item.href} key={item.id} onClick={() => setOpen(false)} aria-current={section === item.id ? "page" : undefined}>
                      <Icon size={17} aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      <ArrowUpRight size={14} />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          <div className="dashboard-mega-grid">
            {groups.map((g) => (
              <section key={g.id}>
                <h3>
                  <Link href={g.href} onClick={() => setOpen(false)}>{g.label}</Link>
                </h3>
                <p>{g.description}</p>
                {g.items.filter((item) => item.href !== g.href).map((item) => (
                  <Link
                    href={item.href}
                    key={item.id}
                    onClick={() => setOpen(false)}
                    aria-current={section === item.id ? "page" : undefined}
                  >
                    <span>
                      <strong>{user.role === "anggota" && item.id === "anggota" ? "Data saya" : item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </section>
            ))}
          </div>
          {!groups.length && (
            <div className="dashboard-nav-empty">
              <p>Fitur belum ditemukan. Coba kata lain.</p>
            </div>
          )}
          <div className="dashboard-mega-footer">
            <Link href="/dashboard/panduan" onClick={() => setOpen(false)}>
              <BookOpen size={14} /> Pusat Bantuan
            </Link>
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              Kembali ke Pusat Kendali
            </Link>
            <span>Ctrl / ⌘ K · Esc untuk menutup</span>
          </div>
        </DialogContent>
    </Dialog>
  );
}
