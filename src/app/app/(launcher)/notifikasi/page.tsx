import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { can, getIdentity } from "@/lib/session";
import { NotifikasiClient } from "./notifikasi-client";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const canReviewApprovals =
    can(identity, "approval:read") ||
    can(identity, "finance:journal:approve") ||
    can(identity, "field:organisasi:review") ||
    can(identity, "organization:team:approve");

  const shortcuts = [
    ...(canReviewApprovals
      ? [{ label: "Kotak Persetujuan", href: "/app/pengurus/persetujuan" }]
      : []),
    ...(can(identity, "organization:read")
      ? [{ label: "Penugasan Pengurus", href: "/app/pengurus/tugas" }]
      : []),
    ...(can(identity, "secretariat:read")
      ? [{ label: "Register Surat Sekretariat", href: "/app/sekretariat/surat" }]
      : []),
  ];

  return <NotifikasiClient shortcuts={shortcuts} />;
}
