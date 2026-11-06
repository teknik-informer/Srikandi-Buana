import type { Row } from "./srikandi";
import { createCSV } from "./csv";
export function calculateCashReport(rows: Row[], month: string, fund: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error("Pilih bulan laporan yang valid.");
  const all = rows.filter((r) => r.kind === "kas" && (fund === "Semua pos" || r.data.fund === fund))
    .sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)) || a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  const delta = (r: Row) => {
    const amount = Number(r.data.amount);
    if (!Number.isSafeInteger(amount) || amount < 0 || !["Pemasukan", "Pengeluaran"].includes(String(r.data.type)))
      throw Error("Ada nominal atau jenis transaksi yang tidak valid. Periksa buku kas sebelum mengekspor.");
    return r.data.type === "Pemasukan" ? amount : -amount;
  };
  const add = (sum: number, value: number) => {
    const result = sum + value;
    if (!Number.isSafeInteger(result)) throw Error("Jumlah transaksi melampaui batas perhitungan yang aman. Periksa cakupan laporan.");
    return result;
  };
  for (const r of all) {
    const date = String(r.data.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
      throw Error("Ada tanggal transaksi yang tidak valid. Periksa buku kas sebelum mengekspor.");
  }
  const opening = all.filter((r) => String(r.data.date).slice(0, 7) < month).reduce((sum, r) => add(sum, delta(r)), 0);
  const ledger = all.filter((r) => String(r.data.date).startsWith(month));
  const incoming = ledger.filter((r) => r.data.type === "Pemasukan").reduce((sum, r) => add(sum, delta(r)), 0);
  const outgoing = ledger.filter((r) => r.data.type === "Pengeluaran").reduce((sum, r) => add(sum, -delta(r)), 0);
  let running = opening;
  const lines = ledger.map((r) => ({ r, balance: running = add(running, delta(r)) }));
  return { opening, incoming, outgoing, closing: running, lines };
}
export function cashReportCSV(report: ReturnType<typeof calculateCashReport>, fund: string) {
  return createCSV([
    ["Tanggal", "Uraian", "Pos", "Masuk", "Keluar", "Saldo"],
    ["", "Saldo awal", fund, "", "", report.opening],
    ...report.lines.map(({ r, balance }) => [r.data.date, r.data.name, r.data.fund,
      r.data.type === "Pemasukan" ? r.data.amount : "", r.data.type === "Pengeluaran" ? r.data.amount : "", balance]),
    ["", "Total periode", fund, report.incoming, report.outgoing, report.closing],
  ]);
}
