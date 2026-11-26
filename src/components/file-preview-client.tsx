"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

export function FilePreviewClient({ fileId, fileName }: { fileId: string; fileName: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  function printFrame() {
    const target = frame.current?.contentWindow;
    if (target) {
      target.focus();
      target.print();
    }
  }

  return (
    <div className="pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/app/berkas" className="sb-btn sb-btn-outline"><ArrowLeft size={14} /> Pusat Berkas</Link>
        <div className="flex items-center gap-2">
          <a href={`/api/files/${fileId}`} className="sb-btn sb-btn-outline"><Download size={14} /> Unduh</a>
          <button type="button" onClick={printFrame} className="sb-btn sb-btn-primary"><Printer size={14} /> Cetak</button>
        </div>
      </div>
      <div className="mb-3 text-[12px] font-semibold text-ink print:hidden">{fileName}</div>
      <iframe
        ref={frame}
        title={`Pratinjau ${fileName}`}
        src={`/api/files/${fileId}?disposition=inline`}
        className="h-[calc(100vh-190px)] min-h-[560px] w-full rounded-lg border border-line bg-white print:h-auto print:min-h-0 print:border-0"
      />
    </div>
  );
}
