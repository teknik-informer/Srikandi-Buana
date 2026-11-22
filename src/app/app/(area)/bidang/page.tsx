import Link from "next/link";
import type { Metadata } from "next";
import { FIELDS } from "@/config/fields";
import { FieldMark } from "@/components/brand";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import { PROGRAMS } from "@/data/operations";

export const metadata: Metadata = { title: "Peta Bidang" };

export default function BidangIndex() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Approved Field Registry"
        title="Peta aplikasi bidang"
        description="Empat bidang resmi dengan aplikasi operasional masing-masing. Status pengesahan organisasi dan status konfigurasi aplikasi dicatat terpisah."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {FIELDS.map((f) => {
          const prog = PROGRAMS.filter((p) => p.bidang === f.slug);
          return (
            <Card key={f.fieldId} className="p-5">
              <div className="flex items-start gap-3.5">
                <FieldMark icon={f.icon} accent={f.accent} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[17px] font-semibold text-ink">{f.name}</h2>
                    <StatusBadge status={f.appStatus} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted2">{f.fieldId} · {f.code}</div>
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{f.mandate}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-[11.5px]">
                <div className="rounded-sb-sm border border-line bg-paper px-2.5 py-1.5">
                  <dt className="text-muted2">Modul</dt><dd className="font-semibold text-ink">{f.modules.length}</dd>
                </div>
                <div className="rounded-sb-sm border border-line bg-paper px-2.5 py-1.5">
                  <dt className="text-muted2">Tim</dt><dd className="font-semibold text-ink">{f.teamSize}</dd>
                </div>
                <div className="rounded-sb-sm border border-line bg-paper px-2.5 py-1.5">
                  <dt className="text-muted2">Program</dt><dd className="font-semibold text-ink">{prog.length}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {f.kpis.map((k) => (
                  <span key={k.label} className="sb-chip !text-[10.5px]">{k.label}: <strong className="text-ink">{k.value}</strong></span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-[11px] text-muted2">Koordinator: {f.coordinator}</span>
                <Link href={f.appHref} className="sb-btn sb-btn-primary !py-1.5 !px-3 text-[12px]">Buka aplikasi</Link>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">Catatan tata kelola</Badge>
          <p className="text-[12px] text-muted">
            Menonaktifkan modul teknis tidak menghapus unit organisasi maupun data historis. Perubahan
            nama/mandat bidang hanya melalui proses administrasi organisasi yang berwenang.
          </p>
        </div>
      </Card>
    </div>
  );
}
