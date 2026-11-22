import type { Metadata } from "next";
import { AnggaranClient } from "./anggaran-client";

export const metadata: Metadata = { title: "Anggaran & Dana" };

export default function AnggaranPage() {
  return <AnggaranClient />;
}
