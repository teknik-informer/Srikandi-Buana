import type { Metadata } from "next";
import { RapatClient } from "./rapat-client";

export const metadata: Metadata = { title: "Rapat & Undangan" };

export default function RapatSekretariatPage() {
  return <RapatClient />;
}
