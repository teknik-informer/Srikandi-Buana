"use client";

/**
 * Rapat & undangan — kini layar kerja, bukan tabel bacaan.
 *
 * Sebelumnya halaman ini merender konstanta `MEETINGS`: sekretariat tidak
 * bisa mencatat rapat baru, dan notulen tidak bisa difinalkan dari sini.
 * Sekarang rapat bagian dari dokumen bersama (meeting.create/update/notulen).
 *
 * Aturan yang dipakai:
 * - Rapat baru selalu lahir sebagai notulen **draf**; keputusan diisi dulu.
 * - Notulen tidak bisa difinalkan tanpa satu pun keputusan — dicek di
 *   reducer, bukan hanya di antarmuka, supaya jalur tulis lain ikut aman.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, NoRows, SearchBox, SearchProvider, Segmented, Select, TextArea, TextInput, useSearch, match } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatDateFull, daysUntil } from "@/lib/format";

type Tab = "mendatang" | "lampau" | "semua";

const JENIS = [
  { value: "rapat pengurus", label: "Rapat pengurus" },
  { value: "rapat bidang", label: "Rapat bidang" },
  { value: "rapat anggota", label: "Rapat anggota" },
] as const;

export function RapatClient() {
  return (
    <SearchProvider>
      <Isi />
    </SearchProvider>
  );
}

function Isi() {
  const { state, dispatch, actor, shared } = useStore();
  const { q } = useSearch();
  const [tab, setTab] = useState<Tab>("semua");
  const [baru, setBaru] = useState(false);
  const [ubah, setUbah] = useState<string | null>(null);

  const rapat = state.meetings ?? [];

  const mendatang = useMemo(
    () => rapat.filter((m) => daysUntil(m.date) > 0).sort((a, b) => a.date.localeCompare(b.date)),
    [rapat],
  );
  const lampau = useMemo(
    () => rapat.filter((m) => daysUntil(m.date) <= 0).sort((a, b) => b.date.localeCompare(a.date)),
    [rapat],
  );

  const tersaring = useMemo(() => {
    const dasar = tab === "mendatang" ? mendatang : tab === "lampau" ? lampau : [...mendatang, ...lampau];
    if (!q.trim()) return dasar;
    return dasar.filter((m) => match(`${m.id} ${m.title} ${m.type} ${m.date}`, q));
  }, [tab, mendatang, lampau, q]);

  const totalHadir = lampau.reduce((s, m) => s + m.attendees, 0);
  const drafNotulen = rapat.filter((m) => m.notulenStatus === "draft").length;
  const target = ubah ? rapat.find((m) => m.id === ubah) ?? null : null;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sb-label mb-1">Sekretariat</div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-ink">Rapat &amp; undangan</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            Jadwal rapat, kehadiran, dan keputusan. Notulen lahir sebagai draf dan baru
            difinalkan setelah keputusannya tercatat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip />
          <Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline">Notulen</Link>
          <Btn variant="primary" size="sm" onClick={() => setBaru(true)}>Catat rapat</Btn>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Rapat mendatang" value={mendatang.length} note={mendatang[0] ? `Terdekat ${formatDateFull(mendatang[0].date)}` : "Belum ada agenda"} tone="info" />
        <StatCard label="Rapat terlaksana" value={lampau.length} note={`${totalHadir} kehadiran tercatat`} tone="success" />
        <StatCard label="Notulen draf" value={drafNotulen} note={drafNotulen ? "Perlu difinalkan" : "Semua notulen final"} tone={drafNotulen ? "warning" : "neutral"} href="/app/sekretariat/notulen" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Daftar rapat"
          subtitle={shared ? "Dari dokumen bersama — sama dengan notulen dan laporan" : "Mode lokal: belum tersiar"}
          action={<Badge tone="info">{tersaring.length} rapat</Badge>}
        />
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            label="Saringan rapat"
            options={[
              { key: "mendatang", label: `Mendatang (${mendatang.length})` },
              { key: "lampau", label: `Terlaksana (${lampau.length})` },
              { key: "semua", label: `Semua (${rapat.length})` },
            ]}
          />
          <div className="ml-auto w-full sm:w-64">
            <SearchBox placeholder="Cari judul, jenis, tanggal…" />
          </div>
        </div>

        {tersaring.length ? (
          <div className="sb-scroll">
            <table className="sb-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Kode</th><th>Rapat</th><th>Tanggal</th><th>Jenis</th>
                  <th className="num">Hadir</th><th className="num">Keputusan</th><th>Notulen</th><th>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {tersaring.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-muted">{m.id}</td>
                    <td className="font-medium text-ink">{m.title}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateFull(m.date)}</td>
                    <td className="text-muted">{m.type}</td>
                    <td className="num">{m.attendees}</td>
                    <td className="num">{m.decisions.length}</td>
                    <td>
                      <Badge tone={m.notulenStatus === "final" ? "success" : "warning"}>
                        {m.notulenStatus === "final" ? "final" : "draf"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" onClick={() => setUbah(m.id)} className="text-[11.5px] font-semibold text-primary-800 hover:underline">
                          Ubah
                        </button>
                        <span aria-hidden className="text-line-strong">·</span>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "meeting.notulen", id: m.id, status: m.notulenStatus === "final" ? "draft" : "final", actor })}
                          className="text-[11.5px] font-semibold text-primary-800 hover:underline"
                        >
                          {m.notulenStatus === "final" ? "Buka draf" : "Finalkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoRows q={q} />
        )}
      </Card>

      {baru ? <FormRapat onTutup={() => setBaru(false)} /> : null}
      {target ? <FormUbah rapat={target} onTutup={() => setUbah(null)} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FormRapat({ onTutup }: { onTutup: () => void }) {
  const { exec, actor } = useStore();
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("2026-11-24");
  const [jenis, setJenis] = useState<(typeof JENIS)[number]["value"]>("rapat pengurus");
  const [hadir, setHadir] = useState("0");
  const [keputusan, setKeputusan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const simpan = () => {
    const hasil = exec({
      type: "meeting.create",
      title: judul,
      date: tanggal,
      kind: jenis,
      attendees: Number(hadir) || 0,
      decisions: keputusan.split("\n").map((s) => s.trim()).filter(Boolean),
      actor,
    });
    if (!hasil.ok) {
      setGalat(hasil.message ?? "Rapat tidak dapat dicatat.");
      return;
    }
    onTutup();
  };

  return (
    <Modal
      open
      onClose={onTutup}
      title="Catat rapat"
      description="Rapat baru selalu lahir sebagai notulen draf. Finalkan setelah keputusannya lengkap."
      width={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onTutup}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan rapat</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Judul rapat" required>
          {(id) => <TextInput id={id} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="mis. Rapat Pengurus Harian — Evaluasi Desember" />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal" required>
            {(id) => <TextInput id={id} type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />}
          </Field>
          <Field label="Jenis">
            {(id) => (
              <Select id={id} value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)}>
                {JENIS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Jumlah hadir">
          {(id) => <TextInput id={id} type="number" min={0} value={hadir} onChange={(e) => setHadir(e.target.value)} />}
        </Field>
        <Field label="Keputusan rapat" hint="Satu keputusan per baris. Boleh dikosongkan; notulen masih draf.">
          {(id) => (
            <TextArea
              id={id}
              className="min-h-[96px]"
              value={keputusan}
              onChange={(e) => setKeputusan(e.target.value)}
              placeholder={"Menetapkan jadwal Sekolah Tani Desember.\nMenunda pembelian mesin sangrai."}
            />
          )}
        </Field>
        {galat ? <p className="rounded-sb-sm border border-[var(--sb-danger)]/30 bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]">{galat}</p> : null}
      </div>
    </Modal>
  );
}

function FormUbah({
  rapat,
  onTutup,
}: {
  rapat: { id: string; title: string; date: string; type: string; attendees: number; decisions: string[] };
  onTutup: () => void;
}) {
  const { exec, actor } = useStore();
  const [judul, setJudul] = useState(rapat.title);
  const [tanggal, setTanggal] = useState(rapat.date);
  const [jenis, setJenis] = useState(rapat.type);
  const [hadir, setHadir] = useState(String(rapat.attendees));
  const [keputusan, setKeputusan] = useState(rapat.decisions.join("\n"));
  const [galat, setGalat] = useState<string | null>(null);

  const simpan = () => {
    const hasil = exec({
      type: "meeting.update",
      id: rapat.id,
      patch: {
        title: judul,
        date: tanggal,
        type: jenis as "rapat pengurus" | "rapat bidang" | "rapat anggota",
        attendees: Number(hadir) || 0,
        decisions: keputusan.split("\n").map((s) => s.trim()).filter(Boolean),
      },
      actor,
    });
    if (!hasil.ok) {
      setGalat(hasil.message ?? "Perubahan tidak tersimpan.");
      return;
    }
    onTutup();
  };

  return (
    <Modal
      open
      onClose={onTutup}
      title={`Ubah rapat ${rapat.id}`}
      width={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onTutup}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan perubahan</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Judul rapat" required>
          {(id) => <TextInput id={id} value={judul} onChange={(e) => setJudul(e.target.value)} />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal">
            {(id) => <TextInput id={id} type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />}
          </Field>
          <Field label="Jenis">
            {(id) => (
              <Select id={id} value={jenis} onChange={(e) => setJenis(e.target.value)}>
                {JENIS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Jumlah hadir">
          {(id) => <TextInput id={id} type="number" min={0} value={hadir} onChange={(e) => setHadir(e.target.value)} />}
        </Field>
        <Field label="Keputusan rapat" hint="Satu keputusan per baris.">
          {(id) => (
            <TextArea
              id={id}
              className="min-h-[96px]"
              value={keputusan}
              onChange={(e) => setKeputusan(e.target.value)}
            />
          )}
        </Field>
        {galat ? <p className="rounded-sb-sm border border-[var(--sb-danger)]/30 bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]">{galat}</p> : null}
      </div>
    </Modal>
  );
}
