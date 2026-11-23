import type { Metadata } from "next";
import { FinanceAccountSection } from "@/components/finance-account-section";

export const metadata: Metadata = { title: "Bagan Akun (COA)" };

export default async function CoaPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { result } = await searchParams;
  return <FinanceAccountSection result={result} />;
}
