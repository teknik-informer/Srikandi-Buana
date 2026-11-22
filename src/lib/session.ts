import "server-only";
import { cookies } from "next/headers";
import { ACCOUNT_BY_KEY, type DemoIdentity } from "@/lib/identity";

export { SESSION_COOKIE, DEMO_ACCOUNTS, ACCOUNT_BY_KEY, can, FIELD_APP_STATUS_LABEL } from "@/lib/identity";
export type { DemoIdentity, DemoAccount } from "@/lib/identity";

/** Server-side read of the demo session cookie (returns null when signed out). */
export async function getIdentity(): Promise<DemoIdentity | null> {
  const jar = await cookies();
  const value = jar.get("sb_demo_session")?.value;
  if (!value) return null;
  const account = ACCOUNT_BY_KEY[value];
  return account ? account.identity : null;
}
