"use client";

import { Printer } from "lucide-react";

export function DocumentPrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="sb-btn sb-btn-primary">
      <Printer size={14} /> Cetak / Simpan PDF
    </button>
  );
}
