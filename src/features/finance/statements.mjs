const categoryKeys = ["asset", "liability", "equity", "revenue", "expense"];

const normalBalance = (category, debit, credit) =>
  category === "asset" || category === "expense"
    ? debit - credit
    : credit - debit;

/**
 * Derives organization-level financial statements from posted ledger balances.
 * This function never reads the legacy cash book directly: only journal lines
 * already reflected in account totals are included.
 */
export function calculateFinanceStatements(accounts = []) {
  const grouped = Object.fromEntries(categoryKeys.map((key) => [key, []]));
  const totals = {
    asset: 0,
    liability: 0,
    equity: 0,
    revenue: 0,
    expense: 0,
  };

  for (const account of accounts) {
    const category = String(account?.category ?? "");
    if (!categoryKeys.includes(category)) continue;

    const debit = Number(account?.debit ?? 0);
    const credit = Number(account?.credit ?? 0);
    if (!Number.isFinite(debit) || !Number.isFinite(credit)) continue;

    const balance = normalBalance(category, debit, credit);
    totals[category] += balance;
    grouped[category].push({
      id: String(account.id),
      code: String(account.code ?? ""),
      name: String(account.name ?? ""),
      balance,
    });
  }

  for (const key of categoryKeys) {
    grouped[key].sort((a, b) => a.code.localeCompare(b.code));
  }

  const surplus = totals.revenue - totals.expense;
  const equityIncludingSurplus = totals.equity + surplus;
  const difference = totals.asset - totals.liability - equityIncludingSurplus;
  const hasJournalActivity = accounts.some((account) =>
    Number(account?.debit ?? 0) > 0 || Number(account?.credit ?? 0) > 0,
  );

  return {
    hasJournalActivity,
    accounts: grouped,
    totals,
    surplus,
    equityIncludingSurplus,
    difference,
    isBalanced: hasJournalActivity && Math.abs(difference) < 0.5,
  };
}
