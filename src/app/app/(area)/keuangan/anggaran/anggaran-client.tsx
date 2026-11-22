"use client";

import { useMemo, useState } from "react";
import { PiggyBank, TrendingDown, Wallet, Send } from "lucide-react";
import { FUNDS, PERIODS } from "@/data/finance";
import { Badge, Card, CardHeader, Progress, StatCard, StatusBadge } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, Select, TextInput } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatIDR, percent } from "@/lib/format";

export function AnggaranClient() {
  const { state, exec, actor } = useStore();
  const [open, setOpen] = useState(false);
  const [budgetId, setBudgetId] = useState(state.budgets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  /** Realisation: posted expense/asset lines tagged with the program code. */
  const spend = useMemo(() => {
    const planned = new Map<string, number>();
    for (const b of state.budgets) planned.set(b.programCode, (planned.get(b.programCode) ?? 0) + b.planned);
    const actual = new Map<string, number>();
    for (const j of state.journals) {
      if (j.status !== "diposting") continue;
      for (const l of j.lines) {
        if (!l.programCode) continue;
        const isExpense = l.accountCode.startsWith("5-");
        if (isExpense) actual.set(l.programCode, (actual.get(l.programCode) ?? 0) + l.debit - l.credit);
      }
    }
    const codes = [...new Set([...planned.keys(), ...actual.keys()])];
    return codes.map((code) => ({ programCode: code, planned: planned.get(code) ?? 0, actual: actual.get(code) ?? 0 }));
  }, [state.budgets, state.journals]);

  const totalPlanned = state.budgets.reduce((s, b) => s + b.planned, 0);
  const totalActual = spend.reduce((s, p) => s + p.actual, 0);
  const selectedBudget = state.budgets.find((b) => b.id === budgetId);

  function request() {
    setErr(null);
    const value = Math.round(Number(amount) || 0);
    const r = exec({ type: "budget.request", budgetId, amount: value, note, actor });
    if (r.ok) {
      setOpen(false);
      setAmount("");
      setNote("");
    } else setErr(r.message);
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Keuangan Native</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Anggaran, komitmen &amp; dana</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Anggaran disusun per program dan akun. Realisasi ditarik dari jurnal; komitmen dicatat terpisah
            hingga dibukukan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip compact />
          <Btn variant="primary" icon={<Send size={14} />} onClick={() => { setErr(null); setOpen(true); }}>Ajukan realisasi</Btn>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total anggaran" value={formatIDR(totalPlanned)} tone="info" icon={<PiggyBank size={17} />} />
        <StatCard label="Realisasi" value={formatIDR(totalActual)} note={`${percent(totalActual, totalPlanned)}% dari anggaran`} tone="accent" icon={<TrendingDown size={17} />} />
        <StatCard label="Sisa anggaran" value={formatIDR(totalPlanned - totalActual)} tone="success" icon={<Wallet size={17} />} />
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Anggaran vs realisasi per program" subtitle="Realisasi = beban diposting dengan dimensi program" />
          <div className="divide-y divide-line">
            {spend.map((s) => {
              const prog = state.programs.find((p) => p.code === s.programCode);
              const pct = percent(s.actual, s.planned);
              return (
                <div key={s.programCode} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink">{prog?.name ?? s.programCode}</div>
                      <div className="text-[10.5px] text-muted2">{s.programCode} · {prog?.bidang ?? "—"}</div>
                    </div>
                    <span className="text-[11.5px] text-muted tabular-nums">{formatIDR(s.actual)} / {formatIDR(s.planned)}</span>
                  </div>
                  <div className="mt-1.5"><Progress value={pct} tone={pct > 85 ? "danger" : "primary"} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Rincian anggaran per akun" subtitle={`${state.budgets.length} baris`} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[420px]">
              <thead><tr><th>Akun</th><th>Program</th><th className="num">Anggaran</th></tr></thead>
              <tbody>
                {state.budgets.map((b) => (
                  <tr key={b.id}>
                    <td className="text-[11.5px] text-muted">{b.accountCode} · {b.accountName}</td>
                    <td className="font-medium text-ink">{b.programName.split(" ").slice(0, 3).join(" ")}…</td>
                    <td className="num tabular-nums">{formatIDR(b.planned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sumber dana & pembatasan" subtitle="Setiap transaksi wajib membawa dimensi dana bila relevan" />
          <div className="divide-y divide-line">
            {FUNDS.map((f) => (
              <div key={f.code} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12.5px] font-semibold text-ink">{f.name}</div>
                  <Badge tone={f.status === "aktif" ? "success" : "neutral"}>{f.source}</Badge>
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted2">{f.restriction}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 text-[11px] text-muted">
                  <span>Diterima {formatIDR(f.received)}</span>
                  <span>Terpakai {formatIDR(f.used)}</span>
                  <span className="font-semibold text-primary-800">Sisa {formatIDR(f.received - f.used)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pengendalian periode" subtitle="Posting ke periode tertutup ditolak" />
          <div className="divide-y divide-line">
            {PERIODS.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div>
                  <div className="text-[12px] font-medium text-ink">{p.label}</div>
                  <div className="text-[10.5px] text-muted2">{p.note}</div>
                </div>
                <StatusBadge status={p.status === "terbuka" ? "Terbuka" : "Terkunci"} />
              </div>
            ))}
          </div>
          <div className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] text-muted2">
            Membuka kembali periode terkunci memerlukan proses yang sah dan tercatat pada audit log.
          </div>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajukan realisasi anggaran"
        description="Pengajuan masuk ke Kotak Persetujuan Ketua. Bila disetujui, jurnal diposting otomatis."
        footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn><Btn variant="primary" onClick={request}>Ajukan</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Baris anggaran" required>
            {(id) => (
              <Select id={id} value={budgetId} onChange={(e) => setBudgetId(e.target.value)}>
                {state.budgets.map((b) => (
                  <option key={b.id} value={b.id}>{b.programName} — {b.accountName}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Nilai" required error={err ?? undefined} hint={selectedBudget ? `Sisa program: ${formatIDR(selectedBudget.planned - (spend.find((s) => s.programCode === selectedBudget.programCode)?.actual ?? 0))}` : undefined}>
            {(id) => <TextInput id={id} type="number" min={10000} step={10000} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2000000" />}
          </Field>
          <Field label="Keterangan">{(id) => <TextInput id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. honor narasumber sesi Desember" />}</Field>
        </div>
      </Modal>
    </div>
  );
}
