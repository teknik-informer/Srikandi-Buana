import type { Metadata } from "next";
import { PiutangUtangClient } from "./piutang-client";

export const metadata: Metadata = { title: "Piutang & Utang" };

export default function PiutangUtangPage() {
  return <PiutangUtangClient />;
}
