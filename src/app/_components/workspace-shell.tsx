"use client";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import type { Principal } from "@/lib/permissions";
import Navigation, { DashboardMegaMenu } from "./dashboard-navigation";
import ConnectionStatus from "./connection-status";
import UnsavedChangesGuard from "./access/unsaved-changes-guard";
import AccountMenu from "./access/account-menu";
import ThemeControl from "./access/theme-control";
import NotificationCenter from "./notification-center";
export default function WorkspaceShell({
  user,
  section,
  title,
  children,
  defaultSidebarOpen = true,
}: {
  user: Principal;
  section: string;
  title: string;
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  return (
    <SidebarProvider
      defaultOpen={defaultSidebarOpen}
      className="workspace-shell"
      style={
        { "--sidebar-width": "calc(var(--spacing) * 68)" } as CSSProperties
      }
    >
      <UnsavedChangesGuard />
      <a href="#workspace-content" className="skip-link">
        Langsung ke isi dashboard
      </a>
      <Navigation user={user} section={section} />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <ConnectionStatus />
        <header className="workspace-header">
          <div className="workspace-header-heading">
            <SidebarTrigger
              className="workspace-icon-button"
              aria-label="Buka atau tutup navigasi"
            />
            <Separator
              orientation="vertical"
              className="workspace-header-separator"
            />
            <Breadcrumb aria-label="Lokasi halaman" className="min-w-0 flex-1">
              <BreadcrumbList className="flex-nowrap overflow-hidden">
                {section !== "ringkasan" && (
                  <>
                    <BreadcrumbItem className="hidden sm:inline-flex shrink-0">
                      <BreadcrumbLink asChild>
                        <Link href="/dashboard">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:block shrink-0" />
                  </>
                )}
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage
                    className="workspace-header-title"
                    title={title}
                  >
                    {title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <nav
            className="workspace-header-actions"
            aria-label="Akun dan tindakan utama"
          >
            <DashboardMegaMenu section={section} user={user} />
            <NotificationCenter compact />
            <ThemeControl />
            <AccountMenu user={user} />
          </nav>
        </header>
        <div
          id="workspace-content"
          tabIndex={-1}
          className="workspace-content outline-none"
        >
          <div className="workspace-main">
            {children}
          </div>
          <footer className="workspace-footer">
            <small>© {new Date().getFullYear()} KWT Srikandi Buana</small>
            <nav aria-label="Bantuan dashboard">
              <Link href="/bantuan" target="_blank" rel="noopener noreferrer">
                Bantuan
              </Link>
              <Link href="/privasi" target="_blank" rel="noopener noreferrer">
                Privasi
              </Link>
              <Link href="/" target="_blank" rel="noopener noreferrer">
                Lihat situs
              </Link>
            </nav>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
