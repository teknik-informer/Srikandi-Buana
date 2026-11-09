import { moneyInteger } from "../shared/validation.mjs";

export function balancedLines(lines) {
  return Array.isArray(lines) &&
    lines.length >= 2 &&
    lines.length <= 50 &&
    new Set(lines.map((line) => line?.accountId)).size === lines.length &&
    lines.every((line) =>
      line &&
      typeof line === "object" &&
      typeof line.accountId === "string" &&
      /^[0-9a-f-]{36}$/i.test(line.accountId) &&
      moneyInteger(line.debit) &&
      moneyInteger(line.credit) &&
      ((line.debit > 0 && line.credit === 0) || (line.credit > 0 && line.debit === 0))
    ) &&
    lines.reduce((sum, line) => sum + line.debit, 0) ===
      lines.reduce((sum, line) => sum + line.credit, 0) &&
    lines.reduce((sum, line) => sum + line.debit, 0) > 0;
}
