import type { Metadata } from "next";
import { AgendaClient } from "./agenda-client";

export const metadata: Metadata = { title: "Agenda Organisasi" };

export default function AgendaPage() {
  return <AgendaClient />;
}
