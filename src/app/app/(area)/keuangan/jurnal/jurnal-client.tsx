"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Send, Undo2, FileText, CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { COA, ACCOUNT_BY_CODE } from "@/data/coa";
import { Badge, Card, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, NoRows, SearchBox, SearchProvider, Select, Segmented, TextInput, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatIDR, formatDateID } from "@/lib/format";
import type { JournalLine } from "@/data/types";

type Tab = "diposting" | "draf" | "semua" | "semua-status";

interface Row { accountCode: string; memo: string; debit: string; credit: string; programCode?: string }

const EMPTY_ROW = (): Row => ({ accountCode: "5-1200", memo: "", debit: "", credit: "" });

export function JurnalClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state, exec, actor } = useStore();
  const { q } = useSearch();
  const [tab, setTab] = useState<Tab>("diposting");
  const [open, setOpen] = useState(false);
  const [reverseId, setReverseId] = useState<string | null>(null);

  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("2026-11-22");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW(), debit: "" }, { ...EMPTY_ROW(), accountCode: "1-1000" }]);
  const [err, setErr] = useState<string | null>(null);

  const totals = useMemo(() => {
    const d = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const c = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
    return { d, c, balanced: d === c && d > 0, diff: d - c };
  }, [rows]);

  const posted = state.journals.filter((j) => j.status === "diposting");
  const unbalanced = state.journals.filter((j) => {
    const d = j.lines.reduce((s, l) => s + l.debit, 0);
    const c = j.lines.reduce((s, l) => s + l.credit, 0);
    return d !== c || d === 0;
  });

  const list = state.journals
    .filter((j) => (tab === "diposting" ? j.status === "diposting" : tab === "semua-status" ? true : true))
    .filter((j) => match(`${j.number} ${j.description} ${j.source} ${j.createdBy} ${j.lines.map((l) => l.accountCode).join(" ")}`, q));

  const drafts = state.drafts.filter((d) => match(`${d.description} ${d.lines.map((l) => l.accountCode).join(" ")}`, q));

  const target = state.journals.find((j) => j.id === reverseId);
  const reversedIds = new Set(state.journals.map((j) => j.reversalOf).filter(Boolean));

  function addRow() { setRows((r) => [...r, EMPTY_ROW()]); }
  function removeRow(i: number) { setRows((r) => r.filter((_, idx) => idx !== i)); }
  function setCell(i: number, key: keyof Row, v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  }

  function saveDraft() {
    setErr(null);
    const lines: JournalLine[] = rows.map((r) => ({
      accountCode: r.accountCode,
      debit: Math.round(Number(r.debit) || 0),
      credit: Math.round(Number(r.credit) || 0),
      memo: r.memo || undefined,
      programCode: r.programCode || undefined,
    }));
    const r = exec({ type: "journal.draft", draft: { date, description: desc, lines }, actor });
    if (r.ok) {
      setOpen(false);
      setDesc("");
      setRows([{ ...EMPTY_ROW() }, { ...EMPTY_ROW(), accountCode: "1-1000" }]);
      setTab("semua");
    } else setErr(r.message);
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Keuangan Native</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Jurnal umum &amp; posting</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Buat draf, posting, atau balik jurnal. Jurnal diposting bersifat tetap — koreksi dilakukan
            dengan jurnal pembalik berpasangan, bukan penghapusan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip compact />
          <Btn variant="primary" icon={<Plus size={15} />} onClick={() => { setErr(null); setOpen(true); }}>Jurnal baru</Btn>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Jurnal diposting" value={posted.length} note="Tidak dapat diubah" tone="success" icon={<CheckCircle2 size={17} />} />
        <StatCard label="Draf belum diposting" value={state.drafts.length} note={state.drafts.length ? "Siap diposting" : "Tidak ada draf"} tone="warning" icon={<FileText size={17} />} />
        <StatCard label="Tidak seimbang" value={unbalanced.length} note={unbalanced.length === 0 ? "Semua seimbang ✓" : "Perlu koreksi"} tone={unbalanced.length === 0 ? "success" : "danger"} icon={<Scale size={17} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Tab>
          label="Filter jurnal"
          value={tab}
          onChange={setTab}
          options={[
            { key: "diposting", label: "Diposting", count: posted.length },
            { key: "draf", label: "Draf", count: state.drafts.length },
            { key: "semua", label: "Semua", count: state.journals.length },
          ]}
        />
        <SearchBox placeholder="Cari nomor, keterangan, akun…" className="w-full sm:w-[320px]" />
      </div>

      {/* Drafts */}
      {tab === "draf" || (tab !== "diposting" && state.drafts.length > 0) ? (
        <div className="mt-4 space-y-2">
          {drafts.map((d) => {
            const dr = d.lines.reduce((s, l) => s + l.debit, 0);
            return (
              <Card key={d.id} className="border-dashed border-warning/40">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">Draf {d.id}</Badge>
                      <span className="font-mono text-[10.5px] text-muted2">{formatDateID(d.date, "short")}</span>
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-ink">{d.description}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {d.lines.length} baris · {d.lines.map((l) => `${l.accountCode} ${l.debit ? "D " + formatIDR(l.debit) : "K " + formatIDR(l.credit)}`).join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-primary-800 tabular-nums">{formatIDR(dr)}</span>
                    <Btn size="sm" variant="primary" icon={<Send size={13} />} onClick={() => exec({ type: "journal.post", id: d.id, actor })}>Posting</Btn>
                    <Btn size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => exec({ type: "journal.discard", id: d.id, actor })}>Buang</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
          {drafts.length === 0 && (
            <Card><NoRows q={q} /></Card>
          )}
        </div>
      ) : null}

      {/* Posted journals */}
      {tab !== "draf" ? (
        <div className="mt-4 space-y-3">
          {list.map((j) => {
            const debit = j.lines.reduce((s, l) => s + l.debit, 0);
            const credit = j.lines.reduce((s, l) => s + l.credit, 0);
            const balanced = debit === credit && debit > 0;
            const isReversal = !!j.reversalOf;
            const isReversed = reversedIds.has(j.id);
            return (
              <Card key={j.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11.5px] font-semibold text-ink2">{j.number}</span>
                      <Badge tone="neutral">{j.source}</Badge>
                      {j.sourceRef ? <span className="font-mono text-[10.5px] text-muted2">ref {j.sourceRef}</span> : null}
                      {isReversal ? <Badge tone="warning">Pembalik {j.reversalOf}</Badge> : null}
                      {isReversed ? <Badge tone="danger">Sudah dibalik</Badge> : null}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-ink">{j.description}</div>
                    <div className="mt-0.5 text-[10.5px] text-muted2">
                      {formatDateID(j.date)} · dibuat {j.createdBy}{j.approvedBy ? ` · disetujui ${j.approvedBy}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {balanced ? <Badge tone="success">Seimbang</Badge> : <Badge tone="danger">Tidak seimbang</Badge>}
                    <StatusBadge status={j.status === "diposting" ? "Diposting" : j.status === "menunggu" ? "Menunggu" : "Draf"} />
                    {!isReversal && !isReversed && j.status === "diposting" ? (
                      <Btn size="sm" variant="ghost" icon={<Undo2 size={13} />} onClick={() => setReverseId(j.id)}>Balik</Btn>
                    ) : null}
                  </div>
                </div>
                <div className="sb-scroll">
                  <table className="sb-table min-w-[640px]">
                    <thead><tr><th>Akun</th><th>Memo</th><th>Program</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                    <tbody>
                      {j.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="font-medium text-ink">
                            <span className="font-mono text-[11px] text-muted">{l.accountCode}</span>{" "}
                            {ACCOUNT_BY_CODE[l.accountCode]?.name ?? "—"}
                          </td>
                          <td className="text-muted">{l.memo ?? "—"}</td>
                          <td className="font-mono text-[10.5px] text-muted2">{[l.programCode, l.fundCode].filter(Boolean).join(" · ") || "—"}</td>
                          <td className="num">{l.debit ? formatIDR(l.debit) : "—"}</td>
                          <td className="num">{l.credit ? formatIDR(l.credit) : "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-paper">
                        <td colSpan={3} className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">Total</td>
                        <td className="num font-semibold text-ink">{formatIDR(debit)}</td>
                        <td className="num font-semibold text-ink">{formatIDR(credit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
          {list.length === 0 ? <Card><NoRows q={q} /></Card> : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-sb-sm border border-[var(--sb-info)]/25 bg-[var(--sb-info-bg)] px-3.5 py-3 text-[13px] text-[var(--sb-info)]">
        <div className="mb-0.5 font-semibold">Alur posting yang wajib</div>
        Aplikasi sumber (POS, pengadaan, pelatihan, kontribusi) memanggil domain service Keuangan —
        bukan menulis jurnal langsung. Posting berjalan dalam satu transaksi dengan validasi saldo,
        referensi sumber unik, dan idempotency key unik.
      </div>

      {/* New journal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Jurnal baru"
        description="Draf disimpan dulu; posting menjadikannya final. Jurnal harus seimbang."
        width={720}
        footer={
          <>
            <div className="mr-auto text-[12px]">
              <span className="text-muted">Debit </span>
              <strong className="tabular-nums text-ink">{formatIDR(totals.d)}</strong>
              <span className="mx-1 text-muted">/</span>
              <span className="text-muted">Kredit </span>
              <strong className={`tabular-nums ${totals.balanced ? "text-[var(--sb-success)]" : "text-[var(--sb-danger)]"}`}>{formatIDR(totals.c)}</strong>
              {!totals.balanced ? <span className="ml-1.5 text-[11px] text-[var(--sb-danger)]">selisih {formatIDR(Math.abs(totals.diff))}</span> : null}
            </div>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn variant="primary" onClick={saveDraft} disabled={!totals.balanced}>Simpan draf</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <Field label="Keterangan" required>{(id) => <TextInput id={id} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="mis. Pembelian kemasan 200 pcs" />}</Field>
            <Field label="Tanggal">{(id) => <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          </div>

          <div className="rounded-sb-sm border border-line">
            <table className="sb-table">
              <thead><tr><th>Akun</th><th>Memo</th><th className="num">Debit</th><th className="num">Kredit</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="min-w-[190px]">
                      <Select value={r.accountCode} onChange={(e) => setCell(i, "accountCode", e.target.value)} aria-label={`Akun baris ${i + 1}`} className="!py-1.5 !text-[12px]">
                        {COA.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                      </Select>
                    </td>
                    <td><TextInput value={r.memo} onChange={(e) => setCell(i, "memo", e.target.value)} placeholder="memo" aria-label={`Memo baris ${i + 1}`} className="!py-1.5 !text-[12px]" /></td>
                    <td className="w-[110px]"><TextInput type="number" min={0} value={r.debit} onChange={(e) => setCell(i, "debit", e.target.value)} aria-label={`Debit baris ${i + 1}`} className="!py-1.5 !text-[12px] text-right" /></td>
                    <td className="w-[110px]"><TextInput type="number" min={0} value={r.credit} onChange={(e) => setCell(i, "credit", e.target.value)} aria-label={`Kredit baris ${i + 1}`} className="!py-1.5 !text-[12px] text-right" /></td>
                    <td className="w-9">
                      <button type="button" onClick={() => removeRow(i)} aria-label={`Hapus baris ${i + 1}`} className="inline-flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-[var(--sb-danger-bg)] hover:text-[var(--sb-danger)]">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line px-3 py-2">
              <Btn size="sm" variant="ghost" icon={<Plus size={13} />} onClick={addRow}>Tambah baris</Btn>
            </div>
          </div>

          {err ? (
            <div role="alert" className="flex items-start gap-2 rounded-sb-sm border border-[#ecc9c3] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {err}
            </div>
          ) : (
            <p className="text-[11px] text-muted2">
              Debit dan kredit harus sama dan lebih dari nol. Setiap baris hanya boleh berisi salah satu.
            </p>
          )}
        </div>
      </Modal>

      {/* Reverse */}
      <Modal
        open={!!target}
        onClose={() => setReverseId(null)}
        title="Balik jurnal?"
        description={target ? `${target.number} — ${target.description}` : undefined}
        width={480}
        footer={<><Btn variant="ghost" onClick={() => setReverseId(null)}>Batal</Btn><Btn variant="danger" onClick={() => { if (target) exec({ type: "journal.reverse", id: target.id, actor }); setReverseId(null); }}>Posting pembalik</Btn></>}
      >
        <p className="text-[12.5px] leading-relaxed text-ink2">
          Jurnal asli tidak dihapus. Sistem membuat jurnal baru dengan debit dan kredit tertukar,
          sehingga saldo kembali nol untuk transaksi ini dan jejak audit tetap utuh.
        </p>
        {target ? (
          <div className="mt-3 rounded-sb-sm bg-paper p-3 text-[12px]">
            <div className="flex justify-between"><span className="text-muted">Nilai dibalik</span><strong className="tabular-nums text-ink">{formatIDR(target.lines.reduce((s, l) => s + l.debit, 0))}</strong></div>
            <div className="mt-1 flex justify-between"><span className="text-muted">Baris</span><span className="text-ink">{target.lines.length}</span></div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
