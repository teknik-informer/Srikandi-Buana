import Link from "next/link";
import type { Metadata } from "next";
import { JOURNALS } from "@/data/finance";
import { computeBalances, journalsForAccount } from "@/lib/finance";
import { ACCOUNT_BY_CODE, ACCOUNT_TYPE_LABEL } from "@/data/coa";
import { formatIDR, formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Buku Besar" };

export default async function BukuBesarPage({ searchParams }: { searchParams: Promise<{ akun?: string }> }) {
  const { akun } = await searchParams;
  const balances = computeBalances().filter((b) => b.debit !== 0 || b.credit !== 0);
  const selected = akun ?? balances[0]?.code;
  const account = selected ? ACCOUNT_BY_CODE[selected] : undefined;
  const journals = selected ? journalsForAccount(selected) : [];

  // running balance
  let running = 0;
  const rows = journals.map((j) => {
    const lineTotal = j.lines.filter((l) => l.accountCode === selected);
    const debit = lineTotal.reduce((s, l) => s + l.debit, 0);
    const credit = lineTotal.reduce((s, l) => s + l.credit, 0);
    running += (account?.normal === "debit" ? debit - credit : credit - debit);
    return { j, debit, credit, running };
  });

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Buku besar"
        description="Telusuri dari saldo akun ke setiap jurnal dan transaksi sumbernya. Saldo hanya berasal dari jurnal posted."
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Akun bersaldo" subtitle={`${balances.length} akun`} />
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {balances.map((b) => (
              <Link
                key={b.code}
                href={`/app/keuangan/buku-besar?akun=${b.code}`}
                className={`flex items-center justify-between gap-2 rounded-[7px] px-2.5 py-1.5 text-[11.5px] ${selected === b.code ? "bg-primary text-primary-50" : "text-ink2 hover:bg-surface2"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className={`font-mono text-[10px] ${selected === b.code ? "text-primary-200" : "text-muted2"}`}>{b.code}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatIDR(b.balance)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          {account ? (
            <>
              <Card>
                <CardHeader
                  title={account.name}
                  subtitle={`${account.code} · ${ACCOUNT_TYPE_LABEL[account.type]} · saldo normal ${account.normal}`}
                  action={<Badge tone="neutral">{journals.length} jurnal</Badge>}
                />
                {rows.length ? (
                  <div className="sb-scroll">
                    <table className="sb-table min-w-[680px]">
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
                  <div className="p-4"><EmptyState title="Belum ada mutasi" body="Akun ini belum memiliki jurnal posted pada periode berjalan." /></div>
                )}
              </Card>
              <Card className="p-4">
                <div className="grid gap-3 text-[12px] sm:grid-cols-3">
                  <div><div className="text-muted2">Total debit</div><div className="font-semibold text-ink">{formatIDR(rows.reduce((s, r) => s + r.debit, 0))}</div></div>
                  <div><div className="text-muted2">Total kredit</div><div className="font-semibold text-ink">{formatIDR(rows.reduce((s, r) => s + r.credit, 0))}</div></div>
                  <div><div className="text-muted2">Saldo akhir</div><div className="font-semibold text-primary-800">{formatIDR(rows.at(-1)?.running ?? 0)}</div></div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6"><EmptyState title="Pilih akun" body="Pilih akun pada panel kiri untuk melihat buku besar." /></Card>
          )}

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
        </div>
      </div>
    </div>
  );
}
