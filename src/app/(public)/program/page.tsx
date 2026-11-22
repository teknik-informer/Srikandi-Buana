import Link from "next/link";
import type { Metadata } from "next";
import { PROGRAMS, ACTIVITIES } from "@/data/operations";
import { FIELDS } from "@/config/fields";
import { formatDateID } from "@/lib/format";
import { Badge, Card, Progress, StatusBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Program Berjalan",
  description: "Program organisasi Srikandi Buana tahun 2026 beserta indikator, anggaran, dan status publikasinya.",
};

const FIELD_LABEL: Record<string, string> = {
  organisasi: "Organisasi & Keanggotaan",
  pertanian: "Pertanian & Produksi",
  pelatihan: "Pemberdayaan & Pelatihan",
  usaha: "Usaha & Kemitraan",
};

export default function ProgramPage({ searchParams }: { searchParams: Promise<{ bidang?: string }> }) {
  return <ProgramList searchParams={searchParams} />;
}

async function ProgramList({ searchParams }: { searchParams: Promise<{ bidang?: string }> }) {
  const { bidang } = await searchParams;
  const visible = PROGRAMS.filter((p) => p.published).filter((p) => !bidang || p.bidang === bidang);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl">
        <div className="sb-label mb-2">Program 2026</div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-primary-950 sm:text-[40px]">
          Apa yang sedang kami kerjakan, dan sejauh mana.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink2">
          Halaman ini menampilkan proyeksi publik dari program operasional yang telah disetujui.
          Angka capaian diperbarui dari aplikasi bidang; rincian transaksi keuangan tetap internal.
        </p>
      </div>

      <nav className="mt-7 flex flex-wrap gap-2">
        <Link href="/program" className={`sb-chip ${!bidang ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Semua</Link>
        {FIELDS.map((f) => {
          const key = f.slug;
          const active = bidang === key;
          return (
            <Link key={f.fieldId} href={`/program?bidang=${key}`} className={`sb-chip ${active ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>
              {f.shortName}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-4">
        {visible.map((p) => (
          <Card key={p.code} className="overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{FIELD_LABEL[p.bidang]}</Badge>
                  <StatusBadge status={p.status === "berjalan" ? "Berjalan" : p.status === "perencanaan" ? "Perencanaan" : p.status} />
                  <span className="text-[11px] text-muted2">{p.code}</span>
                </div>
                <h2 className="mt-2.5 font-display text-[22px] font-semibold text-ink">{p.name}</h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{p.objective}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {p.indicators.map((i) => (
                    <div key={i.label} className="rounded-sb-sm border border-line bg-paper px-3 py-2">
                      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{i.label}</div>
                      <div className="mt-0.5 text-[13px] font-semibold text-ink">
                        {i.actual} <span className="text-[11px] font-normal text-muted2">/ target {i.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-line bg-primary-50/40 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Periode</div>
                <div className="text-[13px] font-medium text-ink2">{p.period}</div>
                <div className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Capaian</div>
                <div className="mt-1.5"><Progress value={p.progress} /></div>
                <div className="mt-4 flex justify-between text-[12px]">
                  <span className="text-muted">Anggaran</span>
                  <span className="font-semibold text-ink">Rp {(p.budget / 1_000_000).toLocaleString("id-ID")} jt</span>
                </div>
                <div className="mt-1 flex justify-between text-[12px]">
                  <span className="text-muted">Terserap</span>
                  <span className="font-semibold text-primary-800">Rp {(p.spent / 1_000_000).toLocaleString("id-ID")} jt</span>
                </div>
                <div className="mt-3">
                  <Link href={`/kegiatan?bidang=${p.bidang}`} className="text-[12px] font-semibold text-primary-700 hover:underline">
                    Lihat kegiatan terkait →
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {visible.length === 0 && (
          <Card className="px-6 py-10 text-center text-[13px] text-muted">
            Belum ada program publik untuk bidang ini.
          </Card>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-[22px] font-semibold text-ink">Agenda terdekat</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVITIES.filter((a) => a.openToPublic && a.status === "terjadwal").slice(0, 3).map((a) => (
            <Card key={a.id} className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-700">{formatDateID(a.date)}</div>
              <div className="mt-1.5 text-[13.5px] font-semibold text-ink">{a.name}</div>
              <div className="mt-1 text-[11.5px] text-muted">{a.time} · {a.location}</div>
              <div className="mt-3"><Link href="/kegiatan" className="text-[11.5px] font-semibold text-primary-700">Detail agenda →</Link></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
