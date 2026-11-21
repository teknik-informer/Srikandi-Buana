"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Calculator, Plus, Printer, RefreshCw, Save, Trash2, Wallet, Scale, Tag, Package } from "lucide-react";
import { WorkspacePageHeader, WorkspaceEmptyState } from "./workspace-ui";
import { calculateHpp, calculateActualMargin } from "@/features/finance/hpp-calculation.mjs";

type CostRow = { id: string; component: string; quantity: string; unit: string; unitPrice: string };
type SavedCalculation = {
  id: string;
  created: string;
  updated: string;
  data: Record<string, string | number>;
};
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};
const templates: Record<string, string[]> = {
  "Biaya produksi": ["Benih / bibit", "Pupuk dan nutrisi", "Pestisida / pengendalian", "Tenaga kerja", "Pengairan dan energi", "Transportasi", "Pengolahan", "Pengemasan", "Biaya lain-lain"],
  "Biaya pengadaan": ["Harga pembelian", "Transportasi", "Bongkar muat", "Sortasi dan pemeriksaan", "Penyimpanan", "Biaya administrasi", "Biaya lain-lain"],
  "Biaya pengolahan": ["Bahan penolong", "Tenaga kerja", "Energi dan air", "Penggunaan alat", "Pengemasan", "Transportasi", "Biaya lain-lain"],
};
const freshRow = (component = ""): CostRow => ({ id: crypto.randomUUID(), component, quantity: "1", unit: "unit", unitPrice: "0" });
const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-offset-2 focus-visible:outline-primary";
const fieldClass = "block space-y-1.5 text-xs font-medium text-muted-foreground";

export default function HppWorkspace({ role }: { role: string }) {
  const canWrite = role === "admin" || role === "bendahara";
  const [template, setTemplate] = useState("Biaya produksi");
  const [name, setName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState("");
  const [activity, setActivity] = useState("");
  const [rows, setRows] = useState<CostRow[]>(() => templates["Biaya produksi"].map(freshRow));
  const [outputQuantity, setOutputQuantity] = useState("1");
  const [outputUnit, setOutputUnit] = useState("kg");
  const [targetMargin, setTargetMargin] = useState("20");
  const [sellingPrice, setSellingPrice] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<SavedCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const costRows = useMemo(() => rows.map(row => {
    const quantity = number(row.quantity);
    const unitPrice = Math.round(number(row.unitPrice));
    return { ...row, quantity, unitPrice, subtotal: Math.round(quantity * unitPrice) };
  }), [rows]);
  const totalCost = useMemo(() => costRows.reduce((sum, row) => sum + row.subtotal, 0), [costRows]);
  const output = number(outputQuantity);
  const margin = Math.min(90, Math.max(0, number(targetMargin)));
  const calculation = useMemo(() => {
    try { return calculateHpp({ totalCost, outputQuantity: output > 0 ? output : 1, targetMargin: margin }); }
    catch { return { unitCost: 0, suggestedPrice: 0 }; }
  }, [totalCost, output, margin]);
  const unitCost = output > 0 ? calculation.unitCost : 0;
  const suggestedPrice = output > 0 ? calculation.suggestedPrice : 0;
  const testedPrice = Math.round(number(sellingPrice));
  const actualMargin = calculateActualMargin(unitCost, testedPrice);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/records", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Riwayat perhitungan belum dapat dimuat.");
      const items = Array.isArray(body.records) ? body.records.filter((row: SavedCalculation & { kind?: string }) => row.kind === "hpp") : [];
      setHistory(items.slice(0, 50));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Riwayat perhitungan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  function changeRow(id: string, key: keyof Omit<CostRow, "id">, value: string) {
    setRows(current => current.map(row => row.id === id ? { ...row, [key]: value } : row));
  }
  function applyTemplate(value: string) {
    setTemplate(value);
    setRows(templates[value].map(freshRow));
  }
  function loadSaved(row: SavedCalculation) {
    const data = row.data;
    setSelected(row.id);
    setTemplate(String(data.template || "Biaya produksi"));
    setName(String(data.name || ""));
    setCommodity(String(data.commodity || ""));
    setDate(String(data.date || ""));
    setPeriod(String(data.period || ""));
    setActivity(String(data.activity || ""));
    setOutputQuantity(String(data.outputQuantity || "1"));
    setOutputUnit(String(data.outputUnit || "kg"));
    setTargetMargin(String(data.targetMargin || "0"));
    setSellingPrice(String(data.sellingPrice || ""));
    setReceiptReference(String(data.receiptReference || ""));
    setNotes(String(data.notes || ""));
    try {
      const parsed = JSON.parse(String(data.costItems || "[]"));
      setRows(Array.isArray(parsed) && parsed.length ? parsed.map((row: Omit<CostRow, "id">) => ({ ...row, id: crypto.randomUUID() })) : [freshRow()]);
    } catch {
      setRows([freshRow()]);
    }
    setNotice("Riwayat perhitungan dimuat untuk ditinjau dan dicetak. Perubahan tidak menimpa catatan tersimpan.");
  }
  function reset() {
    setSelected(null);
    setTemplate("Biaya produksi");
    setName("");
    setCommodity("");
    setDate(new Date().toISOString().slice(0, 10));
    setPeriod("");
    setActivity("");
    setRows(templates["Biaya produksi"].map(freshRow));
    setOutputQuantity("1");
    setOutputUnit("kg");
    setTargetMargin("20");
    setSellingPrice("");
    setReceiptReference("");
    setNotes("");
    setNotice("");
    setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = {
        name: name.trim(),
        commodity: commodity.trim(),
        template,
        date,
        period: period.trim(),
        activity: activity.trim(),
        costItems: JSON.stringify(costRows.map(({ id, component, quantity, unit, unitPrice, subtotal }) => ({ component, quantity, unit, unitPrice, subtotal })).filter(row => row.component.trim())),
        totalCost,
        outputQuantity: output,
        outputUnit: outputUnit.trim(),
        unitCost,
        targetMargin: margin,
        suggestedPrice,
        sellingPrice: testedPrice,
        receiptReference: receiptReference.trim(),
        notes: notes.trim(),
      };
      const response = await fetch("/api/records", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "hpp", data }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Perhitungan belum dapat disimpan.");
      setNotice("Perhitungan berhasil disimpan dalam riwayat.");
      setSelected(String(body.id));
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perhitungan belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  const selectedRecord = history.find(row => row.id === selected);
  return (
    <div className="workspace-page space-y-6">
      <WorkspacePageHeader
        eyebrow="BUSINESS & ENTERPRISE · BIAYA DAN USAHA"
        title="Kalkulator Harga Pokok Produksi"
        description="Susun komponen biaya secara fleksibel, hitung HPP per satuan hasil, uji harga jual, dan simpan riwayat perhitungan untuk bahan keputusan."
        actions={canWrite ? <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"><Calculator size={16}/> Perhitungan baru</button> : undefined}
      />
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total biaya", value: money(totalCost), icon: Wallet },
          { label: "Hasil akhir", value: output > 0 ? output.toLocaleString("id-ID") + " " + outputUnit : "—", icon: Package },
          { label: "HPP per satuan", value: output > 0 ? money(unitCost) : "—", icon: Scale },
          { label: "Harga jual simulasi", value: money(suggestedPrice), icon: Tag },
        ].map(metric => <div key={metric.label} className="workspace-metric min-w-0 rounded-xl border bg-card p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{metric.label}</p><metric.icon className="size-4 text-muted-foreground" /></div><p className="mt-3 break-words text-xl font-semibold tabular-nums">{metric.value}</p></div>)}
      </div>

      <form onSubmit={save} className="space-y-5">
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-base font-semibold">Identitas perhitungan</h2><p className="mt-1 text-xs text-muted-foreground">Satu perhitungan untuk satu komoditas, produk, periode, atau kegiatan.</p></div>
            <div className="flex items-center gap-2 no-print"><button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium"><Printer size={15}/> Cetak</button><button type="button" onClick={() => void reload()} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium"><RefreshCw size={15}/> Muat ulang</button></div>
          </div>
          {selectedRecord && <p className="mb-3 text-xs text-muted-foreground">Meninjau catatan tersimpan · {selectedRecord.id}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            <label className={fieldClass}>Jenis kalkulasi<select className={inputClass} value={template} disabled={!canWrite || Boolean(selected)} onChange={event => applyTemplate(event.target.value)}>{Object.keys(templates).map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={fieldClass}>Nama perhitungan<input className={inputClass} required maxLength={180} value={name} disabled={!canWrite} onChange={event => setName(event.target.value)} placeholder="Contoh: Produksi sayuran periode panen 1"/></label>
            <label className={fieldClass}>Komoditas / produk<input className={inputClass} required maxLength={120} value={commodity} disabled={!canWrite} onChange={event => setCommodity(event.target.value)} placeholder="Contoh: Cabai, sayuran, hasil olahan"/></label>
            <label className={fieldClass}>Tanggal perhitungan<input className={inputClass} type="date" required value={date} disabled={!canWrite} onChange={event => setDate(event.target.value)}/></label>
            <label className={fieldClass}>Periode / kegiatan<input className={inputClass} maxLength={120} value={period} disabled={!canWrite} onChange={event => setPeriod(event.target.value)} placeholder="Contoh: November 2026"/></label>
            <label className={fieldClass}>Lokasi / kelompok kegiatan<input className={inputClass} maxLength={160} value={activity} disabled={!canWrite} onChange={event => setActivity(event.target.value)} placeholder="Dusun / kelompok / unit usaha"/></label>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-base font-semibold">Rincian komponen biaya</h2><p className="mt-1 text-xs text-muted-foreground">Isi volume dan harga satuan. Subtotal dan total dihitung otomatis.</p></div>
            {canWrite && <button type="button" disabled={rows.length>=20} onClick={() => setRows(current => current.length>=20?current:[...current, freshRow()])} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold disabled:opacity-40"><Plus size={15}/> Tambah baris</button>}
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-3">Komponen biaya</th><th className="px-3 py-3">Volume</th><th className="px-3 py-3">Satuan</th><th className="px-3 py-3 text-right">Harga satuan</th><th className="px-3 py-3 text-right">Subtotal</th><th className="px-3 py-3 no-print"> </th></tr></thead>
              <tbody>{costRows.map(row => <tr key={row.id} className="border-t">
                <td className="p-2"><input className={inputClass+" min-w-48"} aria-label="Komponen biaya" value={row.component} disabled={!canWrite} onChange={event => changeRow(row.id,"component",event.target.value)} placeholder="Nama komponen"/></td>
                <td className="p-2"><input className={inputClass+" w-24"} aria-label="Volume" type="number" min="0" max="1000000000" step="0.001" value={row.quantity} disabled={!canWrite} onChange={event => changeRow(row.id,"quantity",event.target.value)}/></td>
                <td className="p-2"><input className={inputClass+" w-24"} aria-label="Satuan biaya" maxLength={16} value={row.unit} disabled={!canWrite} onChange={event => changeRow(row.id,"unit",event.target.value)}/></td>
                <td className="p-2"><input className={inputClass+" min-w-32 text-right"} aria-label="Harga satuan" type="number" min="0" max="1000000000000" step="1" value={row.unitPrice} disabled={!canWrite} onChange={event => changeRow(row.id,"unitPrice",event.target.value)}/></td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{money(row.subtotal)}</td>
                <td className="p-2 no-print">{canWrite && <button type="button" aria-label="Hapus komponen" disabled={rows.length===1} onClick={() => setRows(current => current.filter(item => item.id!==row.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground disabled:opacity-30"><Trash2 size={14}/></button>}</td>
              </tr>)}</tbody>
              <tfoot><tr className="border-t bg-muted/30 font-semibold"><th colSpan={4} className="px-3 py-3 text-right">Total biaya</th><td className="px-3 py-3 text-right tabular-nums">{money(totalCost)}</td><td className="no-print"/></tr></tfoot>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold">Hasil akhir dan HPP</h2><p className="mt-1 text-xs text-muted-foreground">HPP per satuan = total biaya ÷ jumlah hasil akhir.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={fieldClass}>Jumlah hasil akhir<input className={inputClass} type="number" min="0.001" max="1000000000" step="0.001" required value={outputQuantity} disabled={!canWrite} onChange={event => setOutputQuantity(event.target.value)}/></label>
              <label className={fieldClass}>Satuan hasil<input className={inputClass} required maxLength={24} value={outputUnit} disabled={!canWrite} onChange={event => setOutputUnit(event.target.value)}/></label>
            </div>
            <div className="mt-4 rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">HPP per {outputUnit || "satuan"}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{output>0?money(unitCost):"—"}</p></div>
          </div>
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold">Simulasi harga jual dan margin</h2><p className="mt-1 text-xs text-muted-foreground">Harga rekomendasi menggunakan target margin dari harga jual, bukan markup dari biaya.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={fieldClass}>Target margin (%)<input className={inputClass} type="number" min="0" max="90" step="0.5" value={targetMargin} disabled={!canWrite} onChange={event => setTargetMargin(event.target.value)}/></label>
              <label className={fieldClass}>Uji harga jual per satuan (Rp)<input className={inputClass} type="number" min="0" step="1" value={sellingPrice} disabled={!canWrite} onChange={event => setSellingPrice(event.target.value)}/></label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Harga jual untuk target margin</p><p className="mt-1 text-lg font-semibold">{money(suggestedPrice)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Margin pada harga uji</p><p className="mt-1 text-lg font-semibold">{sellingPrice && testedPrice>0 && actualMargin!==null?actualMargin.toLocaleString("id-ID",{maximumFractionDigits:1})+"%":"—"}</p></div></div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="text-base font-semibold">Referensi dan catatan</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className={fieldClass}>Kode / ID penerimaan hasil (opsional)<input className={inputClass} maxLength={120} value={receiptReference} disabled={!canWrite} onChange={event => setReceiptReference(event.target.value)} placeholder="Referensi penerimaan terkait"/></label>
            <label className={fieldClass}>Catatan perhitungan<textarea className={inputClass+" min-h-10 py-2"} rows={2} maxLength={2000} value={notes} disabled={!canWrite} onChange={event => setNotes(event.target.value)} placeholder="Asumsi, metode, dan keterangan biaya"/></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 no-print">
            {canWrite && <button type="submit" disabled={busy || !name.trim() || !commodity.trim() || !date || output<=0 || totalCost<=0 || !rows.some(row=>row.component.trim())} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save size={16}/>{busy?"Menyimpan…":"Simpan perhitungan"}</button>}
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"><Printer size={16}/> Cetak hasil</button>
            <a href="/dashboard/lotkopi" className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium">Penerimaan hasil</a>
            <a href="/dashboard/laporan" className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium">Laporan keuangan</a>
          </div>
          {!canWrite && <p className="mt-3 text-xs text-muted-foreground">Akses lihat saja. Pembuatan dan penyimpanan perhitungan dilakukan oleh Bendahara atau Administrator Sistem.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Catatan: perhitungan ini merupakan analisis biaya. Penyimpanan tidak otomatis membukukan pengeluaran kas atau menambah stok. Referensi penerimaan dicatat sebagai penghubung administratif.</p>
        </section>
      </form>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Riwayat perhitungan</h2><p className="mt-1 text-xs text-muted-foreground">Maksimal 50 catatan terbaru. Catatan tersimpan dapat dibuka kembali untuk ditinjau dan dicetak.</p></div><button type="button" onClick={() => void reload()} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs"><RefreshCw size={14}/> Muat ulang</button></div>
        {loading ? <p className="py-6 text-sm text-muted-foreground">Memuat riwayat…</p> : history.length===0 ? <WorkspaceEmptyState title="Belum ada perhitungan tersimpan" description="Simpan perhitungan pertama untuk mulai membangun riwayat biaya komoditas dan kegiatan."/> : <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Tanggal</th><th className="p-3">Komoditas / produk</th><th className="p-3">Jenis</th><th className="p-3 text-right">Total biaya</th><th className="p-3 text-right">HPP / satuan</th><th className="p-3"/></tr></thead><tbody>{history.map(row=><tr key={row.id} className="border-t"><td className="p-3 whitespace-nowrap">{String(row.data.date||"—")}</td><td className="p-3"><span className="font-medium">{String(row.data.commodity||row.data.name||"—")}</span><span className="block text-xs text-muted-foreground">{String(row.data.name||"")}</span></td><td className="p-3">{String(row.data.template||"—")}</td><td className="p-3 text-right tabular-nums">{money(Number(row.data.totalCost||0))}</td><td className="p-3 text-right tabular-nums">{money(Number(row.data.unitCost||0))}</td><td className="p-3 text-right"><button type="button" onClick={() => loadSaved(row)} className="rounded-md border px-3 py-1.5 text-xs font-medium">Tinjau</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
