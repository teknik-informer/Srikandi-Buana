import type { Metadata } from "next";
import { PersetujuanClient } from "./persetujuan-client";

export const metadata: Metadata = { title: "Persetujuan" };

export default function PersetujuanPage() {
  return <PersetujuanClient />;
}
