import type { Metadata } from "next";
import { SekretariatDashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Sekretariat" };

export default function SekretariatDashboard() {
  return <SekretariatDashboardClient />;
}
