"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  CalendarPlus, ClipboardList, MailPlus, Sprout, Target,
  UserPlus, X, type LucideIcon,
} from "lucide-react";
import { submitJoinInterest, type JoinState } from "@/app/actions/forms";
import { createAgriculturePlot } from "@/app/actions/agriculture";
import { createFieldActivity, createFieldProgram, createFieldTask } from "@/app/actions/field-operations";
import { registerSecretariatLetter } from "@/app/actions/secretariat-letters";

type Kind = "anggota" | "lahan" | "agenda" | "surat" | "program" | "tugas";

export interface QuickCreateOption {
  kind: Kind;
  label: string;
  description: string;
}

export interface QuickCreateField {
  slug: string;
  label: string;
  canActivity: boolean;
  canProgram: boolean;
  canTask: boolean;
}

interface Props {
  options: QuickCreateOption[];
  fields: QuickCreateField[];
  initialKind?: Kind;
}

const ICONS: Record<Kind, LucideIcon> = {
  anggota: UserPlus,
  lahan: Sprout,
  agenda: CalendarPlus,
  surat: MailPlus,
  program: Target,
  tugas: ClipboardList,
};

const INITIAL_JOIN: JoinState = { ok: false, message: "" };
const TODAY = (() => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); })();

function inputClass() {
  return "mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:opacity-60";
}
function textAreaClass() {
  return "mt-1.5 min-h-[88px] w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:opacity-60";
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-[11.5px] font-semibold text-ink2">
      <span>{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>
      <div>{children}</div>
    </label>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function Footer({ children = "Simpan", cancel }: { children?: React.ReactNode; cancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold text-muted transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-live="polite"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-700 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : children}
      </button>
    </div>
  );
}

export function BuatCepatPanel({ options, fields, initialKind }: Props) {
  const [active, setActive] = useState<Kind | null>(initialKind ?? null);
  const [joinState, joinAction, joinPending] = useActionState(submitJoinInterest, INITIAL_JOIN);
  const activeOption = options.find((option) => option.kind === active);

  const close = () => setActive(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const Icon = ICONS[option.kind];
          const selected = active === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => setActive(selected ? null : option.kind)}
              aria-expanded={selected}
              className={`group flex min-h-[94px] items-start gap-3 rounded-xl border p-4 text-left transition hover:border-primary-300 hover:bg-primary-50/30 ${selected ? "border-primary-400 bg-primary-50/50 ring-1 ring-primary-200" : "border-line bg-card"}`}
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink group-hover:text-primary-800">{option.label}</span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!options.length ? (
        <div className="rounded-xl border border-line bg-card p-5 text-center">
          <p className="text-[13px] font-semibold text-ink">Belum ada tindakan Buat yang tersedia</p>
          <p className="mt-1 text-[11.5px] text-muted">Tindakan akan muncul sesuai hak akses akun Anda.</p>
        </div>
      ) : null}

      {active && activeOption ? (
        <section className="rounded-xl border border-line bg-card p-4 sm:p-5" aria-label={`Formulir ${activeOption.label}`}>
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink">{activeOption.label}</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">{activeOption.description}</p>
            </div>
            <button type="button" onClick={close} aria-label="Tutup formulir" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-muted/50 hover:text-ink"><X size={16}/></button>
          </div>

          {active === "anggota" ? (
            <form action={joinAction}>
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-[11.5px] leading-relaxed text-blue-900">
                Formulir ini mencatat <strong>pengajuan minat bergabung</strong>, bukan membuat anggota aktif atau akun login. Verifikasi tetap dilakukan oleh Bidang Organisasi &amp; Keanggotaan dan Sekretariat.
              </div>
              {joinState.message ? (
                <div role="status" className={`mb-3 rounded-lg border px-3 py-2.5 text-[12px] ${joinState.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                  {joinState.message}
                  {joinState.ref ? <div className="mt-1 font-semibold">Nomor pengajuan: {joinState.ref}</div> : null}
                </div>
              ) : null}
              <Grid>
                <Field label="Nama lengkap" required><input name="nama" required minLength={3} maxLength={160} autoComplete="name" className={inputClass()} placeholder="Nama sesuai identitas"/></Field>
                <Field label="Nomor WhatsApp" required><input name="telepon" required inputMode="tel" autoComplete="tel" maxLength={20} className={inputClass()} placeholder="08xxxxxxxxxx"/></Field>
                <Field label="Alamat lengkap" required><input name="alamat" required minLength={5} maxLength={500} className={inputClass()} placeholder="Dusun, desa, kecamatan"/></Field>
                <Field label="Minat bidang" required>
                  <select name="kegiatan" required defaultValue="" className={inputClass()}>
                    <option value="" disabled>Pilih bidang</option>
                    <option value="organisasi">Organisasi &amp; Keanggotaan</option>
                    <option value="pertanian">Pertanian &amp; Produksi</option>
                    <option value="pelatihan">Pemberdayaan &amp; Pelatihan</option>
                    <option value="usaha">Usaha &amp; Kemitraan</option>
                  </select>
                </Field>
                <Field label="Pengalaman" required>
                  <select name="pengalaman" required defaultValue="" className={inputClass()}>
                    <option value="" disabled>Pilih pengalaman</option>
                    <option value="baru">Baru mulai</option>
                    <option value="1-3">1–3 tahun</option>
                    <option value="4-10">4–10 tahun</option>
                    <option value="10+">Lebih dari 10 tahun</option>
                  </select>
                </Field>
                <Field label="Catatan tambahan"><input name="catatan" maxLength={1000} className={inputClass()} placeholder="Opsional"/></Field>
              </Grid>
              <label className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
                <input name="setuju" type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-line text-primary-700"/>
                <span>Saya menyatakan data ini benar dan menyetujui pemrosesan data untuk proses pengajuan keanggotaan.</span>
              </label>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"/>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={joinPending} aria-live="polite" className="inline-flex h-9 items-center rounded-lg bg-primary-700 px-4 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{joinPending ? "Mengirim…" : "Kirim pengajuan"}</button>
              </div>
            </form>
          ) : null}

          {active === "lahan" ? (
            <form action={createAgriculturePlot}>
              <Grid>
                <Field label="Kode petak" required><input name="plot_code" required minLength={2} maxLength={60} className={inputClass()} placeholder="Mis. PRT-001"/></Field>
                <Field label="Nama pemilik/pengelola" required><input name="owner_label" required minLength={2} maxLength={160} className={inputClass()} placeholder="Nama pemilik lahan"/></Field>
                <Field label="Dusun"><input name="hamlet" maxLength={120} className={inputClass()} placeholder="Nama dusun"/></Field>
                <Field label="Desa" required><input name="village" required minLength={2} maxLength={120} defaultValue="Ngadimulyo" className={inputClass()}/></Field>
                <Field label="Komoditas" required><input name="commodity" required minLength={2} maxLength={120} className={inputClass()} placeholder="Kopi, cabai, sayuran…"/></Field>
                <Field label="Penggunaan lahan"><input name="land_use" maxLength={120} className={inputClass()} placeholder="Kebun, tegalan, pekarangan…"/></Field>
                <Field label="Luas (hektare)" required><input name="area_ha" required type="number" min="0.0001" max="100000" step="0.0001" className={inputClass()} placeholder="0,25"/></Field>
                <Field label="Catatan lokasi"><input name="location_note" maxLength={1000} className={inputClass()} placeholder="Patokan atau catatan lokasi"/></Field>
              </Grid>
              <Footer cancel={close}>Simpan petak</Footer>
            </form>
          ) : null}

          {active === "agenda" ? (
            <form action={createFieldActivity}>
              <Grid>
                <Field label="Bidang" required>
                  <select name="field_key" required defaultValue={fields.find((field) => field.canActivity)?.slug ?? ""} className={inputClass()}>
                    {fields.filter((field) => field.canActivity).map((field) => <option key={field.slug} value={field.slug}>{field.label}</option>)}
                  </select>
                </Field>
                <Field label="Nama kegiatan" required><input name="title" required minLength={3} maxLength={300} className={inputClass()} placeholder="Nama agenda/kegiatan"/></Field>
                <Field label="Tanggal" required><input name="activity_date" required type="date" defaultValue={TODAY} className={inputClass()}/></Field>
                <Field label="Penanggung jawab"><input name="responsible_label" maxLength={160} className={inputClass()} placeholder="Nama penanggung jawab"/></Field>
                <Field label="Waktu mulai"><input name="start_time" type="time" className={inputClass()}/></Field>
                <Field label="Waktu selesai"><input name="end_time" type="time" className={inputClass()}/></Field>
                <Field label="Lokasi"><input name="location" maxLength={300} className={inputClass()} placeholder="Lokasi kegiatan"/></Field>
                <Field label="Program terkait"><input name="program_id" className={inputClass()} placeholder="ID program (opsional)"/></Field>
              </Grid>
              <div className="mt-3">
                <Field label="Deskripsi"><textarea name="description" maxLength={5000} className={textAreaClass()} placeholder="Tujuan, catatan, atau kebutuhan kegiatan"/></Field>
              </div>
              <label className="mt-3 flex items-center gap-2 text-[11.5px] text-muted"><input name="open_to_public" type="checkbox" className="h-4 w-4 rounded border-line text-primary-700"/>Tampilkan pada agenda publik (sesuai kebijakan publikasi)</label>
              <Footer cancel={close}>Simpan agenda</Footer>
            </form>
          ) : null}

          {active === "surat" ? (
            <form action={registerSecretariatLetter}>
              <Grid>
                <Field label="Jenis surat" required>
                  <select name="direction" required defaultValue="masuk" className={inputClass()}><option value="masuk">Surat masuk</option><option value="keluar">Surat keluar</option></select>
                </Field>
                <Field label="Nomor surat resmi"><input name="number" maxLength={100} className={inputClass()} placeholder="Nomor dari pihak penerbit (opsional)"/></Field>
                <Field label="Perihal" required><input name="subject" required minLength={3} maxLength={300} className={inputClass()} placeholder="Perihal surat"/></Field>
                <Field label="Pengirim/penerima" required><input name="counterpart" required minLength={2} maxLength={200} className={inputClass()} placeholder="Instansi atau nama pihak"/></Field>
                <Field label="Penanggung jawab" required><input name="assignee" required minLength={2} maxLength={120} className={inputClass()} placeholder="Nama petugas Sekretariat"/></Field>
              </Grid>
              <p className="mt-3 text-[10.5px] leading-relaxed text-muted">Nomor registrasi internal dibuat oleh sistem. Nomor surat resmi tidak akan dibuat-buat.</p>
              <Footer cancel={close}>Registrasikan surat</Footer>
            </form>
          ) : null}

          {active === "program" ? (
            <form action={createFieldProgram}>
              <Grid>
                <Field label="Bidang" required>
                  <select name="field_key" required defaultValue={fields.find((field) => field.canProgram)?.slug ?? ""} className={inputClass()}>
                    {fields.filter((field) => field.canProgram).map((field) => <option key={field.slug} value={field.slug}>{field.label}</option>)}
                  </select>
                </Field>
                <Field label="Nama program" required><input name="title" required minLength={3} maxLength={300} className={inputClass()} placeholder="Nama program kerja"/></Field>
                <Field label="Mulai"><input name="period_start" type="date" className={inputClass()}/></Field>
                <Field label="Selesai"><input name="period_end" type="date" className={inputClass()}/></Field>
                <Field label="Usulan anggaran (Rp)"><input name="budget_request" type="number" min="0" step="1" className={inputClass()} placeholder="Opsional"/></Field>
              </Grid>
              <div className="mt-3"><Field label="Tujuan program"><textarea name="objective" maxLength={5000} className={textAreaClass()} placeholder="Tujuan, hasil yang diharapkan, dan sasaran"/></Field></div>
              <Footer cancel={close}>Simpan program</Footer>
            </form>
          ) : null}

          {active === "tugas" ? (
            <form action={createFieldTask}>
              <Grid>
                <Field label="Bidang" required>
                  <select name="field_key" required defaultValue={fields.find((field) => field.canTask)?.slug ?? ""} className={inputClass()}>
                    {fields.filter((field) => field.canTask).map((field) => <option key={field.slug} value={field.slug}>{field.label}</option>)}
                  </select>
                </Field>
                <Field label="Judul tugas" required><input name="title" required minLength={3} maxLength={300} className={inputClass()} placeholder="Judul pekerjaan"/></Field>
                <Field label="Penanggung jawab"><input name="assignee_label" maxLength={160} className={inputClass()} placeholder="Nama pelaksana"/></Field>
                <Field label="Tenggat"><input name="due_date" type="date" className={inputClass()}/></Field>
                <Field label="Prioritas" required><select name="priority" defaultValue="sedang" className={inputClass()}><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select></Field>
              </Grid>
              <div className="mt-3"><Field label="Deskripsi"><textarea name="description" maxLength={5000} className={textAreaClass()} placeholder="Uraian dan keluaran yang diharapkan"/></Field></div>
              <Footer cancel={close}>Simpan tugas</Footer>
            </form>
          ) : null}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-line px-4 py-5 text-center">
          <p className="text-[12px] font-medium text-muted">Pilih jenis pencatatan untuk membuka formulir.</p>
        </div>
      )}
    </div>
  );
}
