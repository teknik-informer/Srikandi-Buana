"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { requestJSON } from "@/lib/request-json";
import type { Principal } from "@/lib/permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Download, MapPin, Plus, RefreshCw, Users } from "lucide-react";

type Session = { id: string; data: Record<string, unknown>; created?: string; updated?: string };
type AttendanceRecord = { id: string; data: Record<string, unknown>; created?: string; updated?: string };
type Member = { id: string; name: string; dusun: string; role: string };
type Payload = { mode: "member" | "management"; sessions: Session[]; records: AttendanceRecord[]; corrections: AttendanceRecord[]; members?: Member[]; summary?: { sessionsToday: number; present: number; late: number; correctionsPending: number } };
const statusLabels: Record<string, string> = { scheduled: "Terjadwal", active: "Sedang berlangsung", closed: "Ditutup", cancelled: "Dibatalkan", present: "Hadir", late: "Terlambat", excused: "Izin", sick: "Sakit", absent: "Tidak hadir", pending: "Menunggu pemeriksaan", approved: "Disetujui", rejected: "Ditolak" };
const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const label = (value: unknown) => statusLabels[String(value)] || String(value || "—");
const dateLabel = (value: unknown) => { const s = String(value || ""); if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s || "—"; const [y,m,d] = s.split("-"); return d + "/" + m + "/" + y; };

export default function HrmAttendanceWorkspace({ user }: { user: Principal }) {
  const memberMode = user.role === "anggota";
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState("Rapat");
  const [eventDate, setEventDate] = useState(todayJakarta());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [programId, setProgramId] = useState(user.programIds[0] || "");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [correctionReason, setCorrectionReason] = useState<Record<string, string>>({});
  const [correctionStatus, setCorrectionStatus] = useState<Record<string, string>>({});
  const [qrLink, setQrLink] = useState<Record<string, string>>({});
  const [qrExpiry, setQrExpiry] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { response, data: result } = await requestJSON<Payload & { error?: string }>("/api/hrm/attendance");
      if (!response.ok) throw new Error(result?.error || "Data presensi belum dapat dimuat.");
      setData(result);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Data presensi belum dapat dimuat.";
      setError(message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sessions = data?.sessions || [];
  const members = data?.members || [];
  const records = data?.records || [];
  const corrections = data?.corrections || [];
  const sessionMap = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  useEffect(() => {
    if (memberMode && typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      const token = query.get("token"), sessionId = query.get("sessionId");
      if (token && sessionId) {
        void requestJSON<{ error?: string; status?: string }>("/api/hrm/attendance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check_in", sessionId, method: "qr", token }),
        }).then(({ response, data: result }) => {
          if (!response.ok) throw new Error(result?.error || "Presensi QR belum berhasil.");
          toast.success("Presensi QR berhasil dicatat.");
          window.history.replaceState({}, "", window.location.pathname);
          void load();
        }).catch((cause) => toast.error(cause instanceof Error ? cause.message : "Presensi QR belum berhasil."));
      }
    }
  }, [memberMode, load]);

  async function send(action: string, body: Record<string, unknown>, method: "POST" | "PATCH" = "POST") {
    setSaving(true); setError("");
    try {
      const { response, data: result } = await requestJSON<{ error?: string; id?: string; checkInUrl?: string; expiresAt?: string; status?: string }>("/api/hrm/attendance", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }),
      });
      if (!response.ok) throw new Error(result?.error || "Perubahan presensi belum tersimpan.");
      await load();
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Perubahan presensi belum tersimpan.";
      setError(message); toast.error(message); return null;
    } finally { setSaving(false); }
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionName.trim() || !location.trim() || !participantIds.length) { toast.error("Lengkapi nama, lokasi, dan peserta sesi."); return; }
    const result = await send("create_session", { sessionName, sessionType, eventDate, startTime, endTime, location, programId: programId || null, participantIds });
    if (result) {
      toast.success("Sesi presensi berhasil dibuat.");
      setSessionName(""); setLocation(""); setParticipantIds([]);
    }
  }

  async function checkIn(sessionId: string, method = "self") {
    const result = await send("check_in", { sessionId, method });
    if (result) toast.success(result.status === "late" ? "Presensi tercatat sebagai terlambat." : "Presensi berhasil dicatat.");
  }

  async function createQr(sessionId: string) {
    const result = await send("create_qr", { sessionId });
    if (result?.checkInUrl) { setQrLink((current) => ({ ...current, [sessionId]: result.checkInUrl! })); setQrExpiry((current) => ({ ...current, [sessionId]: result.expiresAt || "" })); toast.success("Tautan token presensi berhasil dibuat."); }
  }

  async function requestCorrection(record: AttendanceRecord) {
    const reason = correctionReason[record.id] || "";
    const requestedStatus = correctionStatus[record.id] || "present";
    const result = await send("request_correction", { attendanceRecordId: record.id, requestedStatus, reason });
    if (result) toast.success("Pengajuan koreksi dikirim untuk diperiksa.");
  }

  async function reviewCorrection(correction: AttendanceRecord, decision: "approved" | "rejected") {
    const note = window.prompt("Tuliskan alasan keputusan koreksi (minimal 3 karakter):") || "";
    if (note.trim().length < 3) return;
    const result = await send("review_correction", { correctionId: correction.id, decision, reviewNote: note }, "PATCH");
    if (result) toast.success(decision === "approved" ? "Koreksi disetujui." : "Koreksi ditolak.");
  }

  const title = memberMode ? "Presensi Saya" : "Smart Attendance Management";
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">HRM · Pengelolaan Kehadiran</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{memberMode ? "Lihat sesi yang ditugaskan kepada Anda, lakukan check-in, dan pantau riwayat kehadiran pribadi." : "Kelola sesi kegiatan, peserta, pencatatan kehadiran, dan pengajuan koreksi dalam satu tempat."}</p>
      </div>
      <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Muat ulang</Button>
    </div>

    {error && <Alert variant="destructive"><AlertTitle>Belum dapat diproses</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

    {loading && <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-6">Memuat data presensi…</CardContent></Card><Card><CardContent className="p-6">Memuat sesi…</CardContent></Card><Card><CardContent className="p-6">Memuat riwayat…</CardContent></Card></div>}

    {!loading && !memberMode && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-5"><CalendarDays className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Sesi hari ini</p><p className="text-2xl font-semibold">{data?.summary?.sessionsToday ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Users className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Hadir tercatat hari ini</p><p className="text-2xl font-semibold">{data?.summary?.present ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Clock3 className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Terlambat</p><p className="text-2xl font-semibold">{data?.summary?.late ?? 0}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><ClipboardCheck className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Koreksi menunggu</p><p className="text-2xl font-semibold">{data?.summary?.correctionsPending ?? 0}</p></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Buat sesi presensi</CardTitle><CardDescription>Gunakan untuk rapat, pelatihan, penyuluhan, gotong royong, kegiatan pertanian, dan kegiatan program.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={createSession} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field><FieldLabel htmlFor="attendance-session-name">Nama kegiatan</FieldLabel><Input id="attendance-session-name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} maxLength={160} required /></Field>
              <Field><FieldLabel htmlFor="attendance-session-type">Jenis kegiatan</FieldLabel><NativeSelect id="attendance-session-type" value={sessionType} onChange={(e) => setSessionType(e.target.value)}>{["Rapat","Penyuluhan","Pelatihan","Gotong Royong","Kegiatan Pertanian","Kegiatan Program","Kunjungan Lapangan","Kegiatan Organisasi","Lainnya"].map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}</NativeSelect></Field>
              <Field><FieldLabel htmlFor="attendance-date">Tanggal</FieldLabel><Input id="attendance-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></Field>
              <div className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor="attendance-start">Mulai</FieldLabel><Input id="attendance-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></Field><Field><FieldLabel htmlFor="attendance-end">Selesai</FieldLabel><Input id="attendance-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></Field></div>
              <Field><FieldLabel htmlFor="attendance-location">Lokasi kegiatan</FieldLabel><Input id="attendance-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={240} required /></Field>
              {user.role === "koordinator" && <Field><FieldLabel htmlFor="attendance-program">Program penugasan</FieldLabel><NativeSelect id="attendance-program" value={programId} onChange={(e) => setProgramId(e.target.value)}>{user.programIds.map((id) => <NativeSelectOption key={id} value={id}>Program {id}</NativeSelectOption>)}</NativeSelect></Field>}
            </div>
            <FieldGroup><FieldLabel>Peserta terdaftar dan terverifikasi</FieldLabel><div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">{members.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={participantIds.includes(member.id)} onChange={(e) => setParticipantIds((current) => e.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} /><span className="min-w-0"><strong>{member.name}</strong><small className="block text-muted-foreground">{member.dusun} · {member.role}</small></span></label>)}{!members.length && <p className="text-sm text-muted-foreground">Belum ada anggota aktif dan terverifikasi yang dapat dipilih.</p>}</div></FieldGroup>
            <Button type="submit" disabled={saving || !members.length}><Plus className="mr-2 size-4" />{saving ? "Menyimpan…" : "Buat sesi presensi"}</Button>
          </form>
        </CardContent>
      </Card>
    </>}

    {!loading && <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>{memberMode ? "Sesi yang dapat diikuti" : "Sesi presensi"}</CardTitle><CardDescription>{memberMode ? "Sesi aktif yang mencantumkan akun Anda sebagai peserta." : "Status dan waktu sesi presensi yang tercatat."}</CardDescription></CardHeader><CardContent className="space-y-3">
        {sessions.map((session) => {
          const s = session.data, sessionRecords = records.filter((r) => r.data.sessionId === session.id);
          const ownRecord = sessionRecords.find((r) => r.data.participantId === user.memberId);
          return <div key={session.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{String(s.sessionName)}</h3><p className="mt-1 text-sm text-muted-foreground">{String(s.sessionType)} · {dateLabel(s.eventDate)} · {String(s.startTime)}–{String(s.endTime)}</p><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{String(s.location)}</p></div><Badge variant={s.status === "active" ? "default" : "secondary"}>{label(s.status)}</Badge></div>
            {memberMode ? <div className="mt-3">{ownRecord ? <p className="text-sm">Status Anda: <strong>{label(ownRecord.data.status)}</strong> · {ownRecord.data.checkInAt ? new Date(String(ownRecord.data.checkInAt)).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Belum ada waktu hadir"}</p> : <Button className="mt-2" onClick={() => void checkIn(session.id)} disabled={saving || s.status !== "active"}><CheckCircle2 className="mr-2 size-4" />Hadir sekarang</Button>}</div> : <div className="mt-3 flex flex-wrap gap-2"><span className="text-sm text-muted-foreground">{sessionRecords.length} catatan presensi</span>{s.status === "scheduled" && <Button size="sm" onClick={() => void send("session_status", { sessionId: session.id, status: "active", expectedUpdated: session.updated }, "PATCH")} disabled={saving}>Buka sesi</Button>}{s.status === "active" && <><Button size="sm" variant="outline" onClick={() => void createQr(session.id)} disabled={saving}>Buat tautan QR</Button><Button size="sm" variant="destructive" onClick={() => void send("session_status", { sessionId: session.id, status: "closed", expectedUpdated: session.updated }, "PATCH")} disabled={saving}>Tutup sesi</Button></>}{s.status === "scheduled" && <Button size="sm" variant="ghost" onClick={() => void send("session_status", { sessionId: session.id, status: "cancelled", expectedUpdated: session.updated }, "PATCH")} disabled={saving}>Batalkan</Button>}{qrLink[session.id] && <div className="w-full rounded-lg bg-muted p-3 text-sm"><p className="font-medium">Tautan presensi QR (berlaku hingga {new Date(qrExpiry[session.id]).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})</p><a className="break-all underline" href={qrLink[session.id]}>{qrLink[session.id]}</a><Button size="sm" variant="outline" className="mt-2" onClick={() => void navigator.clipboard.writeText(qrLink[session.id])}>Salin tautan</Button></div>}</div>}
          </div>;
        })}
        {!sessions.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{memberMode ? "Belum ada sesi aktif yang ditugaskan kepada Anda." : "Belum ada sesi presensi. Buat sesi pertama untuk memulai."}</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{memberMode ? "Riwayat kehadiran saya" : "Catatan kehadiran terbaru"}</CardTitle><CardDescription>{memberMode ? "Riwayat yang hanya dapat dilihat oleh akun Anda." : "Catatan presensi dalam sesi yang berada dalam kewenangan Anda."}</CardDescription></CardHeader><CardContent className="space-y-3">
        {records.slice(0, 30).map((record) => <div key={record.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{String(record.data.participantName || "Peserta")}</strong><Badge variant="secondary">{label(record.data.status)}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{String(sessionMap.get(String(record.data.sessionId))?.data.sessionName || "Kegiatan")} · {record.data.checkInAt ? new Date(String(record.data.checkInAt)).toLocaleString("id-ID") : "Tidak ada waktu check-in"}</p>
          {memberMode && <div className="mt-3 grid gap-2"><NativeSelect value={correctionStatus[record.id] || "present"} onChange={(e) => setCorrectionStatus((current) => ({ ...current, [record.id]: e.target.value }))}><NativeSelectOption value="present">Hadir</NativeSelectOption><NativeSelectOption value="late">Terlambat</NativeSelectOption><NativeSelectOption value="excused">Izin</NativeSelectOption><NativeSelectOption value="sick">Sakit</NativeSelectOption><NativeSelectOption value="absent">Tidak hadir</NativeSelectOption></NativeSelect><Textarea rows={2} placeholder="Alasan pengajuan koreksi (minimal 10 karakter)" value={correctionReason[record.id] || ""} onChange={(e) => setCorrectionReason((current) => ({ ...current, [record.id]: e.target.value }))} /><Button size="sm" variant="outline" onClick={() => void requestCorrection(record)} disabled={saving}>Ajukan koreksi</Button></div>}
        </div>)}
        {!records.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada catatan kehadiran.</p>}
      </CardContent></Card>
    </div>}

    {!loading && !memberMode && <Card><CardHeader><CardTitle>Permohonan koreksi</CardTitle><CardDescription>Perubahan hanya diterapkan setelah disetujui dan selalu menyimpan status sebelumnya.</CardDescription></CardHeader><CardContent className="space-y-3">
      {corrections.map((correction) => <div key={correction.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong className="text-sm">{String(correction.data.participantName || "Peserta")}</strong><p className="text-sm text-muted-foreground">{label(correction.data.previousStatus)} → {label(correction.data.requestedStatus)} · {String(correction.data.reason)}</p><Badge variant="secondary">{label(correction.data.approvalStatus)}</Badge></div>{correction.data.approvalStatus === "pending" && ["ketua", "sekretaris"].includes(user.role) && <div className="flex gap-2"><Button size="sm" onClick={() => void reviewCorrection(correction, "approved")} disabled={saving}>Setujui</Button><Button size="sm" variant="outline" onClick={() => void reviewCorrection(correction, "rejected")} disabled={saving}>Tolak</Button></div>}</div>)}
      {!corrections.length && <p className="text-sm text-muted-foreground">Belum ada pengajuan koreksi.</p>}
    </CardContent></Card>}
  </div>;
}
