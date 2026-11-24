"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock, ShieldCheck, UserRound, Database } from "lucide-react";
import { MEMBER_INTEREST_OPTIONS } from "@/config/member-profile";
import { Badge, Card, CardHeader, Avatar, Notice } from "@/components/ui";
import { Btn, Field, TextInput } from "@/components/act";
import { formatDateID } from "@/lib/format";
import { updateMemberProfile } from "@/app/actions/member-profile";

export interface MemberProfileData {
  personId: string;
  legalName: string;
  preferredName: string;
  phone: string;
  village: string;
  memberNumber: string | null;
  membershipStatus: string | null;
  joinedOn: string | null;
  role: string;
  scope: string;
  interests: string[];
}

type EditableProfile = {
  preferredName: string;
  phone: string;
  village: string;
  interests: string[];
};

const MEMBERSHIP_STATUS: Record<string, string> = {
  active: "Aktif",
  pending: "Menunggu verifikasi",
  inactive: "Nonaktif",
  left: "Tidak lagi menjadi anggota",
  archived: "Arsip",
};

function sameInterests(a: string[], b: string[]): boolean {
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function ProfilClient({
  profile,
  loadError,
}: {
  profile: MemberProfileData | null;
  loadError: boolean;
}) {
  const router = useRouter();
  const initial: EditableProfile = {
    preferredName: profile?.preferredName || profile?.legalName || "",
    phone: profile?.phone ?? "",
    village: profile?.village ?? "",
    interests: profile?.interests ?? [],
  };
  const [saved, setSaved] = useState<EditableProfile>(initial);
  const [preferredName, setPreferredName] = useState(initial.preferredName);
  const [phone, setPhone] = useState(initial.phone);
  const [village, setVillage] = useState(initial.village);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const dirty = useMemo(
    () =>
      preferredName !== saved.preferredName ||
      phone !== saved.phone ||
      village !== saved.village ||
      !sameInterests(interests, saved.interests),
    [preferredName, phone, village, interests, saved],
  );

  function toggleInterest(key: string) {
    setMessage(null);
    setError(null);
    setInterests((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function save() {
    if (!profile || pending || !dirty) return;
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const result = await updateMemberProfile({ preferredName, phone, village, interests });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const next = { preferredName, phone, village, interests: [...interests] };
      setSaved(next);
      setMessage(result.message);
      router.refresh();
    } catch {
      setError("Profil belum dapat disimpan. Periksa koneksi lalu coba kembali.");
    } finally {
      setPending(false);
    }
  }

  function cancelChanges() {
    setPreferredName(saved.preferredName);
    setPhone(saved.phone);
    setVillage(saved.village);
    setInterests([...saved.interests]);
    setError(null);
    setMessage(null);
  }

  if (loadError) {
    return (
      <div className="pb-10">
        <header className="mb-5 border-b border-line pb-4">
          <div className="sb-label mb-1.5">Portal Anggota</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Profil saya</h1>
        </header>
        <Notice tone="danger" title="Profil belum dapat dimuat">
          Layanan data anggota sedang tidak tersedia. Data tidak akan diganti dengan profil contoh.
          Muat ulang halaman setelah koneksi pulih.
        </Notice>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pb-10">
        <header className="mb-5 border-b border-line pb-4">
          <div className="sb-label mb-1.5">Portal Anggota</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Profil saya</h1>
        </header>
        <Notice tone="warning" title="Data anggota belum terhubung">
          Akun Anda belum memiliki data orang yang terhubung di buku induk organisasi.
          Hubungi Sekretariat untuk pemeriksaan identitas akun.
        </Notice>
      </div>
    );
  }

  const membershipStatus = profile.membershipStatus
    ? MEMBERSHIP_STATUS[profile.membershipStatus] ?? profile.membershipStatus
    : "Belum tercatat";
  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Portal Anggota</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Profil saya</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Data tampilan dan kontak dapat Anda perbarui. Identitas legal serta status keanggotaan resmi tetap dikelola Sekretariat.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-medium text-muted">
          <Database size={12} /> Data organisasi
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader
            title="Data yang dapat Anda ubah"
            subtitle="Disimpan pada basis data organisasi"
            action={dirty ? <Badge tone="warning">Belum disimpan</Badge> : <Badge tone="success">Tersimpan</Badge>}
          />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3 rounded-sb-sm bg-paper p-3">
              <Avatar name={preferredName || profile.legalName} size={44} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">{preferredName || profile.legalName}</div>
                <div className="text-[11px] text-muted">{profile.role} · {profile.memberNumber ?? "Nomor anggota belum diterbitkan"}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama tampilan" required>
                {(id) => <TextInput id={id} value={preferredName} onChange={(e) => { setPreferredName(e.target.value); setMessage(null); setError(null); }} maxLength={80} />}
              </Field>
              <Field label="Desa">
                {(id) => <TextInput id={id} value={village} onChange={(e) => { setVillage(e.target.value); setMessage(null); setError(null); }} maxLength={120} />}
              </Field>
              <Field label="Nomor WhatsApp">
                {(id) => <TextInput id={id} value={phone} onChange={(e) => { setPhone(e.target.value); setMessage(null); setError(null); }} maxLength={20} />}
              </Field>
              <Field label="Status keanggotaan" hint="Dikelola Sekretariat">
                {(id) => <TextInput id={id} value={membershipStatus} readOnly disabled />}
              </Field>
            </div>

            <div>
              <div className="mb-1 text-[12px] font-semibold text-ink2">Minat &amp; keterampilan</div>
              <div className="flex flex-wrap gap-1.5">
                {MEMBER_INTEREST_OPTIONS.map((option) => {
                  const selected = interests.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleInterest(option.key)}
                      className={`min-h-[34px] rounded-full border px-3 text-[11.5px] font-semibold transition ${
                        selected ? "border-primary-600 bg-primary-600 text-white" : "border-line bg-white text-ink2 hover:border-primary-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted2">
                {interests.length} minat dipilih — dapat digunakan untuk pencocokan kegiatan dan pelatihan.
              </p>
            </div>

            {error ? <p className="rounded-sb-sm border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]" role="alert">{error}</p> : null}
            {message ? <p className="rounded-sb-sm border border-[var(--sb-success)] bg-[var(--sb-success-bg)] px-3 py-2 text-[12px] text-[var(--sb-success)]" role="status">{message}</p> : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Btn variant="primary" icon={<Save size={14} />} onClick={() => void save()} disabled={!dirty || pending} loading={pending}>
                Simpan profil
              </Btn>
              {dirty ? (
                <Btn variant="ghost" onClick={cancelChanges} disabled={pending}>
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
                ["Nama legal", profile.legalName],
                ["Nomor anggota", profile.memberNumber ?? "Belum diterbitkan"],
                ["Peran akun", profile.role],
                ["Lingkup akses", profile.scope],
                ["Status", membershipStatus],
                ["Tanggal bergabung", profile.joinedOn ? formatDateID(profile.joinedOn) : "Belum tercatat"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              Perubahan identitas legal, nomor anggota, jabatan, dan status memerlukan verifikasi serta keputusan organisasi.
            </div>
          </Card>

          {!profile.membershipStatus ? (
            <Notice tone="warning" title="Keanggotaan belum tercatat">
              Profil akun sudah terhubung, tetapi data keanggotaan formal belum ditemukan. Hubungi Sekretariat untuk pencocokan buku induk.
            </Notice>
          ) : null}

          <div className="rounded-sb-sm border border-[var(--sb-info)]/25 bg-[var(--sb-info-bg)] px-3.5 py-3 text-[12px] text-[var(--sb-info)]">
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} /> Pemisahan data</div>
            Anda dapat mengubah nama tampilan, kontak, desa, dan preferensi minat. Data legal dan keputusan keanggotaan hanya berubah melalui peran yang berwenang.
          </div>

          <div className="flex items-center gap-2 rounded-sb-sm border border-line bg-paper px-3.5 py-2.5 text-[11.5px] text-muted">
            <UserRound size={14} /> Masuk sebagai {profile.role} · {profile.scope}
          </div>
        </div>
      </div>
    </div>
  );
}
