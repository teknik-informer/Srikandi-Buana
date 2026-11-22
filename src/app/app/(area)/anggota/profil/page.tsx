import type { Metadata } from "next";
import { ProfilClient } from "./profil-client";

export const metadata: Metadata = { title: "Profil Saya" };

export default function ProfilAnggotaPage() {
  return <ProfilClient />;
}
