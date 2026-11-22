import type { Metadata } from "next";
import { PengurusDashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Ringkasan Organisasi" };

export default function PengurusDashboard() {
  return <PengurusDashboardClient />;
}
