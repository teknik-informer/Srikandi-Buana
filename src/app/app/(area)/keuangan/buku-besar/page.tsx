import type { Metadata } from "next";
import { BukuBesarClient } from "./buku-besar-client";

export const metadata: Metadata = { title: "Buku Besar" };

export default function BukuBesarPage() {
  return <BukuBesarClient />;
}
