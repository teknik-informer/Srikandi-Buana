import Link from "next/link";
import type { Metadata } from "next";
import { ACTIVITIES } from "@/data/operations";
import { formatDateFull, relativeID } from "@/lib/format";
import { Badge, Card, StatusBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Agenda Kegiatan",
  description: "Kalender kegiatan Srikandi Buana: pelatihan, kunjungan lapangan, panen raya, dan bazar.",
};

const BIDANG_LABEL: Record<string, string> = {
  organisasi: "Organisasi & Keanggotaan",
  pertanian: "Pertanian & Produksi",
  pelatihan: "Pemberdayaan & Pelatihan",
  usaha: "Usaha & Kemitraan",
};

export default async function KegiatanPage({ searchParams }: { searchParams: Promise<{ bidang?: string }> }) {
  const { bidang } = await searchParams;
  const upcoming = ACTIVITIES.filter((a) => a.status === "terjadwal" && (!bidang || a.bidang === bidang));
  const past = ACTIVITIES.filter((a) => a.status === "selesai" && (!bidang || a.bidang === bidang));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="sb-label mb-2">Agenda</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Kegiatan yang bisa diikuti.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Kegiatan bertanda <Badge tone="info">Terbuka untuk umum</Badge> dapat diikuti warga. Kegiatan internal
        hanya untuk anggota dan tim bidang.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/kegiatan" className={`sb-chip ${!bidang ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Semua</Link>
        {Object.entries(BIDANG_LABEL).map(([k, v]) => (
          <Link key={k} href={`/kegiatan?bidang=${k}`} className={`sb-chip ${bidang === k ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>{v}</Link>
        ))}
      </div>

      <h2 className="mt-9 font-display text-[21px] font-semibold text-ink">Yang akan datang</h2>
      <div className="mt-3 space-y-3">
        {upcoming.map((a) => (
          <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex w-[92px] shrink-0 flex-col items-center rounded-sb-sm border border-line bg-paper px-2 py-2">
              <span className="font-display text-[22px] font-bold leading-none text-primary-800">{a.date.slice(8, 10)}</span>
              <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                {new Date(a.date + "T00:00:00Z").toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "UTC" })}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14.5px] font-semibold text-ink">{a.name}</h3>
                {a.openToPublic && <Badge tone="info">Terbuka untuk umum</Badge>}
              </div>
              <div className="mt-0.5 text-[12px] text-muted">{formatDateFull(a.date)} · {a.time} · {a.location}</div>
              <div className="mt-1 text-[11.5px] text-muted2">{BIDANG_LABEL[a.bidang]} · {a.participants} peserta · PIC {a.person}</div>
            </div>
            <div className="shrink-0 text-right">
              <Badge tone="neutral">{relativeID(a.date)}</Badge>
            </div>
          </Card>
        ))}
        {upcoming.length === 0 && <Card className="px-5 py-8 text-center text-[13px] text-muted">Belum ada kegiatan terjadwal untuk bidang ini.</Card>}
      </div>

      <h2 className="mt-10 font-display text-[21px] font-semibold text-ink">Sudah berlangsung</h2>
      <div className="mt-3 space-y-2">
        {past.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sb-sm border border-line bg-white px-4 py-3">
            <div>
              <span className="text-[13px] font-medium text-ink">{a.name}</span>
              <span className="ml-2 text-[11.5px] text-muted">{a.date} · {a.participants} peserta</span>
            </div>
            <StatusBadge status="Selesai" />
          </div>
        ))}
      </div>
    </div>
  );
}
