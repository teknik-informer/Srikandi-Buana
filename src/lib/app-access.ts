import type { AppKey } from "@/config/apps";
import { can, type AppIdentity } from "@/lib/identity";

/**
 * Client-side navigation visibility only. Route layouts and server actions
 * remain the authorization boundary and must enforce the same permission.
 */
export function canAccessApp(identity: AppIdentity, app: AppKey): boolean {
  switch (app) {
    case "launcher":
      return true;
    case "pengurus":
      return can(identity, "organization:read");
    case "sekretariat":
      return can(identity, "secretariat:read");
    case "keuangan":
      return can(identity, "finance:read");
    case "organisasi":
    case "pertanian":
    case "pelatihan":
    case "usaha":
      return can(identity, `field:${app}:read`);
    case "anggota":
      return can(identity, "member:self");
    case "pos":
      return can(identity, "pos:sell");
    case "studio":
      return identity.roleKey === "platform_admin" || identity.roleKey === "organization_admin";
    case "portal":
      return can(identity, "portal:read");
    default: {
      const exhaustive: never = app;
      return exhaustive;
    }
  }
}
/** Resolve an application scope from a workspace destination for navigation filtering. */
export function appKeyForHref(href: string): AppKey {
  if (href.startsWith("/studio")) return "studio";
  if (href.startsWith("/portal")) return "portal";
  if (href.startsWith("/app/pengurus")) return "pengurus";
  if (href.startsWith("/app/sekretariat")) return "sekretariat";
  if (href.startsWith("/app/keuangan")) return "keuangan";
  if (href.startsWith("/app/anggota")) return "anggota";
  if (href.startsWith("/app/pos")) return "pos";
  if (href.startsWith("/app/bidang/organisasi")) return "organisasi";
  if (href.startsWith("/app/bidang/pertanian")) return "pertanian";
  if (href.startsWith("/app/bidang/pelatihan")) return "pelatihan";
  if (href.startsWith("/app/bidang/usaha")) return "usaha";
  return "launcher";
}

/** Navigation visibility only; the destination layout performs final authorization. */
export function canAccessAppHref(identity: AppIdentity, href: string): boolean {
  return canAccessApp(identity, appKeyForHref(href));
}
