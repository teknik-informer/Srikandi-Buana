import type { Metadata } from "next";
import { requireIdentity } from "@/lib/session";
import { loadSelfProfile } from "@/lib/self-profile";
import { ProfilClient } from "./profil-client";

export const metadata: Metadata = { title: "Profil Saya" };

export default async function ProfilAnggotaPage() {
  const identity = await requireIdentity("member:self");

  try {
    const profile = await loadSelfProfile(identity);
    return <ProfilClient profile={profile} loadError={false} />;
  } catch (reason) {
    const errorType =
      reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
        ? reason.name
        : "UnknownError";
    console.warn("[member-profile] Source unavailable", errorType);
    return <ProfilClient profile={null} loadError />;
  }
}
