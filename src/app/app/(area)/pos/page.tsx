import type { Metadata } from "next";
import { PosTerminal } from "@/components/pos-terminal";

export const metadata: Metadata = { title: "POS Penjualan" };

export default function PosPage() {
  return <PosTerminal />;
}
