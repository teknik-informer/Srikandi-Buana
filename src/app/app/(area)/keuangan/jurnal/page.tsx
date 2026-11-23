import type { Metadata } from "next";
import { FinanceJournalSection } from "@/components/finance-journal-section";

export const metadata: Metadata = { title: "Jurnal & Posting" };

export default async function JurnalPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { result } = await searchParams;
  return <FinanceJournalSection result={result} />;
}
