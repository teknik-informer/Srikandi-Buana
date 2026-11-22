import type { Metadata } from "next";
import { JurnalClient } from "./jurnal-client";

export const metadata: Metadata = { title: "Jurnal & Posting" };

export default function JurnalPage() {
  return <JurnalClient />;
}
