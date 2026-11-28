import type { Metadata } from "next";
import { requireIdentity } from "@/lib/session";
import { loadSelfProfile } from "@/lib/self-profile";
import { ProfilClient } from "@/app/app/(area)/anggota/profil/profil-client";

export const metadata: Metadata = { title: "Akun & profil" };

/**
 * Shared self-profile surface for every authenticated role. It is separate
 * from the member portal so secretariat, treasurer, field staff and members
 * can manage only their own profile without receiving member-app privileges.
 */
export default async function ProfilSayaPage() {
  const identity = await requireIdentity();

  try {
    const profile = await loadSelfProfile(identity);
    return <ProfilClient profile={profile} loadError={false} />;
  } catch (reason) {
    const errorType =
      reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
        ? reason.name
        : "UnknownError";
    console.warn("[self-profile] Source unavailable", errorType);
    return <ProfilClient profile={null} loadError />;
  }
}
