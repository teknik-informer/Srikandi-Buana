import Link from "next/link";
import type { Metadata } from "next";
import { orgSummary, hitungAnggota, hitungLahan } from "@/lib/org-summary";
import { FIELDS } from "@/config/fields";
import { incomeStatement, trialBalance, cashPosition } from "@/lib/finance";
import { formatIDR, formatNumber, percent } from "@/lib/format";
import { Badge, Card, CardHeader, Notice, PageHeader, Progress, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Laporan Organisasi" };

export default async function LaporanOrganisasiPage() {
  /**
   * Anggota dan lahan dibaca dari dokumen bersama, bukan konstanta. Laporan
   * yang menyebut jumlah anggota berbeda dari buku induk bukan laporan.
   */
  const ringkas = await orgSummary();
  const anggota = hitungAnggota(ringkas.members);
  const lahan = hitungLahan(ringkas.lands);
  const { programs: PROGRAMS, tasks: TASKS, activities: ACTIVITIES, harvests: HARVESTS } = ringkas;
  const is = incomeStatement();
  const tb = trialBalance();
  const cash = cashPosition();
  const totalBudget = PROGRAMS.reduce((s, p) => s + p.budget, 0);
  const totalSpent = PROGRAMS.reduce((s, p) => s + p.spent, 0);
  const totalKg = HARVESTS.reduce((s, h) => s + h.weightKg, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Laporan organisasi"
        description="Rangkuman lintas domain untuk pengambilan keputusan: keuangan, program, keanggotaan, dan produksi. Angka rinci tetap dihitung di aplikasi pemilik data."
        actions={
          <>
            <Link href="/app/keuangan/laporan" className="sb-btn sb-btn-outline">Laporan keuangan</Link>
            <Link href="/app/pengurus/indikator" className="sb-btn sb-btn-primary">Indikator kinerja</Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Surplus periode" value={formatIDR(is.surplus)} note={`Margin ${percent(is.surplus, is.totalRevenue)}%`} tone="success" href="/app/keuangan/laporan" />
        <StatCard label="Kas & bank" value={formatIDR(cash.totalClosing)} note={tb.balanced ? "Neraca seimbang" : "Periksa neraca"} tone="info" href="/app/keuangan/kas-bank" />
        <StatCard label="Serapan program" value={`${percent(totalSpent, totalBudget)}%`} note={`${formatIDR(totalSpent)} dari ${formatIDR(totalBudget)}`} tone="warning" />
        <StatCard label="Produksi panen" value={`${formatNumber(totalKg)} kg`} note={`${HARVESTS.length} catatan panen`} tone="accent" href="/app/bidang/pertanian" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ikhtisar keuangan" subtitle="Diturunkan dari jurnal berstatus posted" action={<Link href="/app/keuangan/laporan" className="text-[11.5px] font-semibold text-primary-700">Rincian →</Link>} />
          <dl className="divide-y divide-line">
            {[
              ["Pendapatan", is.totalRevenue, "text-ink"],
              ["Beban (termasuk HPP & penyusutan)", is.totalExpense, "text-ink"],
              ["Surplus", is.surplus, "text-primary-800"],
            ].map(([label, value, cls]) => (
              <div key={String(label)} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <dt className="text-[12.5px] text-muted">{label as string}</dt>
                <dd className={`text-[13px] font-semibold tabular-nums ${cls as string}`}>{formatIDR(value as number)}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Kebijakan akuntansi (basis pengakuan, COA final, perlakuan hibah) <strong>belum disahkan</strong> — angka bersifat demo berlabel (§1.1, §28).
          </div>
        </Card>

        <Card>
          <CardHeader title="Program & serapan" subtitle="Per bidang resmi" action={<Link href="/app/pengurus/program" className="text-[11.5px] font-semibold text-primary-700">Semua program →</Link>} />
          <ul className="divide-y divide-line">
            {FIELDS.map((f) => {
              const list = PROGRAMS.filter((p) => p.bidang === f.slug);
              const b = list.reduce((s, p) => s + p.budget, 0);
              const sp = list.reduce((s, p) => s + p.spent, 0);
              const tasks = TASKS.filter((t) => t.bidang === f.slug && t.status !== "selesai").length;
              return (
                <li key={f.fieldId} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-ink">{f.shortName}</span>
                    <Badge tone="neutral">{formatIDR(sp)} / {formatIDR(b)}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={percent(sp, b)} />
                    <span className="shrink-0 text-[10.5px] text-muted2">{tasks} tugas</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Keanggotaan & partisipasi" />
          <dl className="divide-y divide-line">
            {[
              ["Anggota aktif", `${anggota.aktif} orang`],
              ["Menunggu verifikasi", `${anggota.menunggu} orang`],
              ["Kegiatan tercatat", `${ACTIVITIES.length} (${ACTIVITIES.filter((a) => a.status === "selesai").length} selesai)`],
              ["Total peserta kegiatan", `${formatNumber(ACTIVITIES.reduce((s, a) => s + a.participants, 0))} orang-kegiatan`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <dt className="text-[12.5px] text-muted">{k}</dt>
                <dd className="text-[12.5px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Produksi & produk" subtitle="Ringkasan dari aplikasi bidang dan POS" />
          <dl className="divide-y divide-line">
            {[
              ["Total panen tercatat", `${formatNumber(totalKg)} kg`],
              ["Petak terdata", `${HARVESTS.length ? new Set(HARVESTS.map((h) => h.plotId)).size : 0} petak`],
              ["Program terbit publik", `${PROGRAMS.filter((p) => p.published).length} dari ${PROGRAMS.length}`],
              ["Tugas terlambat", `${TASKS.filter((t) => t.status === "terlambat").length}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <dt className="text-[12.5px] text-muted">{k}</dt>
                <dd className="text-[12.5px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Format laporan resmi belum ditetapkan">
          Nama dan format laporan resmi mengikuti kebijakan yang disahkan (§9.4.1). Halaman ini adalah rangkuman manajerial,
          bukan laporan resmi yang dapat diserahkan ke pihak ketiga.
        </Notice>
      </div>
    </div>
  );
}
