import type { Metadata } from "next";
import { AnggotaHomeClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Beranda Anggota" };

export default function AnggotaHome() {
  return <AnggotaHomeClient />;
}
