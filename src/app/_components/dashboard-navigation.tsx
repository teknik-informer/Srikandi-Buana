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
import { dashboardGroups, navigationMatches } from "@/lib/navigation-config";
import { canReadSection, roles, type Principal } from "@/lib/permissions";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Files,
  Grid2X2,
  LayoutDashboard,
  MessagesSquare,
  ShoppingBag,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import LogoutButton from "./access/logout-button";
const icons = [Users, CalendarDays, Wallet, Files, MessagesSquare,
  ShoppingBag, Grid2X2, Settings2];
export default function DashboardNavigation({ section, user }: { section: string; user: Principal }) {
  const identity = useProfileIdentity(user);
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const active = dashboardGroups.find((g) => g.items.some((i) => i.id === section));
  const [expanded, setExpanded] = useState(active?.id || ""),
    [query, setQuery] = useState("");
  useEffect(() => {
    setExpanded(active?.id || "");
    setQuery("");
  }, [section, active?.id]);
  const groups = dashboardGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => canReadSection(user, i.id) && navigationMatches(i, query)) }))
    .filter((g) => g.items.length);
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
              <SidebarMenuButton asChild isActive={section === "ringkasan"} tooltip="Ringkasan">
                <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                  <LayoutDashboard />
                  <span>Ringkasan</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="dashboard-menu-search">
          <label htmlFor="dashboard-menu-query" className="sr-only">
            Cari menu dashboard
          </label>
          <div className="dashboard-nav-search">
            <Search size={14} />
            <Input
              id="dashboard-menu-query"
              placeholder="Cari menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Hapus pencarian menu" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            )}
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>KATEGORI RUANG KERJA</SidebarGroupLabel>
          <SidebarMenu>
            {groups.map((group) => {
              const Icon = icons[dashboardGroups.findIndex((g) => g.id === group.id)];
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
      <SidebarFooter className="p-4">
        <div className="account">
          <UserAvatar user={identity} className="size-9" />
          <div className="min-w-0 flex-1">
            <strong className="block truncate">{identity.displayName || user.email}</strong>
            <small>{roles[user.role]}</small>
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
  const groups = dashboardGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => canReadSection(user, i.id) && navigationMatches(i, query)) }))
    .filter((g) => g.items.length);
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
          <DialogTitle>Semua ruang kerja, satu tempat.</DialogTitle>
          <DialogDescription>
            Pilih kategori atau cari fitur untuk langsung membuka halaman yang Anda perlukan.
          </DialogDescription>
          <div className="dashboard-mega-search">
            <Search size={17} />
            <Input
              ref={searchInput}
              aria-label="Cari fitur aplikasi"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari anggota, kas, dokumen, publikasi…"
            />
          </div>
          <div className="dashboard-mega-grid">
            {groups.map((g) => (
              <section key={g.id}>
                <h3>{g.label}</h3>
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
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              Kembali ke ringkasan
            </Link>
            <span>Ctrl / ⌘ K · Esc untuk menutup</span>
          </div>
        </DialogContent>
    </Dialog>
  );
}
