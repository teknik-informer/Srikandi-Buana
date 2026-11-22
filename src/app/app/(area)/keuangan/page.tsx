import type { Metadata } from "next";
import { KeuanganDashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Ringkasan Keuangan" };

export default function KeuanganDashboard() {
  return <KeuanganDashboardClient />;
}
