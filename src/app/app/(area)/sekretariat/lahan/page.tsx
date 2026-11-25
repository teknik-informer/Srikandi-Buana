import type { Metadata } from "next";
import { LahanClient } from "./lahan-client";

export const metadata: Metadata = { title: "Data Lahan" };

export default function LahanPage() {
  return <LahanClient />;
}
