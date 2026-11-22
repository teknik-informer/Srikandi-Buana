import type { Metadata } from "next";
import { LaporanClient } from "./laporan-client";

export const metadata: Metadata = { title: "Laporan Keuangan" };

export default function LaporanPage() {
  return <LaporanClient />;
}
