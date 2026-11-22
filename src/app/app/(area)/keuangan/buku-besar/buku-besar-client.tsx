"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ACCOUNT_BY_CODE, ACCOUNT_TYPE_LABEL } from "@/data/coa";
import { Badge, Card, CardHeader, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { DemoStateChip, SearchBox, SearchProvider, useSearch, match } from "@/components/act";
import { useStore, computeBalances } from "@/lib/store";
import { COA } from "@/data/coa";
import { formatIDR, formatDateID } from "@/lib/format";

export function BukuBesarClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state } = useStore();
  const { q } = useSearch();
  const balances = useMemo(
    () => computeBalances(state, COA).filter((b) => b.debit !== 0 || b.credit !== 0),
    [state],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? balances[0]?.code;
  const account = active ? ACCOUNT_BY_CODE[active] : undefined;

  const journals = useMemo(
    () =>
      state.journals
        .filter((j) => j.status === "diposting" && j.lines.some((l) => l.accountCode === active))
        .slice()
        .reverse(),
    [state.journals, active],
  );

  const rows = useMemo(() => {
    let running = 0;
    return journals.map((j) => {
      const ls = j.lines.filter((l) => l.accountCode === active);
      const debit = ls.reduce((s, l) => s + l.debit, 0);
      const credit = ls.reduce((s, l) => s + l.credit, 0);
      running += account?.normal === "debit" ? debit - credit : credit - debit;
      return { j, debit, credit, running };
    });
  }, [journals, active, account]);

  const visibleBalances = balances.filter((b) => match(`${b.code} ${b.name}`, q));

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Keuangan Native</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Buku besar</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Telusuri dari saldo akun ke setiap jurnal dan transaksi sumbernya. Saldo hanya berasal dari jurnal diposting.
          </p>
        </div>
        <DemoStateChip compact />
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Akun bersaldo" subtitle={`${balances.length} akun`} />
          <div className="p-2"><SearchBox placeholder="Cari akun…" /></div>
          <div className="max-h-[62vh] overflow-y-auto p-1.5">
            {visibleBalances.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => setSelected(b.code)}
                aria-current={active === b.code}
                className={`flex w-full items-center justify-between gap-2 rounded-[7px] px-2.5 py-2 text-left text-[11.5px] transition ${
                  active === b.code ? "bg-primary text-primary-50" : "text-ink2 hover:bg-surface2"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className={`font-mono text-[10px] ${active === b.code ? "text-primary-200" : "text-muted2"}`}>{b.code}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatIDR(b.balance)}</span>
              </button>
            ))}
            {visibleBalances.length === 0 ? <p className="px-3 py-6 text-center text-[12px] text-muted">Tidak ada akun yang cocok.</p> : null}
          </div>
        </Card>

        <div className="space-y-4">
          {account ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Akun" value={account.code} note={account.name} tone="info" icon={<BookOpen size={17} />} />
                <StatCard label="Mutasi" value={rows.length} note="Jurnal diposting" tone="neutral" />
                <StatCard label="Saldo akhir" value={formatIDR(rows.at(-1)?.running ?? 0)} note={`Normal ${account.normal}`} tone="success" />
              </div>

              <Card>
                <CardHeader
                  title={account.name}
                  subtitle={`${account.code} · ${ACCOUNT_TYPE_LABEL[account.type]} · saldo normal ${account.normal}`}
                  action={<Badge tone="neutral">{journals.length} jurnal</Badge>}
                />
                {rows.length ? (
                  <div className="sb-scroll">
                    <table className="sb-table min-w-[720px]">
                      <thead><tr><th>Tanggal</th><th>Jurnal</th><th>Keterangan</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo</th></tr></thead>
                      <tbody>
                        {rows.map(({ j, debit, credit, running: r }) => (
                          <tr key={j.id}>
                            <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                            <td className="whitespace-nowrap font-mono text-[11px] text-muted">{j.number}</td>
                            <td className="font-medium text-ink">{j.description}</td>
                            <td className="num">{debit ? formatIDR(debit) : "—"}</td>
                            <td className="num">{credit ? formatIDR(credit) : "—"}</td>
                            <td className="num font-semibold text-primary-800">{formatIDR(r)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4"><EmptyState title="Belum ada mutasi" body="Akun ini belum memiliki jurnal diposting pada periode berjalan." /></div>
                )}
              </Card>

              <Card className="p-4">
                <div className="grid gap-3 text-[12px] sm:grid-cols-3">
                  <div><div className="text-muted2">Total debit</div><div className="font-semibold text-ink tabular-nums">{formatIDR(rows.reduce((s, r) => s + r.debit, 0))}</div></div>
                  <div><div className="text-muted2">Total kredit</div><div className="font-semibold text-ink tabular-nums">{formatIDR(rows.reduce((s, r) => s + r.credit, 0))}</div></div>
                  <div><div className="text-muted2">Saldo akhir</div><div className="font-semibold text-primary-800 tabular-nums">{formatIDR(rows.at(-1)?.running ?? 0)}</div></div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Jurnal terkait sumber" subtitle="Penelusuran dokumen & audit" />
                <div className="sb-scroll">
                  <table className="sb-table min-w-[560px]">
                    <thead><tr><th>Sumber</th><th>Referensi</th><th>Status</th><th>Dibuat</th></tr></thead>
                    <tbody>
                      {journals.slice(0, 5).map((j) => (
                        <tr key={j.id}>
                          <td><Badge tone="neutral">{j.source}</Badge></td>
                          <td className="font-mono text-[11px] text-muted">{j.sourceRef ?? j.number}</td>
                          <td><StatusBadge status="Diposting" /></td>
                          <td className="text-muted">{j.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6"><EmptyState title="Pilih akun" body="Pilih akun pada panel kiri untuk melihat buku besar." /></Card>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-muted2">
        Butuh mencatat transaksi baru? <Link href="/app/keuangan/jurnal" className="font-semibold text-primary-700">Buka Jurnal &amp; posting →</Link>
      </p>
    </div>
  );
}
