"use client";
export default function PrintButton(){return <button type="button" onClick={()=>window.print()} className="rounded-lg bg-emerald-950 px-5 py-3 text-sm font-semibold text-white print:hidden">Cetak / Simpan sebagai PDF</button>}
