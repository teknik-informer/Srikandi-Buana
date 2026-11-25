import type { Metadata } from "next";
import { KerjaClient } from "./kerja-client";

export const metadata: Metadata = { title: "Meja Kerja" };

export default function KerjaPage() {
  return <KerjaClient />;
}
