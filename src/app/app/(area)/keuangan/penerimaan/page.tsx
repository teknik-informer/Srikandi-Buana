import type { Metadata } from "next";
import { PenerimaanClient } from "./penerimaan-client";

export const metadata: Metadata = { title: "Penerimaan" };

export default function PenerimaanPage() {
  return <PenerimaanClient />;
}
