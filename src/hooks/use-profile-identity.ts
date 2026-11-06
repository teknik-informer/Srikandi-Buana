"use client";
import { useEffect, useState } from "react";
export type ProfileIdentity = { accountId: string; displayName: string; avatarUrl?: string };
export const profileUpdatedEvent = "srikandi:profile-updated";
export function publishProfileIdentity(profile: ProfileIdentity) {
  window.dispatchEvent(new CustomEvent(profileUpdatedEvent, { detail: profile }));
}
export function useProfileIdentity(user: ProfileIdentity) {
  const [identity, setIdentity] = useState(user);
  useEffect(() => { setIdentity({ accountId: user.accountId, displayName: user.displayName, avatarUrl: user.avatarUrl }); }, [user.accountId, user.displayName, user.avatarUrl]);
  useEffect(() => {
    const changed = (event: Event) => {
      const data = (event as CustomEvent<ProfileIdentity>).detail;
      if (data?.accountId === user.accountId && typeof data.displayName === "string" && (!data.avatarUrl || data.avatarUrl.startsWith("/api/account/avatar?v="))) setIdentity(data);
    };
    window.addEventListener(profileUpdatedEvent, changed);
    return () => window.removeEventListener(profileUpdatedEvent, changed);
  }, [user.accountId]);
  return identity;
}
