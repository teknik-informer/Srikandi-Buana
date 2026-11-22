import type { Metadata } from "next";
import { TugasClient } from "./tugas-client";

export const metadata: Metadata = { title: "Tugas Pengurus" };

export default function TugasPengurusPage() {
  return <TugasClient />;
}
