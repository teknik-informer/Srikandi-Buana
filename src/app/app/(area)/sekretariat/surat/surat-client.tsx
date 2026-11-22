"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowRight, Inbox, Send, CheckCheck } from "lucide-react";
import { Badge, Card, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, NoRows, SearchBox, SearchProvider, Select, Segmented, TextInput, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatDateID } from "@/lib/format";
import type { Letter } from "@/data/types";

type Direction = "masuk" | "keluar";

export function SuratClient() {
  return (
    <SearchProvider>
      <Inner />
    </SearchProvider>
  );
}

function Inner() {
  const { state, exec, actor } = useStore();
  const { q } = useSearch();
  const [dir, setDir] = useState<Direction>("masuk");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", counterpart: "", number: "", assignee: actor.name });
  const [err, setErr] = useState<string | null>(null);

  const counts = {
    masuk: state.letters.filter((l) => l.direction === "masuk").length,
    keluar: state.letters.filter((l) => l.direction === "keluar").length,
  };
  const baru = state.letters.filter((l) => l.status === "baru").length;
  const diproses = state.letters.filter((l) => l.status === "diproses").length;
  const selesai = state.letters.filter((l) => l.status === "selesai").length;

  const list = useMemo(
    () =>
      state.letters
        .filter((l) => l.direction === dir)
        .filter((l) => match(`${l.number} ${l.subject} ${l.counterpart} ${l.assignee}`, q))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.letters, dir, q],
  );

  function advance(l: Letter) {
    const next: Letter["status"] = l.status === "baru" ? "diproses" : l.status === "diproses" ? "selesai" : "baru";
    exec({ type: "letter.status", id: l.id, status: next, actor });
  }

  function register() {
    setErr(null);
    const r = exec({ type: "letter.register", direction: dir, subject: form.subject, counterpart: form.counterpart, number: form.number, assignee: form.assignee, actor });
    if (r.ok) { setOpen(false); setForm({ subject: "", counterpart: "", number: "", assignee: actor.name }); }
    else setErr(r.message);
  }

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Sekretariat</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Surat masuk &amp; keluar</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Registrasi surat, penanggung jawab tindak lanjut, dan status penyelesaian. Nomor surat
            mengikuti konfigurasi dokumen generator organisasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip compact />
          <Btn variant="primary" icon={<Plus size={15} />} onClick={() => { setErr(null); setOpen(true); }}>
            Registrasi surat
          </Btn>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Surat masuk" value={counts.masuk} note="Termasuk hari ini" tone="info" icon={<Inbox size={17} />} />
        <StatCard label="Surat keluar" value={counts.keluar} note="Tercatat di ekspedisi" tone="accent" icon={<Send size={17} />} />
        <StatCard label="Perlu ditindak" value={baru} note="Status baru, belum diproses" tone={baru ? "warning" : "success"} icon={<ArrowRight size={17} />} />
        <StatCard label="Selesai" value={selesai} note={`${diproses} sedang diproses`} tone="success" icon={<CheckCheck size={17} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Direction>
          label="Arah surat"
          value={dir}
          onChange={setDir}
          options={[
            { key: "masuk", label: "Masuk", count: counts.masuk },
            { key: "keluar", label: "Keluar", count: counts.keluar },
          ]}
        />
        <SearchBox placeholder="Cari nomor, perihal, pengirim…" className="w-full sm:w-[320px]" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title={dir === "masuk" ? "Surat masuk" : "Surat keluar"}
          subtitle="Urut tanggal terbaru · klik status untuk memajukan alur"
          action={<Badge tone="neutral">{list.length} baris</Badge>}
        />
        <div className="sb-scroll">
          <table className="sb-table min-w-[860px]">
            <thead>
              <tr><th>Nomor</th><th>Perihal</th><th>Lawan transaksi</th><th>Tanggal</th><th>PIC</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{l.number}</td>
                  <td className="font-medium text-ink">{l.subject}</td>
                  <td className="text-muted">{l.counterpart}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(l.date, "short")}</td>
                  <td>{l.assignee}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => advance(l)}
                      title="Klik untuk memajukan status: baru → diproses → selesai"
                      className="inline-flex min-h-[32px] items-center rounded-full transition hover:opacity-80"
                    >
                      <StatusBadge status={l.status === "baru" ? "Baru" : l.status === "diproses" ? "Diproses" : "Selesai"} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 ? <NoRows q={q} /> : null}
        <div className="border-t border-line px-4 py-2.5">
          <Badge tone="neutral">Nomor surat otomatis</Badge>{" "}
          <span className="text-[11px] text-muted">Format penomoran mengikuti konfigurasi dokumen generator organisasi.</span>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Registrasi surat ${dir}`}
        description="Nomor boleh dikosongkan — generator akan memberi penanda sementara."
        footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn><Btn variant="primary" onClick={register}>Simpan registrasi</Btn></>}
      >
        <div className="space-y-3">
          <Field label="Perihal" required error={err ?? undefined}>
            {(id) => <TextInput id={id} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="mis. Undangan rapat koordinasi desa" />}
          </Field>
          <Field label={dir === "masuk" ? "Pengirim" : "Tujuan"} required>
            {(id) => <TextInput id={id} value={form.counterpart} onChange={(e) => setForm({ ...form, counterpart: e.target.value })} placeholder="mis. Dinas Pertanian Kab. Temanggung" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nomor surat" hint="Kosongkan untuk penomoran otomatis">
              {(id) => <TextInput id={id} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="012/KWT-SB/XI/2026" />}
            </Field>
            <Field label="Penanggung jawab">
              {(id) => (
                <Select id={id} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                  {["Sekretaris", "Ketua", "Bendahara", "Bidang Usaha", "Bidang Pertanian"].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <p className="text-[11px] text-muted2">Surat tercatat pada tanggal demo 22 November 2026 dan masuk ke antrean tindak lanjut.</p>
        </div>
      </Modal>
    </div>
  );
}
