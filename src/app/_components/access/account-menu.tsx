"use client";
import Link from "next/link";
import { ChevronDown, UserRound, LogOut, LoaderCircle, LifeBuoy, Settings } from "lucide-react";
import UserAvatar from "./user-avatar";
import { useProfileIdentity } from "@/hooks/use-profile-identity";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { roles, type Principal } from "@/lib/permissions";
import { getVisibleEnterpriseDashboards } from "@/features/enterprise/registry";
import { useLogout } from "@/hooks/use-logout";
export default function AccountMenu({ user }: { user: Principal }) {
  const { busy, error, logout } = useLogout();
  const identity = useProfileIdentity(user);
  const canOpenSettings = getVisibleEnterpriseDashboards(user.role).some((group) => group.features.some((feature) => feature.id === "pengaturan"));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="workspace-account-trigger"
          aria-label="Akun dan keluar"
          title="Akun dan keluar"
        >
          <UserAvatar user={identity} />
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="workspace-account-menu w-72 max-w-[calc(100vw-2rem)]" align="end" sideOffset={8}>
        <DropdownMenuLabel>
          <div className="workspace-account-identity">
            <strong className="block truncate">{identity.displayName || user.email}</strong>
            <span>{roles[user.role]}</span>
            <small>{user.email}</small>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/akun-saya">
              <UserRound />
              Akun saya
            </Link>
          </DropdownMenuItem>
          {canOpenSettings && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/pengaturan">
                <Settings />
                Pengaturan
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/bantuan" target="_blank" rel="noopener noreferrer">
              <LifeBuoy />
              Pusat bantuan
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={busy}
            onSelect={(e) => {
              e.preventDefault();
              void logout();
            }}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <LogOut />}
            {busy ? "Mengakhiri sesi…" : "Keluar akun"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {error && (
          <p className="workspace-account-error" role="alert">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
