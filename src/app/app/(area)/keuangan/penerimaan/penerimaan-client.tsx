"use client";

/**
 * Penerimaan kas/bank.
 *
 * Halaman ini dulu dirender di server dengan `JOURNALS` dari data statis,
 * sehingga penerimaan yang baru dicatat pengurus tidak pernah muncul di sini
 * meskipun buku besar di halaman lain sudah memperlihatkannya. Sekarang ia
 * membaca dokumen bersama lewat `useStore()` — sumber yang sama dengan
 * jurnal, buku besar, dan dasbor keuangan.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ACCOUNT_BY_CODE } from "@/data/coa";
import { Badge, Card, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { DemoStateChip, NoRows, SearchBox, SearchProvider, Segmented, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatIDR, formatDateID } from "@/lib/format";

/** Akun kas dan bank — sama dengan yang dipakai halaman buku besar. */
const CASH_ACCOUNTS = ["1-1000", "1-1100"];

type Tab = "diposting" | "draf" | "semua";

export function PenerimaanClient() {
  return (
    <SearchProvider>
      <Isi />
    </SearchProvider>
  );
}

function Isi() {
  const { state, shared } = useStore();
  const [tab, setTab] = useState<Tab>("diposting");
  const { q } = useSearch();

  const semua = useMemo(
    () =>
      state.journals
        .map((j) => {
          const kas = j.lines.find((l) => l.debit > 0 && CASH_ACCOUNTS.includes(l.accountCode));
          if (!kas) return null;
          const lawan = j.lines.find((l) => l.credit > 0);
          return { j, nilai: kas.debit, lawan };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => (a.j.date < b.j.date ? 1 : -1)),
    [state.journals],
  );

  const tersaring = useMemo(() => {
    const perTab = semua.filter(({ j }) => {
      if (tab === "diposting") return j.status === "diposting";
      if (tab === "draf") return j.status !== "diposting";
      return true;
    });
    if (!q.trim()) return perTab;
    return perTab.filter(({ j, lawan }) =>
      match(`${j.number} ${j.description} ${lawan?.accountCode ?? ""}`, q),
    );
  }, [semua, tab, q]);

  const total = tersaring.filter(({ j }) => j.status === "diposting").reduce((s, x) => s + x.nilai, 0);

  // Sumber terbesar dihitung dari data, bukan ditulis tetap "Hibah".
  const perSumber = useMemo(() => {
    const map = new Map<string, number>();
    for (const { lawan, nilai, j } of tersaring) {
      if (j.status !== "diposting") continue;
      const key = lawan ? (ACCOUNT_BY_CODE[lawan.accountCode]?.name ?? lawan.accountCode) : "Tanpa lawan";
      map.set(key, (map.get(key) ?? 0) + nilai);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [tersaring]);

  const jmlDiposting = semua.filter(({ j }) => j.status === "diposting").length;
  const jmlDraf = semua.length - jmlDiposting;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sb-label mb-1">Keuangan</div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-ink">Penerimaan</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            Penerimaan kas/bank dari penjualan, kontribusi, hibah, dan pelunasan piutang.
            Setiap penerimaan adalah jurnal yang mendebit akun kas atau bank.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip />
          <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline">
            Buka jurnal
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total penerimaan posted" value={formatIDR(total)} tone="success" />
        <StatCard label="Transaksi ditampilkan" value={tersaring.length} note={`${jmlDiposting} posted · ${jmlDraf} belum`} />
        <StatCard
          label="Sumber terbesar"
          value={perSumber ? perSumber[0] : "—"}
          note={perSumber ? formatIDR(perSumber[1]) : "Belum ada penerimaan posted"}
          tone="accent"
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Daftar penerimaan"
          subtitle={shared ? "Dari dokumen bersama — sama dengan jurnal dan buku besar" : "Mode lokal: belum tersiar"}
          action={<Badge tone="info">{tersaring.length} baris</Badge>}
        />
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            label="Saringan penerimaan"
            options={[
              { key: "diposting", label: `Diposting (${jmlDiposting})` },
              { key: "draf", label: `Belum diposting (${jmlDraf})` },
              { key: "semua", label: `Semua (${semua.length})` },
            ]}
          />
          <div className="ml-auto w-full sm:w-64">
            <SearchBox placeholder="Cari nomor, keterangan, akun…" />
          </div>
        </div>

        {tersaring.length ? (
          <div className="sb-scroll">
            <table className="sb-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Akun lawan</th>
                  <th className="num">Nilai</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tersaring.map(({ j, nilai, lawan }) => (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-muted">{j.number}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                    <td className="font-medium text-ink">{j.description}</td>
                    <td className="text-muted">
                      {lawan ? `${lawan.accountCode} ${ACCOUNT_BY_CODE[lawan.accountCode]?.name ?? ""}`.trim() : "—"}
                    </td>
                    <td className="num font-medium">{formatIDR(nilai)}</td>
                    <td><StatusBadge status={j.status === "diposting" ? "Diposting" : j.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoRows q={q} />
        )}
      </Card>
    </div>
  );
}
