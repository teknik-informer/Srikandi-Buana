"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Save, Trash2, X, Plus, GraduationCap, BriefcaseBusiness, HeartHandshake, Award, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { roles, type Role } from "@/lib/permissions";
import { requestJSON } from "@/lib/request-json";
import { markFormDirty, markFormSaved } from "@/lib/unsaved-changes";
import { publishProfileIdentity, type ProfileIdentity } from "@/hooks/use-profile-identity";
import UserAvatar from "./user-avatar";
import IndonesianAddressFields from "./indonesian-address-fields";
import {
  emptyAccountCV, emptyPrivateProfile,
  type AccountCV, type EducationEntry, type ExperienceEntry,
  type LanguageEntry, type CertificationEntry, type PrivateProfileInput,
  type PrivateProfileSummary,
} from "@/lib/account-profile-data";
import { toast } from "sonner";

type ProfileUser = ProfileIdentity & { email: string; role: Role; position: string };
type SavedPayload = { user?: ProfileIdentity; cv?: AccountCV; privateSummary?: PrivateProfileSummary; error?: string };
type Props = {
  user: ProfileUser;
  memberName: string;
  initialCV: AccountCV;
  initialPrivateSummary: PrivateProfileSummary;
  onSaved: (payload: SavedPayload) => void;
};
const emptyEducation = (): EducationEntry => ({ institution: "", level: "", field: "", startYear: "", endYear: "", description: "" });
const emptyExperience = (): ExperienceEntry => ({ organization: "", title: "", location: "", startDate: "", endDate: "", current: false, description: "" });
const emptyLanguage = (): LanguageEntry => ({ language: "", proficiency: "" });
const emptyCertification = (): CertificationEntry => ({ name: "", issuer: "", year: "", description: "" });
const inputClass = "w-full";
const labelText = "text-sm font-medium";
const checkClass = "size-4 rounded border-input accent-primary";

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="space-y-1 border-b pb-3"><h3 className="text-base font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>;
}

function EntryActions({ onAdd, label }: { onAdd: () => void; label: string }) {
  return <Button type="button" variant="outline" size="sm" onClick={onAdd}><Plus className="size-4" />{label}</Button>;
}

export default function AccountProfileEditor({ user, memberName, initialCV, initialPrivateSummary, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [cv, setCV] = useState<AccountCV>(() => ({ ...emptyAccountCV, ...initialCV }));
  const [privateSummary, setPrivateSummary] = useState(initialPrivateSummary);
  const [privateInput, setPrivateInput] = useState<PrivateProfileInput>(() => ({
    ...emptyPrivateProfile,
    nikConsent: initialPrivateSummary.nikConsent,
    bankConsent: initialPrivateSummary.bankConsent,
    bankName: initialPrivateSummary.bankName,
    accountHolder: initialPrivateSummary.accountHolder,
  }));
  const [showSensitiveHelp, setShowSensitiveHelp] = useState(false);
  const [selected, setSelected] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false), request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null), photoForm = useRef<HTMLFormElement>(null), detailsForm = useRef<HTMLFormElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!selected) { setPreview(""); return; }
    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selected]);

  function committed(profile: ProfileIdentity) {
    onSaved({ user: profile });
    publishProfileIdentity(profile);
  }
  function choose(file?: File) {
    if (!file || pending.current) return;
    setError("");
    if (!/\.(jpe?g|png)$/i.test(file.name) || !file.size || file.size > 3 * 1024 * 1024) {
      setError("Pilih foto JPG/PNG berukuran maksimal 3 MB. Ekspor HEIC ke JPG terlebih dahulu.");
      return;
    }
    setSelected(file);
    markFormDirty(photoForm.current);
  }
  async function send(url: string, init: RequestInit, done: (payload: SavedPayload) => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const headers = new Headers(init.headers);
      headers.set("X-Profile-Account", user.accountId);
      const { response, data } = await requestJSON<SavedPayload>(url, {
        ...init, headers, signal: controller.signal,
      }, url.endsWith("/avatar") && init.method === "POST" ? 90000 : 40000);
      if (controller.signal.aborted) return;
      if (!response.ok || !data?.user || data.user.accountId !== user.accountId) {
        throw Error(data?.error || "Perubahan profil belum terkonfirmasi. Muat ulang sebelum mengirim ulang.");
      }
      committed(data.user);
      done(data);
      toast.success("Perubahan profil tersimpan.");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Profil belum diperbarui. Coba lagi.");
    } finally {
      pending.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void send("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "profile", displayName }),
    }, payload => {
      if (payload.user) setDisplayName(payload.user.displayName);
      markFormSaved(form);
    });
  }
  function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const body = new FormData();
    body.append("file", selected);
    void send("/api/account/avatar", { method: "POST", body }, () => clearPhotoDraft());
  }
  function clearPhotoDraft() {
    setSelected(null);
    if (input.current) input.current.value = "";
    if (photoForm.current) markFormSaved(photoForm.current);
  }
  function updateCV<K extends keyof AccountCV>(key: K, value: AccountCV[K]) {
    setCV(current => ({ ...current, [key]: value }));
  }
  function updatePersonal<K extends keyof AccountCV["personal"]>(key: K, value: AccountCV["personal"][K]) {
    setCV(current => ({ ...current, personal: { ...current.personal, [key]: value } }));
  }
  function updateContact<K extends keyof AccountCV["contact"]>(key: K, value: AccountCV["contact"][K]) {
    setCV(current => ({ ...current, contact: { ...current.contact, [key]: value } }));
  }
  function updateEducation(index: number, key: keyof EducationEntry, value: string) {
    setCV(current => ({ ...current, education: current.education.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function updateExperience(list: "experience" | "volunteer", index: number, key: keyof ExperienceEntry, value: string | boolean) {
    setCV(current => ({ ...current, [list]: current[list].map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function updateLanguage(index: number, key: keyof LanguageEntry, value: string) {
    setCV(current => ({ ...current, languages: current.languages.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function updateCertification(index: number, key: keyof CertificationEntry, value: string) {
    setCV(current => ({ ...current, certifications: current.certifications.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void send("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "details", cv, privateProfile: privateInput }),
    }, payload => {
      if (payload.cv) setCV(payload.cv);
      if (payload.privateSummary) {
        setPrivateSummary(payload.privateSummary);
        setPrivateInput(current => ({
          ...emptyPrivateProfile,
          nikConsent: payload.privateSummary?.nikConsent || false,
          bankConsent: payload.privateSummary?.bankConsent || false,
          bankName: payload.privateSummary?.bankName || "",
          accountHolder: payload.privateSummary?.accountHolder || "",
        }));
      }
      markFormSaved(form);
    });
  }

  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader>
        <CardTitle>Profil pribadi & CV</CardTitle>
        <CardDescription>Lengkapi identitas, alamat berjenjang, kontak, pengalaman, pendidikan, dan kemampuan. Data ini milik akun Anda sendiri.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-7">
        <div className="flex min-w-0 flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:p-5">
          <UserAvatar user={{ displayName: user.displayName, avatarUrl: preview || user.avatarUrl }} className="size-16 shrink-0 ring-4 ring-background sm:size-20" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="break-words text-xl font-semibold tracking-tight">{user.displayName}</p>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap gap-2"><Badge variant="secondary">{roles[user.role]}</Badge>{user.position && <Badge variant="outline">{user.position}</Badge>}</div>
            <p className="text-xs text-muted-foreground">Nama resmi keanggotaan: <strong>{memberName || user.displayName}</strong>. Koreksi nama resmi mengikuti verifikasi Sekretariat.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <form ref={photoForm} data-protect-unsaved onSubmit={savePhoto} className="flex flex-wrap gap-2" aria-label="Ubah foto profil">
              <Input ref={input} id="profile-photo" data-unsaved-ignore type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" onChange={event => choose(event.target.files?.[0])} aria-describedby="profile-photo-help" />
              <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Camera className="size-4" />Pilih foto</Button>
              {selected ? <><Button type="submit" disabled={busy}><Save className="size-4" />Simpan foto</Button><Button type="button" variant="ghost" disabled={busy} onClick={clearPhotoDraft}><X className="size-4" />Batal</Button></> : user.avatarUrl && <Button type="button" variant="ghost" disabled={busy} onClick={() => { void send("/api/account/avatar", { method: "DELETE" }, () => clearPhotoDraft()); }}><Trash2 className="size-4" />Hapus</Button>}
            </form>
            <p id="profile-photo-help" className="max-w-xs text-xs text-muted-foreground">JPG/PNG maksimal 3 MB. Foto dipotong persegi dan metadata lokasi dihapus.</p>
          </div>
        </div>

        <form data-protect-unsaved onSubmit={saveName} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" aria-label="Ubah nama tampilan">
          <Field>
            <FieldLabel htmlFor="profile-display-name">Nama tampilan akun</FieldLabel>
            <Input id="profile-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} required autoComplete="nickname" />
            <FieldDescription>Nama yang muncul pada menu akun, notifikasi, dan aktivitas.</FieldDescription>
          </Field>
          <Button type="submit" disabled={busy || !displayName.trim()}><Save className="size-4" />Simpan nama tampilan</Button>
        </form>

        {error && <Alert variant="destructive"><AlertTitle>Profil belum diperbarui</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <form ref={detailsForm} data-protect-unsaved onSubmit={saveDetails} className="space-y-8">
          <fieldset disabled={busy} className="min-w-0 space-y-8">
            <section className="space-y-4" aria-labelledby="profile-personal-title">
              <SectionHeading title="1. Data diri" description="Nama resmi mengikuti data keanggotaan terverifikasi. Lengkapi informasi pribadi yang ingin ditampilkan pada CV internal." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="profile-full-name">Nama lengkap resmi</FieldLabel>
                  <Input id="profile-full-name" value={memberName || user.displayName} readOnly aria-readonly="true" className="bg-muted/40" />
                  <FieldDescription>Untuk koreksi nama resmi atau ejaan KTP, ajukan kepada Sekretariat agar pemeriksaan data tetap tercatat.</FieldDescription>
                </Field>
                <Field><FieldLabel htmlFor="profile-preferred-name">Nama panggilan</FieldLabel><Input id="profile-preferred-name" value={cv.personal.preferredName} onChange={event => updatePersonal("preferredName", event.target.value)} maxLength={80} autoComplete="nickname" /></Field>
                <Field><FieldLabel htmlFor="profile-nationality">Kewarganegaraan</FieldLabel><Input id="profile-nationality" value={cv.personal.nationality} onChange={event => updatePersonal("nationality", event.target.value)} maxLength={80} /></Field>
                <Field><FieldLabel htmlFor="profile-birth-place">Tempat lahir</FieldLabel><Input id="profile-birth-place" value={cv.personal.birthPlace} onChange={event => updatePersonal("birthPlace", event.target.value)} maxLength={100} autoComplete="off" /></Field>
                <Field><FieldLabel htmlFor="profile-birth-date">Tanggal lahir</FieldLabel><Input id="profile-birth-date" type="date" value={cv.personal.birthDate} onChange={event => updatePersonal("birthDate", event.target.value)} autoComplete="bday" /></Field>
                <Field><FieldLabel htmlFor="profile-gender">Jenis kelamin (opsional)</FieldLabel><NativeSelect id="profile-gender" className="w-full" value={cv.personal.gender} onChange={event => updatePersonal("gender", event.target.value)}><NativeSelectOption value="">Tidak diisi</NativeSelectOption><NativeSelectOption value="Perempuan">Perempuan</NativeSelectOption><NativeSelectOption value="Laki-laki">Laki-laki</NativeSelectOption><NativeSelectOption value="Memilih tidak menyebutkan">Memilih tidak menyebutkan</NativeSelectOption></NativeSelect></Field>
              </div>
            </section>

            <section className="space-y-4" aria-labelledby="profile-contact-title">
              <SectionHeading title="2. Kontak" description="Nomor telepon utama tersinkron ke data kontak keanggotaan Anda. Email masuk tetap dikelola administrator." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="profile-phone">Nomor telepon utama</FieldLabel><Input id="profile-phone" type="tel" value={cv.contact.phone} onChange={event => updateContact("phone", event.target.value)} maxLength={30} autoComplete="tel" /></Field>
                <Field><FieldLabel htmlFor="profile-whatsapp">Nomor WhatsApp</FieldLabel><Input id="profile-whatsapp" type="tel" value={cv.contact.whatsapp} onChange={event => updateContact("whatsapp", event.target.value)} maxLength={30} autoComplete="tel" /></Field>
                <Field><FieldLabel htmlFor="profile-secondary-phone">Nomor alternatif</FieldLabel><Input id="profile-secondary-phone" type="tel" value={cv.contact.secondaryPhone} onChange={event => updateContact("secondaryPhone", event.target.value)} maxLength={30} /></Field>
                <Field><FieldLabel htmlFor="profile-secondary-email">Email alternatif</FieldLabel><Input id="profile-secondary-email" type="email" value={cv.contact.emailSecondary} onChange={event => updateContact("emailSecondary", event.target.value)} maxLength={180} autoComplete="email" /></Field>
                <Field><FieldLabel htmlFor="profile-website">Website / portofolio</FieldLabel><Input id="profile-website" type="url" value={cv.contact.website} onChange={event => updateContact("website", event.target.value)} maxLength={300} placeholder="https://…" /></Field>
                <Field><FieldLabel htmlFor="profile-linkedin">Profil LinkedIn</FieldLabel><Input id="profile-linkedin" type="url" value={cv.contact.linkedin} onChange={event => updateContact("linkedin", event.target.value)} maxLength={300} placeholder="https://www.linkedin.com/in/…" /></Field>
              </div>
            </section>

            <section className="space-y-4" aria-labelledby="profile-address-title">
              <SectionHeading title="3. Alamat domisili" description="Pilih provinsi, kabupaten/kota, kecamatan, lalu desa/kelurahan. Kode wilayah mengikuti hierarki administrasi Indonesia." />
              <IndonesianAddressFields value={cv.address} onChange={value => updateCV("address", value)} disabled={busy} />
            </section>

            <section className="space-y-4" aria-labelledby="profile-summary-title">
              <SectionHeading title="4. Ringkasan profil" description="Perkenalkan diri, minat kontribusi, dan fokus keahlian dalam beberapa kalimat." />
              <Field><FieldLabel htmlFor="profile-summary">Tentang saya</FieldLabel><Textarea id="profile-summary" value={cv.summary} onChange={event => updateCV("summary", event.target.value)} maxLength={1600} rows={5} placeholder="Tuliskan ringkasan pengalaman, tujuan, dan bidang kontribusi Anda…" /><FieldDescription>{cv.summary.length}/1600 karakter.</FieldDescription></Field>
            </section>

            <section className="space-y-4" aria-labelledby="profile-education-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title="5. Riwayat pendidikan" description="Catat pendidikan formal, kursus, atau pendidikan nonformal yang relevan." /><EntryActions label="Tambah pendidikan" onAdd={() => updateCV("education", [...cv.education, emptyEducation()])} /></div>
              {cv.education.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-muted-foreground" />Pendidikan {index + 1}</div><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => updateCV("education", cv.education.filter((_, i) => i !== index))}>Hapus</Button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field><FieldLabel htmlFor={"education-level-" + index}>Jenjang</FieldLabel><NativeSelect id={"education-level-" + index} className="w-full" value={item.level} onChange={event => updateEducation(index, "level", event.target.value)}><NativeSelectOption value="">Pilih jenjang</NativeSelectOption>{["SD","SMP","SMA / SMK","Diploma","Sarjana (S1)","Magister (S2)","Doktor (S3)","Pesantren","Kursus / nonformal","Lainnya"].map(value => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}</NativeSelect></Field>
                    <Field><FieldLabel htmlFor={"education-institution-" + index}>Sekolah / perguruan tinggi</FieldLabel><Input id={"education-institution-" + index} value={item.institution} onChange={event => updateEducation(index, "institution", event.target.value)} maxLength={140} /></Field>
                    <Field><FieldLabel htmlFor={"education-field-" + index}>Jurusan / bidang</FieldLabel><Input id={"education-field-" + index} value={item.field} onChange={event => updateEducation(index, "field", event.target.value)} maxLength={120} /></Field>
                    <div className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor={"education-start-" + index}>Tahun mulai</FieldLabel><Input id={"education-start-" + index} inputMode="numeric" value={item.startYear} onChange={event => updateEducation(index, "startYear", event.target.value)} maxLength={4} /></Field><Field><FieldLabel htmlFor={"education-end-" + index}>Tahun selesai</FieldLabel><Input id={"education-end-" + index} inputMode="numeric" value={item.endYear} onChange={event => updateEducation(index, "endYear", event.target.value)} maxLength={4} placeholder="Jika masih berjalan, kosongkan" /></Field></div>
                    <Field className="sm:col-span-2"><FieldLabel htmlFor={"education-description-" + index}>Keterangan / prestasi</FieldLabel><Textarea id={"education-description-" + index} value={item.description} onChange={event => updateEducation(index, "description", event.target.value)} rows={2} maxLength={700} /></Field>
                  </div>
                </div>
              ))}
              {!cv.education.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada pendidikan yang ditambahkan.</p>}
            </section>

            <section className="space-y-4" aria-labelledby="profile-experience-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title="6. Pengalaman kerja" description="Cantumkan pekerjaan, usaha, proyek, atau pengalaman profesional. Tidak wajib memiliki pengalaman formal." /><EntryActions label="Tambah pengalaman kerja" onAdd={() => updateCV("experience", [...cv.experience, emptyExperience()])} /></div>
              {cv.experience.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="size-4 text-muted-foreground" />Pengalaman {index + 1}</div><Button type="button" size="sm" variant="ghost" onClick={() => updateCV("experience", cv.experience.filter((_, i) => i !== index))}>Hapus</Button></div>
                  <ExperienceFields list="experience" item={item} index={index} update={updateExperience} />
                </div>
              ))}
              {!cv.experience.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada pengalaman kerja.</p>}
            </section>

            <section className="space-y-4" aria-labelledby="profile-volunteer-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title="7. Pengalaman organisasi & kerelawanan" description="Masukkan kepengurusan, kegiatan sosial, kelompok tani, komunitas, atau kegiatan sukarela." /><EntryActions label="Tambah pengalaman organisasi" onAdd={() => updateCV("volunteer", [...cv.volunteer, emptyExperience()])} /></div>
              {cv.volunteer.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="size-4 text-muted-foreground" />Organisasi {index + 1}</div><Button type="button" size="sm" variant="ghost" onClick={() => updateCV("volunteer", cv.volunteer.filter((_, i) => i !== index))}>Hapus</Button></div>
                  <ExperienceFields list="volunteer" item={item} index={index} update={updateExperience} />
                </div>
              ))}
              {!cv.volunteer.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada pengalaman organisasi atau relawan.</p>}
            </section>

            <section className="space-y-4" aria-labelledby="profile-skills-title">
              <SectionHeading title="8. Keahlian, hobi & minat" description="Pisahkan setiap item dengan koma. Contoh keahlian: administrasi, pengolahan hasil tani, desain, pemasaran, pengorganisasian." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="profile-skills">Keahlian / kompetensi</FieldLabel><Textarea id="profile-skills" rows={3} value={cv.skills.join(", ")} onChange={event => updateCV("skills", event.target.value.split(",").map(item => item.trim()).filter(Boolean))} placeholder="Administrasi, komunikasi, budidaya tanaman…" /></Field>
                <Field><FieldLabel htmlFor="profile-hobbies">Hobi / minat</FieldLabel><Textarea id="profile-hobbies" rows={3} value={cv.hobbies.join(", ")} onChange={event => updateCV("hobbies", event.target.value.split(",").map(item => item.trim()).filter(Boolean))} placeholder="Membaca, berkebun, memasak…" /></Field>
              </div>
            </section>

            <section className="space-y-4" aria-labelledby="profile-language-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title="9. Kemampuan bahasa" description="Catat bahasa dan tingkat kemampuan yang benar-benar Anda kuasai." /><EntryActions label="Tambah bahasa" onAdd={() => updateCV("languages", [...cv.languages, emptyLanguage()])} /></div>
              {cv.languages.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                  <Field><FieldLabel htmlFor={"language-name-" + index}>Bahasa</FieldLabel><Input id={"language-name-" + index} value={item.language} onChange={event => updateLanguage(index, "language", event.target.value)} maxLength={80} /></Field>
                  <Field><FieldLabel htmlFor={"language-level-" + index}>Tingkat</FieldLabel><NativeSelect id={"language-level-" + index} className="w-full" value={item.proficiency} onChange={event => updateLanguage(index, "proficiency", event.target.value)}><NativeSelectOption value="">Pilih tingkat</NativeSelectOption>{["Dasar","Menengah","Mahir","Penutur asli"].map(level => <NativeSelectOption key={level} value={level}>{level}</NativeSelectOption>)}</NativeSelect></Field>
                  <Button type="button" variant="ghost" size="sm" onClick={() => updateCV("languages", cv.languages.filter((_, i) => i !== index))}>Hapus</Button>
                </div>
              ))}
              {!cv.languages.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada bahasa yang dicatat.</p>}
            </section>

            <section className="space-y-4" aria-labelledby="profile-cert-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title="10. Sertifikat & pelatihan" description="Masukkan pelatihan, pendidikan teknis, sertifikat kompetensi, atau kegiatan peningkatan kapasitas." /><EntryActions label="Tambah sertifikat" onAdd={() => updateCV("certifications", [...cv.certifications, emptyCertification()])} /></div>
              {cv.certifications.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><Award className="size-4 text-muted-foreground" />Pelatihan / sertifikat {index + 1}</div><Button type="button" variant="ghost" size="sm" onClick={() => updateCV("certifications", cv.certifications.filter((_, i) => i !== index))}>Hapus</Button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field><FieldLabel htmlFor={"cert-name-" + index}>Nama kegiatan / sertifikat</FieldLabel><Input id={"cert-name-" + index} value={item.name} onChange={event => updateCertification(index, "name", event.target.value)} maxLength={140} /></Field>
                    <Field><FieldLabel htmlFor={"cert-issuer-" + index}>Penyelenggara</FieldLabel><Input id={"cert-issuer-" + index} value={item.issuer} onChange={event => updateCertification(index, "issuer", event.target.value)} maxLength={140} /></Field>
                    <Field><FieldLabel htmlFor={"cert-year-" + index}>Tahun</FieldLabel><Input id={"cert-year-" + index} inputMode="numeric" value={item.year} onChange={event => updateCertification(index, "year", event.target.value)} maxLength={4} /></Field>
                    <Field><FieldLabel htmlFor={"cert-desc-" + index}>Keterangan</FieldLabel><Input id={"cert-desc-" + index} value={item.description} onChange={event => updateCertification(index, "description", event.target.value)} maxLength={700} /></Field>
                  </div>
                </div>
              ))}
              {!cv.certifications.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada sertifikat atau pelatihan.</p>}
            </section>

            <section className="space-y-4" aria-labelledby="profile-private-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title="11. Identitas & rekening pribadi (opsional)" description="NIK dan nomor rekening disimpan terenkripsi. Tidak muncul pada daftar akun, data anggota, laporan umum, atau ringkasan dashboard." /><Button type="button" variant="ghost" size="sm" onClick={() => setShowSensitiveHelp(value => !value)}>{showSensitiveHelp ? <EyeOff className="size-4" /> : <Eye className="size-4" />}Keterangan privasi</Button></div>
              {showSensitiveHelp && <Alert><AlertTitle>Penggunaan terbatas</AlertTitle><AlertDescription>NIK hanya untuk verifikasi identitas internal bila diperlukan. Rekening hanya untuk administrasi pembayaran internal bila diperlukan. Keduanya hanya dapat dibaca kembali oleh pemilik akun melalui tampilan tersamarkan. Jangan mengisi bila tidak ada kebutuhan atau persetujuan Anda.</AlertDescription></Alert>}
              <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="profile-nik">NIK (16 digit)</FieldLabel>
                  <Input id="profile-nik" value={privateInput.nik} onChange={event => setPrivateInput(current => ({ ...current, nik: event.target.value.replace(/\D/g, "").slice(0,16) }))} inputMode="numeric" autoComplete="off" placeholder={privateSummary.hasNik ? "Sudah tersimpan: " + privateSummary.nikMasked + " · isi untuk mengganti" : "Masukkan 16 digit hanya bila diperlukan"} maxLength={16} />
                  <FieldDescription>{privateSummary.hasNik ? "Tersimpan secara terenkripsi: " + privateSummary.nikMasked + ". Kosongkan untuk mempertahankan nilai yang tersimpan." : "Tidak wajib. Tidak digunakan sebagai nomor anggota atau ditampilkan di profil publik."}</FieldDescription>
                </Field>
                <Field className="sm:col-span-2">
                  <label className="flex items-start gap-2 text-sm"><input className={checkClass} type="checkbox" checked={privateInput.nikConsent} onChange={event => setPrivateInput(current => ({ ...current, nikConsent: event.target.checked }))} /><span>Saya setuju menyimpan NIK untuk verifikasi identitas internal bila diperlukan.</span></label>
                  <FieldDescription>Hapus centang untuk menghapus NIK yang tersimpan.</FieldDescription>
                </Field>
                <div className="sm:col-span-2 border-t pt-4"><p className="font-medium">Informasi rekening bank</p><p className="mt-1 text-sm text-muted-foreground">Boleh dikosongkan bila tidak diperlukan untuk administrasi pembayaran.</p></div>
                <Field><FieldLabel htmlFor="profile-bank-name">Nama bank</FieldLabel><Input id="profile-bank-name" value={privateInput.bankName} onChange={event => setPrivateInput(current => ({ ...current, bankName: event.target.value }))} maxLength={100} placeholder="Contoh: BRI, BNI, BCA…" autoComplete="off" /></Field>
                <Field><FieldLabel htmlFor="profile-bank-holder">Nama pemilik rekening</FieldLabel><Input id="profile-bank-holder" value={privateInput.accountHolder} onChange={event => setPrivateInput(current => ({ ...current, accountHolder: event.target.value }))} maxLength={100} autoComplete="off" /></Field>
                <Field className="sm:col-span-2"><FieldLabel htmlFor="profile-bank-number">Nomor rekening</FieldLabel><Input id="profile-bank-number" value={privateInput.accountNumber} onChange={event => setPrivateInput(current => ({ ...current, accountNumber: event.target.value.replace(/\D/g, "").slice(0,24) }))} inputMode="numeric" autoComplete="off" maxLength={24} placeholder={privateSummary.hasBankAccount ? "Sudah tersimpan: " + privateSummary.accountNumberMasked + " · isi untuk mengganti" : "Masukkan nomor rekening"} /><FieldDescription>{privateSummary.hasBankAccount ? "Tersimpan secara terenkripsi di " + privateSummary.bankName + " · " + privateSummary.accountNumberMasked + ". Kosongkan untuk mempertahankan." : "6–24 digit. Nomor lengkap tidak pernah dikembalikan oleh API."}</FieldDescription></Field>
                <Field className="sm:col-span-2"><label className="flex items-start gap-2 text-sm"><input className={checkClass} type="checkbox" checked={privateInput.bankConsent} onChange={event => setPrivateInput(current => ({ ...current, bankConsent: event.target.checked }))} /><span>Saya setuju menyimpan informasi rekening untuk administrasi pembayaran internal bila diperlukan.</span></label><FieldDescription>Hapus centang untuk menghapus data rekening yang tersimpan.</FieldDescription></Field>
              </div>
            </section>
          </fieldset>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">Simpan perubahan. Data NIK/rekening hanya disimpan bila persetujuan masing-masing dicentang. Data ini bukan untuk ditampilkan pada profil publik.</p>
            <Button type="submit" disabled={busy} className="shrink-0"><Save className="size-4" />{busy ? "Menyimpan profil…" : "Simpan profil lengkap"}</Button>
          </div>
        </form>
        {busy && <p role="status" className="text-sm text-muted-foreground">Perubahan sedang diproses. Jangan tutup halaman sampai penyimpanan selesai.</p>}
      </CardContent>
    </Card>
  );
}

function ExperienceFields({
  list, item, index, update,
}: {
  list: "experience" | "volunteer";
  item: ExperienceEntry;
  index: number;
  update: (list: "experience" | "volunteer", index: number, key: keyof ExperienceEntry, value: string | boolean) => void;
}) {
  const prefix = list + "-" + index;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field><FieldLabel htmlFor={prefix + "-org"}>{list === "experience" ? "Perusahaan / instansi" : "Nama organisasi / komunitas"}</FieldLabel><Input id={prefix + "-org"} value={item.organization} onChange={event => update(list, index, "organization", event.target.value)} maxLength={140} /></Field>
      <Field><FieldLabel htmlFor={prefix + "-title"}>{list === "experience" ? "Jabatan / posisi" : "Jabatan / peran"}</FieldLabel><Input id={prefix + "-title"} value={item.title} onChange={event => update(list, index, "title", event.target.value)} maxLength={120} /></Field>
      <Field><FieldLabel htmlFor={prefix + "-location"}>Lokasi</FieldLabel><Input id={prefix + "-location"} value={item.location} onChange={event => update(list, index, "location", event.target.value)} maxLength={120} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field><FieldLabel htmlFor={prefix + "-start"}>Mulai</FieldLabel><Input id={prefix + "-start"} type="date" value={item.startDate} onChange={event => update(list, index, "startDate", event.target.value)} /></Field>
        <Field><FieldLabel htmlFor={prefix + "-end"}>Selesai</FieldLabel><Input id={prefix + "-end"} type="date" value={item.endDate} onChange={event => update(list, index, "endDate", event.target.value)} disabled={item.current} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className={checkClass} checked={item.current} onChange={event => update(list, index, "current", event.target.checked)} />Masih aktif / berlangsung</label>
      <Field className="sm:col-span-2"><FieldLabel htmlFor={prefix + "-description"}>Tugas, tanggung jawab, atau hasil</FieldLabel><Textarea id={prefix + "-description"} value={item.description} onChange={event => update(list, index, "description", event.target.value)} maxLength={900} rows={3} /></Field>
    </div>
  );
}
