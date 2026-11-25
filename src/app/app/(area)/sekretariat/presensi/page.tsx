import type { Metadata } from "next";
import { PresensiClient } from "./presensi-client";

export const metadata: Metadata = { title: "Daftar Hadir" };

// Kehadiran dibaca dari dokumen bersama lewat store klien, jadi tidak ada
// yang perlu dibekukan saat build.
export const dynamic = "force-dynamic";

export default function PresensiPage() {
  return <PresensiClient />;
}
