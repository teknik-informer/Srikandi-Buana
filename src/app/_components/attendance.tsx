"use client";

import { requestJSON } from "@/lib/request-json";
import { WorkspaceSearch } from "./workspace-ui";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { Users, Download, Save, Plus, Trash2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup, FieldSet, FieldLegend } from "@/components/ui/field";
import { type Row, dateID } from "@/lib/srikandi";
import { canDiscardChanges, markFormDirty, markFormSaved } from "@/lib/unsaved-changes";

type ExternalParticipant = {
  name: string;
  organisation: string;
  role: string;
  attendanceStatus: string;
  photoConsent: string;
};

const defaultExternalParticipant = (): ExternalParticipant => ({
  name: "",
  organisation: "",
  role: "",
  attendanceStatus: "Hadir penuh",
  photoConsent: "Belum ditanyakan",
});

function parseExternalParticipants(value: unknown): ExternalParticipant[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ExternalParticipant =>
      !!item && typeof item === "object" &&
      typeof item.name === "string" &&
      typeof item.organisation === "string" &&
      typeof item.role === "string" &&
      typeof item.attendanceStatus === "string" &&
      typeof item.photoConsent === "string",
    ).map((item) => ({
      name: item.name.slice(0, 160),
      organisation: item.organisation.slice(0, 180),
      role: item.role.slice(0, 120),
      attendanceStatus: item.attendanceStatus,
      photoConsent: item.photoConsent,
    }));
  } catch {
    return [];
  }
}

export default function Attendance({ rows, onSaved }: { rows: Row[]; onSaved: () => Promise<void> }) {
  const events = rows.filter((r) => r.kind === "kegiatan");
  const members = rows.filter((r) => r.kind === "anggota");
  const [eventId, setEventId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<ExternalParticipant[]>([]);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const pending = useRef(false);
  const dirty = useRef(false);
  const event = events.find((e) => e.id === eventId);
  const record = rows.find((r) => r.kind === "kehadiran" && r.data.eventId === eventId);

  useEffect(() => {
    const search = typeof window === "undefined" ? "" : window.location?.search || "";
    const requestedEventId = new URLSearchParams(search).get("eventId");
    if (!requestedEventId || dirty.current) return;
    if (rows.some((item) => item.kind === "kegiatan" && item.id === requestedEventId)) setEventId(requestedEventId);
  }, [rows]);

  useEffect(() => {
    // A background reload must not overwrite work that is still being edited.
    if (dirty.current) return;
    const ids = record?.data.memberIds;
    setSelected(Array.isArray(ids) ? ids.filter((v): v is string => typeof v === "string") : []);
    setExternalParticipants(parseExternalParticipants(record?.data.externalParticipantsJson));
    setNotes(String(record?.data.notes || ""));
  }, [eventId, record]);

  function markDirty() {
    dirty.current = true;
    markFormDirty(form.current);
  }
  function changeSelection(ids: string[]) {
    markDirty();
    setSelected(ids);
  }
  function updateExternalParticipant(index: number, patch: Partial<ExternalParticipant>) {
    markDirty();
    setExternalParticipants((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }
  function addExternalParticipant() {
    if (externalParticipants.length >= 100) return;
    markDirty();
    setExternalParticipants((current) => [...current, defaultExternalParticipant()]);
  }
  function removeExternalParticipant(index: number) {
    markDirty();
    setExternalParticipants((current) => current.filter((_, i) => i !== index));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const { response: r, data: d } = await requestJSON<{ error?: string; externalCount?: number }>(
        "/api/attendance",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, memberIds: selected, externalParticipants, notes }),
        },
      );
      if (!r.ok) throw Error(r.status === 401
        ? "Sesi masuk telah berakhir. Salin catatan yang diperlukan, lalu masuk kembali."
        : d?.error || "Daftar hadir belum tersimpan. Coba lagi.");
      dirty.current = false;
      if (form.current) markFormSaved(form.current);
      toast.success("Daftar hadir tersimpan.");
      await onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Daftar hadir belum tersimpan.";
      setError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  function exportCSV() {
    const q = (x: string) => '"' + x.replace(/^[=+@\-]/, "'$&").replaceAll('"', '""') + '"';
    const csv = "\uFEFF" + [
      ["Kegiatan", "Tanggal", "Nama", "Kelompok/lembaga", "Peran", "Kehadiran", "Izin foto"],
      ...members.map((m) => [
        String(event?.data.name || ""),
        String(event?.data.date || ""),
        String(m.data.name),
        String(m.data.dusun || ""),
        String(m.data.role || ""),
        selected.includes(m.id) ? "Hadir" : "Belum ditandai",
        "Mengikuti catatan persetujuan anggota",
      ]),
      ...externalParticipants.map((p) => [
        String(event?.data.name || ""),
        String(event?.data.date || ""),
        p.name,
        p.organisation,
        p.role,
        p.attendanceStatus,
        p.photoConsent,
      ]),
    ].map((r) => r.map((value) => q(String(value))).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "kehadiran-srikandi-buana.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const visibleMembers = members.filter((m) =>
    (String(m.data.name) + " " + String(m.data.dusun)).toLowerCase().includes(query.toLowerCase()));

  return <Card>
    <CardHeader>
      <CardTitle>Daftar hadir kegiatan</CardTitle>
      <CardDescription>
        Tandai anggota yang hadir dan catat peserta luar kelompok seperti fasilitator atau narasumber ToT. Daftar eksternal tidak meminta identitas sensitif.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="attendance-event">Kegiatan</FieldLabel>
          <NativeSelect id="attendance-event" value={eventId} disabled={saving} onChange={(e) => {
            if (dirty.current && !window.confirm("Ada perubahan daftar hadir yang belum disimpan. Ganti kegiatan dan tinggalkan perubahan tersebut?")) return;
            if (!dirty.current && !canDiscardChanges()) return;
            dirty.current = false;
            if (form.current) markFormSaved(form.current);
            setEventId(e.target.value); setQuery(""); setError("");
          }}>
            <NativeSelectOption value="">Pilih kegiatan</NativeSelectOption>
            {events.map((e) => <NativeSelectOption key={e.id} value={e.id}>
              {String(e.data.name)} · {dateID(String(e.data.date))}
            </NativeSelectOption>)}
          </NativeSelect>
        </Field>
        {event && <form ref={form} data-protect-unsaved onSubmit={save}>
          <FieldSet disabled={saving}>
            <FieldLegend className="sr-only">Kehadiran {String(event.data.name)}</FieldLegend>
            {error && <Alert variant="destructive"><AlertTitle>Belum tersimpan</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="attendance-summary"><Users /><strong>{selected.length + externalParticipants.filter((p) => p.attendanceStatus.startsWith("Hadir")).length}</strong><span>peserta hadir · {selected.length} anggota dan {externalParticipants.length} peserta eksternal tercatat</span></div>
            <div className="inbox-toolbar">
              <WorkspaceSearch value={query} onChange={setQuery} placeholder="Cari anggota…" label="Cari anggota untuk kehadiran" ignoreUnsaved />
              <Button type="button" variant="outline" onClick={() => changeSelection(members.map((m) => m.id))}>Tandai semua</Button>
              <Button type="button" variant="outline" onClick={() => changeSelection([])}>Kosongkan tanda</Button>
            </div>
            <div className="attendance-members">
              {visibleMembers.map((m) => <label key={m.id}>
                <input type="checkbox" checked={selected.includes(m.id)} onChange={(e) => changeSelection(e.target.checked ? [...selected, m.id] : selected.filter((id) => id !== m.id))} />
                <span><strong>{String(m.data.name)}</strong><small>{String(m.data.dusun)} · {String(m.data.role)}</small></span>
              </label>)}
              {!members.length && <p>Tambahkan anggota pada menu Keanggotaan terlebih dahulu.</p>}
              {!!members.length && !visibleMembers.length && <p role="status">Anggota tidak ditemukan. Coba kata lain.</p>}
            </div>

            <section className="mt-6 space-y-3" aria-labelledby="external-attendance-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 id="external-attendance-title" className="font-semibold">Peserta eksternal / mitra / fasilitator</h3>
                  <p className="text-sm text-muted-foreground">Catat nama, lembaga, peran, kehadiran, dan izin foto secara terpisah dari data anggota.</p>
                </div>
                <Button type="button" variant="outline" className="min-h-11" onClick={addExternalParticipant} disabled={externalParticipants.length >= 100}>
                  <Plus data-icon="inline-start" /> Tambah peserta
                </Button>
              </div>
              {externalParticipants.map((participant, index) => (
                <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={"external-name-" + index}>Nama peserta *</FieldLabel>
                    <Input id={"external-name-" + index} value={participant.name} maxLength={160} required onChange={(e) => updateExternalParticipant(index, { name: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={"external-org-" + index}>Kelompok/lembaga asal</FieldLabel>
                    <Input id={"external-org-" + index} value={participant.organisation} maxLength={180} onChange={(e) => updateExternalParticipant(index, { organisation: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={"external-role-" + index}>Peran peserta</FieldLabel>
                    <Input id={"external-role-" + index} value={participant.role} maxLength={120} onChange={(e) => updateExternalParticipant(index, { role: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={"external-status-" + index}>Kehadiran</FieldLabel>
                    <NativeSelect id={"external-status-" + index} value={participant.attendanceStatus} onChange={(e) => updateExternalParticipant(index, { attendanceStatus: e.target.value })}>
                      {["Hadir penuh", "Hadir sebagian", "Izin", "Tidak hadir"].map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={"external-photo-" + index}>Izin dokumentasi foto</FieldLabel>
                    <NativeSelect id={"external-photo-" + index} value={participant.photoConsent} onChange={(e) => updateExternalParticipant(index, { photoConsent: e.target.value })}>
                      {["Belum ditanyakan", "Setuju sesuai tujuan", "Tidak setuju"].map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
                    </NativeSelect>
                  </Field>
                  <div className="flex items-end justify-end">
                    <Button type="button" variant="ghost" className="min-h-11" onClick={() => removeExternalParticipant(index)}>
                      <Trash2 data-icon="inline-start" /> Hapus peserta
                    </Button>
                  </div>
                </div>
              ))}
              {!externalParticipants.length && (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Belum ada peserta eksternal. Tambahkan bila ada narasumber, fasilitator, atau perwakilan mitra yang benar-benar hadir.
                </p>
              )}
            </section>

            <Field className="mt-4">
              <FieldLabel htmlFor="attendance-notes">Catatan kehadiran</FieldLabel>
              <Textarea id="attendance-notes" value={notes} onChange={(e) => { markDirty(); setNotes(e.target.value); }} maxLength={5000} rows={3} />
            </Field>
            <div className="flex gap-3 flex-wrap">
              <Button type="submit" disabled={saving}><Save data-icon="inline-start" />{saving ? "Menyimpan…" : "Simpan kehadiran"}</Button>
              <Button type="button" onClick={exportCSV} variant="outline"><Download data-icon="inline-start" />Ekspor daftar hadir</Button>
            </div>
          </FieldSet>
        </form>}
        {!events.length && <p className="section-note">Tambahkan kegiatan melalui menu Agenda Kegiatan untuk memulai.</p>}
      </FieldGroup>
    </CardContent>
  </Card>;
}
