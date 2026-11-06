"use client";
import { useState } from "react";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { calculateCashReport, cashReportCSV } from "@/lib/cash-report";
import { type Row, rupiah, dateID } from "@/lib/srikandi";
export default function Reports({ rows }: { rows: Row[] }) {
  const [month, setMonth] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7));
  const [fund, setFund] = useState("Semua pos");
  let report: ReturnType<typeof calculateCashReport> | null = null;
  let error = "";
  try { report = calculateCashReport(rows, month, fund); }
  catch (e) { error = e instanceof Error ? e.message : "Laporan belum dapat dihitung."; }
  function exportCSV() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([cashReportCSV(report, fund)], { type: "text/csv;charset=utf-8" }));
    try {
      const link = document.createElement("a"); link.href = url; link.download = "laporan-kas-" + month + ".csv"; link.click();
    } finally { URL.revokeObjectURL(url); }
  }
  return <Card>
    <CardHeader><CardTitle>Laporan buku kas</CardTitle><CardDescription>Saldo dihitung dari transaksi tercatat sampai periode yang dipilih. Catat saldo awal nyata sebagai pemasukan sebelum periode awal bila diperlukan.</CardDescription></CardHeader>
    <CardContent>
      <div className="inbox-toolbar report-controls">
        <Input type="month" required aria-label="Bulan laporan" value={month} onChange={(e) => { if (e.target.value) setMonth(e.target.value); }} className="w-auto" />
        <NativeSelect aria-label="Pos dana laporan" value={fund} onChange={(e) => setFund(e.target.value)}>{["Semua pos", "Organisasi", "Program", "Usaha"].map((value) => <NativeSelectOption key={value}>{value}</NativeSelectOption>)}</NativeSelect>
        <Button onClick={exportCSV} disabled={!report} variant="outline"><Download data-icon="inline-start" />Ekspor laporan</Button>
        <Button onClick={() => window.print()} disabled={!report}><Printer data-icon="inline-start" />Cetak laporan</Button>
      </div>
      {error && <Alert variant="destructive"><AlertTitle>Laporan perlu diperiksa</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {report && <div className="report-sheet">
        <header><h2>KWT SRIKANDI BUANA</h2><h3>Laporan Buku Kas</h3><p>Periode {month} · {fund}</p></header>
        <div className="report-summary">{[["Saldo awal", report.opening], ["Pemasukan", report.incoming], ["Pengeluaran", report.outgoing], ["Saldo akhir", report.closing]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{rupiah(Number(value))}</strong></div>)}</div>
        <Table><TableHeader><TableRow>{["Tanggal", "Uraian", "Pos", "Masuk", "Keluar", "Saldo"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>—</TableCell><TableCell>Saldo awal</TableCell><TableCell>{fund}</TableCell><TableCell>—</TableCell><TableCell>—</TableCell><TableCell>{rupiah(report.opening)}</TableCell></TableRow>
            {report.lines.map(({ r, balance }) => <TableRow key={r.id}><TableCell>{dateID(String(r.data.date))}</TableCell><TableCell>{String(r.data.name)}</TableCell><TableCell>{String(r.data.fund)}</TableCell><TableCell>{r.data.type === "Pemasukan" ? rupiah(Number(r.data.amount)) : "—"}</TableCell><TableCell>{r.data.type === "Pengeluaran" ? rupiah(Number(r.data.amount)) : "—"}</TableCell><TableCell>{rupiah(balance)}</TableCell></TableRow>)}
            <TableRow><TableCell>—</TableCell><TableCell>Total periode</TableCell><TableCell>{fund}</TableCell><TableCell>{rupiah(report.incoming)}</TableCell><TableCell>{rupiah(report.outgoing)}</TableCell><TableCell>{rupiah(report.closing)}</TableCell></TableRow>
          </TableBody>
        </Table>
        {!report.lines.length && <p className="section-note">Tidak ada transaksi pada periode ini. Saldo awal tetap dibawa ke saldo akhir.</p>}
        <p className="report-caption">Dicetak dari catatan pengelola pada {new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}. Kebenaran transaksi dan bukti pendukung tetap diperiksa oleh pengelola.</p>
      </div>}
    </CardContent>
  </Card>;
}
