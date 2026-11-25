import type { Metadata } from "next";
import { PembayaranClient } from "./pembayaran-client";

export const metadata: Metadata = { title: "Pembayaran" };

export default function PembayaranPage() {
  return <PembayaranClient />;
}
