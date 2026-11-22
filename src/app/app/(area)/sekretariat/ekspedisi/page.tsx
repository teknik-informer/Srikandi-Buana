import Link from "next/link";
import type { Metadata } from "next";
import { LETTERS } from "@/data/organization";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID, daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda Surat & Ekspedisi" };

export default function EkspedisiPage() {
  const keluar = LETTERS.filter((l) => l.direction === "keluar");
  const masuk = LETTERS.filter((l) => l.direction === "masuk");
  const perluTindak = LETTERS.filter((l) => l.status !== "selesai");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Agenda surat & ekspedisi"
        description="Jadwal pengiriman surat keluar dan tindak lanjut surat masuk. Nomor surat dibuat otomatis; pengiriman fisik dicatat terpisah dari isi surat."
        actions={<Link href="/app/sekretariat/surat" className="sb-btn sb-btn-outline">Registrasi surat</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Surat keluar" value={keluar.length} note="Agenda ekspedisi" />
        <StatCard label="Surat masuk" value={masuk.length} note="Perlu disposisi" tone="info" />
        <StatCard label="Belum selesai" value={perluTindak.length} note="Baru atau diproses" tone={perluTindak.length ? "warning" : "success"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Agenda ekspedisi — surat keluar" subtitle="Diurutkan menurut tanggal" />
          <div className="divide-y divide-line">
            {keluar.map((l) => (
              <div key={l.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink">{l.subject}</div>
                    <div className="mt-0.5 text-[11px] text-muted">Tujuan {l.counterpart}</div>
                  </div>
                  <Badge tone={l.status === "selesai" ? "success" : "info"}>{l.status}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted2">
                  <span>{l.number}</span>
                  <span>{formatDateID(l.date, "short")}</span>
                  <span>PIC {l.assignee}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Tindak lanjut — surat masuk" subtitle="Disposisi & tenggat" />
          <div className="divide-y divide-line">
            {masuk.map((l) => {
              const d = daysUntil(l.date);
              return (
                <div key={l.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink">{l.subject}</div>
                      <div className="mt-0.5 text-[11px] text-muted">Dari {l.counterpart}</div>
                    </div>
                    <Badge tone={l.status === "baru" ? "warning" : l.status === "diproses" ? "info" : "success"}>{l.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted2">
                    <span className="font-mono">{l.number}</span>
                    <span>Diterima {formatDateID(l.date, "short")}</span>
                    <span>PIC {l.assignee}</span>
                    <span>{d <= 0 ? `${Math.abs(d)} hari lalu` : `${d} hari lagi`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Pembuatan nomor surat">
          Nomor surat mengikuti aturan penomoran organisasi (mis. <span className="font-mono">021/KWT-SB/XI/2026</span>).
          Pada demo ini nomor sudah ada pada data contoh; generator nomor otomatis belum tersambung.
        </Notice>
      </div>
    </div>
  );
}
