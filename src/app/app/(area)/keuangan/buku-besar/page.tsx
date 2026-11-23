import type { Metadata } from "next";
import { FinanceGeneralLedgerSection } from "@/components/finance-general-ledger-section";

export const metadata: Metadata = { title: "Buku Besar" };

export default async function BukuBesarPage({
  searchParams,
}: {
  searchParams: Promise<{ account_id?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  return (
    <FinanceGeneralLedgerSection
      accountId={params.account_id}
      startDate={params.start}
      endDate={params.end}
    />
  );
}
