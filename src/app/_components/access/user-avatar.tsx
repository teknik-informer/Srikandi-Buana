"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
export default function UserAvatar({ user, className }: { user: { displayName: string; avatarUrl?: string }; className?: string }) {
  const initials = user.displayName.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] || "").join("").toUpperCase() || "?";
  return <Avatar className={cn("shrink-0", className)}>
    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={"Foto profil " + user.displayName} className="object-cover" />}
    <AvatarFallback>{initials}</AvatarFallback>
  </Avatar>;
}
