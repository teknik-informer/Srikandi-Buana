import type { Metadata } from "next";
import { FinanceTrialBalanceSection } from "@/components/finance-trial-balance-section";

export const metadata: Metadata = { title: "Neraca Saldo" };

export default async function NeracaSaldoPage({
  searchParams,
}: {
  searchParams: Promise<{ as_of?: string }>;
}) {
  const { as_of: asOf } = await searchParams;
  return <FinanceTrialBalanceSection asOf={asOf} />;
}
