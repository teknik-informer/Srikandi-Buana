import type { Metadata } from "next";
import { SuratClient } from "./surat-client";

export const metadata: Metadata = { title: "Surat Masuk & Keluar" };

export default function SuratPage() {
  return <SuratClient />;
}
