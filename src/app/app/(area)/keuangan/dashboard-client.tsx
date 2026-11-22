"use client";

import Link from "next/link";
import { PERIODS, FUNDS } from "@/data/finance";
import { formatIDR, formatDateID, percent } from "@/lib/format";
import { Badge, Card, CardHeader, Progress, StatCard, StatusBadge } from "@/components/ui";
import { DemoStateChip } from "@/components/act";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { useStore, useFinance } from "@/lib/store";
import { TrendingUp, TrendingDown, PiggyBank, Landmark } from "lucide-react";

function compactIDR(n: number) {
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(n) >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return formatIDR(n);
}

export function KeuanganDashboardClient() {
  const { state } = useStore();
  const { tb, is } = useFinance();
  const cashTotal = ["1-1000", "1-1100"].reduce((sum, code) => {
    let bal = 0;
    for (const j of state.journals) {
      if (j.status !== "diposting") continue;
      for (const l of j.lines) if (l.accountCode === code) bal += l.debit - l.credit;
    }
    return sum + bal;
  }, 0);
  const recent = state.journals.slice(0, 6);
  const posted = state.journals.filter((j) => j.status === "diposting");
  const totalDrafts = state.drafts.length;

  return (
    <div className="pb-10">
      <AppBanner
        {...APP_IDENTITY.keuangan}
        facts={[
          `${posted.length} jurnal diposting`,
          `${totalDrafts} draf menunggu`,
          `Neraca ${tb.balanced ? "seimbang" : "tidak seimbang"}`,
          `Kas & bank ${compactIDR(cashTotal)}`,
        ]}
        badge={<DemoStateChip tone="dark" />}
        actions={[
          { href: "/app/keuangan/laporan", label: "Laporan keuangan", primary: true },
          { href: "/app/keuangan/jurnal", label: "Jurnal & posting" },
        ]}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendapatan periode" value={formatIDR(is.totalRevenue)} note="Nov 2026 · posted" tone="success" href="/app/keuangan/laporan" icon={<TrendingUp size={17} strokeWidth={2.2} />} />
        <StatCard label="Beban periode" value={formatIDR(is.totalExpense)} note="Termasuk HPP & penyusutan" tone="danger" href="/app/keuangan/laporan" icon={<TrendingDown size={17} strokeWidth={2.2} />} />
        <StatCard label="Surplus" value={formatIDR(is.surplus)} note={`Margin ${percent(is.surplus, is.totalRevenue)}%`} tone="info" icon={<PiggyBank size={17} strokeWidth={2.2} />} />
        <StatCard label="Kas & bank" value={formatIDR(cashTotal)} note={`Neraca ${tb.balanced ? "seimbang" : "tidak seimbang"}`} tone="accent" href="/app/keuangan/kas-bank" icon={<Landmark size={17} strokeWidth={2.2} />} />
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Jurnal terbaru"
              subtitle={`${posted.length} jurnal diposting · ${totalDrafts} draf belum diposting`}
              action={<Link href="/app/keuangan/jurnal" className="text-[11.5px] font-semibold text-primary-700">Semua jurnal →</Link>}
            />
            <div className="sb-scroll">
              <table className="sb-table min-w-[560px]">
                <thead><tr><th>Nomor / tanggal</th><th>Keterangan</th><th className="num">Nilai</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.map((j) => {
                    const t = { debit: j.lines.reduce((x, l) => x + l.debit, 0) };
                    return (
                      <tr key={j.id}>
                        <td className="whitespace-nowrap">
                          <div className="font-mono text-[11px] text-muted">{j.number}</div>
                          <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(j.date, "short")}</div>
                        </td>
                        <td className="text-ink2">
                          <span className="line-clamp-2" title={j.description}>{j.description}</span>
                          <span className="mt-0.5 block text-[10.5px] text-muted2">{j.source}</span>
                        </td>
                        <td className="num whitespace-nowrap font-medium" title={formatIDR(t.debit)}>{compactIDR(t.debit)}</td>
                        <td className="whitespace-nowrap"><StatusBadge status={j.status === "diposting" ? "Diposting" : j.status === "menunggu" ? "Menunggu" : "Draf"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Dana & pembatasan penggunaan" subtitle="Setiap transaksi membawa dimensi dana dan program" action={<Link href="/app/keuangan/anggaran" className="text-[11.5px] font-semibold text-primary-700">Anggaran &amp; dana →</Link>} />
            <div className="divide-y divide-line">
              {FUNDS.map((f) => (
                <div key={f.code} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[12.5px] font-semibold text-ink">{f.name}</div>
                      <div className="text-[10.5px] text-muted2">{f.code} · {f.source} · {f.restriction}</div>
                    </div>
                    <Badge tone={f.status === "aktif" ? "success" : "neutral"}>{f.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted">
                    <span>Diterima {formatIDR(f.received)}</span>
                    <span>Terpakai {formatIDR(f.used)}</span>
                    <span className="font-semibold text-primary-800">Sisa {formatIDR(f.received - f.used)}</span>
                  </div>
                  <div className="mt-1.5"><Progress value={percent(f.used, f.received)} tone="accent" /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Status periode" action={<Badge tone="success">Nov 2026 terbuka</Badge>} />
            <ul className="divide-y divide-line">
              {PERIODS.map((p) => (
                <li key={p.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="text-[12px] font-medium text-ink">{p.label}</div>
                    <div className="text-[10.5px] text-muted2">{p.note}</div>
                  </div>
                  <StatusBadge status={p.status === "terbuka" ? "Terbuka" : "Terkunci"} />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Kontrol & kepatuhan" />
            <ul className="space-y-2 px-4 py-3 text-[12px] text-ink2">
              {[
                ["Jurnal seimbang", "Semua jurnal posted debit = kredit"],
                ["Immutabilitas", "Jurnal posted tidak dapat diedit/dihapus"],
                ["Idempotency", "Satu source event → satu posting aktif"],
                ["Pemisahan tugas", "Pengaju ≠ penyetuju untuk nilai tertentu"],
                ["Periode terkunci", "Posting ditolak pada periode tertutup"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sb-success)]" />
                  <span><span className="font-semibold text-ink">{k}:</span> <span className="text-muted">{v}</span></span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <Link href="/app/keuangan/pengaturan" className="text-[11.5px] font-semibold text-primary-700">Lihat posting rule &amp; kontrol →</Link>
            </div>
          </Card>

          <div className="rounded-sb-sm border border-[#f0dcae] bg-[var(--sb-warning-bg)] px-3.5 py-3 text-[12px] text-[var(--sb-warning)]">
            <div className="mb-0.5 font-semibold">Kebijakan akuntansi belum disahkan</div>
            Basis pengakuan, COA final, perlakuan hibah, pajak, dan format laporan resmi wajib disahkan
            organisasi dan tenaga akuntansi kompeten sebelum dipakai untuk pembukuan resmi.
          </div>
        </div>
      </div>
    </div>
  );
}
