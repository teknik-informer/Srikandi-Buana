"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { Card, CardHeader, EmptyState, StatCard } from "@/components/ui";
import { useStore } from "@/lib/store";
import { formatDateID, formatIDR } from "@/lib/format";
import { COA } from "@/data/coa";
import { balancesFor } from "@/lib/ledger";

/**
 * Piutang & Utang — Blueprint §9.4.1.
 *
 * The demo ledger carries no receivable account yet (the blueprint does not
 * record one), so the left column states that plainly instead of inventing
 * invoices. Liabilities are real: every figure comes from posted journals on
 * the liability accounts registered in the chart of accounts.
 */

const PIUTANG_CODES = ["1-1200"]; // tidak ada di COA demo → ditampilkan sebagai belum ada
const UTANG_CODES = ["2-1000", "2-1100", "2-1200"];

export function PiutangUtangClient() {
  const { state } = useStore();
  const utang = useMemo(
    () => balancesFor(state.journals, COA.filter((a) => UTANG_CODES.includes(a.code)).map((a) => ({ code: a.code, name: a.name }))),
    [state.journals],
  );
  const totalUtang = utang.reduce((s, b) => s + Math.max(b.balance, 0), 0);
  const hasPiutang = COA.some((a) => PIUTANG_CODES.includes(a.code));

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <div className="sb-label mb-1.5">Keuangan · Posisi pihak ketiga</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Piutang &amp; utang</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Saldo kewajiban dihitung dari jurnal berstatus diposting. Tidak ada angka yang diketik manual di halaman
            ini; bila buku besar kosong, halaman menyatakannya.
          </p>
        </div>
        <Link href="/app/keuangan/neraca-saldo" className="sb-btn sb-btn-outline">Neraca saldo</Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total utang"
          value={formatIDR(totalUtang)}
          note={`${utang.filter((b) => b.entries.length).length} akun kewajiban aktif`}
          tone="warning"
          icon={<ArrowUpRight size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Piutang tercatat"
          value={hasPiutang ? "—" : "Akun belum ada"}
          note="Chart of accounts demo belum memuat akun piutang"
          tone="info"
          icon={<ArrowDownLeft size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Posisi bersih"
          value={formatIDR(-totalUtang)}
          note="Utang dikurangi piutang tercatat"
          tone="info"
          icon={<Scale size={17} strokeWidth={2.2} />}
        />
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Rincian per akun kewajiban"
            subtitle="Nilai positif berarti organisasi masih berutang pada pihak tersebut"
            action={<Link href="/app/keuangan/bagan-akun" className="text-[11.5px] font-semibold text-primary-700">Bagan akun →</Link>}
          />
          <div className="sb-scroll">
            <table className="sb-table min-w-[560px]">
              <thead>
                <tr><th>Akun</th><th>Nama</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo</th></tr>
              </thead>
              <tbody>
                {utang.map((b) => (
                  <tr key={b.code}>
                    <td className="font-mono text-[11.5px] text-muted">{b.code}</td>
                    <td className="text-ink2">{b.name}</td>
                    <td className="num tabular-nums text-muted">{b.debit ? formatIDR(b.debit) : "—"}</td>
                    <td className="num tabular-nums text-muted">{b.credit ? formatIDR(b.credit) : "—"}</td>
                    <td className="num font-semibold tabular-nums text-ink">{b.balance ? formatIDR(b.balance) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line p-4">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Jurnal yang membentuk saldo</h2>
            {utang.every((b) => b.entries.length === 0) ? (
              <EmptyState
                title="Belum ada jurnal kewajiban"
                body="Tidak ada jurnal diposting yang menyentuh akun utang. Saldo akan muncul di sini setelah pencatatan pembelian kredit atau uang muka pelanggan."
              />
            ) : (
              <ul className="divide-y divide-line">
                {utang.flatMap((b) =>
                  [...b.entries].sort((x, y) => y.date.localeCompare(x.date)).map((e) => (
                    <li key={`${b.code}-${e.id}-${e.line}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-ink">{e.description}</div>
                        <div className="mt-0.5 text-[11px] text-muted2">
                          {formatDateID(e.date, "short")} · <span className="font-mono">{e.number}</span> · {b.code}
                        </div>
                      </div>
                      <div className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink">{formatIDR(e.line)}</div>
                    </li>
                  )),
                )}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-[13.5px] font-bold text-ink">Piutang belum tersedia</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Bagan akun pada demo ini belum memuat akun piutang usaha, dan blueprint tidak mencatat kebijakan
              penjualan kredit. Karena itu tidak ada daftar tagihan pelanggan yang bisa ditampilkan tanpa mengarang
              data.
            </p>
            <Link href="/app/keuangan/bagan-akun" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary-700">
              Lihat bagan akun <ArrowUpRight size={12} />
            </Link>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-[13.5px] font-bold text-ink">Aturan yang dijaga</h2>
            <ul className="mt-2 space-y-2 text-[12px] text-ink2">
              {[
                "Saldo hanya dari jurnal berstatus diposting",
                "Jurnal posted tidak dapat diubah — koreksi lewat jurnal pembalik",
                "Tidak ada pencatatan langsung dari modul lain",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
