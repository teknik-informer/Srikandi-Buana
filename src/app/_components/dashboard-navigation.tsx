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
import { roles, type Principal } from "@/lib/permissions";
import { enterpriseDashboards, getVisibleEnterpriseDashboards, getVisibleEnterpriseUtilities } from "@/features/enterprise/registry";
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
  MessagesSquare,
  ShoppingBag,
  Megaphone,
  Search,
  Settings2,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import LogoutButton from "./access/logout-button";
const dashboardIcons: Record<string, typeof Grid2X2> = {
  ecosystem: Grid2X2,
  management: BriefcaseBusiness,
  administration: Files,
  finance: Wallet,
  commerce: ShoppingBag,
  publication: Megaphone,
  system: Settings2,
};
export default function DashboardNavigation({ section, user }: { section: string; user: Principal }) {
  const identity = useProfileIdentity(user);
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const active = enterpriseDashboards.find((dashboard) => dashboard.id === section || dashboard.features.some((feature) => feature.id === section));
  const [expanded, setExpanded] = useState(active?.id || "");
  useEffect(() => {
    setExpanded(active?.id || "");
  }, [section, active?.id]);
  const groups = getVisibleEnterpriseDashboards(user.role);
  const utilities = getVisibleEnterpriseUtilities(user.role);
  const canOpenSettings = groups.some((group) => group.features.some((feature) => feature.id === "pengaturan"));
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
                  <span>{user.role === "anggota" ? "Dashboard Anggota" : "Dashboard Pengurus"}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {utilities.map((item) => {
              const Icon = item.id === "monitoring" ? Activity : FileText;
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

        <SidebarGroup>
          <SidebarGroupLabel>MENU UTAMA</SidebarGroupLabel>
          <SidebarMenu>
            {groups.map((group) => {
              const Icon = dashboardIcons[group.id] ?? Grid2X2;
              const shown = expanded === group.id;
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
                    <ChevronDown
                      className={shown ? "dashboard-category-chevron expanded" : "dashboard-category-chevron"}
                    />
                  </SidebarMenuButton>
                  {shown && (state !== "collapsed" || isMobile) && (
                    <SidebarMenuSub id={"dashboard-category-" + group.id}>
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
                      {group.features.map((item) => (
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
              <p>Belum ada modul yang tersedia pada akun ini.</p>
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
          {user.role === "admin" && (
            <Link href="/dashboard/sumber" onClick={() => setOpenMobile(false)}>
              Dokumen sumber <Files size={14} />
            </Link>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className="sidebar-footer-clean p-3">
        <div className="sidebar-footer-account">
          <Link href="/dashboard/akun-saya" onClick={() => setOpenMobile(false)} className="sidebar-footer-identity" title="Buka profil akun">
            <UserAvatar user={identity} className="size-9" />
            <span className="min-w-0">
              <strong className="block truncate">{identity.displayName || user.email}</strong>
              <small className="block truncate">{roles[user.role]}</small>
            </span>
          </Link>
          <div className="sidebar-footer-tools">
            {canOpenSettings && (
              <Link href="/dashboard/pengaturan" onClick={() => setOpenMobile(false)} className="sidebar-footer-setting" aria-current={section === "pengaturan" ? "page" : undefined} aria-label="Pengaturan" title="Pengaturan">
                <Settings size={17} />
              </Link>
            )}
            <div className="sidebar-footer-logout"><LogoutButton compact /></div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export function DashboardMegaMenu({
  section,
  user,
  compact = false,
}: {
  section: string;
  user: Principal;
  compact?: boolean;
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
  const groups = getVisibleEnterpriseDashboards(user.role)
    .map((pillar) => ({ ...pillar, items: pillar.features.filter((feature) => navigationMatches(feature, query)) }))
    .filter((pillar) => pillar.items.length);
  const utilities = getVisibleEnterpriseUtilities(user.role)
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
            <span className="dashboard-app-menu-label">Cari menu</span>
            <kbd>⌘ K</kbd>
          </>
        )}
      </Button></DialogTrigger>
        <DialogContent showCloseButton={false} className="workspace-dialog dashboard-mega-dialog sm:max-w-5xl" onOpenAutoFocus={(e) => { e.preventDefault(); searchInput.current?.focus(); }}>
          <DialogClose className="dashboard-mega-close" aria-label="Tutup menu aplikasi">
            <X size={18} />
          </DialogClose>
          <DialogTitle>Navigasi aplikasi</DialogTitle>
          <DialogDescription>
            Pilih ruang kerja, monitoring, laporan, atau Pusat Bantuan sesuai kewenangan akun Anda.
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
          {utilities.length > 0 && (
            <section className="dashboard-mega-shortcuts" aria-label="Akses cepat">
              <p>AKSES CEPAT</p>
              <div>
                {utilities.map((item) => {
                  const Icon = item.id === "monitoring" ? Activity : FileText;
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
                {g.items.map((item) => (
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
