import type { Metadata } from "next";
import { POSTING_RULES, PERIODS } from "@/data/finance";
import { Badge, Card, CardHeader, Notice, PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Posting Rule & Kontrol" };

export default function KeuanganPengaturanPage() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Posting rule & kontrol akuntansi"
        description="Aturan posting versi terbaru. Transaksi menyimpan versi aturan yang dipakai saat posting untuk menjaga reproduksibilitas."
        actions={<Badge tone="info">Domain service — dilindungi</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Matriks aturan posting" subtitle="Perubahan aturan inti memerlukan reviu developer & pengesahan" />
          <div className="divide-y divide-line">
            {POSTING_RULES.map((r) => (
              <div key={r.code} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink2">{r.code}</span>
                    <span className="text-[12.5px] font-semibold text-ink">{r.source}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone="neutral">{r.version}</Badge>
                    <Badge tone={r.protected ? "warning" : "neutral"}>{r.protected ? "dilindungi" : "konfiguratif"}</Badge>
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-muted">{r.rule}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Periode fiskal" />
            <div className="divide-y divide-line">
              {PERIODS.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-[12px] font-medium text-ink">{p.label}</div>
                    <div className="text-[10.5px] text-muted2">{p.note}</div>
                  </div>
                  <StatusBadge status={p.status === "terbuka" ? "Terbuka" : "Terkunci"} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Kontrol teknis aktif" />
            <ul className="space-y-2 px-4 py-3 text-[12px] text-ink2">
              {[
                ["Transaksi atomik", "Header, baris, dan referensi posting commit bersamaan"],
                ["Idempotency unik", "Constraint di database, bukan hanya di UI"],
                ["Presisi desimal", "Uang tidak disimpan sebagai float"],
                ["Snapshot laporan", "Query konsisten saat posting berjalan"],
                ["Rekonsiliasi subledger", "Membandingkan subledger ke akun kontrol"],
                ["Audit jejak", "Aktor, waktu, versi aturan, dan lampiran"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                  <span><span className="font-semibold text-ink">{k}:</span> <span className="text-muted">{v}</span></span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Notice tone="warning" title="Larangan tegas">
          Tidak ada dependensi runtime, API, iframe, token, lisensi, atau server Manager.io / produk
          akuntansi eksternal. Mesin akuntansi berjalan penuh di dalam platform ini.
        </Notice>
        <Notice tone="info" title="Yang boleh dikonfigurasi pengelola">
          Label akun tampilan, pengelompokan laporan yang telah disetujui, format nomor dokumen,
          dan template bukti. Bukan aturan debit-kredit inti.
        </Notice>
      </div>
    </div>
  );
}
