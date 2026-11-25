import type { Metadata } from "next";
import { VerifikasiClient } from "./verifikasi-client";

export const metadata: Metadata = { title: "Pendaftaran & Verifikasi" };

export default function VerifikasiPage() {
  return <VerifikasiClient />;
}
