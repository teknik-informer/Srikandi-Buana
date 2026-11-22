"use client";

import Link from "next/link";
import { Scale, Hash, CheckCircle2 } from "lucide-react";
import { Badge, Card, CardHeader, StatCard } from "@/components/ui";
import { DemoStateChip, SearchBox, SearchProvider, useSearch, match, NoRows, Segmented } from "@/components/act";
import { useStore, useFinance } from "@/lib/store";
import { ACCOUNT_TYPE_LABEL } from "@/data/coa";
import { formatNumber } from "@/lib/format";
import { useState } from "react";

const TYPE_ORDER = ["aset", "kewajiban", "ekuitas", "pendapatan", "beban"];

type Only = "semua" | "aset" | "kewajiban" | "ekuitas" | "pendapatan" | "beban";

export function NeracaClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state } = useStore();
  const { tb } = useFinance();
  const { q } = useSearch();
  const [only, setOnly] = useState<Only>("semua");

  const groups = TYPE_ORDER
    .filter((t) => only === "semua" || t === only)
    .map((t) => ({ type: t, rows: tb.rows.filter((r) => r.type === t && match(`${r.code} ${r.name}`, q)) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Keuangan Native</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Neraca saldo</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Dihitung ulang langsung dari jurnal diposting — bukan angka yang diketik. Kolom debit dan kredit
            harus sama.
          </p>
        </div>
        <DemoStateChip compact />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total debit" value={formatNumber(tb.totalDebit)} tone="info" icon={<Hash size={17} />} />
        <StatCard label="Total kredit" value={formatNumber(tb.totalCredit)} tone="info" icon={<Hash size={17} />} />
        <StatCard label="Keseimbangan" value={tb.balanced ? "Seimbang" : "Tidak"} note={tb.balanced ? "Selisih 0" : "Periksa jurnal"} tone={tb.balanced ? "success" : "danger"} icon={<Scale size={17} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Only>
          label="Filter kelompok akun"
          value={only}
          onChange={setOnly}
          options={[
            { key: "semua", label: "Semua", count: tb.rows.length },
            ...TYPE_ORDER.map((t) => ({ key: t as Only, label: ACCOUNT_TYPE_LABEL[t], count: tb.rows.filter((r) => r.type === t).length })),
          ]}
        />
        <SearchBox placeholder="Cari kode atau nama akun…" className="w-full sm:w-[300px]" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Neraca saldo per 22 November 2026"
          subtitle={`${tb.rows.length} akun bersaldo · ${state.journals.filter((j) => j.status === "diposting").length} jurnal diposting`}
          action={<Badge tone={tb.balanced ? "success" : "danger"}>{tb.balanced ? "Seimbang" : "Tidak seimbang"}</Badge>}
        />
        <div className="sb-scroll">
          <table className="sb-table min-w-[680px]">
            <thead>
              <tr><th>Akun</th><th>Nama</th><th>Kelompok</th><th className="num">Debit</th><th className="num">Kredit</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <FragmentGroup key={g.type} type={g.type} rows={g.rows} />
              ))}
              <tr className="border-t-2 border-line-strong bg-primary-50">
                <td colSpan={3} className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary-900">Jumlah</td>
                <td className="num font-bold text-primary-900">{formatNumber(tb.totalDebit)}</td>
                <td className="num font-bold text-primary-900">{formatNumber(tb.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {groups.length === 0 ? <NoRows q={q} /> : null}
      </Card>

      <div className="mt-4 rounded-sb-sm border border-[var(--sb-info)]/25 bg-[var(--sb-info-bg)] px-3.5 py-3 text-[13px] text-[var(--sb-info)]">
        <div className="mb-0.5 flex items-center gap-1.5 font-semibold"><CheckCircle2 size={14} /> Keseimbangan dihitung, bukan disimpan</div>
        Halaman ini memakai fungsi yang sama dengan mesin posting. Tambahkan jurnal di{" "}
        <Link href="/app/keuangan/jurnal" className="font-semibold underline">Jurnal &amp; posting</Link>{" "}
        dan angka ini bergerak seketika.
      </div>
    </div>
  );
}

function FragmentGroup({ type, rows }: { type: string; rows: { code: string; name: string; type: string; debitCol: number; creditCol: number }[] }) {
  return (
    <>
      <tr className="bg-paper">
        <td colSpan={5} className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{ACCOUNT_TYPE_LABEL[type]}</td>
      </tr>
      {rows.map((r) => (
        <tr key={r.code}>
          <td className="font-mono text-[11.5px] text-muted">{r.code}</td>
          <td className="font-medium text-ink">{r.name}</td>
          <td className="text-muted">{ACCOUNT_TYPE_LABEL[r.type]}</td>
          <td className="num">{r.debitCol ? formatNumber(r.debitCol) : "—"}</td>
          <td className="num">{r.creditCol ? formatNumber(r.creditCol) : "—"}</td>
        </tr>
      ))}
    </>
  );
}
