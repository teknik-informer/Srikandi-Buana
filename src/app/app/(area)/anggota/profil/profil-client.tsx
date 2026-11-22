"use client";

import { useEffect, useState } from "react";
import { Save, Lock, ShieldCheck, UserRound } from "lucide-react";
import { MEMBERS } from "@/data/organization";
import { Badge, Card, CardHeader, Avatar } from "@/components/ui";
import { Btn, DemoStateChip, Field, TextInput } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatDateID } from "@/lib/format";

const SUGGESTED = ["Kopi", "Budidaya kopi", "Pascapanen", "Pemasaran", "Kemasan", "Pelatihan", "Akuntansi", "Kebun sayur", "Madu", "Administrasi"];

export function ProfilClient() {
  const { state, exec, actor } = useStore();
  const me = MEMBERS.find((m) => m.id === actor.key) ?? MEMBERS.find((m) => m.name === actor.name) ?? MEMBERS[0];

  type Saved = { name: string; village: string; phone: string; interests: string[] };
  const [saved, setSaved] = useState<Saved | null>(null);
  const [name, setName] = useState(me.name);
  const [village, setVillage] = useState(me.village);
  const [phone, setPhone] = useState(me.phone);
  const [interests, setInterests] = useState<string[]>(me.interests);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Stored overrides are applied after mount. Reading localStorage during render
   * would produce different markup on the server and trip hydration.
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb_profile_v1");
      if (!raw) return;
      const p = JSON.parse(raw) as Saved;
      setSaved(p);
      setName(p.name);
      setVillage(p.village);
      setPhone(p.phone);
      setInterests(p.interests);
    } catch {
      /* ignore corrupt payload */
    }
  }, [me.name]);

  function toggle(i: string) {
    setDirty(true);
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  }

  function save() {
    setErr(null);
    const r = exec({ type: "profile.update", name, village, phone, interests, actor });
    if (!r.ok) return setErr(r.message);
    const next: Saved = { name, village, phone, interests };
    try {
      localStorage.setItem("sb_profile_v1", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSaved(next);
    setDirty(false);
  }

  const myTasks = state.tasks.filter((t) => t.assignee.split(" ")[0] === me.name.split(" ")[0]);

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Portal Anggota</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Profil saya</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Tiga lapisan profil: data pribadi yang Anda kelola, data keanggotaan resmi yang tidak dapat diubah
            sendiri, dan preferensi.
          </p>
        </div>
        <DemoStateChip compact />
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader
            title="Data yang dapat Anda ubah"
            subtitle="Perubahan tersimpan dan tercatat di jejak audit"
            action={dirty ? <Badge tone="warning">Belum disimpan</Badge> : <Badge tone="success">Tersimpan</Badge>}
          />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3 rounded-sb-sm bg-paper p-3">
              <Avatar name={name} size={44} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">{name}</div>
                <div className="text-[11px] text-muted">{actor.role} · {me.id}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama tampilan" required error={err ?? undefined}>
                {(id) => <TextInput id={id} value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />}
              </Field>
              <Field label="Desa">
                {(id) => <TextInput id={id} value={village} onChange={(e) => { setVillage(e.target.value); setDirty(true); }} />}
              </Field>
              <Field label="Nomor WhatsApp">
                {(id) => <TextInput id={id} value={phone} onChange={(e) => { setPhone(e.target.value); setDirty(true); }} />}
              </Field>
              <Field label="Status keanggotaan" hint="Hanya dapat diubah Sekretariat">
                {(id) => <TextInput id={id} value={me.status} readOnly disabled aria-describedby={`${id}-hint`} />}
              </Field>
            </div>

            <div>
              <div className="mb-1 text-[12px] font-semibold text-ink2">Minat &amp; keterampilan</div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map((i) => {
                  const on = interests.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(i)}
                      className={`min-h-[34px] rounded-full border px-3 text-[11.5px] font-semibold transition ${
                        on ? "border-primary-600 bg-primary-600 text-white" : "border-line bg-white text-ink2 hover:border-primary-300"
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted2">{interests.length} minat dipilih — dipakai untuk mencocokkan pelatihan dan penugasan.</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Btn variant="primary" icon={<Save size={14} />} onClick={save} disabled={!dirty}>Simpan profil</Btn>
              {dirty ? (
                <Btn variant="ghost" onClick={() => { setName(saved?.name ?? me.name); setVillage(saved?.village ?? me.village); setPhone(saved?.phone ?? me.phone); setInterests(saved?.interests ?? me.interests); setDirty(false); }}>
                  Batalkan perubahan
                </Btn>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Data keanggotaan resmi" subtitle="Dikelola Sekretariat — baca saja" action={<Lock size={14} className="text-muted2" />} />
            <dl className="divide-y divide-line text-[12.5px]">
              {[
                ["Nomor anggota", me.id],
                ["Peran", me.role],
                ["Lingkup", me.scope],
                ["Desa", me.village],
                ["Bergabung", formatDateID(me.joined)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              Perubahan data resmi diajukan ke Sekretariat dan melewati verifikasi — bukan diedit langsung.
            </div>
          </Card>

          <Card>
            <CardHeader title="Penugasan saya" subtitle={`${myTasks.filter((t) => t.status !== "selesai").length} belum selesai`} />
            <ul className="divide-y divide-line">
              {myTasks.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-ink">{t.title}</div>
                    <div className="text-[10.5px] text-muted2">{formatDateID(t.due, "short")} · {t.bidang}</div>
                  </div>
                  <Badge tone={t.status === "selesai" ? "success" : t.status === "terlambat" ? "danger" : "info"}>{t.status}</Badge>
                </li>
              ))}
              {myTasks.length === 0 ? (
                <li className="px-4 py-5 text-center text-[12px] text-muted">Belum ada penugasan atas nama Anda.</li>
              ) : null}
            </ul>
          </Card>

          <div className="rounded-sb-sm border border-[var(--sb-info)]/25 bg-[var(--sb-info-bg)] px-3.5 py-3 text-[12px] text-[var(--sb-info)]">
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} /> Pemisahan data</div>
            Data pribadi boleh Anda ubah sendiri. Data keanggotaan resmi, keuangan, dan keputusan hanya berubah
            melalui peran yang berwenang — setiap perubahan tercatat.
          </div>

          <div className="flex items-center gap-2 rounded-sb-sm border border-line bg-paper px-3.5 py-2.5 text-[11.5px] text-muted">
            <UserRound size={14} /> Masuk sebagai {actor.name} · {actor.scope}
          </div>
        </div>
      </div>
    </div>
  );
}
