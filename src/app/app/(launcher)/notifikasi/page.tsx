import type { Metadata } from "next";
import { NotifikasiClient } from "./notifikasi-client";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotifikasiPage() {
  return <NotifikasiClient />;
}
