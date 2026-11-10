"use client";
import { requestJSON } from "@/lib/request-json";
import { WorkspaceSearch } from "./workspace-ui";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { Users, Download, Save } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup, FieldSet, FieldLegend } from "@/components/ui/field";
import { type Row, dateID } from "@/lib/srikandi";
import { canDiscardChanges, markFormDirty, markFormSaved } from "@/lib/unsaved-changes";

export default function Attendance({ rows, onSaved }: { rows: Row[]; onSaved: () => Promise<void> }) {
  const events = rows.filter((r) => r.kind === "kegiatan");
  const members = rows.filter((r) => r.kind === "anggota");
  const [eventId, setEventId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
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
    setNotes(String(record?.data.notes || ""));
  }, [eventId, record]);
  function changeSelection(ids: string[]) {
    dirty.current = true;
    markFormDirty(form.current);
    setSelected(ids);
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const { response: r, data: d } = await requestJSON<{ error?: string }>("/api/attendance", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, memberIds: selected, notes }),
      });
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
    const csv = "\uFEFF" + [["Kegiatan", "Tanggal", "Nama", "Peran", "Kehadiran"],
      ...members.map((m) => [String(event?.data.name || ""), String(event?.data.date || ""),
        String(m.data.name), String(m.data.role), selected.includes(m.id) ? "Hadir" : "Belum ditandai"]),
    ].map((r) => r.map(q).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "kehadiran-srikandi-buana.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const visibleMembers = members.filter((m) =>
    (String(m.data.name) + " " + String(m.data.dusun)).toLowerCase().includes(query.toLowerCase()));
  return <Card>
    <CardHeader>
      <CardTitle>Daftar hadir kegiatan</CardTitle>
      <CardDescription>Pilih kegiatan lalu tandai anggota yang benar-benar hadir. Data hanya tersedia bagi pengelola.</CardDescription>
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
            <div className="attendance-summary"><Users /><strong>{selected.length}</strong><span>dari {members.length} anggota ditandai hadir</span></div>
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
            <Field>
              <FieldLabel htmlFor="attendance-notes">Catatan kehadiran</FieldLabel>
              <Textarea id="attendance-notes" value={notes} onChange={(e) => { dirty.current = true; markFormDirty(form.current); setNotes(e.target.value); }} maxLength={5000} rows={3} />
            </Field>
            <div className="flex gap-3 flex-wrap">
              <Button type="submit" disabled={saving}><Save data-icon="inline-start" />{saving ? "Menyimpan…" : "Simpan kehadiran"}</Button>
              <Button type="button" onClick={exportCSV} variant="outline"><Download data-icon="inline-start" />Ekspor daftar hadir</Button>
            </div>
          </FieldSet>
        </form>}
        {!events.length && <p className="section-note">Tambahkan kegiatan melalui menu Agenda & Kegiatan untuk memulai.</p>}
      </FieldGroup>
    </CardContent>
  </Card>;
}
