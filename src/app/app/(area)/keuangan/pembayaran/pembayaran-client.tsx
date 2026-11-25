"use client";

/**
 * Pembayaran & pengeluaran — cermin dari halaman Penerimaan.
 *
 * Dulu dirender di server dengan `JOURNALS` statis, sehingga pembayaran yang
 * baru diposting pengurus tidak pernah muncul di sini. Sekarang membaca
 * dokumen bersama lewat `useStore()`.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ACCOUNT_BY_CODE } from "@/data/coa";
import { Badge, Card, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { DemoStateChip, NoRows, SearchBox, SearchProvider, Segmented, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatIDR, formatDateID } from "@/lib/format";

const CASH_ACCOUNTS = ["1-1000", "1-1100"];

type Tab = "diposting" | "draf" | "semua";

export function PembayaranClient() {
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
          const kas = j.lines.find((l) => l.credit > 0 && CASH_ACCOUNTS.includes(l.accountCode));
          if (!kas) return null;
          const debit = j.lines.find((l) => l.debit > 0);
          return { j, nilai: kas.credit, debit };
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
    return perTab.filter(({ j, debit }) =>
      match(`${j.number} ${j.description} ${debit?.accountCode ?? ""}`, q),
    );
  }, [semua, tab, q]);

  const total = tersaring.filter(({ j }) => j.status === "diposting").reduce((s, x) => s + x.nilai, 0);
  const menunggu = state.approvals.filter((a) => a.status === "menunggu").length;
  const jmlDiposting = semua.filter(({ j }) => j.status === "diposting").length;
  const jmlDraf = semua.length - jmlDiposting;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sb-label mb-1">Keuangan</div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-ink">Pembayaran &amp; pengeluaran</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            Pembayaran beban, saprodi, pelatihan, dan pelunasan utang. Setiap pembayaran adalah
            jurnal yang mengkredit akun kas atau bank.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip />
          <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline">Buka jurnal</Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total pembayaran posted" value={formatIDR(total)} tone="danger" />
        <StatCard label="Transaksi ditampilkan" value={tersaring.length} note={`${jmlDiposting} posted · ${jmlDraf} belum`} />
        <StatCard
          label="Menunggu persetujuan"
          value={menunggu}
          tone="warning"
          href="/app/pengurus/persetujuan"
          note={menunggu ? "Perlu keputusan pengurus" : "Tidak ada antrean"}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Daftar pembayaran"
          subtitle={shared ? "Dari dokumen bersama — sama dengan jurnal dan buku besar" : "Mode lokal: belum tersiar"}
          action={<Badge tone="info">{tersaring.length} baris</Badge>}
        />
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            label="Saringan pembayaran"
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
                  <th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Akun debit</th>
                  <th className="num">Nilai</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tersaring.map(({ j, nilai, debit }) => (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-muted">{j.number}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                    <td className="font-medium text-ink">{j.description}</td>
                    <td className="text-muted">
                      {debit ? `${debit.accountCode} ${ACCOUNT_BY_CODE[debit.accountCode]?.name ?? ""}`.trim() : "—"}
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

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Pemisahan tugas</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
            Pengaju tidak boleh menjadi penyetuju untuk transaksi melebihi ambang yang ditetapkan.
            Ambang nilai persetujuan <Badge tone="warning">belum ditetapkan</Badge> oleh organisasi —
            konfigurasi tersedia, kebijakan menunggu keputusan resmi.
          </p>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Bukti &amp; lampiran</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
            Setiap pembayaran mensyaratkan bukti yang tersimpan pada Document Store, dengan
            reference ke jurnal. Lampiran tidak dapat diganti setelah periode dikunci.
          </p>
        </Card>
      </div>
    </div>
  );
}
