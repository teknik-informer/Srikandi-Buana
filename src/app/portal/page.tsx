import type { Metadata } from "next";
import Link from "next/link";
import { ORG } from "@/config/org";
import { PROGRAMS } from "@/data/operations";
import { DOCUMENTS } from "@/data/organization";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Portal Eksternal", robots: { index: false } };

export default function PortalEksternal() {
  const shared = DOCUMENTS.filter((d) => d.category === "Laporan" || d.visibility === "publik");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="sb-label">{ORG.shortName} · Portal Eksternal</span>
        <Link href="/" className="text-[12px] font-medium text-muted hover:text-ink">← Website</Link>
      </div>
      <PageHeader
        eyebrow="Akses terbatas · demo"
        title="Portal pemerintah, NGO & mitra"
        description="Hanya data dan laporan yang secara eksplisit dibagikan dan disetujui. Data pribadi anggota tidak pernah tampil di sini."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Laporan dibagikan" value={shared.length} tone="info" />
        <StatCard label="Program dipantau" value={PROGRAMS.filter((p) => p.published).length} tone="success" />
        <StatCard label="Grant data-sharing" value={2} note="Dapat dicabut kapan saja" tone="warning" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Ringkasan program yang dibagikan" subtitle="Proyeksi publik, bukan data operasional penuh" />
          <div className="divide-y divide-line">
            {PROGRAMS.filter((p) => p.published).map((p) => (
              <div key={p.code} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12.5px] font-semibold text-ink">{p.name}</div>
                  <Badge tone="neutral">{p.code}</Badge>
                </div>
                <div className="mt-1 grid gap-1 text-[11px] text-muted sm:grid-cols-3">
                  <span>Capaian {p.progress}%</span>
                  <span>Periode {p.period}</span>
                  <span>Indikator {p.indicators.length}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Dokumen tersedia" />
            <ul className="divide-y divide-line">
              {shared.map((d) => (
                <li key={d.id} className="px-4 py-2.5">
                  <div className="text-[12px] font-medium text-ink">{d.title}</div>
                  <div className="text-[10.5px] text-muted2">{d.number} · {formatDateID(d.date, "short")}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Notice tone="warning" title="Batas akses">
            Akses eksternal tidak memberikan pandangan ke kas, jurnal, kuitansi, data pribadi anggota,
            atau dokumen internal. Setiap grant tercatat dan dapat dicabut.
          </Notice>
        </div>
      </div>
    </div>
  );
}
