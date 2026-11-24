import type { Metadata } from "next";
import { requireIdentity } from "@/lib/session";
import { loadMemberAreaData } from "@/lib/member-area";
import { AnggotaHomeClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Beranda Anggota" };

export default async function AnggotaHome() {
  const identity = await requireIdentity("member:self");
  const data = await loadMemberAreaData(identity);
  return <AnggotaHomeClient data={data} role={identity.role} />;
}
