"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Wallet, AlertTriangle, Link2, CheckCircle2 } from "lucide-react";
import { Badge, Card, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, NoRows, SearchBox, SearchProvider, Select, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatIDR, formatDateID } from "@/lib/format";

export function KasBankClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state, exec, actor } = useStore();
  const { q } = useSearch();
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [journalId, setJournalId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  /** Cash + bank derived from the live ledger, with an opening split like lib/finance.ts. */
  const cash = useMemo(() => {
    const opening = state.journals.find((j) => j.id === "JRN-0001" && j.status === "diposting");
    return ["1-1000", "1-1100"].map((code) => {
      let debit = 0, credit = 0;
      for (const j of state.journals) {
        if (j.status !== "diposting") continue;
        for (const l of j.lines) {
          if (l.accountCode !== code) continue;
          debit += l.debit;
          credit += l.credit;
        }
      }
      let opDebit = 0, opCredit = 0;
      for (const l of opening?.lines ?? []) if (l.accountCode === code) { opDebit += l.debit; opCredit += l.credit; }
      const openingBal = opDebit - opCredit;
      return {
        code,
        name: code === "1-1000" ? "Kas Tunai" : "Bank BRI — Rekening Organisasi",
        opening: openingBal,
        inflow: debit - opDebit,
        outflow: credit - opCredit,
        closing: debit - credit,
      };
    });
  }, [state.journals]);

  const unmatched = state.bank.filter((b) => b.status !== "cocok");
  const rows = state.bank.filter((b) => match(`${b.description} ${b.status} ${b.matchedJournalId ?? ""}`, q));
  const target = state.bank.find((b) => b.id === reconcileId);

  const candidates = useMemo(
    () =>
      state.journals.filter(
        (j) => j.status === "diposting" && j.lines.some((l) => l.accountCode === "1-1100"),
      ),
    [state.journals],
  );

  function reconcile() {
    if (!reconcileId) return;
    const r = exec({ type: "bank.reconcile", id: reconcileId, journalId, actor });
    if (r.ok) { setReconcileId(null); setJournalId(""); setErr(null); }
    else setErr(r.message);
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Keuangan Native</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Kas &amp; bank</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Saldo diturunkan dari buku besar. Rekonsiliasi membandingkan mutasi bank dengan jurnal dan
            menampilkan exception — bukan mengubah saldo diam-diam.
          </p>
        </div>
        <DemoStateChip compact />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {cash.map((a) => (
          <StatCard
            key={a.code}
            label={a.name}
            value={formatIDR(a.closing)}
            note={`Masuk ${formatIDR(a.inflow)} · keluar ${formatIDR(a.outflow)}`}
            tone={a.code === "1-1000" ? "success" : "info"}
            icon={a.code === "1-1000" ? <Wallet size={17} /> : <Landmark size={17} />}
          />
        ))}
        <StatCard label="Exception rekonsiliasi" value={unmatched.length} note={unmatched.length ? "Perlu tindak lanjut bendahara" : "Semua mutasi cocok"} tone={unmatched.length ? "warning" : "success"} icon={<AlertTriangle size={17} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-ink">Rekonsiliasi bank — November 2026</h2>
        <SearchBox placeholder="Cari mutasi…" className="w-full sm:w-[300px]" />
      </div>

      <div className="mt-3 grid items-start gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader
            title="Rekening BRI organisasi (demo)"
            subtitle="Klik 'Cocokkan' pada mutasi yang belum memiliki pasangan jurnal"
            action={<Badge tone={unmatched.length ? "warning" : "success"}>{unmatched.length} belum cocok</Badge>}
          />
          <div className="sb-scroll">
            <table className="sb-table min-w-[720px]">
              <thead><tr><th>Tanggal</th><th>Keterangan</th><th className="num">Masuk</th><th className="num">Keluar</th><th>Jurnal</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap text-muted">{formatDateID(b.date, "short")}</td>
                    <td className="font-medium text-ink">{b.description}</td>
                    <td className="num">{b.debit ? formatIDR(b.debit) : "—"}</td>
                    <td className="num">{b.credit ? formatIDR(b.credit) : "—"}</td>
                    <td className="font-mono text-[11px] text-muted">
                      {b.matchedJournalId ?? (
                        <Btn size="sm" variant="soft" icon={<Link2 size={12} />} onClick={() => { setReconcileId(b.id); setJournalId(""); setErr(null); }}>
                          Cocokkan
                        </Btn>
                      )}
                    </td>
                    <td><StatusBadge status={b.status === "cocok" ? "Cocok" : b.status === "selisih" ? "Selisih" : "Belum"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? <NoRows q={q} /> : null}
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Status “selisih” pada transfer mitra: bank mencatat masuk Rp 4.200.000, jurnal tercatat sebagai piutang
            (INV-2026-0031). Perlu konfirmasi pelunasan — sistem tidak mengubah saldo otomatis.
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Posisi per akun" />
            <div className="divide-y divide-line">
              {cash.map((a) => (
                <div key={a.code} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[12.5px] font-semibold text-ink">{a.name}</div>
                    <span className="font-mono text-[10.5px] text-muted2">{a.code}</span>
                  </div>
                  <dl className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                    <div><dt className="text-muted2">Awal</dt><dd className="font-medium text-ink2 tabular-nums">{formatIDR(a.opening)}</dd></div>
                    <div><dt className="text-muted2">Masuk</dt><dd className="font-medium text-[var(--sb-success)] tabular-nums">{formatIDR(a.inflow)}</dd></div>
                    <div><dt className="text-muted2">Keluar</dt><dd className="font-medium text-[var(--sb-danger)] tabular-nums">{formatIDR(a.outflow)}</dd></div>
                  </dl>
                  <div className="mt-1.5 border-t border-dashed border-line pt-1.5 text-[12px]">
                    Saldo akhir: <span className="font-semibold text-primary-800 tabular-nums">{formatIDR(a.closing)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Antrean tindak lanjut" action={<Badge tone={unmatched.length ? "warning" : "success"}>{unmatched.length}</Badge>} />
            <ul className="divide-y divide-line">
              {unmatched.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-ink">{b.description}</div>
                    <div className="text-[10.5px] text-muted2">{formatDateID(b.date, "short")} · {b.debit ? `masuk ${formatIDR(b.debit)}` : `keluar ${formatIDR(b.credit)}`}</div>
                  </div>
                  <Btn size="sm" variant="ghost" onClick={() => { setReconcileId(b.id); setJournalId(""); setErr(null); }}>Cocokkan</Btn>
                </li>
              ))}
              {unmatched.length === 0 ? (
                <li className="flex items-center gap-2 px-4 py-4 text-[12px] text-[var(--sb-success)]">
                  <CheckCircle2 size={15} /> Semua mutasi bank sudah dicocokkan.
                </li>
              ) : null}
            </ul>
          </Card>

          <div className="rounded-sb-sm border border-[var(--sb-info)]/25 bg-[var(--sb-info-bg)] px-3.5 py-3 text-[12px] text-[var(--sb-info)]">
            <div className="mb-0.5 font-semibold">Kontrol</div>
            Rekonsiliasi menghasilkan exception, bukan penyesuaian otomatis. Penyesuaian dibuat sebagai jurnal
            koreksi yang tercatat dan memerlukan persetujuan.
          </div>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Jurnal yang menyentuh kas/bank" subtitle="Penelusuran dari mutasi ke jurnal sumber" action={<Link href="/app/keuangan/jurnal" className="text-[11.5px] font-semibold text-primary-700">Kelola jurnal →</Link>} />
        <div className="sb-scroll">
          <table className="sb-table min-w-[600px]">
            <thead><tr><th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Sumber</th></tr></thead>
            <tbody>
              {state.journals
                .filter((j) => j.status === "diposting" && j.lines.some((l) => l.accountCode === "1-1000" || l.accountCode === "1-1100"))
                .slice(0, 6)
                .map((j) => (
                  <tr key={j.id}>
                    <td className="font-mono text-[11px] text-muted">{j.number}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(j.date, "short")}</td>
                    <td className="font-medium text-ink">{j.description}</td>
                    <td><Badge tone="neutral">{j.source}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!target}
        onClose={() => setReconcileId(null)}
        title="Cocokkan mutasi bank"
        description={target ? `${target.description} · ${target.debit ? "masuk" : "keluar"} ${formatIDR(target.debit || target.credit)}` : undefined}
        footer={<><Btn variant="ghost" onClick={() => setReconcileId(null)}>Batal</Btn><Btn variant="primary" onClick={reconcile} disabled={!journalId}>Cocokkan</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Jurnal pasangan" required error={err ?? undefined} hint="Hanya jurnal diposting yang menyentuh akun bank.">
            {(id) => (
              <Select id={id} value={journalId} onChange={(e) => setJournalId(e.target.value)}>
                <option value="">— pilih jurnal —</option>
                {candidates.map((j) => (
                  <option key={j.id} value={j.number}>{j.number} · {j.description.slice(0, 52)} · {formatIDR(j.lines.filter((l) => l.accountCode === "1-1100").reduce((s, l) => s + (l.debit || l.credit), 0))}</option>
                ))}
              </Select>
            )}
          </Field>
          <p className="text-[11px] text-muted2">
            Mencocokkan tidak mengubah saldo. Ini hanya menautkan bukti bank ke jurnal agar exception tertutup
            dan terlacak di audit.
          </p>
        </div>
      </Modal>
    </div>
  );
}
