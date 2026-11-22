import type { Metadata } from "next";
import { KasBankClient } from "./kas-bank-client";

export const metadata: Metadata = { title: "Kas & Bank" };

export default function KasBankPage() {
  return <KasBankClient />;
}
