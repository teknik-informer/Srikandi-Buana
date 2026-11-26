"use client";

/**
 * BUAT — panel tulis, bukan katalog tautan.
 *
 * Sebelumnya tombol hijau "Buat" di header hanya membuka halaman berisi enam
 * tautan, dan empat dari enam tautan itu ujungnya bukan formulir (halaman
 * pengaturan/daftar). Akibatnya tombol itu tidak pernah menghasilkan apa pun:
 * tidak ada isian, tidak ada keluaran. Rute di halaman lama pun sebenarnya
 * tidak ada (`/app/bidang/pertanian/formulir` tidak pernah didaftarkan).
 *
 * Panel ini menaruh formulirnya langsung di depan orang yang menekan tombol.
 * Enam formulir, masing-masing memanggil satu aksi yang SUDAH diperiksa
 * reducer — tidak ada aksi baru yang dikarang di sini:
 *
 *   anggota      → member.create
 *   petak lahan  → land.create
 *   agenda       → activity.create
 *   surat        → letter.register
 *   program      → program.create
 *   tugas        → task.create
 *
 * Setelah tersimpan, panel menampilkan hasilnya: nomor/kode yang dibuat dan
 * tautan ke tempat data itu hidup (href dari ExecResult). Kalau perangkat
 * belum tersambung ke basis data bersama, panel mengatakannya apa adanya,
 * bukan pura-pura tersimpan.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarPlus, CheckCircle2, ClipboardList, Sprout,
  MailPlus, Target, UserPlus, X, type LucideIcon,
} from "lucide-react";
import { Btn, Field, Select, TextArea, TextInput } from "@/components/act";
import { Notice } from "@/components/ui";
import { FIELDS } from "@/config/fields";
import { useStore } from "@/lib/store";
import type { Activity, LandPlot, Letter, Member, Program, Task } from "@/data/types";

type Kind = "anggota" | "lahan" | "agenda" | "surat" | "program" | "tugas";

interface Kartu {
  kind: Kind;
  label: string;
  deskripsi: string;
  simpan: string;
  icon: LucideIcon;
}

const KARTU: Kartu[] = [
  { kind: "anggota", label: "Anggota", deskripsi: "Daftarkan warga ke buku induk keanggotaan.", simpan: "Simpan anggota", icon: UserPlus },
  { kind: "lahan", label: "Petak lahan", deskripsi: "Catat petak garapan: pemilik, komoditas, luas.", simpan: "Simpan petak", icon: Sprout },
  { kind: "agenda", label: "Agenda", deskripsi: "Jadwalkan kegiatan; muncul di kalender bidang.", simpan: "Simpan agenda", icon: CalendarPlus },
  { kind: "surat", label: "Surat", deskripsi: "Registrasi surat masuk atau keluar dengan nomor.", simpan: "Registrasi surat", icon: MailPlus },
  { kind: "program", label: "Program", deskripsi: "Program kerja beranggaran, dengan kode otomatis.", simpan: "Simpan program", icon: Target },
  { kind: "tugas", label: "Tugas", deskripsi: "Tugaskan pekerjaan dengan penanggung jawab & tenggat.", simpan: "Simpan tugas", icon: ClipboardList },
];

const HARI_INI = () => new Date().toISOString().slice(0, 10);

export function BuatCepatPanel({ awal }: { awal?: Kind }) {
  const { state, exec, shared, sharedNote } = useStore();
  const [aktif, setAktif] = useState<Kind | null>(awal ?? null);
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string; href?: string } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function buka(kind: Kind) {
    setAktif(kind);
    setHasil(null);
    setGalat(null);
  }

  function beres(pesan: string, href?: string) {
    setHasil({ ok: true, pesan, href });
    setAktif(null);
  }

  if (hasil?.ok) {
    return (
      <div className="mx-auto max-w-[560px]">
        <div className="sb-card p-6 text-center">
          <CheckCircle2 size={30} className="mx-auto text-[var(--sb-success)]" />
          <h2 className="mt-3 font-display text-[18px] font-semibold text-ink">Tersimpan</h2>
          <p className="mt-1 text-[12.5px] text-ink2">{hasil.pesan}</p>
          <p className="mt-2 text-[11px] text-muted">
            {shared
              ? "Tersimpan di basis data bersama — pengurus lain melihatnya setelah memuat ulang."
              : "Tersimpan di peramban ini saja. Basis data bersama belum tersambung, jadi pengurus lain belum melihatnya."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {hasil.href ? (
              <Link href={hasil.href} className="sb-btn sb-btn-primary">
                Lihat di daftar <ArrowRight size={14} />
              </Link>
            ) : null}
            <Btn variant="outline" onClick={() => { setHasil(null); setAktif(null); }}>Catat lagi</Btn>
            <Btn variant="ghost" onClick={() => setHasil(null)}>Tutup</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!shared ? (
        <div className="mb-4">
          <Notice tone="warning" title="Belum tersambung ke basis data bersama">
            {sharedNote ?? "V9_DATABASE_URL belum terbaca di lingkungan ini."} Yang Anda catat di sini
            tersimpan di peramban ini saja dan tidak terlihat oleh pengurus lain.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KARTU.map((k) => {
          const Icon = k.icon;
          const hidup = aktif === k.kind;
          return (
            <button
              key={k.kind}
              type="button"
              onClick={() => buka(k.kind)}
              aria-expanded={hidup}
              className={`sb-card group flex items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary-300 ${
                hidup ? "border-primary-400 ring-1 ring-primary-200" : ""
              }`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink group-hover:text-primary-800">{k.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{k.deskripsi}</span>
              </span>
            </button>
          );
        })}
      </div>

      {aktif ? (
        <div className="mt-4 sb-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-semibold text-ink">
              {KARTU.find((k) => k.kind === aktif)?.label}
            </h2>
            <button
              type="button"
              onClick={() => { setAktif(null); setGalat(null); }}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-ink"
            >
              <X size={13} /> Tutup
            </button>
          </div>
          {galat ? (
            <div className="mb-3">
              <Notice tone="danger" title="Belum bisa disimpan">{galat}</Notice>
            </div>
          ) : null}

          {aktif === "anggota" ? <FormAnggota onBeres={beres} onGalat={setGalat} busy={busy} setBusy={setBusy} exec={exec} /> : null}
          {aktif === "lahan" ? <FormLahan onBeres={beres} onGalat={setGalat} busy={busy} setBusy={setBusy} exec={exec} /> : null}
          {aktif === "agenda" ? <FormAgenda onBeres={beres} onGalat={setGalat} busy={busy} setBusy={setBusy} exec={exec} program={state.programs} /> : null}
          {aktif === "surat" ? <FormSurat onBeres={beres} onGalat={setGalat} busy={busy} setBusy={setBusy} exec={exec} /> : null}
          {aktif === "program" ? <FormProgram onBeres={beres} onGalat={setGalat} busy={busy} setBusy={setBusy} exec={exec} /> : null}
          {aktif === "tugas" ? <FormTugas onBeres={beres} onGalat={setGalat} busy={busy} setBusy={setBusy} exec={exec} anggota={state.members} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Jejak keluaran: apa yang barusan dicatat, oleh siapa, dan ke mana perginya.
 * Tanpa ini tombol "Buat" masih berhenti di isian; dengan ini orang bisa
 * memastikan catatannya benar-benar masuk dan menemukan letaknya.
 */
export function AktivitasTerakhir() {
  const { state } = useStore();
  const terbaru = state.audit.slice(0, 5);

  return (
    <div className="sb-card mt-4">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="text-[12.5px] font-semibold text-ink">Aktivitas terakhir</h2>
        <Link href="/app/notifikasi" className="text-[11px] font-semibold text-primary-700">Semua jejak →</Link>
      </div>
      <ol className="divide-y divide-line">
        {terbaru.map((e) => (
          <li key={e.id} className="flex items-start gap-2.5 px-4 py-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-ink">
                {e.href ? <Link href={e.href} className="hover:text-primary-800 hover:underline">{e.action}</Link> : e.action}
              </div>
              <div className="truncate text-[11px] text-muted">{e.detail}</div>
            </div>
            <span className="shrink-0 text-[10.5px] tabular-nums text-muted2">{e.at}</span>
          </li>
        ))}
        {!terbaru.length ? <li className="px-4 py-3 text-[12px] text-muted">Belum ada aktivitas.</li> : null}
      </ol>
    </div>
  );
}

/* ── bentuk bantu ─────────────────────────────────────────────────── */

interface FormProps {
  onBeres: (pesan: string, href?: string) => void;
  onGalat: (pesan: string | null) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  exec: ReturnType<typeof useStore>["exec"];
}

function Baris({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Kaki({ busy, label, onBatal }: { busy: boolean; label: string; onBatal: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <Btn variant="ghost" onClick={onBatal} type="button">Batal</Btn>
      <Btn variant="primary" type="submit" loading={busy}>{label}</Btn>
    </div>
  );
}

/* ── anggota ──────────────────────────────────────────────────────── */

function FormAnggota({ onBeres, onGalat, busy, setBusy, exec }: FormProps) {
  const [f, setF] = useState({ name: "", role: "Anggota", field: "", village: "Ngadimulyo", phone: "" });

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    onGalat(null);
    if (!f.name.trim()) return onGalat("Nama anggota wajib diisi.");
    setBusy(true);
    const member: Omit<Member, "id" | "joined" | "interests"> = {
      name: f.name, role: f.role, scope: f.field ? "bidang" : "organisasi",
      field: f.field || undefined, village: f.village, status: "menunggu", phone: f.phone,
    };
    const r = exec({ type: "member.create", member, actor: { name: "Sekretariat", role: "sekretariat" } });
    setBusy(false);
    if (!r.ok) return onGalat(r.message);
    onBeres(r.message || `Anggota ${f.name} didaftarkan.`, r.href ?? "/app/sekretariat/anggota");
  }

  return (
    <form onSubmit={kirim}>
      <Baris>
        <Field label="Nama lengkap" required>{(id) => (
          <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Sri Wulandari" autoFocus />
        )}</Field>
        <Field label="Peran">{(id) => (
          <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {["Anggota", "Koordinator bidang", "Sekretaris", "Bendahara", "Pengurus"].map((r) => <option key={r}>{r}</option>)}
          </Select>
        )}</Field>
        <Field label="Bidang">{(id) => (
          <Select id={id} value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })}>
            <option value="">— lintas bidang —</option>
            {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
          </Select>
        )}</Field>
        <Field label="Desa">{(id) => (
          <Select id={id} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
            {["Ngadimulyo", "Kedu", "Krajan"].map((v) => <option key={v}>{v}</option>)}
          </Select>
        )}</Field>
        <Field label="Telepon" hint="Opsional; dipakai sekretariat untuk konfirmasi.">{(id) => (
          <TextInput id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="08xx" />
        )}</Field>
      </Baris>
      <p className="mt-2 text-[11px] text-muted">Anggota baru masuk berstatus <b>menunggu</b>; verifikasi dilakukan di Sekretariat → Verifikasi.</p>
      <Kaki busy={busy} label="Simpan anggota" onBatal={() => onGalat(null)} />
    </form>
  );
}

/* ── lahan ────────────────────────────────────────────────────────── */

function FormLahan({ onBeres, onGalat, busy, setBusy, exec }: FormProps) {
  const [f, setF] = useState({
    owner: "", commodity: "", areaHa: "", village: "Ngadimulyo",
    status: "persiapan" as LandPlot["status"], notes: "",
  });

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    onGalat(null);
    const luas = Number(f.areaHa);
    if (!f.owner.trim()) return onGalat("Pemilik/penggarap wajib diisi.");
    if (!f.commodity.trim()) return onGalat("Komoditas wajib diisi.");
    if (!Number.isFinite(luas) || luas <= 0) return onGalat("Luas harus angka lebih dari 0 (hektar).");
    setBusy(true);
    const row: Omit<LandPlot, "id"> = {
      owner: f.owner, commodity: f.commodity, areaHa: luas, village: f.village,
      status: f.status, plantedAt: HARI_INI(), lastVisit: "", notes: f.notes,
    };
    const r = exec({ type: "land.create", row, actor: { name: "Sekretariat", role: "sekretariat" } });
    setBusy(false);
    if (!r.ok) return onGalat(r.message);
    onBeres(r.message, r.href ?? "/app/sekretariat/lahan");
  }

  return (
    <form onSubmit={kirim}>
      <Baris>
        <Field label="Pemilik / penggarap" required>{(id) => (
          <TextInput id={id} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="mis. Siti Aminah" autoFocus />
        )}</Field>
        <Field label="Komoditas" required>{(id) => (
          <TextInput id={id} value={f.commodity} onChange={(e) => setF({ ...f, commodity: e.target.value })} placeholder="mis. padi, cabai, jagung" />
        )}</Field>
        <Field label="Luas (ha)" required>{(id) => (
          <TextInput id={id} value={f.areaHa} onChange={(e) => setF({ ...f, areaHa: e.target.value })} inputMode="decimal" placeholder="0,25" />
        )}</Field>
        <Field label="Desa">{(id) => (
          <Select id={id} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
            {["Ngadimulyo", "Kedu", "Krajan"].map((v) => <option key={v}>{v}</option>)}
          </Select>
        )}</Field>
        <Field label="Status">{(id) => (
          <Select id={id} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as LandPlot["status"] })}>
            <option value="persiapan">Persiapan</option>
            <option value="produktif">Produktif</option>
            <option value="istirahat">Istirahat</option>
          </Select>
        )}</Field>
        <Field label="Catatan">{(id) => (
          <TextInput id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Opsional" />
        )}</Field>
      </Baris>
      <Kaki busy={busy} label="Simpan petak" onBatal={() => onGalat(null)} />
    </form>
  );
}

/* ── agenda ───────────────────────────────────────────────────────── */

function FormAgenda({ onBeres, onGalat, busy, setBusy, exec, program }: FormProps & { program: Program[] }) {
  const [f, setF] = useState({
    name: "", date: HARI_INI(), time: "09.00–11.00", location: "Balai pertemuan",
    bidang: FIELDS[0]?.slug ?? "organisasi", programCode: "",
  });

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    onGalat(null);
    if (!f.name.trim()) return onGalat("Nama kegiatan wajib diisi.");
    if (!f.date) return onGalat("Tanggal wajib diisi.");
    setBusy(true);
    const activity: Omit<Activity, "id"> = {
      name: f.name, programCode: f.programCode, bidang: f.bidang, date: f.date,
      time: f.time, location: f.location, participants: 0, status: "terjadwal",
      openToPublic: false, person: "Sekretariat",
    };
    const r = exec({ type: "activity.create", activity, actor: { name: "Sekretariat", role: "sekretariat" } });
    setBusy(false);
    if (!r.ok) return onGalat(r.message);
    onBeres(r.message, r.href ?? "/app/sekretariat/agenda");
  }

  return (
    <form onSubmit={kirim}>
      <Baris>
        <Field label="Nama kegiatan" required>{(id) => (
          <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Rapat koordinasi panen" autoFocus />
        )}</Field>
        <Field label="Tanggal" required>{(id) => (
          <TextInput id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        )}</Field>
        <Field label="Waktu">{(id) => (
          <TextInput id={id} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
        )}</Field>
        <Field label="Tempat">{(id) => (
          <TextInput id={id} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        )}</Field>
        <Field label="Bidang">{(id) => (
          <Select id={id} value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })}>
            {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
          </Select>
        )}</Field>
        <Field label="Program">{(id) => (
          <Select id={id} value={f.programCode} onChange={(e) => setF({ ...f, programCode: e.target.value })}>
            <option value="">— tidak terkait program —</option>
            {program.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </Select>
        )}</Field>
      </Baris>
      <Kaki busy={busy} label="Simpan agenda" onBatal={() => onGalat(null)} />
    </form>
  );
}

/* ── surat ────────────────────────────────────────────────────────── */

function FormSurat({ onBeres, onGalat, busy, setBusy, exec }: FormProps) {
  const [f, setF] = useState({ direction: "masuk" as Letter["direction"], subject: "", counterpart: "", number: "", assignee: "" });

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    onGalat(null);
    if (f.subject.trim().length < 4) return onGalat("Perihal minimal 4 karakter.");
    if (f.counterpart.trim().length < 3) return onGalat("Asal/tujuan surat wajib diisi.");
    setBusy(true);
    const r = exec({
      type: "letter.register", direction: f.direction, subject: f.subject,
      counterpart: f.counterpart, number: f.number, assignee: f.assignee || "Sekretariat",
      actor: { name: "Sekretariat", role: "sekretariat" },
    });
    setBusy(false);
    if (!r.ok) return onGalat(r.message);
    onBeres(r.message, r.href ?? "/app/sekretariat/surat");
  }

  return (
    <form onSubmit={kirim}>
      <Baris>
        <Field label="Arah">{(id) => (
          <Select id={id} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as Letter["direction"] })}>
            <option value="masuk">Surat masuk</option>
            <option value="keluar">Surat keluar</option>
          </Select>
        )}</Field>
        <Field label="Nomor surat" hint="Boleh dikosongkan — sistem memberi penanda sementara.">{(id) => (
          <TextInput id={id} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="mis. 013/SB/XI/2026" />
        )}</Field>
        <Field label="Perihal" required>{(id) => (
          <TextInput id={id} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="mis. Undangan rapat koordinasi" autoFocus />
        )}</Field>
        <Field label={f.direction === "masuk" ? "Asal surat" : "Tujuan surat"} required>{(id) => (
          <TextInput id={id} value={f.counterpart} onChange={(e) => setF({ ...f, counterpart: e.target.value })} placeholder="mis. Dinas Pertanian" />
        )}</Field>
        <Field label="Ditangani oleh">{(id) => (
          <TextInput id={id} value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} placeholder="Sekretariat" />
        )}</Field>
      </Baris>
      <Kaki busy={busy} label="Registrasi surat" onBatal={() => onGalat(null)} />
    </form>
  );
}

/* ── program ──────────────────────────────────────────────────────── */

function FormProgram({ onBeres, onGalat, busy, setBusy, exec }: FormProps) {
  const [f, setF] = useState({
    name: "", bidang: FIELDS[0]?.slug ?? "organisasi", objective: "",
    period: "Nov 2026 – Okt 2027", budget: "", status: "perencanaan" as Program["status"],
  });

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    onGalat(null);
    const anggaran = Number(f.budget);
    if (!f.name.trim()) return onGalat("Nama program wajib diisi.");
    if (!Number.isFinite(anggaran) || anggaran < 0) return onGalat("Anggaran harus angka ≥ 0.");
    setBusy(true);
    const program: Omit<Program, "code"> = {
      name: f.name, bidang: f.bidang, objective: f.objective, period: f.period,
      status: f.status, progress: 0, budget: anggaran, spent: 0, indicators: [], published: false,
    };
    const r = exec({ type: "program.create", program, actor: { name: "Pengurus", role: "pengurus" } });
    setBusy(false);
    if (!r.ok) return onGalat(r.message);
    onBeres(r.message, r.href ?? "/app/pengurus/program");
  }

  return (
    <form onSubmit={kirim}>
      <Baris>
        <Field label="Nama program" required>{(id) => (
          <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Penguatan kebun bibit desa" autoFocus />
        )}</Field>
        <Field label="Bidang">{(id) => (
          <Select id={id} value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })}>
            {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
          </Select>
        )}</Field>
        <Field label="Anggaran (Rp)" required>{(id) => (
          <TextInput id={id} value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} inputMode="numeric" placeholder="mis. 25000000" />
        )}</Field>
        <Field label="Periode">{(id) => (
          <TextInput id={id} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
        )}</Field>
        <Field label="Status">{(id) => (
          <Select id={id} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Program["status"] })}>
            <option value="perencanaan">Perencanaan</option>
            <option value="berjalan">Berjalan</option>
            <option value="ditangguhkan">Ditangguhkan</option>
          </Select>
        )}</Field>
      </Baris>
      <div className="mt-3">
        <Field label="Tujuan">{(id) => (
          <TextArea id={id} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} placeholder="Satu-dua kalimat hasil yang ingin dicapai." />
        )}</Field>
      </div>
      <p className="mt-2 text-[11px] text-muted">Kode program dibuat otomatis dari bidang (mis. PRG-PERTA-01).</p>
      <Kaki busy={busy} label="Simpan program" onBatal={() => onGalat(null)} />
    </form>
  );
}

/* ── tugas ────────────────────────────────────────────────────────── */

function FormTugas({ onBeres, onGalat, busy, setBusy, exec, anggota }: FormProps & { anggota: Member[] }) {
  const [f, setF] = useState({
    title: "", bidang: FIELDS[0]?.slug ?? "organisasi", assignee: "",
    due: HARI_INI(), priority: "sedang" as Task["priority"],
  });

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    onGalat(null);
    if (f.title.trim().length < 4) return onGalat("Judul tugas minimal 4 karakter.");
    if (!f.due) return onGalat("Tenggat wajib diisi.");
    setBusy(true);
    const r = exec({
      type: "task.create", title: f.title, bidang: f.bidang,
      assignee: f.assignee || "Pengurus", due: f.due, priority: f.priority,
      actor: { name: "Pengurus", role: "pengurus" },
    });
    setBusy(false);
    if (!r.ok) return onGalat(r.message);
    onBeres(r.message, r.href ?? "/app/pengurus/tugas");
  }

  const aktif = anggota.filter((m) => m.status === "aktif").slice(0, 60);

  return (
    <form onSubmit={kirim}>
      <Baris>
        <Field label="Judul tugas" required>{(id) => (
          <TextInput id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="mis. Susun laporan panen November" autoFocus />
        )}</Field>
        <Field label="Bidang">{(id) => (
          <Select id={id} value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })}>
            {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
          </Select>
        )}</Field>
        <Field label="Penanggung jawab">{(id) => (
          <Select id={id} value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })}>
            <option value="">— Pengurus —</option>
            {aktif.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </Select>
        )}</Field>
        <Field label="Tenggat" required>{(id) => (
          <TextInput id={id} type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
        )}</Field>
        <Field label="Prioritas">{(id) => (
          <Select id={id} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Task["priority"] })}>
            <option value="rendah">Rendah</option>
            <option value="sedang">Sedang</option>
            <option value="tinggi">Tinggi</option>
          </Select>
        )}</Field>
      </Baris>
      <Kaki busy={busy} label="Simpan tugas" onBatal={() => onGalat(null)} />
    </form>
  );
}
