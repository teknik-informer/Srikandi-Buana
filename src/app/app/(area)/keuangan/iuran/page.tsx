import type { Metadata } from "next";
import { IuranClient } from "./iuran-client";

export const metadata: Metadata = { title: "Iuran & Kontribusi" };

export default function IuranPage() {
  return <IuranClient />;
}
