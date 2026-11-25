"use client";

/**
 * SATU LAYAR, SEMUA URUSAN.
 *
 * Lima urusan berdampingan di satu meja kerja: anggota, lahan, kas, program,
 * agenda. Tidak ada yang hanya bisa dibaca. Tiap panel menulis lewat aksi yang
 * sama dengan aplikasi bidangnya, jadi angka di sini, di buku induk, dan di
 * laporan keuangan berasal dari satu dokumen yang dibagi lewat server.
 *
 * Di ponsel panel menumpuk satu kolom; di tablet dua; di desktop tiga dengan
 * kas dan agenda mengambil dua kolom karena isinya lebih panjang.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore, useFinance, type Actor } from "@/lib/store";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { Btn, Field, Modal, ResetDemo, Select, TextInput } from "@/components/act";
import { formatDateID, formatIDR, relativeID } from "@/lib/format";
import type { LandPlot } from "@/data/types";

/* ─────────────────────────── kecil-kecil ─────────────────────────── */

/**
 * Angka ramah Indonesia.
 *
 * Petugas lapangan menulis "0,4 ha" dan "1.250.000" — koma untuk desimal,
 * titik untuk ribuan. `Number()` menolak keduanya. Aturan di sini:
 *   - bila ada koma → koma adalah desimal, titik adalah ribuan;
 *   - bila hanya titik → titik dengan tepat 3 digit di belakangnya adalah
 *     pemisah ribuan, selain itu desimal (0.4 tetap 0,4).
 */
function angka(s: string): number {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return NaN;
  if (t.includes(",")) {
    return Number(t.replace(/\./g, "").replace(",", "."));
  }
  const titik = t.split(".");
  if (titik.length > 2) return Number(t.replace(/\./g, ""));
  if (titik.length === 2 && titik[1].length === 3) return Number(titik.join(""));
  return Number(t);
}

/** Rupiah ringkas untuk pita angka: "Rp1,2 jt" alih-alih deretan digit. */
function ringkas(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (Math.abs(n) >= 1_000) return `Rp${Math.round(n / 1_000)} rb`;
  return formatIDR(n);
}

function Row({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2 last:border-0">
      <div className="min-w-0">
        <div className="truncate text-[12.5px] text-ink">{label}</div>
        {note ? <div className="truncate text-[11px] text-muted">{note}</div> : null}
      </div>
      <div className="shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-[12px] text-muted">{children}</div>;
}

function Panel({
  title,
  href,
  action,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader
        title={title}
        action={
          <div className="flex items-center gap-2">
            {action}
            {href ? (
              <Link href={href} className="text-[11.5px] font-semibold text-primary-700">
                Buka →
              </Link>
            ) : null}
          </div>
        }
      />
      <div className="min-h-0 flex-1 px-4 pb-4">{children}</div>
    </Card>
  );
}

/* ───────────────────────────── panel ────────────────────────────── */

export function KerjaClient() {
  const { state, exec, actor, shared, sharedNote, ready } = useStore();
  const fin = useFinance();

  /* modal mana yang terbuka */
  const [open, setOpen] = useState<null | "anggota" | "lahan" | "kas" | "agenda">(null);

  /* ── ringkasan ── */
  const aktif = state.members.filter((m) => m.status === "aktif");
  const menunggu = state.members.filter((m) => m.status === "menunggu");
  const lahanProduktif = state.lands.filter((l) => l.status === "produktif");
  const totalHa = state.lands.reduce((s, l) => s + (Number(l.areaHa) || 0), 0);
  const kasSaldo = fin.tb.rows
    .filter((r) => r.code === "1-1000" || r.code === "1-1100")
    .reduce((s, r) => s + (r.balance ?? 0), 0);
  const tugasTerbuka = state.tasks.filter((t) => t.status !== "selesai");

  const agenda = useMemo(
    () =>
      [...state.activities]
        .filter((a) => a.status === "terjadwal" || a.status === "berjalan")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    [state.activities],
  );

  return (
    <>
      <PageHeader
        eyebrow="Meja kerja"
        title="Satu layar, semua urusan"
        description="Anggota, lahan, kas, program, dan agenda di satu tempat — dan semuanya bisa langsung diubah dari sini. Yang Anda catat di sini terlihat oleh pengurus lain di perangkat lain."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={shared ? "success" : ready ? "warning" : "neutral"}>
              {shared ? "Data tersiar ke semua perangkat" : ready ? "Mode lokal — belum tersiar" : "Menyambung data bersama…"}
            </Badge>
            <Link href="/app" className="sb-btn sb-btn-outline">Semua aplikasi</Link>
            {/* Selama pengujian, meja kerja penuh data uji. Tombol ini
                mengembalikan dokumen bersama — untuk semua pengurus. */}
            <ResetDemo variant="ghost" label="Bersihkan data uji" />
          </div>
        }
      />

      {!shared && ready ? (
        <div className="mb-4">
          <Notice tone="warning" title="Perubahan belum dibagi ke perangkat lain">
            {sharedNote ?? "Data bersama belum tersambung."} Selama belum tersambung ke basis data, pekerjaan hanya
            tersimpan di peramban ini dan tidak terlihat oleh pengurus lain.
            Hubungi pengelola sistem untuk mengisi <code className="font-mono text-[11.5px]">V9_DATABASE_URL</code>.
          </Notice>
        </div>
      ) : null}

      {/* ── pita angka: satu baris fakta, bukan kartu hiasan ── */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Anggota aktif", value: aktif.length, note: `${menunggu.length} menunggu verifikasi`, href: "/app/sekretariat/anggota" },
          { label: "Lahan digarap", value: `${totalHa.toFixed(1)} ha`, note: `${lahanProduktif.length} petak produktif`, href: "/app/sekretariat/lahan" },
          { label: "Saldo kas & bank", value: ringkas(kasSaldo), note: "Buku besar hari ini", href: "/app/keuangan/kas-bank" },
          { label: "Program berjalan", value: state.programs.filter((p) => p.status !== "selesai").length, note: `${state.programs.length} program tercatat`, href: "/app/pengurus/indikator" },
          { label: "Agenda terdekat", value: agenda[0] ? relativeID(agenda[0].date) : "—", note: agenda[0]?.name ?? "Belum ada agenda", href: "/app/sekretariat/agenda" },
        ].map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-sb-md border border-line bg-surface px-3 py-2.5 transition hover:border-primary-200 hover:bg-primary-50/40"
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-semibold leading-tight tabular-nums text-ink">{k.value}</div>
            <div className="truncate text-[11px] text-muted">{k.note}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {/* ── ANGGOTA ── */}
        <Panel
          title="Anggota"
          href="/app/sekretariat/anggota"
          action={<Btn variant="outline" onClick={() => setOpen("anggota")}>Tambah</Btn>}
        >
          {menunggu.length ? (
            <div className="mb-2 rounded-sb-sm border px-2.5 py-2 text-[11.5px]" style={{ borderColor: "var(--sb-warning)", background: "var(--sb-warning-bg)", color: "var(--sb-warning)" }}>
              {menunggu.length} pendaftar menunggu keputusan sekretariat.
            </div>
          ) : null}
          {state.members.length ? (
            state.members.slice(0, 6).map((m) => (
              <Row
                key={m.id}
                label={m.name}
                note={`${m.role}${m.field ? ` · ${FIELDS.find((f) => f.slug === m.field)?.shortName ?? m.field}` : ""} · ${m.village}`}
                value={
                  <Badge tone={m.status === "aktif" ? "success" : m.status === "menunggu" ? "warning" : "neutral"}>
                    {m.status}
                  </Badge>
                }
              />
            ))
          ) : (
            <Empty>Belum ada anggota. Mulai dengan menambah satu.</Empty>
          )}
          {state.members.length > 6 ? (
            <div className="pt-2 text-[11px] text-muted">+{state.members.length - 6} anggota lain di buku induk</div>
          ) : null}
        </Panel>

        {/* ── LAHAN ── */}
        <Panel
          title="Lahan"
          href="/app/sekretariat/lahan"
          action={<Btn variant="outline" onClick={() => setOpen("lahan")}>Catat petak</Btn>}
        >
          {state.lands.length ? (
            state.lands.slice(0, 6).map((l) => (
              <Row
                key={l.id}
                label={l.commodity}
                note={`${l.owner} · ${l.village} · ${l.status}`}
                value={`${Number(l.areaHa).toFixed(1)} ha`}
              />
            ))
          ) : (
            <Empty>Belum ada petak tercatat.</Empty>
          )}
          {state.lands.length > 6 ? (
            <div className="pt-2 text-[11px] text-muted">+{state.lands.length - 6} petak lain</div>
          ) : null}
        </Panel>

        {/* ── KAS ── */}
        <Panel
          title="Kas & bank"
          href="/app/keuangan/kas-bank"
          action={<Btn variant="outline" onClick={() => setOpen("kas")}>Catat transaksi</Btn>}
        >
          <div className="mb-2 rounded-sb-sm bg-paper px-2.5 py-2">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">Saldo buku besar</div>
            <div className="text-[17px] font-semibold tabular-nums text-ink">{formatIDR(kasSaldo)}</div>
          </div>
          {state.drafts.length ? (
            state.drafts.slice(0, 3).map((d) => (
              <Row
                key={d.id}
                label={d.description || "(tanpa keterangan)"}
                note={`${formatDateID(d.date, "short")} · draf belum dijurnal`}
                value={ringkas(d.lines.reduce((s, x) => s + (x.debit || 0), 0))}
              />
            ))
          ) : (
            <Empty>Belum ada draf jurnal yang menunggu.</Empty>
          )}
          <div className="pt-2 text-[11px] text-muted">
            Draf perlu dijurnal di <Link href="/app/keuangan/jurnal" className="font-semibold text-primary-700">buku jurnal</Link> sebelum masuk laporan.
          </div>
        </Panel>

        {/* ── PROGRAM ── */}
        <Panel title="Program" href="/app/pengurus/indikator">
          {state.programs.length ? (
            state.programs.slice(0, 5).map((p) => (
              <Row
                key={p.code}
                label={p.name}
                note={`${p.period} · ${FIELDS.find((f) => f.slug === p.bidang)?.shortName ?? p.bidang}`}
                value={<Badge tone={p.status === "berjalan" ? "info" : p.status === "selesai" ? "success" : "neutral"}>{p.status}</Badge>}
              />
            ))
          ) : (
            <Empty>Belum ada program.</Empty>
          )}
        </Panel>

        {/* ── AGENDA ── */}
        <Panel
          title="Agenda"
          href="/app/sekretariat/agenda"
          action={<Link href="/app/sekretariat/agenda?baru=1" className="sb-btn sb-btn-outline">Catat</Link>}
          className="md:col-span-2 xl:col-span-1"
        >
          {agenda.length ? (
            agenda.map((a) => (
              <Row
                key={a.id}
                label={a.name}
                note={`${formatDateID(a.date, "long")} · ${a.time} · ${a.location}`}
                value={<span className="text-[11px] font-medium text-muted">{relativeID(a.date)}</span>}
              />
            ))
          ) : (
            <Empty>Tidak ada agenda mendatang.</Empty>
          )}
        </Panel>

        {/* ── TUGAS: satu-satunya panel yang menuntut tindakan ── */}
        <Panel title="Perlu tindakan" href="/app/pengurus/persetujuan">
          <Row label="Persetujuan menunggu" value={state.approvals.filter((a) => a.status === "menunggu").length} note="Termasuk anggaran bidang" />
          <Row label="Tugas terbuka" value={tugasTerbuka.length} note={`${state.tasks.filter((t) => t.status === "terlambat").length} terlambat`} />
          <Row label="Draf jurnal" value={state.drafts.length} note="Belum masuk laporan" />
          <Row label="Pendaftar anggota" value={menunggu.length} note="Perlu verifikasi" />
          <div className="pt-2">
            <Link href="/app/pengurus/persetujuan" className="sb-btn sb-btn-primary w-full justify-center">
              Buka kotak persetujuan
            </Link>
          </div>
        </Panel>
      </div>

      {/* ───────────────────────── dialog tambah ───────────────────────── */}
      {open === "anggota" ? <AddMember actor={actor} onClose={() => setOpen(null)} /> : null}
      {open === "lahan" ? <AddLand actor={actor} onClose={() => setOpen(null)} /> : null}
      {open === "kas" ? <AddCash actor={actor} onClose={() => setOpen(null)} /> : null}
      {open === "agenda" ? <AddAgenda actor={actor} onClose={() => setOpen(null)} /> : null}

      {!ready ? null : null}
    </>
  );
}

/* ─────────────────────── dialog: anggota baru ─────────────────────── */

function AddMember({ actor, onClose }: { actor: Actor; onClose: () => void }) {
  const { exec } = useStore();
  const [f, setF] = useState({ name: "", role: "Anggota", village: "Ngadimulyo", phone: "", field: "" });
  const [err, setErr] = useState<string | null>(null);

  function simpan() {
    const r = exec({
      type: "member.create",
      member: { name: f.name, role: f.role, scope: "anggota", village: f.village, phone: f.phone, field: f.field || undefined, status: "menunggu" },
      actor,
    });
    if (r.ok) onClose();
    else setErr(r.message);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Anggota baru"
      description="Masuk sebagai pendaftar; sekretariat memverifikasi sebelum berstatus aktif."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan anggota</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nama lengkap" required error={err ?? undefined}>
          {(id) => <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Sumiyati" />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Desa">{(id) => (
            <Select id={id} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
              <option>Ngadimulyo</option><option>Kedu</option><option>Krajan</option>
            </Select>
          )}</Field>
          <Field label="Bidang">{(id) => (
            <Select id={id} value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })}>
              <option value="">— belum ditentukan —</option>
              {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
            </Select>
          )}</Field>
          <Field label="Peran">{(id) => (
            <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option>Anggota</option><option>Pengurus bidang</option><option>Pengurus harian</option>
            </Select>
          )}</Field>
          <Field label="Telepon">{(id) => (
            <TextInput id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="08…" inputMode="tel" />
          )}</Field>
        </div>
      </div>
    </Modal>
  );
}

/* ──────────────────────── dialog: petak lahan ─────────────────────── */

function AddLand({ actor, onClose }: { actor: Actor; onClose: () => void }) {
  const { exec } = useStore();
  const [f, setF] = useState({ owner: "", commodity: "", areaHa: "", village: "Ngadimulyo", status: "persiapan" as LandPlot["status"], notes: "" });
  const [err, setErr] = useState<string | null>(null);

  function simpan() {
    const ha = angka(f.areaHa);
    if (!Number.isFinite(ha) || ha <= 0) return setErr("Luas harus lebih dari nol hektar (mis. 0,4).");
    const r = exec({
      type: "land.create",
      row: { owner: f.owner, commodity: f.commodity, areaHa: ha, village: f.village, status: f.status, plantedAt: "", lastVisit: "", notes: f.notes },
      actor,
    });
    if (r.ok) onClose();
    else setErr(r.message);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat petak lahan"
      description="Petak langsung muncul di peta lahan dan hitungan hektar organisasi."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan petak</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pemilik / penggarap" required>{(id) => (
            <TextInput id={id} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Nama anggota" />
          )}</Field>
          <Field label="Komoditas" required>{(id) => (
            <TextInput id={id} value={f.commodity} onChange={(e) => setF({ ...f, commodity: e.target.value })} placeholder="mis. Kopi arabika" />
          )}</Field>
          <Field label="Luas (hektar)" required error={err ?? undefined}>{(id) => (
            <TextInput id={id} value={f.areaHa} onChange={(e) => setF({ ...f, areaHa: e.target.value })} placeholder="0,25" inputMode="decimal" />
          )}</Field>
          <Field label="Desa">{(id) => (
            <Select id={id} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
              <option>Ngadimulyo</option><option>Kedu</option><option>Krajan</option>
            </Select>
          )}</Field>
          <Field label="Status petak">{(id) => (
            <Select id={id} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as LandPlot["status"] })}>
              <option value="produktif">Produktif</option>
              <option value="persiapan">Persiapan</option>
              <option value="istirahat">Istirahat / rehabilitasi</option>
            </Select>
          )}</Field>
        </div>
        <Field label="Catatan lapangan">{(id) => (
          <TextInput id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Kondisi, akses air, rencana tanam…" />
        )}</Field>
      </div>
    </Modal>
  );
}

/* ────────────────────── dialog: transaksi kas ─────────────────────── */

const BEBAN = [
  { value: "5-1000", label: "Harga pokok penjualan" },
  { value: "5-1100", label: "Saprodi & benih" },
  { value: "5-1200", label: "Pelatihan" },
  { value: "5-1300", label: "Transportasi & kunjungan" },
  { value: "5-1400", label: "Alat tulis & administrasi" },
  { value: "5-1500", label: "Listrik, air & internet" },
  { value: "5-1600", label: "Honor narasumber" },
];

function AddCash({ actor, onClose }: { actor: Actor; onClose: () => void }) {
  const { exec } = useStore();
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), description: "", amount: "", akun: "5-1300", dari: "1-1000" });
  const [err, setErr] = useState<string | null>(null);

  function simpan() {
    const n = Math.round(Number(f.amount.replace(/[^0-9]/g, "")));
    if (!n) return setErr("Jumlah harus lebih dari nol rupiah.");
    const r = exec({
      type: "journal.draft",
      draft: {
        date: f.date,
        description: f.description || "Pengeluaran operasional",
        lines: [
          { accountCode: f.akun, debit: n, credit: 0 },
          { accountCode: f.dari, debit: 0, credit: n },
        ],
      },
      actor,
    });
    if (r.ok) onClose();
    else setErr(r.message);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat transaksi"
      description="Tersimpan sebagai draf jurnal; bendahara menjurnal agar masuk laporan."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan draf</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal" required>{(id) => (
            <TextInput id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          )}</Field>
          <Field label="Jumlah (Rp)" required error={err ?? undefined}>{(id) => (
            <TextInput id={id} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="150000" inputMode="numeric" />
          )}</Field>
        </div>
        <Field label="Keterangan" required>{(id) => (
          <TextInput id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="mis. Bensin kunjungan petak Kedu" />
        )}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jenis beban">{(id) => (
            <Select id={id} value={f.akun} onChange={(e) => setF({ ...f, akun: e.target.value })}>
              {BEBAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          )}</Field>
          <Field label="Dibayar dari">{(id) => (
            <Select id={id} value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })}>
              <option value="1-1000">Kas tunai</option>
              <option value="1-1100">Bank BRI</option>
            </Select>
          )}</Field>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────── dialog: agenda baru ─────────────────────── */

function AddAgenda({ actor, onClose }: { actor: Actor; onClose: () => void }) {
  const { exec } = useStore();
  const [f, setF] = useState({ name: "", date: "", time: "09.00–11.00", location: "Balai pertemuan", bidang: "organisasi" });
  const [err, setErr] = useState<string | null>(null);

  function simpan() {
    const r = exec({
      type: "activity.create",
      activity: { name: f.name, date: f.date, time: f.time, location: f.location, bidang: f.bidang, programCode: "", participants: 0, status: "terjadwal", openToPublic: false, person: actor.name },
      actor,
    });
    if (r.ok) onClose();
    else setErr(r.message);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Catat agenda"
      description="Muncul di kalender organisasi dan agenda terdekat di semua layar."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan agenda</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nama kegiatan" required error={err ?? undefined}>{(id) => (
          <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Rapat evaluasi panen" />
        )}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tanggal" required>{(id) => (
            <TextInput id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          )}</Field>
          <Field label="Waktu">{(id) => (
            <TextInput id={id} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} placeholder="09.00–11.00" />
          )}</Field>
        </div>
        <Field label="Tempat">{(id) => (
          <TextInput id={id} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        )}</Field>
        <Field label="Bidang">{(id) => (
          <Select id={id} value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })}>
            {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
          </Select>
        )}</Field>
      </div>
    </Modal>
  );
}
