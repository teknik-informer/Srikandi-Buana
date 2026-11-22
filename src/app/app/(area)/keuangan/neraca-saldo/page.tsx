import type { Metadata } from "next";
import { NeracaClient } from "./neraca-client";

export const metadata: Metadata = { title: "Neraca Saldo" };

export default function NeracaSaldoPage() {
  return <NeracaClient />;
}
