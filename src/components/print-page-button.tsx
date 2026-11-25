"use client";

import { Printer } from "lucide-react";

export function PrintPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="sb-btn sb-btn-primary no-print"
    >
      <Printer size={14} /> Cetak kuitansi
    </button>
  );
}
