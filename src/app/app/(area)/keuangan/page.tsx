import type { Metadata } from "next";
import { FinanceDashboardSection } from "@/components/finance-dashboard-section";

export const metadata: Metadata = { title: "Ringkasan Keuangan" };

export default function KeuanganDashboard() {
  return <FinanceDashboardSection />;
}
